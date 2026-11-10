import {HttpUtils, removeHTML, randNumber, Sleep} from "../utils/utils";
import {SystemConfig} from "@App/config";
import {Application} from "../application";
import {AIEnabled, AskAI, AIResult, VisionEnabled, VisionConfig, CaptureQuestionImage, AskAIVision, ShowVisionPreview, VisionOCR, ReasonFromText} from "./ai";

export interface Topic {
    topic: string
    type: TopicType
    id?: string
}

export interface Option {
    option: any
    content: any
}

export interface Answer {
    index: number
    topic: string
    type: TopicType
    status: TopicStatus
    answers?: Option[]
    correct: Option[]
    errors?: Option[]
    id?: string

    Equal(content1: string, content2: string): boolean
}

export class PushAnswer implements Answer {
    public index: number;
    public topic: string;
    public type: TopicType;
    public status: TopicStatus;
    public answers: Option[];
    public errors: Option[];
    public correct: Option[];

    public Equal(content1: string, content2: string): boolean {
        return content1 == content2;
    }
}

// 选项
export interface Options {
    Random(): TopicStatus;

    Fill(s: Answer): Promise<TopicStatus>;

    Correct(): Answer
}

// 题目,继承了选项接口
export interface Question extends Options {
    GetType(): TopicType;

    GetTopic(): string;

    GetOptions?(): Option[];

    SetStatus(status: TopicStatus): void;
}

//-1-一个错误 1-单选 2-多选 3-判断 4-填空
export type TopicType = -1 | 1 | 2 | 3 | 4;
export type FillType = 1;
// 1随机答案 2不支持的随机答案类型 3无答案 4无符合答案
export type TopicStatus = "ok" | "random" | "no_support_random" | "no_answer" | "no_match";

let topicStatusMap = new Map<TopicStatus, string>();
topicStatusMap.set("ok", "搜索成功").set("random", "随机答案").set("no_support_random", "不支持的随机答案类型").set("no_answer", "题库中没有搜索到答案").set("no_match", "题库中没有符合的答案");
let questionStatusMap = new Map<QuestionStatus, string>();
questionStatusMap.set("success", "搜索成功").set("network", "题库网络错误").set("incomplete", "题库不全").set("processing", "搜索中...");

export function TopicStatusString(status: TopicStatus): string {
    return topicStatusMap.get(status) || "未知错误";
}

export function QuestionStatusString(status: QuestionStatus): string {
    return questionStatusMap.get(status) || "未知错误";
}

export function SwitchTopicType(title: string): TopicType {
    if (!title) {
        return null;
    }
    let t = String(title);
    let norm = t.replace(/\s+/g, "");
    switch (norm) {
        case "单选题":
        case "单选":
        case "单项选择题": {
            return 1;
        }
        case "多选题":
        case "多选":
        case "多项选择题": {
            return 2;
        }
        case "判断题":
        case "判断": {
            return 3;
        }
        case "填空题":
        case "填空":
        case "简答题":
        case "名词解释":
        case "论述题": {
            return 4;
        }
        default: {
            // 兜底：截取开头两个字判断（页面有时带序号等前缀）
            let head = norm.slice(0, 4);
            if (head.indexOf("单选") >= 0) {
                return 1;
            }
            if (head.indexOf("多选") >= 0) {
                return 2;
            }
            if (head.indexOf("判断") >= 0) {
                return 3;
            }
            if (head.indexOf("填空") >= 0 || head.indexOf("简答") >= 0 || head.indexOf("论述") >= 0) {
                return 4;
            }
            return null;
        }
    }
}

