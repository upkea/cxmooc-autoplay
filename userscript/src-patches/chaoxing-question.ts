import { substrex, randNumber as RandNumber, removeHTMLTag } from "@App/internal/utils/utils";
import {
    Question,
    TopicStatus,
    TopicStatusString,
    TopicType,
    SwitchTopicType,
    GuessTopicType,
    Option,
    Answer,
    PushAnswer
} from "@App/internal/app/question";
import { CreateNoteLine } from "./utils";

// 只收集"看得见"的文字节点：跳过 display:none / visibility:hidden / 透明 / 字号为 0 的元素。
// 超星部分页面会在题目里混入隐藏的混淆文字，直接 innerText 会拿到乱码。
function visibleText(root: Node): string {
    let out = "";
    let walk = (node: Node, depth: number) => {
        if (!node || depth > 14) {
            return;
        }
        if (node.nodeType == 3) {
            out += (node as Text).nodeValue || "";
            return;
        }
        if (node.nodeType != 1) {
            return;
        }
        let e = <HTMLElement>node;
        try {
            if (e.tagName == "SCRIPT" || e.tagName == "STYLE" || e.tagName == "IMG" || e.tagName == "SVG") {
                return;
            }
            let st = window.getComputedStyle(e);
            if (st.display == "none" || st.visibility == "hidden") {
                return;
            }
            if (parseFloat(st.opacity || "1") < 0.05) {
                return;
            }
            let fs = parseFloat(st.fontSize || "14");
            if (fs > 0 && fs < 1) {
                return;
            }
        } catch (err) {
            // ignore
        }
        let kids = e.childNodes;
        for (let i = 0; i < kids.length; i++) {
            walk(kids[i], depth + 1);
        }
    };
    walk(root, 0);
    return out;
}

