// 下载 Electron 二进制（npmmirror 镜像），提取到 node_modules/electron/dist
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const version = require('D:/work/cxmooc-desktop/node_modules/electron/package.json').version;
const url = `https://npmmirror.com/mirrors/electron/v${version}/electron-v${version}-win32-x64.zip`;
const zip = path.join('D:/work/cxmooc-desktop/tmp', `electron-v${version}-win32-x64.zip`);
const dist = 'D:/work/cxmooc-desktop/node_modules/electron/dist';

(async () => {
  fs.mkdirSync(path.dirname(zip), { recursive: true });
  if (!fs.existsSync(dist + '/electron.exe')) {
    if (!fs.existsSync(zip)) {
      console.log('downloading', url);
      const t0 = Date.now();
      const r = await fetch(url, { redirect: 'follow' });
      if (!r.ok) { console.log('HTTP', r.status); process.exit(1); }
      const file = fs.createWriteStream(zip);
      let got = 0;
      for await (const chunk of r.body) { file.write(chunk); got += chunk.length; }
      file.end();
      await new Promise((res) => file.on('finish', res));
      console.log('downloaded', (got / 1048576).toFixed(1), 'MB in', ((Date.now() - t0) / 1000).toFixed(0), 's');
    }
    console.log('extracting to', dist);
    fs.mkdirSync(dist, { recursive: true });
    const ps = `Expand-Archive -Path '${zip}' -DestinationPath '${dist}' -Force`;
    execFileSync('powershell', ['-NoProfile', '-Command', ps], { stdio: ['ignore', 'inherit', 'inherit'] });
  }
  const exe = dist + '/electron.exe';
  console.log('electron.exe exists:', fs.existsSync(exe), exe);
})().catch((e) => { console.log('FAILED', e.message); process.exit(1); });