# cxmooc-desktop（桌面版）

> 本目录已并入 [cxmooc-autoplay](https://github.com/upkea/cxmooc-autoplay) 仓库（`desktop/` 子目录）。油猴脚本与桌面版同源管理，安装包也统一在 cxmooc-autoplay 的 Releases 发布。

学习通（超星）网课**学习辅助**桌面版：Electron 壳内嵌学习通网页，注入免费开源的[油猴脚本](https://github.com/upkea/cxmooc-autoplay)（基于 CodFrm/cxmooc-tools，MIT）。

> ⚠️ **仅供个人学习交流使用**，请勿用于代刷、代考等违反学校规定的用途。请遵守所在平台的服务条款，一切使用后果自负。

## 安装与使用（普通用户）

1. 从 [GitHub Releases](https://github.com/upkea/cxmooc-autoplay/releases) 下载 `Setup.x.x.x.exe` 双击安装
2. 首次打开若 SmartScreen 提示「未知发布者」：点 **更多信息 → 仍要运行**（应用未做代码签名）
3. 窗口自动打开学习通，手机号/扫码登录 → 进课程页即可挂机
4. 点任务栏托盘图标 → **设置**：
   - AI 答题：选服务商（默认智谱 glm-4-flash 免费）→ 粘贴 API Key → **测试连接** → 保存
   - 拟人化：倍速上限（默认 2x）、故意答错率（默认 0 = 全对）、随机延迟
5. 关窗口只是收进托盘，退出去托盘菜单「退出」
6. 版本更新自动进行（打包版从 Releases 拉取，退出时自动安装）

## 当前状态：v0.2.0 定版

- [x] Electron 壳 + 学习通网页登录（UA 伪装、弹窗外跳、单实例、标签页多开）
- [x] document-start 注入脚本（视频守护 / 自动切章 / 弹题全都在）
- [x] GM API 垫片（跨域请求走主进程；配置与设置窗口共用 `cx-config.json`）
- [x] **原生设置窗口**：服务商预设 + AI Key + 接口/模型 + 视觉读题开关 + 拟人化 + 「测试连接」
- [x] **AI 答题**：视觉读题（截图→glm-4v 识图）+ 文本模型（glm-4-plus 解题）+ 联网搜索 + 多模型投票，绕过字体加密
- [x] **题图预览小窗**（可拖动 / 加减缩放），提交后自动切章
- [x] 托盘、退出菜单、自动更新
- [x] 拟人化（倍速上限 / 故意答错率 / 随机延迟）
- [ ] 代码签名（当前 SmartScreen 会提示「未知发布者」）

## 开发

```bash
cd desktop   # 桌面版代码在这个子目录里

# 1) 首次：装依赖 + 下载 Electron 二进制（npmmirror 镜像）
npm install --ignore-scripts --registry=https://registry.npmmirror.com
node get-electron-bin.js

# 2) 生成注入 bundle（vendor 下的头 + webpack 产物）
node make-bundle.js

# 3) 启动
start.bat   # 或 npm start

# 烟雾测试（隐藏窗口跑 30 秒，日志写 smoke.log）
npm run smoke

# 4) 打包（win-unpacked + NSIS 安装包 → desktop/release/）
npm run dist
```

> 打包走 npmmirror 镜像：`ELECTRON_BUILDER_BINARIES_MIRROR=https://npmmirror.com/mirrors/electron-builder-binaries/`；配置里已用 `electronDist` 指向本地 `node_modules/electron/dist`，不会重复下载。
> 沙箱/CI 里 npm 子进程被禁止时，加环境变量 `CX_SKIP_DEPS=1` 再打包：跳过依赖收集，产物不含 `electron-updater`（仅用于验证布局，正式包请在本机跑 `npm run dist`）。

## 目录

```
main.js            主进程：窗口 / 注入 / GM 转发 / 托盘 / 设置窗口 / 自动更新
config-store.js    统一配置（userData/cx-config.json），页面与设置窗口共用
preload.js         IPC 桥（请求转发 / 配置读写 / 打开链接）
shims.js           GM 垫片（document-start 注入；GM_getValue 同步直读主进程配置）
settings.html/js   原生设置窗口（服务商预设 / Key / 模型 / 自动答题 / 测试连接）
make-bundle.js     拼 app-inject.js
vendor/            油猴脚本的头 + webpack 产物（源头见 cxmooc-autoplay）
get-electron-bin.js  从 npmmirror 下载 Electron 二进制（npm 装完跑一次）
start.bat          启动入口
```

## 已知限制

- Electron 环境指纹与普通浏览器有差异，学习通若加强检测需要持续跟进
- 未签名（SmartScreen 会提示），正式分发前需要代码签名证书

## 致谢

- [CodFrm/cxmooc-tools](https://github.com/CodFrm/cxmooc-tools)（MIT）—— 原始工具
- [DaRin1403/xuexitong-autostudy](https://github.com/DaRin1403/xuexitong-autostudy)（MIT）—— 字体加密解密思路
- [lightagent-lab/web-llm-gateways](https://github.com/lightagent-lab/web-llm-gateways) —— 大模型反代思路参考

## License

MIT