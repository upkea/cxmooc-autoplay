// 配置仓库（主进程）：所有设置统一存在 userData/cx-config.json
// 页面内「更改API」面板和原生「设置」窗口读写的是同一份数据。
const fs = require('fs');
const path = require('path');

let file = null;
let data = {};
let dirty = false;
let timer = null;

function init(userDataDir) {
  try {
    file = path.join(userDataDir, 'cx-config.json');
    const raw = fs.readFileSync(file, 'utf8');
    data = JSON.parse(raw) || {};
  } catch (e) {
    data = {};
  }
}

function flush() {
  if (!file || !dirty) return;
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
    dirty = false;
  } catch (e) { /* ignore */ }
}

function getAll() {
  return Object.assign({}, data);
}

function get(k, d) {
  const v = data[k];
  return v === undefined || v === null ? d : v;
}

function set(k, v) {
  data[k] = v;
  dirty = true;
  clearTimeout(timer);
  timer = setTimeout(flush, 500);
  return true;
}

module.exports = { init, getAll, get, set, flush };