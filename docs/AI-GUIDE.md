# AI 答题配置指南

本项目**不内置任何 API Key**。你要么自己去官方平台注册一个（推荐，很多免费），要么自己搭一个反代网关把网页版大模型变成 API。下面两种方式任选其一。

---

## 方式 A：注册官方 API（推荐，免费/低价）

### 最快上手：智谱 GLM-4-Flash（免费，不限量）

1. 打开 <https://open.bigmodel.cn>，用手机号注册登录
2. 进入 [API Keys 页面](https://open.bigmodel.cn/usercenter/apikeys)，点「创建 API Key」，复制得到的 key（形如 `xxxxxxxx.xxxxxxxx`）
3. 填进脚本：

```js
ai_enable: true,
ai_base: "https://open.bigmodel.cn/api/paas/v4",
ai_key: "粘贴你的key",
ai_model: "glm-4-flash",
```

> GLM-4-Flash 是智谱官方长期免费模型，答题任务够用，连续题库充足。

### 其他可选平台

| 平台 | 免费情况 | 注册地址 | `ai_base` | `ai_model` |
|---|---|---|---|---|
| 智谱 | GLM-4-Flash 免费 | <https://open.bigmodel.cn> | `https://open.bigmodel.cn/api/paas/v4` | `glm-4-flash` |
| 硅基流动 | 注册送额度 | <https://siliconflow.cn> | `https://api.siliconflow.cn/v1` | `Qwen/Qwen2.5-7B-Instruct` |
| DeepSeek | 低价按量 | <https://platform.deepseek.com> | `https://api.deepseek.com/v1` | `deepseek-chat` |
| 阿里云百炼 | 新用户送额度 | <https://bailian.console.aliyun.com> | `https://dashscope.aliyuncs.com/compatible-mode/v1` | `qwen-plus` |

> 以上全部是各平台**官方接口**，key 在平台控制台自己生成，只填写到你自己的脚本里。

---

## 方式 B：自建反代（把网页版豆包/DeepSeek/Kimi 变成 API）

适合：没有 API key、想用已经登录好的网页版会话、或者想"免费"用网页版的用户。

参考项目：[lightagent-lab/web-llm-gateways](https://github.com/lightagent-lab/web-llm-gateways)（MIT），它把「已登录的网页版大模型会话」包装成标准 OpenAI 接口。

### 概览

| 子项目 | 上游 | 接口 | 端口 | 模型名 |
|---|---|---|---|---|
| doubao-gateway | 豆包网页版 | Chat Completions | `8787` | `doubao-web` |
| deepseek-gateway | DeepSeek 网页版 | Chat Completions / Responses | `8788` | `deepseek-web` |
| kimi-gateway | Kimi 网页版 | Chat Completions / Responses | `8789` | `kimi-web` |

### 部署（官方推荐 Docker 方式）

```sh
git clone https://github.com/lightagent-lab/web-llm-gateways.git
cd web-llm-gateways/doubao-gateway
docker compose up -d --build
```

首次使用需要登录一次豆包（通过 noVNC 隧道，见该项目 README），登录态会持久化，之后无需再登录。

接入本脚本：

```js
ai_enable: true,
ai_base: "http://127.0.0.1:8787/v1",
ai_key: "任意非空字符串",   // 反代网关不校验 key，但脚本要求非空
ai_model: "doubao-web",
```

> ⚠️ 反代方案把 Docker 里第三方的网页会话能力包装成接口，Cookie 留在容器内。请在符合豆包/DeepSeek/Kimi 各自服务条款的前提下使用；本项目只做协议适配，不绕过付费或鉴权，也不建议用于商业用途。

### 无 Docker 的本机简化方式

如果你的电脑不想装 Docker，也可以直接用 Windows 本机跑 `playwright-core` 连接一个带调试端口的 Chrome：

1. 用一个独立的 Chrome 用户目录启动（带调试端口）：

```bat
"C:\Program Files\Google\Chrome\Application\chrome.exe" ^
  --remote-debugging-port=9222 ^
  --user-data-dir="%TEMP%\doubao-profile" ^
  --no-first-run --no-default-browser-check https://www.doubao.com/
```

2. 在弹窗里登录豆包，保持窗口开着（可最小化，别关）
3. 下载 `doubao-gateway/gateway.cjs`，运行：

```bat
set DOUBAO_CDP_URL=http://127.0.0.1:9222
set DOUBAO_GATEWAY_PORT=8787
node gateway.cjs
```

4. 测试：`curl http://127.0.0.1:8787/health`，返回 OK 即成功

---

## 填完后怎么验证

1. 保存脚本（Ctrl+S）→ 刷新学习通页面
2. 打开 F12 控制台，遇到题目时会出现：

```
[info ...] AI 答题中（1/5）：题目开头…
[info ...] AI 答案已填写：A
```

3. 如果报错，控制台里会有具体信息（key 无效 / 网络失败 / 无法解析回复等），对着 `docs/TROUBLESHOOTING.md` 排查。

## 重要提醒

- **不要把含真实 key 的脚本上传到 GitHub**。提交前确认 `ai_key: ""` 是空的。
- AI 答题质量：选择题、判断题准确率尚可；**填空、主观题、图片/公式/图表题不要指望**。
- 每个平台的免费额度、限流规则会变，以平台最新公告为准。