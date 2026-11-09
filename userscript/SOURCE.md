# 源码改动说明

本目录的 `cxmooc-tools.user.js` 是在 [CodFrm/cxmooc-tools](https://github.com/CodFrm/cxmooc-tools)（MIT）基础上构建的，构建时对源码做了下面这些改动。

## 基线

```
git clone https://github.com/CodFrm/cxmooc-tools.git
# master 分支，package.json version 2.5.0
```

## 新增文件

| 文件 | 作用 |
|---|---|
| `src/internal/app/ai.ts` | AI 答题核心：构造 prompt、调用 OpenAI 兼容接口、解析回复成选项 |
| `src/tampermonkey/continue-watch.ts` | 「继续学习」检测（写页面标题标记）+ `<video>` 暂停自动恢复 |

两个文件已放在 `src-patches/` 目录，可直接复制进源码树对应位置。

## 修改文件

### 1. `src/internal/app/question.ts`

**(a)** `Question` 接口增加可选方法，让 AI 能拿到选项文本：

```ts
export interface Question extends Options {
    GetType(): TopicType;
    GetTopic(): string;
    GetOptions?(): Option[];   // ← 新增
    SetStatus(status: TopicStatus): void;
}
```

**(b)** 顶部 import：

```ts
import {AIEnabled, AskAI} from "./ai";
```

**(c)** `ToolsQuestionBankFacade.Answer()` 开头加分支——配置了 AI 就不走题库：

```ts
public Answer(callback: (status: QuestionStatus) => void) {
    if (AIEnabled()) {
        this.answerWithAI(callback);
        return;
    }
    let topic = new Array<Topic>();
    // ... 原有逻辑
}
```

**(d)** 新增 `answerWithAI()` 方法（逐题问 AI → 解析 → `q.Fill()`），源码见 `src-patches/cxmooc-question-ts-diff.md`。

### 2. `src/mooc/chaoxing/question.ts`

`cxSelectQuestion`（单选/多选/判断）和 `cxFillQuestion`（填空）各增加 `GetOptions()`，把页面上的选项文本暴露给 AI：

```ts
public GetOptions(): Option[] {
    const res = new Array<Option>();
    const opts = this.options();
    for (let i = 0; i < opts.length; i++) {
        res.push({option: this.getOption(opts[i]), content: this.getContent(opts[i])});
    }
    return res;
}
```

### 3. `src/tampermonkey/cxmooc-pack.ts`

入口末尾挂载两个模块：

```ts
import { StartContinueWatch, StartVideoGuard } from "./continue-watch";

// ... app.run();

StartContinueWatch();   // 「继续学习」出现时改标题，供 AutoHotkey 读取
StartVideoGuard();      // 视频被暂停时自动 play()
```

### 4. `src/tampermonkey/{cxmooc,zhihuishu,course163}.js`

脚本头部的 config 块增加 AI 配置项：

```js
ai_enable: true,
ai_base: "https://api.siliconflow.cn/v1",
ai_key: "",
ai_model: "Qwen/Qwen2.5-7B-Instruct",
```

### 5. 界面调整：操作按钮移进「小工具通知条」

原版把「开始挂机 / 秒过视频 / 下载资源 / 下载字幕」那排按钮浮在视频上方，会挡住画面。改为放进右上角的「小工具通知条」面板里。

**`src/internal/utils/log.ts`** —— 面板结构里加一个按钮栏容器：

```html
<div class="head" id="tools-head"> ... </div>
<div class="tools-btn-bar" id="tools-btn-bar"></div>
<div class="main">
   <div class="tools-notice-content"></div>
</div>
```

并在面板关闭（点 x）时，把这排按钮挪到一个悬浮小条里，避免「暂停挂机」点不到：

```ts
(<HTMLButtonElement>this.div.querySelector(".close")).onclick = () => {
    let bar = <HTMLElement>this.div.querySelector("#tools-btn-bar");
    if (bar && bar.children.length > 0) {
        let holder = document.createElement("div");
        holder.id = "tools-btn-float";
        holder.style.cssText = "position:fixed;right:16px;top:130px;...";
        while (bar.firstChild) holder.appendChild(bar.firstChild);
        document.body.appendChild(holder);
    }
    this.el = undefined;
    this.div.remove();
};
```

**`src/mooc/chaoxing/task.ts`** —— `CxTaskControlBar` 构造时优先把按钮挂到 `#tools-btn-bar`，面板还没创建就轮询重试（最多 5 次 × 600ms），找不到再留在原位。同时给每组按钮打上任务点标记 `data-cx-key`，同一任务点重复创建时先删掉旧的那组：

```ts
constructor(prev: HTMLElement, task: CxTask) {
    this.task = task;
    this.prev = document.createElement("div");
    this.prev.style.cssText = "display:flex;flex-wrap:wrap;gap:4px;justify-content:center;";
    this.prev.setAttribute("data-cx-key", CxTaskControlBar.taskKey(task));
    prev.style.textAlign = "center";
    prev.style.width = "100%";
    prev.prepend(this.prev);
    this.defaultBtn();
    this.moveToNoticePanel(0);   // 新增
}

// 任务点唯一标识，用于识别"同一个任务点被创建了两次"
protected static taskKey(task: CxTask): string {
    let prop: any = task && (<any>task).taskinfo && (<any>task).taskinfo.property;
    return prop ? String(prop.objectid || prop.jobid || prop.mid || "") : "";
}

protected moveToNoticePanel(tryCount: number) {
    let bar = <HTMLElement>document.getElementById("tools-btn-bar");
    if (bar) {
        let key = this.prev.getAttribute("data-cx-key");
        let olds = bar.querySelectorAll("[data-cx-key='" + key + "']");
        for (let i = 0; i < olds.length; i++) {
            if (olds[i] != this.prev) (<HTMLElement>olds[i]).remove();
        }
        if (this.prev.parentElement != bar) bar.appendChild(this.prev);
        return;
    }
    if (tryCount < 5) setTimeout(() => this.moveToNoticePanel(tryCount + 1), 600);
}
```

**`src/mooc/chaoxing/course.ts`** —— 每加载一批新任务点（切换章节/任务）时，先清空通知条里的按钮组，否则旧任务的按钮会一直堆在面板里，切几次就变成好几排：

```ts
// OperateCard() 里，重建 taskList 之前
let btnBar = <HTMLElement>document.getElementById("tools-btn-bar");
if (btnBar) {
    while (btnBar.firstChild) btnBar.removeChild(btnBar.firstChild);
}
```

**`src/views/common.ts`** —— 补按钮栏样式（flex 换行、分隔线、空时不占位）：

```css
.tools-btn-bar { display:flex; flex-wrap:wrap; gap:4px; padding:6px 4px;
                 border-top:1px solid #eee; border-bottom:1px solid #eee; box-sizing:border-box; }
.tools-btn-bar:empty { display:none; }
.tools-btn-bar .cx-btn { margin:0 !important; }
```


## 6. 通知条里加 AI 设置：服务商自动配置 + 连接检测 + `自动答题` 开关

目标：不用改脚本源码、不用重装，直接在页面右上角的「小工具通知条」里配好 AI，并且能立刻知道「连不连得上」。

**`src/internal/utils/log.ts`** —— 面板结构里插两行（AI 栏 + 展开的填写表单），放在标题栏和任务按钮栏之间：

```html
<div class="tools-ai-bar" id="tools-ai-bar">
   <button class="cx-btn tools-ai-btn" id="tools-ai-btn">更改API</button>
   <label class="switch">
      <input class="checkbox-input" id="ai-auto-checkbox" type="checkbox">
      <label class="checkbox" for="ai-auto-checkbox"></label>
      <span>自动答题</span>
   </label>
   <span class="tools-ai-status" id="ai-status">未配置</span>
</div>
<div class="tools-ai-form" id="tools-ai-form">
   <div class="row"><span>服务商</span>
      <select id="ai-provider-select">
         <option value="zhipu">智谱 GLM（glm-4-flash，免费）</option>
         <option value="siliconflow">硅基流动</option>
         <option value="deepseek">DeepSeek</option>
         <option value="custom">自定义（自己填地址和模型）</option>
      </select>
   </div>
   <div class="row"><span>API Key</span><input id="ai-key-input" type="password" placeholder="粘贴你申请到的 key"></div>
   <div class="row"><span>接口地址</span><input id="ai-base-input" type="text"></div>
   <div class="row"><span>模型名</span><input id="ai-model-input" type="text"></div>
   <div class="row tools-ai-actions">
      <button class="cx-btn" id="ai-test-btn">测试连接</button>
      <button class="cx-btn" id="ai-save-btn">保存</button>
      <button class="cx-btn" id="ai-cancel-btn">取消</button>
      <span class="tools-ai-hint" id="ai-test-result"></span>
   </div>
</div>
```

**自动配置**：内置服务商预设，选服务商就自动填好接口地址和模型，用户只需要粘 Key。

```ts
let AI_PRESETS: any = {
    zhipu:       {base: "https://open.bigmodel.cn/api/paas/v4", model: "glm-4-flash"},
    siliconflow: {base: "https://api.siliconflow.cn/v1", model: "Qwen/Qwen2.5-7B-Instruct"},
    deepseek:    {base: "https://api.deepseek.com/v1", model: "deepseek-chat"},
    custom:      {base: "", model: ""},
};
```

- 选非「自定义」时，接口地址 / 模型名输入框自动填值并置为只读（灰底），避免改坏。
- 打开表单时按已保存的 `ai_base` 反查属于哪个预设，自动选中对应服务商。
- 「自定义」才允许手改地址和模型（第三方中转、自建反代、Ollama 等用这个）。

**连接检测**：`src/internal/app/ai.ts` 新增 `TestAIConnection(conf?)`，发一个 `max_tokens: 4` 的极小请求，返回 `{ok, ms, status?, error?}`；有 `GM_xmlhttpRequest` 就用它（能拿到 HTTP 状态码），否则退回 `fetch`。

```ts
if (status == 401 || status == 403) error = "Key 不对或没有权限(HTTP 401)";
else if (status == 404) error = "接口地址不对(HTTP 404)，检查接口地址";
else if (status == 429) error = "请求太频繁或额度用完了(HTTP 429)";
else if (status == 0)   error = "网络错误：连不上接口";
```

- 页面加载时：有 Key 就自动测一次，面板右侧显示 `● 检测中…` → `● 已连接`（绿）/ `● 连接失败`（红，鼠标悬停看原因）/ `● 未配置 Key`。
- 「测试连接」按钮用**表单里当前填的**值测，不需要先保存。
- 保存配置后自动再测一次。

**保存与持久化**：

```ts
writeConf("ai_base", conf.base);
writeConf("ai_key", conf.key);
writeConf("ai_model", conf.model);
```

`writeConf` 内部做两件事：`Application.App.config.SetConfig(key, val)`（当前页面立即生效）+ `localStorage.setItem("cx_ai_custom", …)`（刷新后由脚本头部恢复）。

**`自动答题` 开关**：写 `ai_enable`（`"true"` / `"false"`），关掉后 `AIEnabled()` 返回 false，答题回落到原题库逻辑。

**面板关闭**（点 x）时，`#tools-ai-bar` 会连同任务按钮一起被搬进右上角的悬浮小条，不丢失。

**`src/views/common.ts`** —— 补 `.tools-ai-bar` / `.tools-ai-form` / `input` / `select` / `.tools-ai-status` 的样式，并把面板 `max-height` 从 260px 提到 470px（多了一行 AI 栏 + 可展开的表单），日志区高度改为 200px。

**脚本头部** —— 让面板里填的值在刷新后不被默认值覆盖，见 [`src-patches/cxmooc-js-diff.md`](src-patches/cxmooc-js-diff.md)：先把默认 `config` 写进 `localStorage`，再用 `cx_ai_custom` 里保存过的值覆盖回来。

## 7. 为什么「不自动答题」：抓题时机 + 日志补显

现象：面板显示 `● 已连接`、开关也开着，但章节测验的题目一直空着，日志里也看不到「AI 答题中」。

原因有两个，都是原版流程的坑：

1. **抓题太早**。`Topic.QueryAnswer()` 一进来就 `addQuestion()`，而超星的题目是异步渲染的——页面 `readyState` 刚变成 `complete` 时 `.TiMu` 往往还没出现，于是抓到 0 道题；`answerWithAI()` 遇到空列表直接 `callback("success")`，上层当成"答完了"，静默跳过。
2. **早期日志看不到**。`PageLog` 的面板在 `window load` 之后才创建，在此之前 `Application.App.log.Info()` 只进控制台（`this.el` 还是 undefined），所以「题目搜索中」这类关键日志在面板里根本不会出现，看起来像什么都没发生。

修法：

**`src/internal/app/topic.ts`** —— `QueryAnswer()` 改成轮询等题目出现，再开始作答：

```ts
let tries = 0;
let attempt = () => {
    this.addQuestion();
    let count = this.answer.GetQuestionCount ? this.answer.GetQuestionCount() : -1;
    if (count == 0 && tries < 12) {
        tries++;
        if (tries == 1) Application.App.log.Info("页面上暂时还没有题目，等待加载...");
        setTimeout(attempt, 800);
        return;
    }
    if (count <= 0) Application.App.log.Warn("等了约 10 秒仍没在页面上找到题目，跳过这个任务点");
    this.answer.Answer((status) => { /* 原有逻辑 */ });
};
attempt();
```

**`src/internal/app/question.ts`** —— 配合加两处：

```ts
// QuestionBankFacade 接口 + ToolsQuestionBankFacade 实现
GetQuestionCount(): number { return this.question.length; }

// Answer() 开头，先打一行日志再分支
let useAI = AIEnabled();
Application.App.log.Info("开始答题：识别到 " + this.question.length + " 道题，" + (useAI ? "用 AI 作答" : "走原题库"));
if (useAI) { this.answerWithAI(callback); return; }

// answerWithAI()：空列表不再假装成功
if (list.length == 0) {
    Application.App.log.Warn("页面上没识别到题目（选择器 .TiMu 没命中），可能是题目还没加载出来或页面结构变了");
    return callback("incomplete");
}
```

**`src/internal/utils/log.ts`** —— `PageLog` 加一个待显示队列，面板出现后补刷：

```ts
protected pending: Array<Array<string>> = [];

protected buffer(text: string, color: string, background: string) {
    this.pending.push([text, color, background]);
    if (this.pending.length > 80) this.pending.shift();
}

// window load 里，this.el 赋值之后：
if (this.pending.length > 0) {
    this.pending.forEach(p => this.first(p[0], p[1], p[2]));
    this.pending = [];
}
```

结果：刷新后打开章节测验，面板上会依次出现

```
题目搜索中...
页面上暂时还没有题目，等待加载...     ← 如果题目还没渲染
开始答题：识别到 1 道题，用 AI 作答
AI 答题中（1/1）：浙江杭州西湖孤山西泠印社...
AI 答案已填写：["A"]
```

这样卡在哪一步一眼就能看出来。

### 追加修复：题目读取一崩，整条流程就静默死掉

上线后仍然不勾选，日志停在「开始答题：识别到 1 道题，用 AI 作答」，没有后面的「AI 答题中」。排查发现是**读取题目信息时抛异常**，而 `answerWithAI()` 是 async 函数，异常直接变成未处理的 Promise rejection——没有日志、没有提示，流程就停在那里。

三处会崩：

| 位置 | 原因 |
|---|---|
| `cxQuestion.options()` | `el.querySelector(".clearfix > ul,...")` 返回 null，紧接着 `null.querySelectorAll` 抛 TypeError（新版章节测验的选项在 `.Zy_ulTop` 里，不在旧选择器范围内） |
| `cxQuestion.GetTopic()` | `processor.GetTopic` 里 `el.querySelector(".Zy_TItle > .clearfix").innerHTML`，结构变了就是 null.innerHTML |
| 判断题 `Fill()` | AI 给的是 `{option: true, content: true}`（布尔），`content.trim()` 直接崩 |

对应修复：

```ts
// 1) 选项选择器补全 + 空值兜底
protected options(): NodeListOf<HTMLLIElement> {
    let tmpel = <HTMLElement>this.el.querySelector(
        ".clearfix > ul,.clearfix ul.Zy_ulBottom.clearfix,ul.Zy_ulTk,.Zy_ulTop,ul.Zy_ulTop,.Zy_ulBottom,ul.Zy_ulBottom"
    );
    if (tmpel) return tmpel.querySelectorAll("li");
    // 兜底：所有带 input/a 的 li
    ...
}

// 2) 题干读取兜底
public GetTopic(): string {
    try { let ret = this.processor.GetTopic(this.el); if (ret) return String(ret).trim(); } catch (e) {}
    let title = <HTMLElement>this.el.querySelector(".Zy_TItle,.Cy_TItle");
    return ((title ? title.innerText : this.el.innerText) || "").replace(/\s+/g, " ").trim().substring(0, 300);
}

// 3) 判断题：把 AI 的「对/错」映射成这道题自己的选项值
if (type == 3 && options.length > 0) { /* 按 对/正确/√ 与 错/错误/× 匹配 options */ }

// 4) 每题单独 try/catch，崩了只影响这一题
try { /* 读取选项、题干、问 AI、填写 */ }
catch (e) { Application.App.log.Warn("AI 答题异常（第 N 题）：" + e); }
```

另外 `getOption/getContent/click` 也都加了 null 保护（没有 `input` 时退化为取 `li` 的文字、直接 `el.click()`）。

## 构建

```bash
# 环境：Node.js（原作者用 12.x，实测 Node 18/20 可用）
npm install
npm run tampermonkey
# 产物：build/tampermonkey-cxmooc.js 等
```

然后用脚本头（`src/tampermonkey/cxmooc.js` 的 `==UserScript==` 段 + config 块）拼接 webpack 产物，去掉末尾的 `//# sourceMappingURL=` 行，即为最终的 `.user.js`。

> 注：本项目用 Node 24 构建时，webpack 4 需要设置 `NODE_OPTIONS=--openssl-legacy-provider`；另外 `devDependencies` 里的 vuepress/jest 可以删掉以加快安装。

## 只发布了超星版本

`userscript/cxmooc-tools.user.js` 只包含超星（学习通）版本。智慧树/中国大学MOOC 的构建产物未包含在本仓库，需要的话用同样方法构建 `tampermonkey-zhihuishu.js` / `tampermonkey-course163.js` 并拼上对应头部。
