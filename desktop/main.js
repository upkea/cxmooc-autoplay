// cxmooc-desktop 主进程
// Electron 壳：内嵌学习通网页注入用户脚本；原生设置窗；托盘；单实例；GitHub 自动更新
const electron = require('electron');
const { app, BrowserWindow, session, ipcMain, shell, Tray, Menu, nativeImage } =
  electron && typeof electron === 'object' && electron.app ? electron : {};
const path = require('path');
const fs = require('fs');
const store = require('./config-store.js');

if (!app) {
  console.error('[cxmooc] Electron 以错误模式启动：require("electron") 没返回主进程 API。');
  console.error('[cxmooc] 请双击 start.bat 启动，不要用 node main.js。');
  process.exit(2);
}

const IS_SMOKE = process.argv.includes('--smoke');

// 数据目录兜底（三级）：CX_USER_DATA 环境变量 → 标准 %APPDATA% → 程序目录下 userdata。
// 部分机器对 %APPDATA% 有外部文件过滤（写入会被拦，Chromium 初始化直接失败），
// 逐级检测可写性，保证程序在任何机器上都能起来。
function canWriteSync(dir) {
  try {
    fs.mkdirSync(dir, { recursive: true });
    fs.accessSync(dir, fs.constants.W_OK);
    return true;
  } catch (e) {
    return false;
  }
}
try {
  if (process.env.CX_USER_DATA && canWriteSync(process.env.CX_USER_DATA)) {
    app.setPath('userData', path.resolve(process.env.CX_USER_DATA));
  } else if (!canWriteSync(app.getPath('userData'))) {
    app.setPath('userData', path.join(path.dirname(process.execPath), 'userdata'));
  }
} catch (e) {
  console.error('[cxmooc] userData fallback failed:', e && e.message);
}

// 兼容性开关：无独立 GPU 的机器用软件渲染（WARP）保证能起；
// 设 CX_SOFT_RENDER=0 可切回默认渲染（有 GPU 的机器用这个看视频更流畅）。
// 必须在 app ready 之前设置。
try {
  if (process.env.CX_SOFT_RENDER !== '0') {
    app.disableHardwareAcceleration();
    app.commandLine.appendSwitch('no-sandbox');
    app.commandLine.appendSwitch('no-zygote');
    app.commandLine.appendSwitch('disable-gpu-compositing');
    app.commandLine.appendSwitch('use-angle', 'd3d11-warp-webgl');
  } else {
    app.commandLine.appendSwitch('no-sandbox');
    app.commandLine.appendSwitch('no-zygote');
  }
} catch (e) {
  console.error('[cxmooc] compat switches failed:', e && e.message);
}

const CHROME_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
const HOME_URL = 'https://i.chaoxing.com';

let win = null;
let settingsWin = null;
let tray = null;
let quitting = false;

const LOG = [];
function log(...a) {
  const s = a.map((x) => (typeof x === 'string' ? x : JSON.stringify(x))).join(' ');
  LOG.push(new Date().toISOString() + ' ' + s);
  console.log('[cxmooc]', s);
}
// AI 请求走 Electron 网络栈（net.fetch，与页面加载同一通道）。
// 这台机器上主进程的 Node fetch 会卡死超时，Chromium 网络栈则正常。
function netFetch(url, opts) {
  try {
    const net = electron.net;
    if (net && typeof net.fetch === 'function') {
      return net.fetch(url, opts);
    }
  } catch (e) { /* ignore */ }
  return fetch(url, opts);
}
setInterval(() => {
  if (LOG.length) {
    try {
      fs.appendFileSync(path.join(app.getPath('userData'), IS_SMOKE ? 'smoke.log' : 'app.log'), LOG.join('\n') + '\n');
    } catch (e) { /* ignore */ }
    LOG.length = 0;
  }
}, 2000);

// ===== 单实例 =====
if (!IS_SMOKE) {
  const gotLock = app.requestSingleInstanceLock();
  if (!gotLock) {
    app.quit();
  } else {
    app.on('second-instance', () => {
      if (win) { win.show(); win.focus(); }
    });
  }
}

