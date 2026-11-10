// CI 用：打包后生成 electron-updater 的 latest.yml（文件名与 sha512 对齐产物）
const fs = require('fs');
const crypto = require('crypto');
const releaseDir = 'release';
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const files = fs.readdirSync(releaseDir).filter((f) => f.endsWith('.exe') && !f.endsWith('.blockmap'));
if (!files.length) {
  console.log('no exe found in', releaseDir);
  process.exit(1);
}
const name = files[0];
const buf = fs.readFileSync(releaseDir + '/' + name);
const sha = crypto.createHash('sha512').update(buf).digest('base64');
const yml = [
  'version: ' + pkg.version,
  'files:',
  '  - url: ' + name,
  '    sha512: ' + sha,
  '    size: ' + buf.length,
  'path: ' + name,
  'sha512: ' + sha,
  "releaseDate: '" + new Date().toISOString() + "'",
  '',
].join('\n');
fs.writeFileSync(releaseDir + '/latest.yml', yml);
console.log('latest.yml written for', name, buf.length, 'bytes');