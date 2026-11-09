import {CssBtn} from "./utils";
import {createBtn} from "@App/internal/utils/utils";
import {Application} from "@App/internal/application";
import {
    SwitchTopicType,
    Question,
    QuestionBankFacade, QuestionStatus, QuestionStatusString
} from "@App/internal/app/question";
import {CxQuestionFactory} from "./question";
import {Topic, QueryQuestions} from "@App/internal/app/topic";
import {CxTaskControlBar, CxTask} from "@App/mooc/chaoxing/task";
import {TaskType} from "@App/internal/app/task";
import {AIEnabled} from "@App/internal/app/ai";

export class CxTopicControlBar extends CxTaskControlBar {
    public defaultBtn() {
        super.defaultBtn();
        let isAI = AIEnabled();
        // 用 AI 答题时不显示「搜索题目」（那是走原题库的入口）
        if (!isAI) {
            let topic = CssBtn(createBtn("搜索题目", "点击搜索题目答案", "cx-btn"));
            topic.style.background = "#3fae93";
            this.prev.append(topic);
            // 绑定事件
            topic.onclick = async () => {
                topic.innerText = "答案搜索中...";
                (<TopicAdapter>this.task).Start().then((ret: any) => {
                    ret = ret || "搜索题目";
                    topic.innerText = QuestionStatusString(ret);
                });
            };
        }
        // 提交按钮：答案填完后手动点它，或等自动挂机间隔到点自动提交
        let submit = CssBtn(createBtn("提交答案", "题目填完后点此提交", "cx-btn"));
        submit.style.background = "#e6a23c";
        this.prev.append(submit);
        submit.onclick = async () => {
            if (submit.innerText == "提交中...") {
                return;
            }
            submit.innerText = "提交中...";
            try {
                await (<TopicAdapter>this.task).ManualSubmit();
                submit.innerText = "已提交";
            } catch (e) {
                submit.innerText = "提交失败 重试";
                Application.App.log.Warn("手动提交失败：" + ((e && e.message) ? e.message : e));
            }
        };
    }
}

export class TopicAdapter extends CxTask {

    protected lock: boolean;
    protected topic: Topic;
    protected status: QuestionStatus;

    constructor(context: any, taskinfo: any, topic: Topic) {
        super(context, taskinfo);
        this.topic = topic;
    }

    public Init(): Promise<any> {
        return new Promise<any>(async resolve => {
            Application.App.log.Debug("题目信息", this.taskinfo);
            await this.topic.Init();
            resolve(undefined);
        });
    }

    public Start(): Promise<QuestionStatus> {
        return new Promise<QuestionStatus>(async resolve => {
            if (this.lock) {
                return resolve("processing");
            }
            this.lock = true;
            let ret = await this.topic.QueryAnswer();
            this.status = ret;
            this.callEvent("complete");
            this.lock = false;
            return resolve(ret);
        });
    }

    public Type(): TaskType {
        return "topic";
    }

    public async Submit(): Promise<void> {
        return new Promise((resolve) => {
            if (this.status == "success") {
                this.topic.Submit().then(() => {
                    resolve();
                }).catch(() => resolve());
            } else {
                resolve();
            }
        });
    }

    // 手动点「提交答案」按钮时走这里：不管状态直接提交
    public ManualSubmit(): Promise<any> {
        return Promise.resolve(this.topic.Submit());
    }

}

export class CxCourseQueryQuestion implements QueryQuestions {
    protected context: any;
    protected createQuestion: (context: any, el: HTMLElement) => Question;

    constructor(content: any, createQuestion: (context: any, el: HTMLElement) => Question) {
        this.context = content;
        this.createQuestion = createQuestion;
    }

    public QueryQuestions(): Question[] {
        let timu = <Array<HTMLElement>>this.context.document.querySelectorAll(".TiMu");
        let ret = new Array<Question>();
        timu.forEach((val) => {
            let question = this.createQuestion(this.context, val);
            if (question == null) {
                return;
            }
            ret.push(question);
        });
        return ret;
    }
}

export class CxCourseTopic extends Topic {

    constructor(content: any, answer: QuestionBankFacade) {
        super(content, answer);
        answer.CheckCourse();
    }

