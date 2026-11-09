import { substrex, randNumber as RandNumber, removeHTMLTag } from "@App/internal/utils/utils";
import {
    Question,
    TopicStatus,
    TopicStatusString,
    TopicType,
    SwitchTopicType,
    Option,
    Answer,
    PushAnswer
} from "@App/internal/app/question";
import { CreateNoteLine } from "./utils";

//TODO: 优化
export class CxQuestionFactory {
    public static CreateCourseQuestion(context: any, el: HTMLElement): Question {
        let ret = SwitchTopicType(substrex(el.innerText, '【', '】'));
        return this.CreateCourseQuestionByTopicType(context, ret, el);
    }

    public static CreateExamQuestion(context: any, type: TopicType, el: HTMLElement): Question {
        let processor = new ExamQuestionProcessor();
        let ret: Question = null;
        this.RemoveNotice(el);
        switch (type) {
            case 1:
            case 2: {
                ret = new cxExamSelectQuestion(context, el, type, processor);
                break;
            }
            case 3: {
                ret = new cxExamJudgeQuestion(context, el, type, processor);
                break;
            }
            case 4: {
                ret = new cxExamFillQuestion(context, el, type, processor);
                break;
            }
            default: {
                this.AddNotice(el, "不支持的类型");
                return null
            }
        }
        return ret;
    }

    public static CreateCourseQuestionByTopicType(context: any, type: TopicType, el: HTMLElement): Question {
        let ret: Question = null;
        let processor = new CourseQuestionProcessor();
        this.RemoveNotice(el);
        switch (type) {
            case 1:
            case 2: {
                ret = new cxSelectQuestion(context, el, type, processor);
                break;
            }
            case 3: {
                ret = new cxJudgeQuestion(context, el, type, processor);
                break;
            }
            case 4: {
                ret = new cxFillQuestion(context, el, type, processor);
                break;
            }
            default: {
                this.AddNotice(el, "不支持的类型");
                return null
            }
        }
        return ret;
    }

    protected static getBeforeType(el: HTMLElement): HTMLElement {
        let before = el.previousElementSibling;
        do {
            if (before.className == "Cy_TItle1") {
                return <HTMLElement>before;
            }
            before = before.previousElementSibling;
        } while (before != null)
        return null;
    }

    public static CreateHomeWorkQuestion(context: any, el: HTMLElement): Question {
        let ret = CxQuestionFactory.getBeforeType(el);
        return this.CreateCourseQuestionByTopicType(context, SwitchTopicType(substrex(ret.innerText, ".", "（")), el);
    }

    //TODO:写的什么玩意啊
    public static CreateExamCollectQuestion(context: any, el: HTMLElement): Question {
        let ret = CxQuestionFactory.getBeforeType(el.parentElement);
        let txt = ret.innerText.match(/、(.*?)[\s|（]/)[1];
        return this.CreateExamQuestionByTopicType(context, SwitchTopicType(txt), el);
    }

    public static CreateExamQuestionByTopicType(context: any, type: TopicType, el: HTMLElement): Question {
        let ret: Question = null;
        let processor = new CourseQuestionProcessor();
        this.RemoveNotice(el);
        switch (type) {
            case 1:
            case 2: {
                ret = new cxSelectQuestion(context, el, type, processor);
                break;
            }
            case 3: {
                ret = new cxJudgeQuestion(context, el, type, processor);
                break;
            }
            case 4: {
                ret = new cxExamFillQuestion(context, el, type, processor);
                break;
            }
            default: {
                this.AddNotice(el, "不支持的类型");
                return null
            }
        }
        return ret;
    }

    public static RemoveNotice(el: HTMLElement) {
        let tmpel = <HTMLElement>el.querySelector(".clearfix > ul,.clearfix > .Py_tk,.Zy_ulTk");
        if (tmpel == undefined) {
            tmpel = el;
        }
        tmpel.querySelectorAll(".prompt-line-answer").forEach((v) => {
            v.remove()
        });
    }