// ===== 注入 =====
function injectSource() {
  const shims = fs.readFileSync(path.join(__dirname, 'shims.js'), 'utf8');
  const body = fs.readFileSync(path.join(__dirname, 'app-inject.js'), 'utf8');
  return shims + '\n' + body;
}

const hookedWc = new WeakSet();

function hookContents(wc) {
  if (!wc || hookedWc.has(wc)) return;
  hookedWc.add(wc);
  const kind = (wc.getType && wc.getType()) || '?';
  try {
    const dbg = wc.debugger;
    dbg.attach('1.3');
    dbg.sendCommand('Page.enable');
    dbg.sendCommand('Page.addScriptToEvaluateOnNewDocument', { source: injectSource() });
    log('injection attached (document-start) for', kind);
  } catch (e) {
    log('debugger attach failed (' + kind + '):', e.message);
  }
  wc.on('dom-ready', () => {
    try {
      wc.executeJavaScript('window.__cxInjected === true', true).then((ok) => {
        if (!ok) wc.executeJavaScript(injectSource(), true).catch(() => {});
      }).catch(() => {});
    } catch (e) { /* ignore */ }
  });
  // 无 preload 桥兜底：页面 console 上行 [CXREQ] → 主进程 fetch → executeJavaScript 回填
  try {
    wc.on('console-message', (e, level, message) => {
      try {
        const msg = typeof message === 'string' ? message : (e && e.message);
        if (typeof msg !== 'string') return;
        // 诊断输出：字体解密等 [CXxxx] 前缀的 console 全部写进 app.log
        if (msg.indexOf('[CXFONT]') === 0 || msg.indexOf('[CXDEBG]') === 0 || msg.indexOf('[CXLOG]') === 0 || msg.indexOf('[CXVISION]') === 0) {
          log('console:', msg.length > 700 ? msg.slice(0, 700) : msg);
        }
        if (msg.indexOf('[CXREQ]') !== 0) return;
        const payload = JSON.parse(msg.slice(7));
        const details = payload.d || {};
        const id = payload.id;
        (async () => {
          let res;
          const t0 = Date.now();
          log('cx-request(console) ->', String((details.url || '')).slice(0, 80));
          try {
            const headers = Object.assign({}, details.headers || {});
            const ctrl = new AbortController();
            const timer = setTimeout(() => ctrl.abort(), details.timeout || 30000);
            const rr = await netFetch(details.url, {
              method: details.method || 'GET',
              headers: headers,
              body: details.data || null,
              signal: ctrl.signal,
              redirect: 'follow',
            });
            clearTimeout(timer);
            res = { status: rr.status, text: await rr.text() };
            log('cx-request(console) <-', rr.status, Date.now() - t0 + 'ms', String(res.text || '').slice(0, 120));
          } catch (err) {
            res = { error: String((err && err.message) || err) };
            log('cx-request(console) ERR:', res.error, '| url:', String((details.url || '')).slice(0, 80));
          }
          const js = 'window.__cxResp && window.__cxResp(' + id + ', ' + JSON.stringify(res) + ')';
          wc.executeJavaScript(js, true).catch(() => {});
        })();
      } catch (err) { /* ignore */ }
    });
  } catch (e) { /* ignore */ }
  wc.on('did-finish-load', () => log('load:', wc.getURL()));
  wc.on('did-fail-load', (e, code, desc, url) => log('fail-load:', code, desc || '', url || ''));
  // 页面里 window.open：学习通域名 → 转成标签页；其他 → 系统浏览器
  try {
    wc.setWindowOpenHandler(({ url }) => {
      if (isCxUrl(url)) {
        try {
          if (win && !win.isDestroyed()) win.webContents.send('cx-new-tab', url);
        } catch (err) { /* ignore */ }
      } else if (url && /^https?:/i.test(url)) {
        shell.openExternal(url);
      }
      return { action: 'deny' };
    });
  } catch (e) { /* ignore */ }
}

const CX_DOMAINS = /^(https?:\/\/([a-z0-9-]+\.)*(chaoxing\.com|xueyinonline\.com|zhihuishu\.com|erya100\.com)(\/|$))/i;
function isCxUrl(u) { return !!u && CX_DOMAINS.test(u); }