// 按页面 DOM 结构推断题型：没有题型标题时的兜底
// 单选：radio 一组；多选：checkbox 一组；判断：两个 radio（对/错）；填空：input/textarea
// 另外向上找分类标题（「一. 单选题（共1题）」），很多新版页面选项不是 input 元素
export function GuessTopicType(el: HTMLElement): TopicType {
    try {
        let root = el || document.body;
        // 0) 先看自身文字里有没有题型标记
        let selfText = String(root.innerText || "").slice(0, 80);
        if (/多选题|多选/.test(selfText)) {
            return 2;
        }
        if (/判断题|判断/.test(selfText)) {
            return 3;
        }
        if (/填空题|填空/.test(selfText)) {
            return 4;
        }
        if (/单选题|单选/.test(selfText)) {
            return 1;
        }
        // 1) 向上找分类标题
        let node: HTMLElement = root;
        for (let depth = 0; depth < 8 && node; depth++) {
            let prev = node.previousElementSibling;
            let guard = 0;
            while (prev && guard < 6) {
                let t = String(prev.innerText || "").slice(0, 40);
                if (/多选题|多选/.test(t)) {
                    return 2;
                }
                if (/判断题|判断/.test(t)) {
                    return 3;
                }
                if (/填空题|填空/.test(t)) {
                    return 4;
                }
                if (/单选题|单选/.test(t)) {
                    return 1;
                }
                prev = prev.previousElementSibling;
                guard++;
            }
            node = <HTMLElement>node.parentElement;
        }
        // 2) 按控件类型判断
        let checkbox = root.querySelectorAll('input[type="checkbox"]');
        let radio = root.querySelectorAll('input[type="radio"]');
        let input = root.querySelectorAll('input[type="text"],input[type="input"],textarea');
        if (checkbox.length > 0 && radio.length == 0) {
            return 2;
        }
        if (radio.length > 0) {
            return radio.length <= 2 ? 3 : 1;
        }
        if (input.length > 0) {
            return 4;
        }
    } catch (e) {
        // ignore
    }
    return null;
}

export type QuestionStatus = "success" | "network" | "incomplete" | "processing";
export type QuestionCallback = (status: QuestionStatus) => void

export type QuestionBankCallback = (args: { status: QuestionStatus, answer: Answer[] }) => Promise<void>

// 题库具体实现
export interface QuestionBank {
    Answer(topic: Topic[], resolve: QuestionBankCallback): void;

    Push(answer: Answer[]): Promise<QuestionStatus>;

    SetInfo(info: QuestionInfo): void;

    CheckCourse?(info?: QuestionInfo[]): Promise<number>;
}

export interface QuestionInfo {
    refer: string
    id: string
}

// 小工具题库
export class ToolsQuestionBank implements QuestionBank {

    protected platform: string;
    protected info: QuestionInfo;

    constructor(platform: string, info?: QuestionInfo) {
        this.platform = platform;
        this.info = info;
    }

    public SetInfo(info: QuestionInfo): void {
        this.info = info;
    }

    public GetInfo(): string {
        return encodeURIComponent(JSON.stringify(this.info));
    }

    public Answer(topic: Topic[], resolve: QuestionBankCallback): void {
        Application.App.log.Debug("答案查询", topic);
        let num = 20;
        let answer = new Array<Answer>();
        let retStatus: QuestionStatus = "success";
        let next = (index: number) => {
            let body = "info=" + this.GetInfo() + "&";
            let t = index;
            for (; t < index + num && t < topic.length; t++) {
                let val = topic[t];
                body += "topic[" + (t - index) + "]=" + encodeURIComponent((val.topic)) + "&type[" + (t - index) + "]=" + val.type + "&";
            }
            HttpUtils.HttpPost(SystemConfig.url + "v2/answer?platform=" + this.platform, body, {
                headers: {
                    "Authorization": Application.App.config.vtoken,
                    "X-Version": SystemConfig.version.toString(),
                },
                json: true,
                success: async (result: any) => {
                    let status: QuestionStatus = "success";
                    let tmpResult = new Array<Answer>();
                    for (let i = 0; i < result.length; i++) {
                        if (result[i].result == undefined || result[i].result.length <= 0) {
                            tmpResult.push({
                                index: index + result[i].index,
                                topic: result[i].topic,
                                type: -1,
                                status: "no_answer",
                                answers: null,
                                correct: null,
                                Equal: this.Equal,
                            });
                            status = "incomplete";
                            continue;
                        }
                        let val = result[i].result[0];
                        tmpResult.push({
                            index: index + result[i].index,
                            topic: val.topic,
                            type: val.type,
                            correct: val.correct,
                            status: "ok",
                            Equal: this.Equal,
                        });
                    }
                    answer = answer.concat(tmpResult);
                    if (status != "success") {
                        retStatus = status;
                    }
                    await resolve({status: "processing", answer: tmpResult});
                    if (t < topic.length) {
                        next(t);
                    } else {
                        return resolve({status: retStatus, answer: answer});
                    }
                },
                error: () => {
                    return resolve({status: "network", answer: answer});
                }
            });
        }
        next(0);
    }

