// 标签页壳逻辑：一个窗口内多个 webview 标签，课程弹窗全部变新标签
(function () {
  var HOME_URL = 'https://i.chaoxing.com';
  var PRELOAD_URL = null;
  try { PRELOAD_URL = new URL('./preload.js', window.location.href).href; } catch (e) { /* ignore */ }

  var tabs = [];
  var activeId = null;
  var nextId = 1;

  var tabbar = document.getElementById('tabbar');
  var views = document.getElementById('views');
  var newtab = document.getElementById('newtab');

  function makeWebview() {
    var wv = document.createElement('webview');
    wv.setAttribute('partition', 'persist:main');
    wv.setAttribute('webpreferences', 'contextIsolation=no,nodeIntegration=no,sandbox=no');
    if (PRELOAD_URL) wv.setAttribute('preload', PRELOAD_URL);
    wv.setAttribute('allowpopups', 'true');
    return wv;
  }

  function guessTitle(url) {
    if (!url) return '学习通';
    if (/mooc2/.test(url)) return '课程';
    if (/interaction/.test(url)) return '答题';
    if (/passport2|login/.test(url)) return '登录';
    if (/ananas/.test(url)) return '视频';
    if (/homework|work/.test(url)) return '作业';
    return '学习通';
  }

  function activate(id) {
    var t = null;
    for (var i = 0; i < tabs.length; i++) if (tabs[i].id === id) t = tabs[i];
    if (!t) return;
    activeId = id;
    for (var i = 0; i < tabs.length; i++) {
      var on = tabs[i].id === id;
      tabs[i].wv.classList.toggle('active', on);
      tabs[i].root.classList.toggle('active', on);
    }
  }

  function closeTab(id) {
    if (tabs.length <= 1) {
      var only = tabs[0];
      only.wv.setAttribute('src', HOME_URL);
      only.title.textContent = '学习通';
      return;
    }
    var idx = -1;
    for (var i = 0; i < tabs.length; i++) if (tabs[i].id === id) idx = i;
    if (idx < 0) return;
    var tab = tabs[idx];
    tabs.splice(idx, 1);
    try { tab.wv.parentNode.removeChild(tab.wv); } catch (e) { /* ignore */ }
    try { tab.root.parentNode.removeChild(tab.root); } catch (e) { /* ignore */ }
    if (activeId === id) {
      var next = tabs[Math.min(idx, tabs.length - 1)];
      if (next) activate(next.id);
    }
  }

  function bindEvents(tab) {
    tab.wv.addEventListener('did-finish-load', function () {
      try { updateTitle(tab); } catch (e) { /* ignore */ }
    });
    tab.wv.addEventListener('did-start-loading', function () {
      try { updateTitle(tab); } catch (e) { /* ignore */ }
    });
    tab.wv.addEventListener('page-title-updated', function (e) {
      try {
        if (e.title && e.title.length > 1 && e.title.length < 40) tab.title.textContent = e.title;
      } catch (x) { /* ignore */ }
    });
  }

  function updateTitle(tab) {
    try {
      var u = tab.wv.getURL ? tab.wv.getURL() : '';
      if (u && !/about:blank/i.test(u)) tab.title.textContent = guessTitle(u);
    } catch (e) { /* ignore */ }
  }

  function createTab(url, activateNow) {
    var id = nextId++;
    var root = document.createElement('div');
    var title = document.createElement('span');
    var close = document.createElement('span');
    root.className = 'tab';
    title.className = 'title';
    title.textContent = guessTitle(url);
    close.className = 'close';
    close.textContent = '\u00d7';
    root.appendChild(title);
    root.appendChild(close);
    root.addEventListener('mousedown', function (e) { e.stopPropagation(); });
    root.addEventListener('click', function () { activate(id); });
    close.addEventListener('click', function (e) { e.stopPropagation(); closeTab(id); });
    tabbar.appendChild(root);

    var wv = makeWebview();
    views.appendChild(wv);

    var tab = { id: id, root: root, title: title, wv: wv, url: url || HOME_URL };
    tabs.push(tab);
    bindEvents(tab);
    if (url) wv.setAttribute('src', url);
    if (activateNow || tabs.length === 1) activate(id);
    return tab;
  }

  // preload 桥：主进程把学习通弹窗地址转交过来 → 开新标签
  try {
    if (window.__cxShell && typeof window.__cxShell.onNewTab === 'function') {
      window.__cxShell.onNewTab(function (url) { createTab(url, true); });
    }
    if (window.__cxShell && typeof window.__cxShell.onFocusTab === 'function') {
      window.__cxShell.onFocusTab(function (tabUrl) {
        for (var i = 0; i < tabs.length; i++) {
          try { if (tabs[i].wv.getURL() === tabUrl) { activate(tabs[i].id); return; } } catch (e) { /* ignore */ }
        }
        createTab(tabUrl, true);
      });
    }
  } catch (e) { /* ignore */ }

  newtab.addEventListener('click', function () { createTab(null, true); });

  if (tabs.length === 0) createTab(HOME_URL, true);
})();