    public static AddNotice(el: HTMLElement, str: string) {
        let tmpel = <HTMLElement>el.querySelector(".clearfix > ul,.clearfix > .Py_tk,.Zy_ulTk");
        if (tmpel == undefined) {
            tmpel = el;
        }
        CreateNoteLine(str, "answer", tmpel);
    }
}

//TODO: 优化
export interface QuestionProcessor {
    GetTopic(el: HTMLElement): string
}

class CourseQuestionProcessor implements QuestionProcessor {
    public GetTopic(el: HTMLElement): string {
        let ret = el.querySelector(".Zy_TItle > .clearfix,.Cy_TItle > .clearfix").innerHTML;
        ret = ret.substring(ret.indexOf('】') + 1);
        if (/（(.+?)分）($|\s)/.test(ret)) {
            ret = ret.substring(0, ret.lastIndexOf("（"));
        }
        return ret;
    }
}

class ExamQuestionProcessor implements QuestionProcessor {
    public GetTopic(el: HTMLElement): string {
        let ret = el.querySelector(".Cy_TItle.clearfix .clearfix").innerHTML;
        ret = ret.substr(0, ret.lastIndexOf('分）'));
        ret = ret.substr(0, ret.lastIndexOf('（'));
        return ret;
    }
}

abstract class cxQuestion implements Question {

    protected el: HTMLElement;
    protected type: TopicType;
    protected processor: QuestionProcessor;
    protected context: Window;

    constructor(context: Window, el: HTMLElement, type: TopicType, processor: QuestionProcessor) {
        this.context = context;
        this.el = el;
        this.type = type;
        this.processor = processor;
    }

    public abstract Random(): TopicStatus;

    public abstract Correct(): Answer;

    public abstract Fill(answer: Answer): Promise<TopicStatus>;

    public SetStatus(status: TopicStatus) {
        this.AddNotice(TopicStatusString(status));
    }

    public GetTopic(): string {
        try {
            let ret = this.processor.GetTopic(this.el);
            if (ret != undefined && ret != null && String(ret).trim() != "") {
                return String(ret).trim();
            }
        } catch (e) {
            // 页面结构变了，走下面的兜底
        }
        // 兜底：直接取题干区域的文字
        try {
            let title = <HTMLElement>this.el.querySelector(".Zy_TItle,.Cy_TItle");
            let text = (title ? title.innerText : this.el.innerText) || "";
            text = text.replace(/[\r\n\t]+/g, " ").replace(/\s{2,}/g, " ").trim();
            return text.substring(0, 300);
        } catch (e) {
            return "";
        }
    }

    public RemoveNotice() {
        CxQuestionFactory.RemoveNotice(this.el);
    }

    public AddNotice(str: string) {
        CxQuestionFactory.AddNotice(this.el, str);
    }

    public GetType(): TopicType {
        return this.type;
    }

    protected options(): NodeListOf<HTMLLIElement> {
        let tmpel = <HTMLElement>this.el.querySelector(
            ".clearfix > ul,.clearfix ul.Zy_ulBottom.clearfix,ul.Zy_ulTk,.Zy_ulTop,ul.Zy_ulTop,.Zy_ulBottom,ul.Zy_ulBottom"
        );
        if (tmpel) {
            return tmpel.querySelectorAll("li");
        }
        // 兜底：题目元素下所有带输入框的 li
        let all = <NodeListOf<HTMLLIElement>>this.el.querySelectorAll("li");
        let ret = new Array<HTMLLIElement>();
        for (let i = 0; i < all.length; i++) {
            if (all[i].querySelector("input,a")) {
                ret.push(all[i]);
            }
        }
        if (ret.length > 0) {
            return <any>ret;
        }
        return all;
    }

    protected isCorrect(): Element {
        let el = this.el.querySelector(".Py_answer.clearfix,.Py_tk");
        if (el) {
            if (el.querySelectorAll('.fr.dui').length > 0 || el.querySelectorAll('.fr.bandui').length > 0) {
                return el;
            } else if (el.innerHTML.indexOf('正确答案') >= 0) {
                return el;
            }
        }
        let topic = this.el.querySelector(".Cy_TItle.clearfix")
        if (!topic) {
            return null;
        }
        let fs = topic.querySelector(".font18.fb");
        if (fs && fs.innerHTML != "0.0") {
            return el;
        }
        return null;
    }