//TODO: 优化
export class CxQuestionFactory {
    public static CreateCourseQuestion(context: any, el: HTMLElement): Question {
        let type = SwitchTopicType(substrex(el.innerText, '【', '】'));
        if (type == null) {
            type = GuessTopicType(el);
        }
        if (type == null) {
            this.AddNotice(el, "不支持的类型");
            return null;
        }
        return this.CreateCourseQuestionByTopicType(context, type, el);
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
        let before = CxQuestionFactory.getBeforeType(el);
        let type = before ? SwitchTopicType(substrex(before.innerText, ".", "（")) : null;
        if (type == null) {
            type = SwitchTopicType(substrex(el.innerText, '【', '】'));
        }
        if (type == null) {
            type = GuessTopicType(el);
        }
        if (type == null) {
            this.AddNotice(el, "不支持的类型");
            return null;
        }
        return this.CreateCourseQuestionByTopicType(context, type, el);
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

    // 供「视觉读题」截图用
    public GetElement(): HTMLElement {
        return this.el;
    }

    public abstract Random(): TopicStatus;

    public abstract Correct(): Answer;

    public abstract Fill(answer: Answer): Promise<TopicStatus>;

    public SetStatus(status: TopicStatus) {
        this.AddNotice(TopicStatusString(status));
    }

    public GetTopic(): string {
        // 优先取"看得见"的文字：超星某些页面会在 DOM 里塞隐藏的混淆文本，
        // 直接读 innerText/innerHTML 会拿到乱的（或夹着假字）
        let raw = "";
        try {
            raw = visibleText(this.el);
        } catch (e) {
            raw = "";
        }
        if (!raw.trim()) {
            try {
                raw = String(this.processor.GetTopic(this.el) || "");
            } catch (e) {
                raw = "";
            }
        }
        if (!raw.trim()) {
            try {
                raw = this.el.innerText || "";
            } catch (e) {
                raw = "";
            }
        }
        raw = raw.replace(/<[^>]*>/g, " ");
        // 去掉【单选题】这类题型标签、去掉（2.0分）、还原实体、压缩空白
        raw = raw.replace(/【[^】]{0,20}】/g, " ");
        raw = raw.replace(/[（(]\s*[\d.]+\s*分\s*[)）]/g, " ");
        raw = raw.replace(/&nbsp;/gi, " ").replace(/&lt;/gi, "<").replace(/&gt;/gi, ">").replace(/&amp;/gi, "&");
        raw = raw.replace(/[\r\n\t]+/g, " ").replace(/\s{2,}/g, " ").trim();
        // 拿到的是整道题（含选项）时，从第一个选项标记处截断
        let m = raw.match(/\s+[A-H][.、．]\s*/);
        if (m && m.index !== undefined && m.index > 6) {
            raw = raw.substring(0, m.index).trim();
        }
        return raw.substring(0, 300);
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
        let ret = new Array<HTMLLIElement>();
        let addAll = (root: Element) => {
            if (!root) {
                return;
            }
            let lis = root.querySelectorAll("li");
            for (let i = 0; i < lis.length; i++) {
                if (ret.indexOf(lis[i]) < 0) {
                    ret.push(lis[i]);
                }
            }
        };
        // 1) 常见选项容器
        let tmpel = <HTMLElement>this.el.querySelector(
            ".clearfix > ul,.clearfix ul.Zy_ulBottom.clearfix,ul.Zy_ulTk,.Zy_ulTop,ul.Zy_ulTop,.Zy_ulBottom,ul.Zy_ulBottom,.Zy_ulList"
        );
        if (tmpel) {
            let lis = tmpel.querySelectorAll("li");
            if (lis.length > 0) {
                return lis;
            }
        }
        // 2) 题目元素下所有 li
        addAll(this.el);
        // 3) 扩大到题目卡片容器（.TiMu 或父级）
        if (ret.length == 0) {
            try {
                let card: Element = this.el.closest ? this.el.closest(".TiMu") : null;
                if (!card) {
                    card = this.el.parentElement;
                }
                addAll(card);
            } catch (e) { /* ignore */ }
        }
        // 4) 只要带输入框/可点击的 li
        if (ret.length > 1) {
            let withInput = ret.filter((li) => !!li.querySelector("input,label,a,i,span"));
            if (withInput.length > 0) {
                return <any>withInput;
            }
        }
        // 5) 终极兜底：整个文档里找 li（单题页安全，多题页取前 12 个）
        if (ret.length == 0) {
            try {
                let all = this.context ? this.context.document.querySelectorAll("li") : document.querySelectorAll("li");
                let guard = 0;
                for (let i = 0; i < all.length && guard < 12; i++) {
                    if (ret.indexOf(all[i]) < 0) {
                        ret.push(all[i]);
                        guard++;
                    }
                }
            } catch (e) { /* ignore */ }
        }
        try {
            // 诊断：输出题目元素真实结构（一次性，便于定位选项容器）
            Application.App.log.Warn("选项诊断: el=" + ((this.el && this.el.tagName) || "?") + "." + ((this.el && String(this.el.className)) || "").slice(0, 40) +
                " li=" + (this.el ? this.el.querySelectorAll("li").length : -1) +
                " ul=" + (this.el ? this.el.querySelectorAll("ul").length : -1) +
                " input=" + (this.el ? this.el.querySelectorAll("input").length : -1) +
                " 抓到=" + ret.length +
                " | html=" + String((this.el && this.el.innerHTML) || "").replace(/\s+/g, " ").slice(0, 260));
        } catch (e) { /* ignore */ }
        if (ret.length == 0) {
            try {
                Application.App.log.Warn("选项抓取失败：el=" + ((this.el && this.el.className) || "") + " li=" + (this.el ? this.el.querySelectorAll("li").length : -1) + " docLi=" + (this.context ? this.context.document.querySelectorAll("li").length : -1));
            } catch (e) { /* ignore */ }
        }
        return <any>ret;
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
        let clean = (s: string): string => {
            let t = (s || "").replace(/\s+/g, " ").trim();
            // 去掉内容开头重复的选项字母标记（"A." / "A、" / "A "）
            t = t.replace(/^[A-Ha-h][\s.、．:：)）]+/, "").trim();
            return t;
        };
        // 选项内容：优先用可见文字，取最后一个非字母的 <a>（第一个 <a> 通常是选项字母标记）
        let anchors = el.querySelectorAll("a");
        for (let i = anchors.length - 1; i >= 0; i--) {
            let t = (anchors[i].innerText || anchors[i].textContent || "").trim();
            if (t == "" || /^[A-Ha-h]$/.test(t)) {
                continue;
            }
            return clean(t);
        }
        let tmpel = <HTMLInputElement>el.querySelector("label > input,input");
        if (tmpel == null) {
            return clean(visibleText(el));
        }
        let v = String(tmpel.value || "").toLowerCase();
        if (v == "true") {
            return "对√";
        }
        if (v == "false") {
            return "错×";
        }
        return clean(visibleText(el));
    }

