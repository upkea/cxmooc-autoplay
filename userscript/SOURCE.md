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