// 每个 webview 标签都是独立 WebContents：创建时立刻挂注入
app.on('web-contents-created', (e, wc) => {
  try {
    if (wc.getType() === 'webview') hookContents(wc);
  } catch (err) { /* ignore */ }
});

function createWindow() {
  win = new BrowserWindow({
    width: 1280,
    height: 900,
    show: !IS_SMOKE,
    title: '学习通 · 学习辅助',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: false,
      nodeIntegration: false,
      sandbox: false,
      webviewTag: true,
    },
  });
  win.webContents.setUserAgent(CHROME_UA);
  hookContents(win.webContents);
  // 关闭按钮 → 收进托盘（退出请用托盘菜单）
  win.on('close', (e) => {
    if (!quitting && !IS_SMOKE) {
      e.preventDefault();
      win.hide();
    }
  });
  win.loadFile(path.join(__dirname, 'shell.html')).catch((e) => log('loadFile err:', e.message));

  if (IS_SMOKE) {
    setTimeout(async () => {
      try {
        const ok = await win.webContents.executeJavaScript(
          '({tabs: document.querySelectorAll("webview").length, ua: navigator.userAgent.slice(0, 60)})',
          true
        );
        log('smoke check:', JSON.stringify(ok));
      } catch (e) {
        log('smoke check err:', e.message);
      }
      log('smoke done');
      app.quit();
    }, 30000);
  }
}

// ===== 原生设置窗口 =====
function openSettings() {
  if (settingsWin && !settingsWin.isDestroyed()) {
    settingsWin.show();
    settingsWin.focus();
    return;
  }
  settingsWin = new BrowserWindow({
    width: 540,
    height: 640,
    title: '设置 · 学习通学习辅助',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: false,
      nodeIntegration: false,
      sandbox: false,
    },
  });
  settingsWin.setMenuBarVisibility(false);
  settingsWin.webContents.setWindowOpenHandler(({ url }) => {
    if (url && /^https?:/i.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  settingsWin.loadFile(path.join(__dirname, 'settings.html'));
  settingsWin.on('closed', () => { settingsWin = null; });
}

// ===== 托盘 =====
const TRAY_ICON_B64 =
  'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAOklEQVR4nGNgGJTA+ZDVf2yYbI1EG0SRAcRqxmkINkX/oZgsA/6jYfobQLEXaBoTtEkHxBhEUOOAAAByeh7o2NFRAwAAAABJRU5ErkJggg==';

function createTray() {
  try {
    const icon = nativeImage.createFromDataURL('data:image/png;base64,' + TRAY_ICON_B64);
    tray = new Tray(icon);
    const menu = Menu.buildFromTemplate([
      { label: '打开学习通', click: () => { if (win) { win.show(); win.focus(); } } },
      { label: '设置', click: () => openSettings() },
      { type: 'separator' },
      { label: '退出', click: () => { quitting = true; app.quit(); } },
    ]);
    tray.setToolTip('学习通 · 学习辅助');
    tray.setContextMenu(menu);
    tray.on('click', () => { if (win) { win.show(); win.focus(); } });
  } catch (e) {
    log('tray failed:', e.message);
  }
}

// ===== 配置 IPC（页面脚本与设置窗口共用一份配置）=====
ipcMain.on('cx-cfg-get', (e, arg) => {
  try { e.returnValue = store.get((arg && arg.k) || '', arg && arg.d); } catch (err) { e.returnValue = arg && arg.d; }
});
ipcMain.on('cx-cfg-set', (e, arg) => {
  try {
    store.set(String(arg && arg.k), arg && arg.v);
    e.returnValue = true;
    // 同步给所有页面（含标签 webview）：事件 + 直接把值写进他们的 localStorage
    try {
      const k = String(arg && arg.k);
      const v = String(arg && arg.v);
      const js = 'try{ localStorage.setItem(' + JSON.stringify(k) + ', ' + JSON.stringify(v) + ') }catch(e){}';
      for (const wc of webContentsIterator()) {
        if (wc === e.sender) continue;
        try { wc.send('cx-cfg-changed', { k: k, v: v }); } catch (err) { /* ignore */ }
        try { wc.executeJavaScript(js, true).catch(() => {}); } catch (err) { /* ignore */ }
      }
    } catch (err) { /* ignore */ }
  } catch (err) {
    e.returnValue = false;
  }
});
function webContentsIterator() {
  try {
    const all = (require('electron').webContents || null);
    if (all && typeof all.getAllWebContents === 'function') {
      return all.getAllWebContents().filter((wc) => {
        return !settingsWin || wc !== settingsWin.webContents;
      });
    }
  } catch (e) { /* ignore */ }
  return BrowserWindow.getAllWindows()
    .filter((w) => w !== settingsWin && !w.isDestroyed())
    .map((w) => w.webContents);
}
ipcMain.on('cx-cfg-all', (e) => {
  try { e.returnValue = store.getAll(); } catch (err) { e.returnValue = {}; }
});
ipcMain.handle('cx-request', async (e, details) => {
  try {
    details = details || {};
    const headers = Object.assign({}, details.headers || {});
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), details.timeout || 30000);
    const t0 = Date.now();
    log('cx-request ->', String(details.url || '').slice(0, 80));
    const res = await netFetch(details.url, {
      method: details.method || 'GET',
      headers: headers,
      body: details.data || null,
      signal: ctrl.signal,
      redirect: 'follow',
    });
    clearTimeout(timer);
    const text = await res.text();
    log('cx-request <-', res.status, Date.now() - t0 + 'ms', String(text || '').slice(0, 120));
    return { status: res.status, text };
  } catch (err) {
    log('cx-request ERR:', String((err && err.message) || err), '| url:', String((details && details.url) || '').slice(0, 80));
    return { error: String((err && err.message) || err) };
  }
});