    protected defaultAnswer(): Answer {
        let ret = new PushAnswer();
        ret.topic = this.GetTopic();
        ret.type = this.GetType();
        ret.correct = new Array();
        ret.answers = new Array();
        return ret;
    }
}

class cxSelectQuestion extends cxQuestion implements Question {

    protected getContent(el: HTMLElement): string {
        let ret = el.querySelector("a");
        if (ret == null) {
            let tmpel = <HTMLInputElement>el.querySelector("label > input,input");
            if (tmpel == null) {
                // 没有 input 也没有 a：直接把 li 的文字当选项内容
                return (el.innerText || "").replace(/^\s*[A-Ha-h]\s*[.、]?\s*/, "").trim();
            }
            if (tmpel.value == "true") {
                return "对√";
            }
            return "错×";
        }
        return ret.innerHTML;
    }

    protected getOption(el: HTMLElement): string {
        let ipt = <HTMLInputElement>el.querySelector("input");
        if (ipt == null) {
            let txt = (el.innerText || "").trim();
            let m = txt.match(/^([A-Ha-h])\s*[.、:：)）]?/);
            if (m) {
                return m[1].toUpperCase();
            }
            return txt.substring(0, 20);
        }
        return ipt.value;
    }

    public GetOptions(): Option[] {
        const res = new Array<Option>();
        const opts = this.options();
        for (let i = 0; i < opts.length; i++) {
            res.push({option: this.getOption(opts[i]), content: this.getContent(opts[i])});
        }
        return res;
    }

    protected click(el: HTMLElement, content: string) {
        if (!el) {
            return;
        }
        let ipt = <HTMLInputElement>el.querySelector("label > input,input");
        if (ipt) {
            try {
                if (!ipt.checked) {
                    ipt.click();
                }
            } catch (e) {
                // 页面脚本可能抛错，忽略
            }
            if (!ipt.checked) {
                // 有些页面 input 是隐藏的，真正生效的是外层 label / li
                try {
                    let label = <HTMLElement>el.querySelector("label");
                    if (label) {
                        label.click();
                    }
                } catch (e) {
                    // ignore
                }
            }
            if (!ipt.checked) {
                try {
                    el.click();
                } catch (e) {
                    // ignore
                }
            }
            if (!ipt.checked) {
                // 最后兜底：直接改 checked 再派发事件
                try {
                    ipt.checked = true;
                    ipt.dispatchEvent(new Event("change", {bubbles: true}));
                    ipt.dispatchEvent(new Event("click", {bubbles: true}));
                } catch (e) {
                    // ignore
                }
            }
        } else {
            try {
                el.click();
            } catch (e) {
                // ignore
            }
        }
        try {
            this.AddNotice(this.getOption(el) + ":" + content);
        } catch (e) {
            // ignore
        }
    }

    public Random(): TopicStatus {
        let options = this.options();
        let pos = RandNumber(0, options.length - 1);
        this.click(options[pos], this.getContent(options[pos]));
        return "random";
    }

    public Fill(s: Answer): Promise<TopicStatus> {
        return new Promise(resolve => {
            try {
                let options = this.options();
                if (!options || options.length == 0) {
                    try {
                        this.AddNotice("没有找到选项");
                    } catch (e) {
                        // ignore
                    }
                    return resolve("no_match");
                }
                let flag = false;
                for (let i = 0; i < s.correct.length; i++) {
                    let target = s.correct[i];
                    if (!target) {
                        continue;
                    }
                    let targetOpt = String(target.option == undefined ? "" : target.option).trim();
                    let targetContent = String(target.content == undefined ? "" : target.content).trim();
                    let hit = -1;
                    // 1) 按选项自带的 value 匹配（A/B/C/D 或 true/false）
                    for (let j = 0; j < options.length; j++) {
                        let val = String(this.getOption(options[j]) || "").trim();
                        if (targetOpt != "" && val.toLowerCase() == targetOpt.toLowerCase()) {
                            hit = j;
                            break;
                        }
                    }
                    // 2) 按选项文字匹配
                    if (hit < 0 && targetContent != "") {
                        for (let j = 0; j < options.length; j++) {
                            if (s.Equal(this.getContent(options[j]), targetContent)) {
                                hit = j;
                                break;
                            }
                        }
                    }
                    // 3) 兜底：字母按顺序（A->第1个，D->第4个）
                    if (hit < 0 && /^[A-Ha-h]$/.test(targetOpt)) {
                        let idx = targetOpt.toUpperCase().charCodeAt(0) - 65;
                        if (idx >= 0 && idx < options.length) {
                            hit = idx;
                        }
                    }
                    if (hit >= 0) {
                        this.click(options[hit], targetContent);
                        flag = true;
                    }
                }
                return resolve(flag ? "ok" : "no_match");
            } catch (e) {
                return resolve("no_match");
            }
        });
    }

    public Correct(): Answer {
        let correct = this.isCorrect();
        if (correct == null) {
            return null;
        }
        let ret = this.defaultAnswer();
        let options = this.el.querySelectorAll(".Zy_ulTop > li.clearfix,.Cy_ulTop li");
        let correctText = correct.querySelector("span").innerText;
        for (let i = 0; i < options.length; i++) {
            let optionText = (<HTMLElement>options[i].querySelector("i.fl")).innerText;
            let option = {
                option: optionText.substring(0, 1),
                content: options[i].querySelector("a.fl,a").innerHTML,
            };
            ret.answers.push(option);
            if (correctText.indexOf(option.option) > 0) {
                ret.correct.push(option);
            }
        }
        return ret;
    }

}

