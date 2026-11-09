# question.ts 改动片段

## 1. 顶部 import

`	s
import {AIEnabled, AskAI} from "./ai";
`

## 2. Question 接口

`	s
export interface Question extends Options {
    GetType(): TopicType;

    GetTopic(): string;

    GetOptions?(): Option[];

    SetStatus(status: TopicStatus): void;
}
`

## 3. Answer() 开头分支

`	s
public Answer(callback: (status: QuestionStatus) => void) {
    // 配置了 AI 就直接走 AI 答题，不再请求题库
    if (AIEnabled()) {
        this.answerWithAI(callback);
        return;
    }

    let topic = new Array<Topic>();
    // ... 原有逻辑不变
}
`

## 4. 新增 answerWithAI 方法（插在 randAnswer 之前）

``ts
    // 用 AI 逐题作答（不经过题库）
    protected async answerWithAI(callback: (status: QuestionStatus) => void) {
        const list = new Array<Question>();
        for (let i = 0; i < this.question.length; i++) {
            if (this.question[i].GetType() == -1) {
                continue;
            }
            list.push(this.question[i]);
        }
        if (list.length == 0) {
            return callback("success");
        }

        let status: QuestionStatus = "success";
        const interval = Application.App.config.topic_interval * 1000;
        for (let i = 0; i < list.length; i++) {
            const q = list[i];
            const type = q.GetType();
            const options = q.GetOptions ? q.GetOptions() : [];
            const title = q.GetTopic();
            Application.App.log.Info("AI 答题中（" + (i + 1) + "/" + list.length + "）：" + title.substring(0, 40));

            const ret = await AskAI(title, type, options);
            if (!ret.ok || !ret.correct || ret.correct.length == 0) {
                Application.App.log.Warn("AI 没给出答案：" + (ret.error || "无法解析"));
                status = this.randAnswer(status, "no_answer", q);
                if (i < list.length - 1) {
                    await Sleep(interval);
                }
                continue;
            }

            const answer: Answer = {
                index: i,
                topic: title,
                type: type,
                status: "ok",
                answers: options,
                correct: ret.correct,
                Equal: (content1: string, content2: string) => removeHTML(content1) == removeHTML(content2),
            };

            const tmp = await q.Fill(answer);
            if (tmp == "ok") {
                q.SetStatus("ok");
                Application.App.log.Info("AI 答案已填写：" + JSON.stringify(ret.correct.map(v => v.option)));
            } else {
                status = this.randAnswer(status, tmp, q);
            }
            if (i < list.length - 1) {
                await Sleep(interval);
            }
        }
        return callback(status);
    }
``