// 视觉读题：原生整窗截图 + 按题目元素精确裁剪（稳定且不会再截错题）
ipcMain.handle('cx-capture', async (e, arg) => {
  const wc = e.sender;
  try {
    const rect = (arg && arg.rect) || null;
    const image = await wc.capturePage();
    const full = image.getSize();
    let dataUrl = image.toDataURL();
    log('capture: native', full.width + 'x' + full.height, rect ? 'rect=' + JSON.stringify(rect) : 'no-rect');
    if (rect && rect.width > 10 && rect.height > 10) {
      try {
        // 视口 CSS 尺寸 → 图片像素缩放比
        let vpW = 0;
        try {
          vpW = await wc.executeJavaScript('window.innerWidth', true);
        } catch (err) { /* ignore */ }
        const ratio = vpW > 0 ? full.width / vpW : 1;
        const ni = nativeImage.createFromDataURL(dataUrl);
        let cropX = Math.max(0, Math.min(full.width - 20, Math.floor(rect.x * ratio)));
        let cropY = Math.max(0, Math.min(full.height - 20, Math.floor(rect.y * ratio)));
        let cropW = Math.min(full.width - cropX, Math.floor(rect.width * ratio));
        let cropH = Math.min(full.height - cropY, Math.floor(rect.height * ratio));
        log('capture crop-plan:', JSON.stringify({ vpW: vpW, ratio: Number(ratio.toFixed(2)), cropX: cropX, cropY: cropY, cropW: cropW, cropH: cropH }));
        if (cropW > 20 && cropH > 20) {
          const cropped = ni.crop({ x: cropX, y: cropY, width: cropW, height: cropH });
          dataUrl = cropped.toDataURL();
          log('capture cropped:', cropW + 'x' + cropH);
        } else {
          log('capture crop skipped (too small)');
        }
      } catch (err) {
        log('capture crop failed:', String((err && err.message) || err));
      }
    }
    // 过大就等比缩小
    try {
      const ni2 = nativeImage.createFromDataURL(dataUrl);
      const sz = ni2.getSize();
      if (sz.width > 1800) {
        const resized = ni2.resize({ width: 1800, quality: 'better' });
        dataUrl = resized.toDataURL();
        log('capture resized ->', resized.getSize().width + 'x' + resized.getSize().height);
      }
    } catch (err) { /* ignore */ }
    return { dataUrl: dataUrl };
  } catch (err) {
    log('capture ERR:', String((err && err.message) || err));
    return { error: String((err && err.message) || err) };
  }
});