class cxJudgeQuestion extends cxSelectQuestion implements Question {

    protected getContent(el: HTMLElement): string {
        let tmpel = <HTMLInputElement>el.querySelector("label > input,input");
        if (tmpel == null) {
            return (el.innerText || "").trim();
        }
        if (tmpel.value == "true") {
            return "对√";
        }
        return "错×";
    }

    protected click(el: HTMLElement) {
        if (!el) {
            return;
        }
        try {
            let tmpel = <HTMLInputElement>el.querySelector("label > input,input");
            if (tmpel) {
                if (!tmpel.checked) {
                    tmpel.click();
                }
            } else {
                el.click();
            }
        } catch (e) {
            // 页面自己的脚本可能在这里抛错，忽略它，别让整题失败
        }
        try {
            this.AddNotice(this.getContent(el));
        } catch (e) {
            // ignore
        }
    }

    public Random(): TopicStatus {
        let options = this.options();
        let pos = RandNumber(0, 1);
        this.click(options[pos]);
        return "random";
    }

    public Fill(answer: Answer): Promise<TopicStatus> {
        return new Promise<TopicStatus>(resolve => {
            try {
                let options = this.options();
                if (!options || options.length == 0) {
                    return resolve("no_match");
                }
                // 判断 AI（或题库）要的是「对」还是「错」
                let wantTrue: boolean = null;
                let c: any = answer.correct && answer.correct[0];
                if (c) {
                    if (typeof c.content == "boolean") {
                        wantTrue = c.content;
                    } else if (typeof c.option == "boolean") {
                        wantTrue = c.option;
                    } else {
                        let txt = String(c.content || "") + " " + String(c.option || "");
                        if (/对|正确|√|✓|TRUE/i.test(txt)) {
                            wantTrue = true;
                        } else if (/错|错误|×|✗|FALSE/i.test(txt)) {
                            wantTrue = false;
                        }
                    }
                }
                let match = -1;
                for (let j = 0; j < options.length; j++) {
                    let val = String(this.getOption(options[j]) || "").toLowerCase();
                    let content = this.getContent(options[j]) || "";
                    let isTrue = val == "true" || val == "1" || /对|正确|√/.test(content);
                    let isFalse = val == "false" || val == "0" || /错|错误|×/.test(content);
                    if (wantTrue === true && isTrue) {
                        match = j;
                        break;
                    }
                    if (wantTrue === false && isFalse) {
                        match = j;
                        break;
                    }
                }
                if (match < 0) {
                    match = wantTrue === false ? 1 : 0;
                }
                if (match > options.length - 1) {
                    match = options.length - 1;
                }
                this.click(options[match]);
                return resolve("ok");
            } catch (e) {
                return resolve("no_match");
            }
        })
    }

