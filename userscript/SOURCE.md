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
