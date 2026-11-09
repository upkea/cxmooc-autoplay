# cxmooc-autoplay

超星（学习通）/ 智慧树 网课增强包：**视频自动恢复播放 + 「继续学习」提示自动点 + AI 自动答题**。

基于 [CodFrm/cxmooc-tools](https://github.com/CodFrm/cxmooc-tools)（MIT）二次修改，主要解决三个实际痛点：

| 痛点 | 本项目的做法 |
|---|---|
| 页面失焦/长时间无操作，视频被暂停，弹出「继续学习」 | 油猴脚本直接监听 `<video>` 的 `pause` 事件，自动调用 `play()` 恢复（不依赖鼠标键盘） |
| 模拟点击对那个提示无效（页面不响应点击） | 提供 AutoHotkey 方案：读页面标题标记 → 激活窗口 → 按空格；另附 F6 手动救急 |
| 题库搜不到答案 / 题库服务不稳定 | 接入**任意 OpenAI 兼容接口**（智谱 / 硅基流动 / DeepSeek / 本地 Ollama）让 AI 直接作答 |

## 目录结构

```
cxmooc-autoplay/
├── userscript/
│   ├── cxmooc-tools.user.js      # 构建好的油猴脚本，Tampermonkey 直接安装
│   ├── SOURCE.md                 # 改了什么、怎么自己编译
│   └── src-patches/              # 改动的源码文件
├── ahk/
│   ├── cxmooc-autoclick.ahk      # AutoHotkey v2 脚本
│   ├── template-continue.png     # 「继续学习」按钮模板（+ 多尺度版本）
│   ├── start.bat                 # 启动脚本
│   └── check.bat                 # 只检测不点击（校准用）
└── docs/
```

## 快速开始

### 1. 安装油猴脚本（必须）

1. 浏览器装 [Tampermonkey](https://www.tampermonkey.net/)
2. Chrome 需要额外开启（否则脚本不执行）：
   `chrome://extensions` → 打开右上角「开发者模式」→ Tampermonkey 详情 → 打开 **「允许运行用户脚本 / Allow User Scripts」**
3. 打开 `userscript/cxmooc-tools.user.js`（拖进浏览器，或 Tampermonkey 管理面板 → 实用工具 → 从文件导入）
4. 装完**刷新学习通页面**（脚本更新后必须刷新，否则跑的还是旧代码）

### 2. 配置 AI 答题（可选）

打开 Tampermonkey → 管理面板 → 「超星慕课小工具」→ **编辑**，找到脚本开头的 `config` 块：

```js
ai_enable: true,                              // 启用 AI 答题
ai_base: "https://api.siliconflow.cn/v1",     // OpenAI 兼容接口地址
ai_key: "",                                   // 填你的 API Key，不填则继续用原题库
ai_model: "Qwen/Qwen2.5-7B-Instruct",         // 模型名
```

改完 **Ctrl+S** 保存 → 刷新学习通页面。

常用免费/低价服务：

| 服务 | `ai_base` | `ai_model` | 说明 |
|---|---|---|---|
| 智谱 GLM-4-Flash | `https://open.bigmodel.cn/api/paas/v4` | `glm-4-flash` | 官方免费模型，推荐 |
| 硅基流动 | `https://api.siliconflow.cn/v1` | `Qwen/Qwen2.5-7B-Instruct` | 注册送额度 |
| DeepSeek | `https://api.deepseek.com/v1` | `deepseek-chat` | 便宜，按量付费 |
| 本地 Ollama | `http://127.0.0.1:11434/v1` | `qwen2.5:7b` | 完全离线免费，key 随便填 |

> AI 答题会按题型要求模型只输出答案：单选给 `A`、多选给 `ABD`、判断给 `对/错`、填空按空逐行输出。

### 3. 视频自动恢复（已内置）

脚本会在每个 frame 里守护 `<video>`：检测到暂停就自动 `play()`。**不需要任何额外操作**，刷新页面即可生效。

如果超星那边还会强制暂停，可以用下面的 AHK 方案兜底。

### 4. AutoHotkey 兜底（可选，Windows）

适用：视频停住且自动 `play()` 无效时。

1. 安装 [AutoHotkey v2](https://www.autohotkey.com/)
2. 双击 `ahk/start.bat`
3. 屏幕右上角出现状态小窗口即启动

| 热键 | 功能 |
|---|---|
| **F6** | 立即恢复（激活浏览器 + 按空格），视频停住时直接按这个 |
| **F7** | 只检测，不操作（判断当前有没有「继续学习」提示） |
| **F8** | 检测并尝试恢复 |
| **F9** | 开 / 关自动处理 |
| **F10** | 退出 |

**注意**：
- 图像识别依赖 `template-continue.png`，**页面缩放必须是 100%**（缩放变了按钮像素尺寸就变了）
- 脚本只认「看得见的画面」，学习通页面被最小化/完全遮挡时无法识别
- 如果你用的分辨率/缩放和作者不同，需要重新截模板：开着提示截一张图，见 `docs/TROUBLESHOOTING.md`

## 已知限制（很重要）

- **必须刷新页面**：油猴脚本更新后，已打开的页面还在跑旧代码。
- **AI 答题质量取决于模型**：涉及图片、公式、图表、上下文的题，模型可能答错。**选择题/判断题准确率尚可，填空和主观题不要指望。**
- **平台会改版**：超星播放器/页面结构一变，选择器和模板都可能失效，需要同步更新。
- **视频仍需页面可见**：超星会因页面失焦而暂停，AI/脚本只能"恢复"，不能"阻止"。
- **单并发**：AI 答题是一道一道问，一次章节测验可能要等几分钟。

## 免责声明

本项目仅供技术学习与交流，**不绕过任何付费或鉴权机制**。使用本项目产生的任何后果（包括但不限于学习成绩异常、账号处罚、违反平台服务条款）由使用者自行承担。请在符合学校和平台规定的前提下使用。

## 致谢

- [CodFrm/cxmooc-tools](https://github.com/CodFrm/cxmooc-tools) —— 原始超星/智慧树/中国大学MOOC 工具（MIT）
- [lightagent-lab/web-llm-gateways](https://github.com/lightagent-lab/web-llm-gateways) —— 网页版大模型反代网关的思路参考

## License

MIT，详见 [LICENSE](LICENSE)。使用前请保留原作者版权声明。