    public Correct(): Answer {
        let el = this.el.querySelector(".Py_answer.clearfix");
        let ret = this.defaultAnswer();
        let score = this.el.querySelector(".Cy_TItle.clearfix .font18.fb");
        if (el.innerHTML.indexOf('正确答案') !== -1 || (score && score.querySelector(".Cy_TItle.clearfix .font18.fb").innerHTML != "0.0")) {
            let correctText = el.querySelector("span").innerText;
            if (correctText.indexOf('×') !== -1) {
                ret.correct.push({ option: false, content: false });
            } else {
                ret.correct.push({ option: true, content: true });
            }
            return ret;
        }
        if (!el.querySelectorAll('.fr.dui').length && !el.querySelectorAll('.fr.cuo').length) {
            return null;
        }
        let correctText = el.querySelector("span").innerText;
        if (el.querySelectorAll('.fr.dui').length) {
            if (correctText.indexOf('×') !== -1) {
                ret.correct.push({ option: false, content: false });
            } else {
                ret.correct.push({ option: true, content: true });
            }
        } else {
            if (correctText.indexOf('×') !== -1) {
                ret.correct.push({ option: true, content: true });
            } else {
                ret.correct.push({ option: false, content: false });
            }
        }
        return ret;
    }
}

class cxFillQuestion extends cxQuestion implements Question {

    protected getOption(el: HTMLElement): string {
        if (el.className == "XztiHover1") {
            return substrex(el.previousElementSibling.innerHTML, "第", "空");
        }
        let tmpel = el.querySelector("span.fb");
        return substrex(tmpel.innerHTML, "第", "空");
    }

    public GetOptions(): Option[] {
        const res = new Array<Option>();
        let opts: any = this.options();
        if (!opts || opts.length == 0) {
            const box = this.el.querySelector(".Zy_ulTk");
            if (box) {
                opts = box.querySelectorAll(".XztiHover1");
            }
        }
        if (opts) {
            for (let i = 0; i < opts.length; i++) {
                res.push({option: this.getOption(opts[i]), content: ""});
            }
        }
        return res;
    }

    public Random(): TopicStatus {
        return "no_support_random";
    }

    public Correct(): Answer {
        let correct = this.isCorrect();
        if (correct == null) {
            return null;
        }
        let ret = this.defaultAnswer();
        let options = this.el.querySelectorAll(".Py_tk span.font14");
        let isMy = false;
        if (options.length <= 0) {
            isMy = true;
            options = this.el.querySelectorAll(".Py_answer.clearfix .font14");
        }
        for (let i = 0; i < options.length; i++) {
            if (isMy && options[i].querySelectorAll(".fr.dui").length <= 0) {
                continue;
            }
            let optionEl = options[i].querySelector("i.fl");
            let option = {
                option: substrex(optionEl.innerHTML, "第", "空"),
                content: (<HTMLElement>options[i].querySelector(".clearfix")).innerText,
            };
            ret.correct.push(option);
        }
        return ret;
    }