    public Push(answer: Answer[]): Promise<QuestionStatus> {
        return new Promise((resolve) => {
            Application.App.log.Debug("采集提交", answer);
            HttpUtils.HttpPost(SystemConfig.url + "answer?platform=" + this.platform, "info=" + this.GetInfo() + "&data=" + encodeURIComponent(JSON.stringify(answer)), {
                headers: {
                    "Authorization": Application.App.config.vtoken,
                    "X-Version": SystemConfig.version.toString(),
                },
                json: true,
                success: (result: any) => {
                    Application.App.log.Info("答案自动记录成功,成功获得" + result.add_token_num + "个打码数,剩余数量:" + result.token_num);
                    resolve("success");
                },
                error: () => {
                    resolve("network");
                }
            });
        });
    }

    public Equal(content1: string, content2: string): boolean {
        return removeHTML(content1) == removeHTML(content2);
    }

    public CheckCourse(info?: QuestionInfo[]): Promise<number> {
        return new Promise<number>(resolve => {
            info = info || [this.info];
            HttpUtils.HttpPost(SystemConfig.url + "v2/check?platform=" + this.platform, "info=" + encodeURIComponent(JSON.stringify(info)), {
                headers: {
                    "Authorization": Application.App.config.vtoken,
                    "X-Version": SystemConfig.version.toString(),
                },
                success: () => {
                    resolve(0);
                }, error: () => {
                    resolve(-1);
                }
            });
            resolve();
        });
    }
}

export interface QuestionBankFacade {
    ClearQuestion(): void

    AddQuestion(q: Question): void

    GetQuestionCount(): number

    Answer(callback: (status: QuestionStatus) => void): void

    Push(callback: (status: QuestionStatus) => void): void

    CheckCourse(): Promise<number>
}

export class ToolsQuestionBankFacade implements QuestionBankFacade {
    protected bank: QuestionBank;
    protected question: Array<Question>;

    constructor(platform?: string | QuestionBank, info?: any) {
        if (typeof platform == "string") {
            this.bank = new ToolsQuestionBank(platform, info);
        } else {
            this.bank = platform;
        }
        this.question = new Array<Question>();
    }

    public ClearQuestion() {
        this.question = new Array<Question>();
    }

    public AddQuestion(q: Question) {
        this.question.push(q);
    }

    public GetQuestionCount(): number {
        return this.question.length;
    }

