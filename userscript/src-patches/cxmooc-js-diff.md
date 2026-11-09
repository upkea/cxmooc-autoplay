# `src/tampermonkey/{cxmooc,zhihuishu,course163}.js` —— 脚本头部改动

这三个文件是三个平台的 userscript 头部（`==UserScript==` 元信息 + `config` 默认配置块）。
本仓库在原版基础上有两类改动。

## 1. 新增 AI 配置项（在 `config` 块末尾）

```js
// ===== AI 答题（填了 ai_key 就不再请求题库，直接让 AI 作答）=====
ai_enable: true,                                  // 是否启用 AI 答题
ai_base: "https://api.siliconflow.cn/v1",         // OpenAI 兼容接口地址
ai_key: "",                                       // API Key（必填，填了才会启用 AI）
ai_model: "Qwen/Qwen2.5-7B-Instruct",             // 模型名
```

> `ai_key` 在仓库里**始终为空字符串**，真实 key 由使用者自己在面板里填写（见下文）或改脚本后本地保存，不会提交。

## 2. 让面板里改过的 AI 配置在刷新后保留

原版头部每次加载都会用默认值覆盖 `localStorage`：

```js
Object.keys(config).forEach(k => {
    localStorage[k] = config[k];
});
```

油猴脚本没有申请 `GM_getValue` / `GM_setValue` 权限，配置实际存在 `localStorage`。
如果原样保留这段，用户在通知条面板里点「更改API」填的 key 会在刷新后被默认值抹掉。

所以改成「默认值 + 用户自定义值」两段：

```js
// 用户在面板里改过的 AI 配置（更改API / 自动答题开关）单独存一份，刷新后恢复
let cxCustomConfig = {};
try {
    cxCustomConfig = JSON.parse(localStorage.getItem("cx_ai_custom") || "{}") || {};
} catch (e) {
    cxCustomConfig = {};
}
Object.keys(config).forEach(k => {
    localStorage[k] = config[k];
});
Object.keys(cxCustomConfig).forEach(k => {
    localStorage[k] = cxCustomConfig[k];
});
```

面板里点「保存」时，`src/internal/utils/log.ts` 会同时：

1. `Application.App.config.SetConfig(key, val)` —— 让当前页面立刻生效；
2. `localStorage.setItem("cx_ai_custom", JSON.stringify(custom))` —— 供下次加载恢复。

`cx_ai_custom` 只存 `ai_base` / `ai_key` / `ai_model` / `ai_enable` 这四个键，不会影响其它配置项。