    public Fill(answer: Answer): Promise<TopicStatus> {
        return new Promise<TopicStatus>(resolve => {
            let options = this.options();
            if (!options.length) {
                options = this.el.querySelector('.Zy_ulTk').querySelectorAll(".XztiHover1");
            }
            let flag = 0;
            for (let i = 0; i < answer.correct.length; i++) {
                for (let j = 0; j < options.length; j++) {
                    if (this.getOption(options[j]) == answer.correct[i].option) {
                        flag++;
                        let el = <HTMLInputElement>options[j].querySelector("input.inp");
                        if (!el) {
                            let uedit = (<any>this.context).$(options[j]).find('textarea');
                            if (uedit.length <= 0) {
                                this.AddNotice(this.getOption(options[j]) + "空发生了一个错误");
                                continue;
                            }
                            (<any>this.context).UE.getEditor(uedit.attr('name')).setContent(answer.correct[i].content);
                            this.AddNotice(this.getOption(options[j]) + ":" + answer.correct[i].content);
                        } else {
                            el.value = removeHTMLTag(answer.correct[i].content);
                            this.AddNotice(this.getOption(options[j]) + ":" + answer.correct[i].content);
                        }
                    }
                }
            }
            if (flag == options.length) {
                return resolve("ok");
            }
            return resolve("no_match");
        });
    }

}

//TODO: 优化
class cxExamSelectQuestion extends cxSelectQuestion {

    protected options(): NodeListOf<HTMLLIElement> {
        return this.el.querySelectorAll(".Cy_ulBottom.clearfix.w-buttom li input");
    }

    protected getContent(el: HTMLElement): string {
        let textOption = this.el.querySelectorAll(".Cy_ulTop.w-top li div.clearfix a");
        let tmpli = el.parentElement.parentElement;
        let pos = -1;
        do {
            tmpli = <HTMLElement>tmpli.previousElementSibling;
            pos++;
        } while (tmpli != null);
        return textOption[pos].innerHTML;
    }

    protected getOption(el: HTMLElement): string {
        return el.parentElement.innerText;
    }

    protected click(el: HTMLElement, content: string) {
        el.click();
        this.AddNotice(this.getOption(el) + ":" + content);
    }
}

class cxExamFillQuestion extends cxFillQuestion {

    protected options(): NodeListOf<HTMLLIElement> {
        return this.el.querySelectorAll(".Cy_ulTk .XztiHover1");
    }

    protected getOption(el: HTMLElement): string {
        let tmpel = el.querySelector(".fb.font14");
        return substrex(tmpel.innerHTML, "第", "空");
    }

    public Fill(answer: Answer): Promise<TopicStatus> {
        return new Promise<TopicStatus>(resolve => {
            let options = this.options();
            let flag = 0;
            for (let i = 0; i < answer.correct.length; i++) {
                for (let j = 0; j < options.length; j++) {
                    if (this.getOption(options[j]) == answer.correct[i].option) {
                        flag++;
                        let uedit = (<any>window).$(options[j]).find('textarea');
                        if (uedit.length <= 0) {
                            this.AddNotice(this.getOption(options[j]) + "空发生了一个错误");
                            continue;
                        }
                        (<any>window).UE.getEditor(uedit.attr('name')).setContent(answer.correct[i].content);
                        this.AddNotice(this.getOption(options[j]) + ":" + answer.correct[i].content);
                    }
                }
            }
            if (flag == options.length) {
                return resolve("ok");
            }
            return resolve("no_match");
        });
    }

    public Correct(): Answer {
        let correct = this.isCorrect();
        if (correct == null) {
            return null;
        }
        let ret = this.defaultAnswer();
        let options = this.el.querySelectorAll(".Py_tk div[id] span.font14");
        let isMy = false;
        if (options.length <= 0) {
            isMy = true;
            options = this.el.querySelectorAll(".Py_answer.clearfix .font14");
        }
        for (let i = 0; i < options.length; i++) {
            if (isMy && options[i].querySelectorAll(".fr.dui").length <= 0) {
                continue;
            }
            let optionEl = options[i].querySelector("i");
            let option = {
                option: substrex(optionEl.innerHTML, "第", "空"),
                content: options[i].innerHTML.substr(options[i].innerHTML.indexOf("</i>") + 4),
            };
            ret.correct.push(option);
        }
        return ret;
    }

}

class cxExamJudgeQuestion extends cxJudgeQuestion {

    protected options(): NodeListOf<HTMLLIElement> {
        return this.el.querySelectorAll(".Cy_ulBottom.clearfix li");
    }

}