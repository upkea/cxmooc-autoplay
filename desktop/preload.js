// preload：给页面暴露 IPC 通道
// - __cxIpcRequest：跨域请求（GM_xmlhttpRequest）
// - __cxCfgGet / __cxCfgSet / __cxCfgAll：统一配置（主进程 cx-config.json）
// - __cxShell：标签页壳用（新标签事件）
const { ipcRenderer } = require('electron');
if (!window.__cxIpcReady) {
  window.__cxIpcReady = true;
  window.__cxShell = {
    onNewTab: function (fn) { ipcRenderer.on('cx-new-tab', function (e, url) { fn(url); }); },
    onFocusTab: function (fn) { ipcRenderer.on('cx-focus-tab', function (e, url) { fn(url); }); },
  };
  window.__cxIpcRequest = (details) => ipcRenderer.invoke('cx-request', details);
  window.__cxCapture = (rect) => ipcRenderer.invoke('cx-capture', { rect });
  window.__cxClick = (rect) => ipcRenderer.invoke('cx-click', { rect });
  window.__cxInvoke = (channel, ...args) => ipcRenderer.invoke(channel, ...args);
  window.__cxCfgGet = (k, d) => ipcRenderer.sendSync('cx-cfg-get', { k, d });
  window.__cxCfgSet = (k, v) => ipcRenderer.sendSync('cx-cfg-set', { k, v });
  window.__cxCfgAll = () => ipcRenderer.sendSync('cx-cfg-all');
  // 主进程广播配置变更时，页面脚本可以从这里感知（辅助刷新设置面板）
  window.__cxOnCfgChanged = null;
  ipcRenderer.on('cx-cfg-changed', (e, arg) => {
    if (typeof window.__cxOnCfgChanged === 'function') window.__cxOnCfgChanged(arg.k, arg.v);
  });
}