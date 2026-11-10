// GM 垫片：让为油猴写的脚本在 Electron 页面环境里跑起来
// 由 main.js 在 document-start 注入（在用户脚本之前）。
//
// 两层数据通路：
// 1) preload 桥（__cxIpcRequest / __cxCfg*）——当页面加载了 preload 时用；
// 2) 无桥兜底（webview 标签里 preload 可能没加载）：
//    - GM_getValue/GM_setValue 走 localStorage（同步，原生设置窗口由主进程广播写入）；
//    - GM_xmlhttpRequest 走 console 上行 + 主进程 fetch + executeJavaScript 回调。
(function () {
  try {
    var w = window;
    // 注意：不要在这里一次性缓存桥的存在。
    // document-start 注入早于 preload 执行，那时 __cxIpcRequest 还没被挂上；
    // 必须每次调用时实时检测（配置读写那两条已经是实时检测了）。
    function liveBridge() {
      try {
        return typeof w.__cxIpcRequest === 'function' ? w.__cxIpcRequest : null;
      } catch (e) {
        return null;
      }
    }

    // ---- 无桥时的异步上行通道 ----
    var cxRespSeq = 1;
    var cxPending = {};
    w.__cxResp = function (id, res) {
      try {
        if (cxPending[id]) {
          var cb = cxPending[id];
          delete cxPending[id];
          cb(res);
        }
      } catch (e) { /* ignore */ }
    };
    function uplink(details, cb) {
      var id = ++cxRespSeq;
      cxPending[id] = cb;
      try {
        console.log('[CXREQ]' + JSON.stringify({ id: id, d: details }));
        setTimeout(function () {
          if (cxPending[id]) {
            delete cxPending[id];
            cb({ error: '请求超时（上行通道无回应）' });
          }
        }, (details.timeout || 30000) + 5000);
      } catch (e) {
        delete cxPending[id];
        cb({ error: String(e && e.message || e) });
      }
    }
    function runResponse(details, res, onload, onreadystatechange, onerror) {
      if (res && res.error) {
        // 把失败原因塞成 HTTP 598 让页面面板直接显示出来（面板会把非预期状态码打给用户）
        var diag = 'CXDIAG:' + String(res.error || 'BRIDGE_FAILED');
        var resp = { readyState: 4, status: 598, responseText: diag };
        if (onreadystatechange) onreadystatechange(resp);
        if (onload) onload(resp);
        return;
      }
      var resp = { readyState: 4, status: (res && res.status) || 0, responseText: (res && res.text) || '' };
      if (onreadystatechange) onreadystatechange(resp);
      if (onload) onload(resp);
    }

    if (typeof w.GM_xmlhttpRequest !== 'function') {
      w.GM_xmlhttpRequest = function (details) {
        details = details || {};
        function fail(e) { runResponse(details, { status: 598, text: 'CXDIAG:' + String(e && e.message || 'BRIDGE_MISSING') }, details.onload, details.onreadystatechange); }
        var invoke = liveBridge();
        try { console.log('[CXDEBG] request url=' + String((details.url || '')).slice(0, 60) + ' bridge=' + (invoke ? 'yes' : 'NO')); } catch (e) { /* ignore */ }
        if (invoke) {
          // 关键：IPC 结构化克隆不接受函数——把回调剥掉，只传纯数据
          var clean = {
            url: details.url,
            method: details.method || 'GET',
            headers: details.headers || {},
            data: details.data != null ? String(details.data) : null,
            timeout: details.timeout || 30000,
          };
          invoke(clean)
            .then(function (res) { runResponse(details, res, details.onload, details.onreadystatechange, details.onerror); })
            .catch(function (e) { fail(e); });
        } else {
          uplink(details, function (res) { runResponse(details, res, details.onload, details.onreadystatechange, details.onerror); });
        }
      };
    } else {
      // 已有 GM_xmlhttpRequest 时也保留原样
    }

    if (typeof w.GM_getValue !== 'function') {
      var storageLike = function (k, d) {
        try {
          if (typeof w.__cxCfgGet === 'function') {
            var v = w.__cxCfgGet(k, null);
            if (v !== undefined && v !== null) return v;
          }
        } catch (e) { /* ignore */ }
        try {
          var lv = w.localStorage && w.localStorage.getItem(k);
          return lv == null ? d : lv;
        } catch (e) { return d; }
      };
      w.GM_getValue = storageLike;
    }
    if (typeof w.GM_setValue !== 'function') {
      w.GM_setValue = function (k, v) {
        try {
          if (typeof w.__cxCfgSet === 'function') w.__cxCfgSet(k, v);
        } catch (e) { /* ignore */ }
        try { w.localStorage && w.localStorage.setItem(k, String(v)); } catch (e) { /* ignore */ }
      };
    }
    if (typeof w.GM_notification !== 'function') {
      w.GM_notification = function (d) {
        try {
          new Notification((d && d.title) || '网课小工具', { body: String((d && d.text) || '').slice(0, 120) });
        } catch (e) { /* ignore */ }
      };
    }
    w.unsafeWindow = w;
    w.__cxInjected = true;
    // 视觉读题：截取页面元素区域（走 preload 桥）
    if (typeof w.cxCapture !== 'function') {
      w.cxCapture = function (rect) {
        try {
          if (typeof w.__cxCapture === 'function') return w.__cxCapture(rect);
        } catch (e) { /* ignore */ }
        return Promise.reject(new Error('no capture bridge'));
      };
    }
    // 真实鼠标点击（CDP 派发可信事件，部分页面只认真实点击）
    if (typeof w.cxClick !== 'function') {
      w.cxClick = function (rect) {
        try {
          if (typeof w.__cxClick === 'function') return w.__cxClick(rect);
        } catch (e) { /* ignore */ }
        return Promise.reject(new Error('no click bridge'));
      };
    }
    // 按元素点击（自动换算嵌套 iframe 偏移）—— 给目录切章/选项勾选用
    if (typeof w.cxClickEl !== 'function') {
      w.cxClickEl = function (el) {
        try {
          if (!el) return null;
          var r = el.getBoundingClientRect();
          if (!r || r.width < 2 || r.height < 2) return null;
          var offX = r.left;
          var offY = r.top;
          var pw = w;
          var depth = 0;
          while (pw && pw.parent && pw.parent !== pw && depth < 6) {
            var fe = null;
            try { fe = pw.frameElement; } catch (e) { fe = null; }
            if (!fe) break;
            var fr = fe.getBoundingClientRect();
            offX += fr.left;
            offY += fr.top;
            pw = pw.parent;
            depth++;
          }
          offX -= pw.scrollX || 0;
          offY -= pw.scrollY || 0;
          return w.cxClick({ x: offX, y: offY, width: r.width, height: r.height });
        } catch (e) {
          return null;
        }
      };
    }
    if (typeof w.__cxOnCfgChanged !== 'function') w.__cxOnCfgChanged = null;
  } catch (e) {
    // ignore
  }
})();