    public Init(): Promise<any> {
        return new Promise<any>(resolve => {
            let timer = this.context.setInterval(async () => {
                if (this.context.document.readyState == "complete") {
                    this.context.clearInterval(timer);
                    if (this.context.document.URL.indexOf("selectWorkQuestionYiPiYue") > 0) {
                        await this.CollectAnswer();
                    }
                    resolve(undefined);
                }
            }, 500);
        });
    }

    public QueryAnswer(): Promise<QuestionStatus> {
        if (this.context.document.URL.indexOf("selectWorkQuestionYiPiYue") > 0) {
            return null;
        }
        return super.QueryAnswer();
    }

    // 在测试页文档里找提交/确认按钮（新版选择器和旧版都试，再按文字兜底）
    private findBtn(doc: any, texts: RegExp): HTMLElement {
        let sels = [".Btn_blue_1", ".bluebtn", "#submitBtn", ".btnBlue", ".greenBtn", ".cy-btn", ".Zj_btn", ".submit", ".subBtn", ".mark_btn", "input[type=submit]"];
        for (let i = 0; i < sels.length; i++) {
            try {
                let el = <HTMLElement>doc.querySelector(sels[i]);
                if (el) {
                    return el;
                }
            } catch (e) {
                // ignore
            }
        }
        try {
            let nodes = doc.querySelectorAll("a,button,span,.btn,div");
            for (let i = 0; i < nodes.length; i++) {
                let el = <HTMLElement>nodes[i];
                let t = ((el.innerText || el.textContent || "") as string).trim();
                if (texts.test(t)) {
                    return el;
                }
            }
        } catch (e) {
            // ignore
        }
        return null;
    }

    public Submit(): Promise<any> {
        return new Promise<any>(resolve => {
            Application.App.log.Info("准备提交答案");
            let self = this;
            let doc = this.context.document;
            this.context.setTimeout(() => {
                try {
                    // 第一步：点「交卷 / 提交」主按钮
                    let submit = self.findBtn(doc, /^(交卷|提交|提交答案|确认|确认提交|立即提交|交作业)$/);
                    if (!submit) {
                        Application.App.log.Warn("没找到提交按钮，请手动点页面上的「提交 / 交卷」");
                        return resolve("no_submit_btn");
                    }
                    Application.App.log.Info("点击提交按钮：" + String((<any>submit).innerText || submit.tagName || ""));
                    try {
                        submit.click();
                    } catch (e) {
                        // ignore
                    }
                    // 第二步：等确认框出来，点「确定」确认提交
                    self.context.setTimeout(() => {
                        try {
                            let confirm = self.findBtn(doc, /^(确定|确认|是|提交|交卷|确认提交)$/);
                            if (confirm) {
                                confirm.click();
                                Application.App.log.Info("已点确认提交");
                            }
                            resolve(undefined);
                        } catch (e) {
                            resolve(undefined);
                        }
                    }, 2500);
                } catch (e) {
                    Application.App.log.Warn("提交失败：" + ((e && e.message) ? e.message : e));
                    resolve(undefined);
                }
            }, 2000);
        });
    }
}

export class ExamTopic extends Topic implements QueryQuestions {

    public QueryQuestions(): Question[] {
        let current = document.querySelector(".current");
        let topicType = SwitchTopicType((<HTMLElement>current.parentElement.previousElementSibling).innerText);
        let question = CxQuestionFactory.CreateExamQuestion(window, topicType, document.querySelector(".leftContent.TiMu"));
        let ret = new Array();
        if (question == null) {
            return ret;
        }
        ret.push(question);
        return ret;
    }

    public Init(): Promise<any> {
        if (document.URL.indexOf("exam/test/reVersionPaperMarkContentNew") > 0) {
            this.CollectAnswer();
        }
        return null
    }

    public Submit(): Promise<any> {
        return new Promise(resolve => {
            resolve(undefined);
        });
    }
}

export class HomeworkTopic extends CxCourseTopic {

    constructor(content: any, answer: QuestionBankFacade) {
        super(content, answer);
    }

    public Init(): Promise<any> {
        return new Promise<any>(resolve => {
            if (!(<HTMLInputElement>document.querySelector("input#workRelationId"))) {
                this.CollectAnswer();
            }
            resolve();
        });
    }

    public Submit(): Promise<any> {
        return new Promise(resolve => {
            resolve();
        });
    }
}