    protected getOption(el: HTMLElement): string {
        // 优先 input.value（若是字母或 "true"/"false"）
        let ipt = <HTMLInputElement>el.querySelector("input");
        let v = "";
        if (ipt) {
            v = String(ipt.value || "").trim();
            if (v != "") {
                return v;
            }
        }
        // 属性里找字母（aria-label / title / name / data-opt）
        if (ipt) {
            let attr = (ipt.getAttribute("aria-label") || ipt.getAttribute("title") || ipt.getAttribute("data-opt") || ipt.getAttribute("name") || "").trim();
            let m = attr.match(/[A-Ha-h]/);
            if (m) {
                return m[0].toUpperCase();
            }
        }
        // 字母标记元素（i.fl / a.fl / .fl / option-sign）
        let letterEl = el.querySelector("i.fl, a.fl, i.option-sign, b.option-sign, .fl");
        if (letterEl) {
            let t = (letterEl.innerText || letterEl.textContent || "").trim();
            let m = t.match(/[A-Ha-h]/);
            if (m) {
                return m[0].toUpperCase();
            }
        }
        // 文本开头或第一个独立字母
        let txt = (el.innerText || el.textContent || "").trim();
        let m2 = txt.match(/^([A-Ha-h])\s*[.、:：)）]?/) || txt.match(/[A-Ha-h]/);
        if (m2) {
            return m2[1].toUpperCase();
        }
        return "";
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
            let isCheckbox = String(ipt.type || "").toLowerCase() == "checkbox";
            try {
                ipt.click();
            } catch (e) {
                // 页面脚本可能抛错，忽略
            }
            // 多选（checkbox）：点一次就够，千万别再用 label/li 重复点，否则会取消勾选
            if (isCheckbox) {
                try {
                    this.AddNotice(this.getOption(el) + ":" + content);
                } catch (e) {
                    // ignore
                }
                return;
            }
            // 单选（radio）：点完检查，没选中就逐级补
            if (!ipt.checked) {
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
                // 兜底：强制 checked + 派发事件，绕过页面的 click 处理
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
        // 最后补一次 CDP 真实点击（部分页面不认合成 click）
        try {
            setTimeout(() => this.cdpClick(el), 120);
        } catch (e) {
            // ignore
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
                // 勾选回读校验：漏勾的重试一次（多选题尤其重要——少勾一个就 0 分）
                setTimeout(() => {
                    try {
                        let missing: number[] = [];
                        for (let k = 0; k < s.correct.length; k++) {
                            let target = s.correct[k];
                            if (!target) {
                                continue;
                            }
                            let targetOpt = String(target.option == undefined ? "" : target.option).trim();
                            let wantIdx = -1;
                            if (/^[A-Ha-h]$/.test(targetOpt)) {
                                wantIdx = targetOpt.toUpperCase().charCodeAt(0) - 65;
                            }
                            if (wantIdx < 0 || wantIdx >= options.length) {
                                continue;
                            }
                            let inp = options[wantIdx].querySelector("input");
                            if (inp && !(<HTMLInputElement>inp).checked) {
                                missing.push(wantIdx);
                            }
                        }
                        if (missing.length > 0) {
                            Application.App.log.Warn("回读发现未勾选，重试：" + JSON.stringify(missing.map((x) => String.fromCharCode(65 + x))));
                            for (let mi = 0; mi < missing.length; mi++) {
                                this.click(options[missing[mi]], "");
                            }
                        }
                    } catch (e) { /* ignore */ }
                }, 200);
                if (!flag) {
                    // 诊断：把「要选的」和「实际看到的选项」都打出来，方便定位
                    try {
                        let seen: string[] = [];
                        for (let j = 0; j < options.length; j++) {
                            seen.push(String(this.getOption(options[j]) || "?") + "=" + String(this.getContent(options[j]) || "").replace(/\s+/g, " ").slice(0, 16));
                        }
                        let want: string[] = [];
                        for (let k = 0; k < s.correct.length; k++) {
                            let c: any = s.correct[k];
                            want.push((c ? String(c.option) + "/" + String(c.content || "") : "?"));
                        }
                        Application.App.log.Warn("选项没匹配上 | 要选:" + JSON.stringify(want) + " | 页面选项:" + JSON.stringify(seen));
                    } catch (e) {
                        // ignore
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
        let txt = (visibleText(el) || "").replace(/\s+/g, " ").trim();
        let tmpel = <HTMLInputElement>el.querySelector("label > input,input");
        if (tmpel) {
            let v = String(tmpel.value || "").toLowerCase();
            if (v == "true") {
                return "对√";
            }
            if (v == "false") {
                return "错×";
            }
        }
        // 没拿到 true/false 就看选项文字本身
        if (/错/.test(txt)) {
            return "错×";
        }
        if (/对/.test(txt)) {
            return "对√";
        }
        return txt;
    }

    // CDP 真实点击：把元素中心点换算到顶层视口坐标，交给主进程派发可信鼠标事件
    protected cdpClick(el: HTMLElement) {
        try {
            let w: any = window;
            if (typeof w.cxClick !== "function" || !el) {
                return;
            }
            let r = el.getBoundingClientRect();
            if (!r || r.width < 2 || r.height < 2) {
                return;
            }
            let offX = r.left;
            let offY = r.top;
            let pw: any = w;
            let depth = 0;
            while (pw && pw.parent && pw.parent !== pw && depth < 6) {
                let fe: any = null;
                try {
                    fe = pw.frameElement;
                } catch (e) {
                    fe = null;
                }
                if (!fe) {
                    break;
                }
                let fr = fe.getBoundingClientRect();
                offX += fr.left;
                offY += fr.top;
                pw = pw.parent;
                depth++;
            }
            offX -= pw.scrollX || 0;
            offY -= pw.scrollY || 0;
            w.cxClick({x: offX, y: offY, width: r.width, height: r.height});
        } catch (e) {
            // ignore
        }
    }

    protected click(el: HTMLElement) {
        if (!el) {
            return;
        }
        let clicked = false;
        try {
            let tmpel = <HTMLInputElement>el.querySelector("label > input,input");
            if (tmpel) {
                if (!tmpel.checked) {
                    tmpel.click();
                }
                clicked = true;
            }
        } catch (e) {
            // 页面自己的脚本可能在这里抛错，忽略它，别让整题失败
        }
        if (!clicked) {
            // 没有 input：依次尝试点 label / 选项序号 / 选项文字 / li 本身
            try {
                let inner = <HTMLElement>el.querySelector("label,.num_option,.answer_p,span,i,a");
                if (inner && inner !== el) {
                    inner.click();
                    clicked = true;
                }
            } catch (e) {
                // ignore
            }
        }
        if (!clicked) {
            try {
                el.click();
            } catch (e) {
                // ignore
            }
        }
        // 补一次鼠标事件（部分页面只监听 mousedown/mouseup）
        try {
            el.dispatchEvent(new MouseEvent("mousedown", {bubbles: true, cancelable: true, view: window}));
            el.dispatchEvent(new MouseEvent("mouseup", {bubbles: true, cancelable: true, view: window}));
        } catch (e) {
            // ignore
        }
        // 最后补一次 CDP 真实点击
        try {
            setTimeout(() => this.cdpClick(el), 120);
        } catch (e) {
            // ignore
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
                if (wantTrue === null) {
                    Application.App.log.Warn("判断题填充：无法判断对/错，放弃");
                    return resolve("no_match");
                }
                // 按「可见文字」匹配对/错（不用索引猜，避免隐藏元素/顺序错位）
                let match = -1;
                let texts: string[] = [];
                for (let j = 0; j < options.length; j++) {
                    let t = "";
                    try {
                        t = visibleText(options[j]);
                    } catch (e) {
                        t = "";
                    }
                    if (!t) {
                        t = String(this.getContent(options[j]) || "");
                    }
                    texts.push(t);
                    let isTrue = /对|正确|√|✓/.test(t);
                    let isFalse = /错|错误|×|✗/.test(t);
                    if (wantTrue === true && isTrue && !isFalse) {
                        match = j;
                        break;
                    }
                    if (wantTrue === false && isFalse && !isTrue) {
                        match = j;
                        break;
                    }
                }
                // 文字匹配失败再退回索引（判断题通常 A=对 B=错）
                if (match < 0) {
                    match = wantTrue === false ? 1 : 0;
                }
                if (match > options.length - 1) {
                    match = options.length - 1;
                }
                Application.App.log.Info("判断题填充：要选「" + (wantTrue ? "对" : "错") + "」，点第 " + (match + 1) + " 项（文字：" + String(texts[match] || "").slice(0, 12) + "）");
                this.click(options[match]);
                // 回读确认
                setTimeout(() => {
                    try {
                        let picked = -1;
                        for (let j = 0; j < options.length; j++) {
                            let inp = options[j].querySelector("input");
                            if (inp && (<HTMLInputElement>inp).checked) {
                                picked = j;
                                break;
                            }
                        }
                        Application.App.log.Info("判断题填充结果：实际选中第 " + (picked + 1) + " 项" + (picked == match ? "（一致）" : "（不一致！）"));
                    } catch (e) { /* ignore */ }
                }, 150);
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