    public Answer(callback: (status: QuestionStatus) => void) {
        // 配置了 AI 就直接走 AI 答题，不再请求题库
        let useAI = AIEnabled();
        Application.App.log.Info("开始答题：识别到 " + this.question.length + " 道题，" + (useAI ? "用 AI 作答" : "走原题库"));
        if (useAI) {
            this.answerWithAI(callback);
            return;
        }

        let topic = new Array<Topic>();
        this.question.forEach((val) => {
            let type = val.GetType();
            if (type == -1) {
                return;
            }
            topic.push({
                topic: (val.GetTopic()),
                type: type,
            });
        });
        let status: QuestionStatus = "success";
        this.bank.Answer(topic, (ret: { status: QuestionStatus, answer: Answer[] }): Promise<void> => {
            return new Promise(async (resolve) => {
                if (ret.status != "processing") {
                    Application.App.log.Debug("题库返回", ret);
                    if (ret.status != "success" || status == "success") {
                        callback(ret.status);
                        return resolve();
                    }
                    callback(status);
                    return resolve();
                }
                let t = Application.App.config.topic_interval * 1000;
                for (let i = 0; i < ret.answer.length; i++) {
                    let answer = ret.answer[i];
                    let question = this.question[answer.index];
                    let tmpStatus = answer.status;
                    if (answer.status == "no_answer") {
                        status = this.randAnswer(status, tmpStatus, question);
                        await Sleep(t);
                        continue
                    }
                    if (answer.type != question.GetType()) {
                        tmpStatus = "no_match";
                    } else {
                        tmpStatus = await question.Fill(answer);
                    }
                    if (tmpStatus == "no_match") {
                        status = this.randAnswer(status, tmpStatus, question);
                        await Sleep(t);
                        continue
                    }
                    question.SetStatus(tmpStatus);
                    if (i < ret.answer.length - 1) {
                        await Sleep(t);
                    }
                }
                return resolve();
            });
        });
    }

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
            Application.App.log.Warn("页面上没识别到题目（选择器 .TiMu 没命中），可能是题目还没加载出来或页面结构变了");
            return callback("incomplete");
        }

        let status: QuestionStatus = "success";
        const interval = Application.App.config.topic_interval * 1000;
        for (let i = 0; i < list.length; i++) {
            const q = list[i];
            try {
                const type = q.GetType();
                let options: Option[] = [];
                try {
                    options = q.GetOptions ? (q.GetOptions() || []) : [];
                } catch (e) {
                    Application.App.log.Warn("读取选项失败（不影响作答）：" + ((e && e.message) ? e.message : e));
                    options = [];
                }
                let title = "";
                try {
                    title = q.GetTopic() || "";
                } catch (e) {
                    title = "";
                }
                // 诊断日志：视觉读题模式下不打印原始（可能加密的）题目文字
                if (VisionEnabled()) {
                    Application.App.log.Info("AI 答题中（" + (i + 1) + "/" + list.length + "）：题型 " + (type == 1 ? "单选" : (type == 2 ? "多选" : (type == 3 ? "判断" : "填空"))) + "，选项 " + options.length + " 个（视觉读题模式）");
                } else {
                    Application.App.log.Info("AI 答题中（" + (i + 1) + "/" + list.length + "）：" + title.substring(0, 40));
                }
                // 诊断：把实际发给 AI 的选项打出来（内容为空说明页面没取到选项文字）
                // 视觉读题模式下选项来自图片，不再打印（避免显示加密字体造成的乱码）
                try {
                    if (!VisionEnabled()) {
                        if (options.length > 0) {
                            let parts: string[] = [];
                            for (let k = 0; k < options.length; k++) {
                                parts.push(String(options[k].option) + "=" + String(options[k].content || "").slice(0, 20));
                            }
                            Application.App.log.Info("AI 选项：" + parts.join(" | "));
                        } else {
                            Application.App.log.Info("AI 选项：没取到选项文字");
                        }
                    }
                } catch (e) {
                    // ignore
                }

                // 视觉读题优先：页面文字被字体加密时，截图直接让视觉模型读（最可靠）
                let ret: AIResult = null;
                if (VisionEnabled()) {
                    try {
                        let el: HTMLElement = null;
                        try {
                            el = (q as any).GetElement ? (q as any).GetElement() : null;
                        } catch (e) {
                            el = null;
                        }
                        if (el) {
                            let img = await CaptureQuestionImage(el);
                            if (img) {
                                ShowVisionPreview(img, "读题中…");
                                let typeName = type == 1 ? "单选题" : (type == 2 ? "多选题" : (type == 3 ? "判断题" : "填空题"));
                                // 从选项列表推出可用字母（防止模型输出不存在的选项）
                                let validLetters: string[] = [];
                                for (let oi = 0; oi < options.length; oi++) {
                                    let lo = String(options[oi].option || "").trim().toUpperCase();
                                    if (/^[A-H]$/.test(lo) && validLetters.indexOf(lo) < 0) {
                                        validLetters.push(lo);
                                    }
                                }
                                if (validLetters.length == 0) {
                                    validLetters = ["A", "B", "C", "D"];
                                }
                                let parseLetters = (txt: string): string[] => {
                                    let letters: string[] = [];
                                    let push = (mm: string[]) => {
                                        for (let mi = 0; mi < mm.length; mi++) {
                                            if (validLetters.indexOf(mm[mi]) >= 0 && letters.indexOf(mm[mi]) < 0) {
                                                letters.push(mm[mi]);
                                            }
                                        }
                                    };
                                    let mAns = txt.match(/答案\s*[:：]?\s*([A-Ha-h][A-Ha-h\s,，、]*)/);
                                    if (mAns && mAns[1]) {
                                        push(mAns[1].toUpperCase().match(/[A-H]/g) || []);
                                    }
                                    if (letters.length == 0) {
                                        let lines = txt.split(/\r?\n/).map((s: string) => s.trim()).filter((s: string) => s.length > 0);
                                        let last = lines.length > 0 ? lines[lines.length - 1] : txt;
                                        push(String(last).toUpperCase().match(/[A-H]/g) || []);
                                    }
                                    if (type == 1 || type == 3) {
                                        letters = letters.slice(0, 1);
                                    }
                                    return letters;
                                };
                                // 三投两中投票：同一张题图问 3 次（可配置 ai_vision_votes），取多数
                                let votes: string[][] = [];
                                let usedModel = "";
                                let votesWanted = 3;
                                try {
                                    const vv = parseInt(Application.App.config.GetConfig("ai_vision_votes", "3"), 10);
                                    if (!isNaN(vv) && vv >= 1 && vv <= 5) {
                                        votesWanted = vv;
                                    }
                                } catch (e) { /* ignore */ }
                                // ===== 两段式：视觉 OCR 转录 → 强文本模型解题（多次投票）=====
                                let letters: string[] = [];
                                let visionRaw = "";
                                let bestLog = "";
                                let ocrText = "";
                                let ocrModel = "";
                                try {
                                    let ocr = await VisionOCR(img);
                                    if (ocr.ok && ocr.text && String(ocr.text).trim().length >= 8) {
                                        ocrText = String(ocr.text).trim();
                                        ocrModel = ocr.model || "";
                                        Application.App.log.Info("视觉转录（" + ocrModel + "）：" + ocrText.replace(/\s+/g, " "));
                                        ShowVisionPreview(img, "转录完成，文本模型解题中…");
                                        let rr = await ReasonFromText(ocrText, typeName, validLetters, votesWanted);
                                        if (rr.ok && rr.letters.length > 0) {
                                            letters = rr.letters;
                                            bestLog = (rr.raw || letters.join("")) + " => " + letters.join("") + "（" + (rr.model || "") + "）";
                                        } else if (rr.error) {
                                            Application.App.log.Warn("文本模型解题失败：" + rr.error);
                                        }
                                    } else if (ocr.error) {
                                        Application.App.log.Warn("视觉转录失败：" + ocr.error);
                                    }
                                } catch (e) {
                                    // ignore
                                }
                                // 兜底：直接让视觉模型作答
                                if (letters.length == 0) {
                                    let vr2 = await AskAIVision(
                                        img,
                                        "看图回答：" + typeName + "，只输出正确选项的字母（" + validLetters.join("/") + "），不要任何解释。"
                                    );
                                    if (vr2.ok && vr2.text) {
                                        visionRaw = String(vr2.text);
                                        letters = parseLetters(visionRaw);
                                        usedModel = vr2.model || usedModel;
                                    }
                                }
                                if (letters.length > 0) {
                                    Application.App.log.Info("视觉读题答案：" + letters.join("") + "（投票 " + (bestLog || letters.join("")) + "）");
                                    ShowVisionPreview(img, "AI 答案：" + letters.join("") + "（" + (bestLog || letters.join("")) + "）");
                                    if (type == 3) {
                                        // 判断题：A=对(true) B=错(false)，后续统一转换逻辑会映射到题目自己的选项值
                                        ret = {ok: true, correct: [{option: <any>(letters[0] == "A"), content: ""}], raw: "vision:" + letters.join(""), vision: true};
                                    } else {
                                        ret = {ok: true, correct: letters.map((l) => ({option: l, content: ""})), raw: "vision:" + letters.join(""), vision: true};
                                    }
                                } else {
                                    Application.App.log.Warn("视觉读题未给出有效选项（" + String(visionRaw || "").replace(/\s+/g, " ").slice(0, 40) + "）回退文字模式");
                                }
                            }
                        }
                    } catch (e) {
                        // ignore
                    }
                }
                if (!ret || !ret.ok) {
                    ret = await AskAI(title, type, options);
                }
                // 单选题/多选题/判断题：再问一次做交叉验证；两次不一致就问第三次投票
                // （视觉结果已是最可靠来源，不再做文字复核，避免不同来源互相稀释）
                if (!ret.vision && (type == 1 || type == 2 || type == 3) && ret.ok) {
                    try {
                        let r2 = await AskAI(title, type, options);
                        if (this.sameAIResult(ret, r2)) {
                            Application.App.log.Info("AI 复核一致");
                        } else {
                            let r3 = await AskAI(title, type, options);
                            let voted = this.voteAIResults([ret, r2, r3]);
                            Application.App.log.Info("AI 两次不一致，三次投票 -> " + this.aiVoteKey(voted));
                            ret = voted;
                        }
                    } catch (e) {
                        // 复核失败就保留第一次的结果
                    }
                }
                // 拟人化：故意答错率（wrong_rate，百分比，默认 0 = 永远答对；只对单选/判断生效）
                if (ret.ok && (type == 1 || type == 3)) {
                    try {
                        let rate = parseFloat(Application.App.config.GetConfig("wrong_rate", "0"));
                        if (!isNaN(rate) && rate > 0 && Math.random() * 100 < rate) {
                            let wrong = this.pickWrongAnswer(type, options, ret.correct);
                            if (wrong && wrong.length > 0) {
                                Application.App.log.Warn("拟人化：这道题故意答错（wrong_rate=" + rate + "%）");
                                ret = {ok: true, correct: wrong, raw: ret.raw};
                            }
                        }
                    } catch (e) {
                        // ignore
                    }
                }
                if (!ret.ok || !ret.correct || ret.correct.length == 0) {
                    Application.App.log.Warn("AI 没给出答案：" + (ret.error || "无法解析"));
                    status = this.randAnswer(status, "no_answer", q);
                    if (i < list.length - 1) {
                        await this.aiSleep(interval);
                    }
                    continue;
                }
                Application.App.log.Info("AI 回答：" + String(ret.raw || "").replace(/\s+/g, " ").slice(0, 60));

                // 判断题：AI 给的是「对/错」，要换成这道题自己的选项值，不然对不上
                let correct = ret.correct;
                if (type == 3 && options.length > 0) {
                    const wantTrue = !!ret.correct[0].option;
                    const mapped = new Array<Option>();
                    for (let k = 0; k < options.length; k++) {
                        const text = String(options[k].content || "") + " " + String(options[k].option || "");
                        const isTrue = /对|正确|√|✓|TRUE/i.test(text);
                        const isFalse = /错|错误|×|✗|FALSE/i.test(text);
                        if ((wantTrue && isTrue && !isFalse) || (!wantTrue && isFalse && !isTrue)) {
                            mapped.push({option: String(options[k].option || ""), content: ""});
                            break;
                        }
                    }
                    if (mapped.length == 0) {
                        // 猜不出来就按顺序：第一个当"对"，第二个当"错"
                        const idx = wantTrue ? 0 : 1;
                        if (options[idx]) {
                            mapped.push({option: String(options[idx].option || ""), content: ""});
                        }
                    }
                    if (mapped.length > 0) {
                        correct = mapped;
                    }
                }

                const answer: Answer = {
                    index: i,
                    topic: title,
                    type: type,
                    status: "ok",
                    answers: options,
                    correct: correct,
                    Equal: (content1: string, content2: string) => removeHTML(content1) == removeHTML(content2),
                };

                // 直接用页面原生选择函数勾选（学习通新版选项是 li[onclick=addChoice]）
                let directOk = false;
                try {
                    let qel: any = (q as any).GetElement ? (q as any).GetElement() : null;
                    if (qel && qel.ownerDocument) {
                        let qdoc: any = qel.ownerDocument;
                        let qwin: any = qdoc.defaultView || window;
                        let opts: any = qel.querySelectorAll ? qel.querySelectorAll(".Zy_ulTop li, .Zy_ulTk li, .Py_tk li, ul li") : null;
                        if (!opts || opts.length == 0) {
                            opts = qdoc.querySelectorAll(".Zy_ulTop li, .Py_tk li");
                        }
                        let wantIdx: number[] = [];
                        for (let di = 0; di < correct.length; di++) {
                            let opt = String(correct[di].option == undefined ? "" : correct[di].option).trim().toUpperCase();
                            if (!/^[A-H]$/.test(opt)) {
                                continue;
                            }
                            let idx: number;
                            if (type == 3) {
                                // 判断题：学习通用「A=对」「F=错」，个别课程用「B=错」
                                if (opt == "A" || opt == "T") {
                                    idx = 0;
                                } else if (opt == "F" || opt == "B") {
                                    idx = 1;
                                } else {
                                    idx = opt.charCodeAt(0) - 65;
                                }
                            } else {
                                idx = opt.charCodeAt(0) - 65;
                            }
                            if (idx >= 0 && wantIdx.indexOf(idx) < 0) {
                                wantIdx.push(idx);
                            }
                        }
                        if (wantIdx.length == 0 && type == 3 && correct.length > 0) {
                            let cv = correct[0].option;
                            wantIdx.push((cv === true || String(cv) == "true") ? 0 : 1);
                        }
                        // 去掉越界项
                        wantIdx = wantIdx.filter((x) => x >= 0 && x < opts.length);
                        if (opts && opts.length > 0 && wantIdx.length > 0) {
                            for (let wi = 0; wi < wantIdx.length; wi++) {
                                let idx2 = wantIdx[wi];
                                if (idx2 < 0 || idx2 >= opts.length) {
                                    continue;
                                }
                                let li: any = opts[idx2];
                                let done = false;
                                // 多选题：addChoice 对 checkbox 常抛 Illegal invocation，优先用可信真实点击
                                if (type == 2) {
                                    try {
                                        let ck = (<any>window).cxClickEl;
                                        if (typeof ck == "function") {
                                            let pr = ck(li);
                                            if (pr && pr.catch) {
                                                pr.catch(() => {});
                                            }
                                            done = true;
                                        }
                                    } catch (e) { /* ignore */ }
                                }
                                if (!done) {
                                    try {
                                        if (typeof qwin.addChoice == "function") {
                                            qwin.addChoice(li);
                                        } else {
                                            li.click();
                                        }
                                        done = true;
                                    } catch (de) {
                                        Application.App.log.Warn("直填失败：" + String((de && de.message) || de));
                                        try {
                                            li.click();
                                        } catch (e2) { /* ignore */ }
                                    }
                                }
                                Application.App.log.Info("直填 " + String.fromCharCode(65 + idx2) + " → aria=" + String(li.getAttribute ? li.getAttribute("aria-checked") : "?"));
                            }
                            // 校验：多选可信点击是异步的，稍等再读
                            let savedWant = wantIdx.slice();
                            let savedOpts = opts;
                            let savedQwin = qwin;
                            let check = () => {
                                let okCnt = 0;
                                for (let wi = 0; wi < savedWant.length; wi++) {
                                    let idx2 = savedWant[wi];
                                    if (idx2 < 0 || idx2 >= savedOpts.length) {
                                        continue;
                                    }
                                    let li: any = savedOpts[idx2];
                                    let aria = li.getAttribute ? String(li.getAttribute("aria-checked")) : "";
                                    let cls = String(li.className || "");
                                    if (aria == "true" || cls.indexOf("after") >= 0 || cls.indexOf("checked") >= 0) {
                                        okCnt++;
                                    } else if (type == 2) {
                                        // 多选：补充一次可信真实点击（addChoice 对 checkbox 可能只改 aria 不改勾选）
                                        try {
                                            let ck = (<any>window).cxClickEl;
                                            if (typeof ck == "function") {
                                                let pr = ck(li);
                                                if (pr && pr.catch) {
                                                    pr.catch(() => {});
                                                }
                                            }
                                        } catch (e) { /* ignore */ }
                                    }
                                }
                                let hidVal = "";
                                try {
                                    let hid = qel && qel.querySelector ? qel.querySelector("input[type=hidden][id^=answer]") : null;
                                    if (!hid) {
                                        hid = qdoc.querySelector("input[type=hidden][id^=answer]");
                                    }
                                    if (hid) {
                                        hidVal = String((<any>hid).value || "");
                                    }
                                } catch (e) { /* ignore */ }
                                Application.App.log.Info("直填校验：" + okCnt + "/" + savedWant.length + " 选中" + (hidVal ? "，隐藏答案=" + hidVal : "") + "（题型 " + type + "）");
                            };
                            setTimeout(check, type == 2 ? 500 : 60);
                            // 已执行点击，先按成功处理；补点由上面的校验异步完成
                            directOk = true;
                        }
                    }
                } catch (de) {
                    // ignore
                }
                Application.App.log.Info("准备勾选：" + JSON.stringify(correct.map(v => v.option)));
                let tmp: any;
                try {
                    tmp = directOk ? "ok" : await q.Fill(answer);
                } catch (e3) {
                    Application.App.log.Warn("勾选答案失败：" + this.errText(e3));
                    tmp = "no_match";
                }
                if (tmp == "ok") {
                    q.SetStatus("ok");
                    Application.App.log.Info("AI 答案已填写：" + JSON.stringify(correct.map(v => v.option)));
                } else {
                    status = this.randAnswer(status, tmp, q);
                }
            } catch (e) {
                Application.App.log.Warn("AI 答题异常（第 " + (i + 1) + " 题）：" + this.errText(e));
                try {
                    status = this.randAnswer(status, "no_answer", q);
                } catch (e2) {
                    status = "incomplete";
                }
            }
            if (i < list.length - 1) {
                await this.aiSleep(interval);
            }
        }
        return callback(status);
    }

    // 拟人化：每题之间在 topic_interval 基础上加 0~3 秒随机延迟
    protected async aiSleep(interval: number): Promise<void> {
        try {
            let r = Application.App.config.GetConfig("random_delay", "true");
            let extra = r != "false" ? Math.floor(Math.random() * 3000) : 0;
            await Sleep(interval + extra);
        } catch (e) {
            await Sleep(interval);
        }
    }

    // 把一次 AI 结果压成可比对的字符串（选项按字母排序）
    protected aiVoteKey(r: AIResult): string {
        try {
            if (!r || !r.ok || !r.correct || r.correct.length == 0) {
                return "";
            }
            let keys = new Array<string>();
            for (let i = 0; i < r.correct.length; i++) {
                keys.push(String(r.correct[i].option));
            }
            keys.sort();
            return keys.join(",");
        } catch (e) {
            return "";
        }
    }

    protected sameAIResult(a: AIResult, b: AIResult): boolean {
        let ka = this.aiVoteKey(a);
        return ka != "" && ka == this.aiVoteKey(b);
    }

    // 多次结果里取出现次数最多的那个（同票取第一次的）
    protected voteAIResults(list: AIResult[]): AIResult {
        try {
            let map: { [k: string]: { count: number, res: AIResult } } = {};
            for (let i = 0; i < list.length; i++) {
                let k = this.aiVoteKey(list[i]);
                if (k == "") {
                    continue;
                }
                if (!map[k]) {
                    map[k] = {count: 0, res: list[i]};
                }
                map[k].count++;
            }
            let best = "";
            for (let k in map) {
                if (best == "" || map[k].count > map[best].count) {
                    best = k;
                }
            }
            return best != "" ? map[best].res : list[0];
        } catch (e) {
            return list[0];
        }
    }

    // 拟人化辅助：挑一个"错"的答案（单选换一个字母；判断翻转对错）
    protected pickWrongAnswer(type: TopicType, options: Option[], correct: Option[]): Option[] {
        try {
            if (!correct || correct.length == 0) {
                return null;
            }
            if (type == 3) {
                let want = correct[0].option;
                return [{option: !want, content: !want}];
            }
            let right = String(correct[0].option || "").toUpperCase();
            let cands: Option[] = [];
            for (let i = 0; i < (options || []).length; i++) {
                let o = String(options[i].option || "").toUpperCase();
                if (o && o != right) {
                    cands.push({option: options[i].option, content: ""});
                }
            }
            if (cands.length == 0) {
                return null;
            }
            return [cands[Math.floor(Math.random() * cands.length)]];
        } catch (e) {
            return null;
        }
    }

    protected errText(e: any): string {
        try {
            if (e && e.stack) {
                return String(e.stack).split("\n").slice(0, 3).join(" | ").substring(0, 220);
            }
        } catch (e2) {
            // ignore
        }
        return (e && e.message) ? String(e.message) : String(e);
    }

    protected randAnswer(status: QuestionStatus, tmpStatus: TopicStatus, question: Question): QuestionStatus {
        if (Application.App.config.rand_answer) {
            tmpStatus = question.Random();
        } else {
            status = "incomplete";
        }
        if (tmpStatus == "no_support_random") {
            status = "incomplete";
        }
        // AI 模式下别显示「题库中没有搜索到答案」，那是原题库的文案
        try {
            let q: any = question;
            if (tmpStatus == "no_answer" && AIEnabled() && typeof q.AddNotice == "function") {
                q.AddNotice("AI 没有给出答案");
                return status;
            }
        } catch (e) {
            // ignore
        }
        question.SetStatus(tmpStatus);
        return status;
    }

    public Push(callback: (status: QuestionStatus) => void): void {
        let answer = new Array<Answer>();
        this.question.forEach((val) => {
            let correct = val.Correct();
            if (correct == null || correct.correct == null || correct.type == -1) {
                return;
            }
            answer.push(correct);
        });
        this.bank.Push(answer).then((ret: QuestionStatus) => {
            Application.App.log.Debug("题库返回", ret);
            return callback(ret);
        });
    }

    protected dealOption(options: Option[]): Option[] {
        for (let i = 0; i < options.length; i++) {
            if (typeof options[i].content == "string") {
                options[i].content = (options[i].content);
            }
        }
        return options;
    }

    public CheckCourse(): Promise<number> {
        return this.bank.CheckCourse();
    }

}
