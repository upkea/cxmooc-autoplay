import {CssBtn} from "./utils";
import {createBtn} from "@App/internal/utils/utils";
import {Application} from "@App/internal/application";
import {
    SwitchTopicType,
    GuessTopicType,
    Question,
    QuestionBankFacade, QuestionStatus, QuestionStatusString
} from "@App/internal/app/question";
import {CxQuestionFactory} from "./question";
import {Topic, QueryQuestions} from "@App/internal/app/topic";
import {CxTaskControlBar, CxTask} from "@App/mooc/chaoxing/task";
import {TaskType} from "@App/internal/app/task";
import {AIEnabled} from "@App/internal/app/ai";
import {DecodeChaoxingFont} from "./font-decode";

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
                // 手动提交完成后，立即切到下一个任务点（跳过挂机间隔等待）
                setTimeout(() => {
                    try {
                        let w: any = window;
                        let fn: any = null;
                        for (let i = 0; i < 6; i++) {
                            if (w && typeof w.__cxAdvanceNow == "function") {
                                fn = w.__cxAdvanceNow;
                                break;
                            }
                            if (!w || w === w.parent) {
                                break;
                            }
                            w = w.parent;
                        }
                        if (fn) {
                            fn();
                        }
                    } catch (e) {
                        // ignore
                    }
                }, 1200);
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

    public async QueryAnswer(): Promise<QuestionStatus> {
        if (this.context.document.URL.indexOf("selectWorkQuestionYiPiYue") > 0) {
            return null;
        }
        // 学习通有些题目用字体加密，先解密再抓题
        try {
            await DecodeChaoxingFont(this.context);
        } catch (e) {
            // ignore
        }
        return super.QueryAnswer();
    }

    // 元素是否真的看得见（iframe 内也能判断）
    private isVisible(el: HTMLElement): boolean {
        try {
            if (!el) {
                return false;
            }
            let r = el.getBoundingClientRect();
            if (r.width > 0 && r.height > 0) {
                return true;
            }
            return el.offsetParent != null;
        } catch (e) {
            return false;
        }
    }

    // 找页面上的「提交」按钮：先按可见文字精确匹配，再退回旧选择器
    private findSubmitBtn(doc: any): HTMLElement {
        let want = /^(提交|交卷|提交答案|立即提交|提交作业|交卷并查看结果)$/;
        let fallback: HTMLElement = null;
        try {
            let nodes = doc.querySelectorAll("button,a,span,div,input[type=submit]");
            for (let i = 0; i < nodes.length; i++) {
                let el = <HTMLElement>nodes[i];
                let t = ((el.innerText || (<any>el).value || el.textContent || "") as string).trim();
                if (!t || !want.test(t)) {
                    continue;
                }
                if (!this.isVisible(el)) {
                    continue;
                }
                let tag = (el.tagName || "").toUpperCase();
                if (tag == "BUTTON" || (<any>el).type == "submit") {
                    return el;
                }
                if (!fallback) {
                    fallback = el;
                }
            }
        } catch (e) {
            // ignore
        }
        if (fallback) {
            return fallback;
        }
        // 旧版选择器兜底：排除「知道了/取消/关闭」这类别的按钮
        let sels = [".Btn_blue_1", ".bluebtn", "#submitBtn", ".btnBlue", ".greenBtn"];
        for (let i = 0; i < sels.length; i++) {
            try {
                let el = <HTMLElement>doc.querySelector(sels[i]);
                if (el && this.isVisible(el)) {
                    let t = ((el.innerText || "") as string).trim();
                    if (!/^(知道了|取消|关闭|返回|×)$/.test(t)) {
                        return el;
                    }
                }
            } catch (e) {
                // ignore
            }
        }
        return null;
    }

    // 收集所有能访问的同源 document（当前 iframe → 父帧 → 顶层）
    // 超星的「确认提交？」弹窗有时不在题目 iframe 里，而是挂在父帧/顶层文档上
    private collectDocs(): any[] {
        let docs: any[] = [];
        let win: any = this.context;
        for (let i = 0; i < 5 && win; i++) {
            try {
                if (win.document && docs.indexOf(win.document) < 0) {
                    docs.push(win.document);
                }
            } catch (e) {
                // ignore
            }
            let p: any = null;
            try {
                p = win.parent;
            } catch (e) {
                p = null;
            }
            if (!p || p == win) {
                break;
            }
            win = p;
        }
        try {
            if (docs.indexOf(document) < 0) {
                docs.push(document);
            }
        } catch (e) {
            // ignore
        }
        return docs;
    }

    // 在单个 document 里找「确认提交？」弹窗，并返回弹窗里的确认按钮
    private findConfirmInDoc(doc: any): HTMLElement {
        if (!doc) {
            return null;
        }
        let wantBtn = /^(提交|确定|确认|确认提交|是)$/;
        // 1) 找出「可见 + 含确认字样 + 内含候选按钮」的弹窗容器，取最内层那个
        let dialog: HTMLElement = null;
        try {
            let nodes = doc.querySelectorAll("div,section,form");
            for (let i = 0; i < nodes.length; i++) {
                let el = <HTMLElement>nodes[i];
                if (!this.isVisible(el)) {
                    continue;
                }
                let t = (el.innerText || "") as string;
                if (t.indexOf("确认提交") < 0 && t.indexOf("确认") < 0) {
                    continue;
                }
                let hasBtn = false;
                let inner = el.querySelectorAll("button,a,span,div");
                for (let j = 0; j < inner.length; j++) {
                    let b = <HTMLElement>inner[j];
                    let bt = ((b.innerText || b.textContent || "") as string).trim();
                    if (wantBtn.test(bt) && bt.indexOf("取消") < 0 && this.isVisible(b)) {
                        hasBtn = true;
                        break;
                    }
                }
                if (!hasBtn) {
                    continue;
                }
                if (!dialog || el.getElementsByTagName("*").length < dialog.getElementsByTagName("*").length) {
                    dialog = el;
                }
            }
        } catch (e) {
            // ignore
        }
        if (!dialog) {
            return null;
        }
        // 2) 在弹窗内找按钮（优先 button 元素）
        let fallback: HTMLElement = null;
        try {
            let nodes = dialog.querySelectorAll("button,a,span,div");
            for (let i = 0; i < nodes.length; i++) {
                let el = <HTMLElement>nodes[i];
                let t = ((el.innerText || el.textContent || "") as string).trim();
                if (!wantBtn.test(t) || t.indexOf("取消") >= 0) {
                    continue;
                }
                if (!this.isVisible(el)) {
                    continue;
                }
                if ((el.tagName || "").toUpperCase() == "BUTTON") {
                    return el;
                }
                fallback = el;
            }
        } catch (e) {
            // ignore
        }
        return fallback;
    }

    // 跨 document 找确认按钮
    private findConfirmBtn(doc: any): HTMLElement {
        let docs = this.collectDocs();
        if (doc && docs.indexOf(doc) < 0) {
            docs.unshift(doc);
        }
        for (let i = 0; i < docs.length; i++) {
            try {
                let el = this.findConfirmInDoc(docs[i]);
                if (el) {
                    Application.App.log.Info("确认弹窗在 frame #" + i + " 里");
                    return el;
                }
            } catch (e) {
                // ignore
            }
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
                    let submit = self.findSubmitBtn(doc);
                    if (!submit) {
                        Application.App.log.Warn("没找到提交按钮，请手动点页面下方的「提交」");
                        return resolve("no_submit_btn");
                    }
                    Application.App.log.Info("点击提交按钮：" + String((<any>submit).innerText || submit.tagName || ""));
                    try {
                        submit.click();
                    } catch (e) {
                        // ignore
                    }
                    // 等确认弹窗，最多轮询 10 次（每次 800ms，约 8 秒）
                    let tries = 0;
                    let clickConfirm = () => {
                        tries++;
                        let confirm = self.findConfirmBtn(doc);
                        if (confirm) {
                            Application.App.log.Info("点击确认按钮：" + String((<any>confirm).innerText || ""));
                            try {
                                confirm.click();
                            } catch (e) {
                                // ignore
                            }
                            // 再等一下，看有没有二次确认
                            self.context.setTimeout(() => {
                                let again = self.findConfirmBtn(doc);
                                if (again && again != confirm) {
                                    try {
                                        again.click();
                                    } catch (e) {
                                        // ignore
                                    }
                                    Application.App.log.Info("点击二次确认：" + String((<any>again).innerText || ""));
                                }
                                resolve(undefined);
                            }, 1500);
                            return;
                        }
                        if (tries < 10) {
                            self.context.setTimeout(clickConfirm, 800);
                            return;
                        }
                        Application.App.log.Warn("等了约 8 秒没找到确认弹窗，可能已直接提交完成；若没提交请手动点一下");
                        resolve(undefined);
                    };
                    self.context.setTimeout(clickConfirm, 800);
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
        let titleEl = <HTMLElement>(current && current.parentElement && current.parentElement.previousElementSibling);
        let topicType = titleEl ? SwitchTopicType(titleEl.innerText) : null;
        let tEl = <HTMLElement>document.querySelector(".leftContent.TiMu");
        if (topicType == null && tEl) {
            topicType = GuessTopicType(tEl);
        }
        let question = CxQuestionFactory.CreateExamQuestion(window, topicType, tEl);
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