// 真实鼠标点击：用 CDP 在指定视口坐标派发可信鼠标事件（学习通新版页面只认真实点击）
ipcMain.handle('cx-click', async (e, arg) => {
  const wc = e.sender;
  try {
    const rect = (arg && arg.rect) || {};
    const cx = Math.round((Number(rect.x) || 0) + (Number(rect.width) || 0) / 2);
    const cy = Math.round((Number(rect.y) || 0) + (Number(rect.height) || 0) / 2);
    const dbg = wc.debugger;
    if (!dbg.isAttached()) {
      dbg.attach('1.3');
    }
    await dbg.sendCommand('Input.dispatchMouseEvent', { type: 'mouseMoved', x: cx, y: cy, button: 'none' });
    await dbg.sendCommand('Input.dispatchMouseEvent', { type: 'mousePressed', x: cx, y: cy, button: 'left', clickCount: 1 });
    await new Promise((r) => setTimeout(r, 60));
    await dbg.sendCommand('Input.dispatchMouseEvent', { type: 'mouseReleased', x: cx, y: cy, button: 'left', clickCount: 1 });
    log('click(cdp):', cx + ',' + cy);
    return { ok: true };
  } catch (err) {
    log('click ERR:', String((err && err.message) || err));
    return { error: String((err && err.message) || err) };
  }
});

ipcMain.handle('cx-open-main', () => {  try {
    if (win) { win.show(); win.focus(); }
    return true;
  } catch (e) { return false; }
});
ipcMain.handle('cx-open-url', (e, url) => {
  try {
    if (url && /^https?:/i.test(url)) shell.openExternal(url);
    return true;
  } catch (e) { return false; }
});

// ===== 调试通道：cmd.txt 里写 JS，应用在活动页面执行，结果写 cmd-result.txt =====
setInterval(async () => {
  try {
    const cmdFile = path.join(__dirname, 'cmd.txt');
    const resFile = path.join(__dirname, 'cmd-result.txt');
    if (!fs.existsSync(cmdFile)) {
      return;
    }
    const code = fs.readFileSync(cmdFile, 'utf8');
    try { fs.unlinkSync(cmdFile); } catch (e) { /* ignore */ }
    if (!code.trim()) {
      return;
    }
    const targets = [];
    try {
      const { webContents } = electron;
      const all = webContents.getAllWebContents();
      for (const wc of all) {
        try {
          const t = wc.getType();
          if (t === 'webview' || t === 'window') {
            targets.push({ wc: wc, type: t });
          }
        } catch (e) { /* ignore */ }
      }
    } catch (e) { /* ignore */ }
    let out = '';
    for (const tg of targets) {
      try {
        if (!tg.wc.isDestroyed()) {
          const r = await tg.wc.executeJavaScript(code, true);
          out += '== ' + tg.type + ' ' + String(tg.wc.getURL() || '').slice(0, 80) + ' ==\n' + String(typeof r === 'string' ? r : JSON.stringify(r)) + '\n';
        }
      } catch (e) {
        out += '== ' + tg.type + ' ERR ==\n' + String((e && e.message) || e) + '\n';
      }
    }
    fs.writeFileSync(resFile, out);
    log('cmd executed ->', resFile);
  } catch (e) { /* ignore */ }
}, 2000);

// ===== 自动更新（仅打包版；GitHub Releases）=====
function setupUpdater() {
  if (IS_SMOKE || !app.isPackaged) return;
  try {
    const { autoUpdater } = require('electron-updater');
    autoUpdater.autoDownload = true;
    autoUpdater.on('update-downloaded', (info) => {
      log('update downloaded', info && info.version, '- 退出后自动安装');
    });
    autoUpdater.on('error', (e) => log('updater error:', e && e.message));
    setTimeout(() => autoUpdater.checkForUpdates().catch(() => {}), 10000);
  } catch (e) {
    log('updater init failed:', e.message);
  }
}

app.whenReady().then(() => {
  app.userAgentFallback = CHROME_UA;
  session.defaultSession.setUserAgent(CHROME_UA);
  store.init(app.getPath('userData'));
  if (!IS_SMOKE) createTray();
  createWindow();
  setupUpdater();
});

app.on('before-quit', () => { quitting = true; store.flush(); });
app.on('window-all-closed', () => {
  // 关窗不退出：学习通挂着走，托盘里能恢复
});