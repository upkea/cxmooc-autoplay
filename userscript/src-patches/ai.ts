import {Application} from "../application";
import {HttpUtils} from "../utils/utils";
import {Option, TopicType} from "./question";

// AI 答题：调用任意 OpenAI 兼容接口（DeepSeek / 硅基流动 / 智谱 / Ollama 都行）
// 配置项存在 localStorage（脚本头部的 config 块）：
//   ai_enable / ai_base / ai_key / ai_model

export interface AIResult {
    ok: boolean;
    correct: Option[];
    raw?: string;
    error?: string;
    vision?: boolean;
}

function cfg(key: string, def: string): string {
    try {
        const val = Application.App.config.GetConfig(key, def);
        if (val === undefined || val === null || String(val).trim() === "") {
            return def;
        }
        return String(val).trim();
    } catch (e) {
        return def;
    }
}

export function AIConfig(): { base: string, key: string, model: string } {
    return {
        base: cfg("ai_base", "https://api.siliconflow.cn/v1").replace(/\/+$/, ""),
        key: cfg("ai_key", ""),
        model: cfg("ai_model", "Qwen/Qwen2.5-7B-Instruct"),
    };
}

export function AIEnabled(): boolean {
    try {
        const c = AIConfig();
        return cfg("ai_enable", "true") != "false" && !!c.key;
    } catch (e) {
        return false;
    }
}

// ===== 视觉读题（绕过超星字体加密的终极方案）=====
// 页面文字被加密字体混淆时，直接截取题目区域图片发给视觉模型读题。
// 默认用智谱 glm-4v-flash（免费）；可用 ai_vision_enabled / ai_vision_base / ai_vision_key / ai_vision_model 覆盖。

export function VisionEnabled(): boolean {
    try {
        if (!AIEnabled()) {
            return false;
        }
        return cfg("ai_vision_enabled", "true") != "false";
    } catch (e) {
        return false;
    }
}

export function VisionConfig(): { base: string, key: string, model: string } {
    const ai = AIConfig();
    let base = cfg("ai_vision_base", "").replace(/\/+$/, "");
    if (!base) {
        base = ai.base;
        // 智谱接口的视觉模型：base 换成智谱
        if (/bigmodel\.cn/i.test(base)) {
            base = base.replace(/\/api\/paas\/v4.*$/, "/api/paas/v4");
        } else if (!/bigmodel\.cn/i.test(base)) {
            base = "https://open.bigmodel.cn/api/paas/v4";
        }
    }
    return {
        base: base,
        key: cfg("ai_vision_key", "") || ai.key,
        model: cfg("ai_vision_model", "glm-4v-flash"),
    };
}

// 截取页面元素区域（桌面版会放大 2 倍截图，文字更清晰）
let captureSeq = 0;
export function CaptureQuestionImage(el: HTMLElement): Promise<string> {
    return new Promise<string>((resolve) => {
        try {
            const w: any = window;
            if (typeof w.cxCapture !== "function") {
                resolve(null);
                return;
            }
            let id = "cxq" + (++captureSeq);
            try {
                el.setAttribute("data-cxq", id);
            } catch (e) {
                resolve(null);
                return;
            }
            w.cxCapture({id: id})
                .then((res: any) => {
                    try {
                        el.removeAttribute("data-cxq");
                    } catch (e) { /* ignore */ }
                    resolve(res && res.dataUrl ? res.dataUrl : null);
                })
                .catch(() => {
                    try {
                        el.removeAttribute("data-cxq");
                    } catch (e) { /* ignore */ }
                    resolve(null);
                });
        } catch (e) {
            resolve(null);
        }
    });
}

export interface VisionResult {
    ok: boolean;
    text?: string;
    error?: string;
}

// 用视觉模型读题：图片 + 提示词 → 回答文本
export function AskAIVision(imageDataUrl: string, prompt: string): Promise<VisionResult> {
    return new Promise<VisionResult>((resolve) => {
        const conf = VisionConfig();
        if (!conf.key) {
            resolve({ok: false, error: "视觉模型未配置 Key"});
            return;
        }
        const url = conf.base + "/chat/completions";
        const body = JSON.stringify({
            model: conf.model,
            temperature: 0,
            max_tokens: 64,
            messages: [{
                role: "user",
                content: [
                    {type: "text", text: prompt},
                    {type: "image_url", image_url: {url: imageDataUrl}},
                ],
            }],
        });
        const finish = (r: VisionResult) => resolve(r);
        try {
            let gx = (<any>window).GM_xmlhttpRequest;
            if (typeof gx == "function") {
                gx({
                    method: "POST",
                    url: url,
                    headers: {"Content-Type": "application/json", "Authorization": "Bearer " + conf.key},
                    data: body,
                    timeout: 40000,
                    onload: (resp: any) => {
                        try {
                            const j = JSON.parse(resp.responseText);
                            const content = (j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || "";
                            if (!content) {
                                finish({ok: false, error: "空回复 HTTP " + resp.status});
                                return;
                            }
                            finish({ok: true, text: String(content)});
                        } catch (e) {
                            finish({ok: false, error: "解析失败 HTTP " + resp.status});
                        }
                    },
                    onerror: () => finish({ok: false, error: "网络错误"}),
                    ontimeout: () => finish({ok: false, error: "超时"}),
                });
                return;
            }
            fetch(url, {
                method: "POST",
                headers: {"Content-Type": "application/json", "Authorization": "Bearer " + conf.key},
                body: body,
            }).then(async (r) => {
                const text = await r.text();
                try {
                    const j = JSON.parse(text);
                    const content = (j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || "";
                    finish(content ? {ok: true, text: String(content)} : {ok: false, error: "空回复 HTTP " + r.status});
                } catch (e) {
                    finish({ok: false, error: "解析失败 HTTP " + r.status});
                }
            }).catch(() => finish({ok: false, error: "网络错误"}));
        } catch (e) {
            finish({ok: false, error: String(e)});
        }
    });
}

function typeText(type: TopicType): string {
    switch (type) {
        case 1:
            return "单选题";
        case 2:
            return "多选题";
        case 3:
            return "判断题";
        case 4:
            return "填空题";
        default:
            return "题目";
    }
}

export function BuildAIPrompt(topic: string, type: TopicType, options: Option[]): string {
    let prompt = "";
    // 给弱模型一个格式示例，避免它把推理过程当答案
    prompt += "【示例】\n";
    prompt += "题型：单选题\n题目：下列哪一项是哺乳动物？\n选项：\nA. 鲨鱼\nB. 鲸鱼\nC. 鳄鱼\nD. 金鱼\n答案：B\n\n";
    prompt += "【题目】\n";
    prompt += "题型：" + typeText(type) + "\n";
    prompt += "题目：" + topic + "\n";
    if (options && options.length > 0) {
        prompt += "选项：\n";
        for (let i = 0; i < options.length; i++) {
            prompt += String(options[i].option) + ". " + String(options[i].content || "") + "\n";
        }
    }
    prompt += "\n作答要求：\n";
    prompt += "1. 先在心里逐项判断每个选项，不要输出长篇分析；\n";
    prompt += "2. 最后单独一行输出最终答案，格式必须是「答案：X」；\n";
    switch (type) {
        case 1:
            prompt += "3. 单选：只有一个正确项，X 是一个字母，例如「答案：B」。\n";
            break;
        case 2:
            prompt += "3. 多选：正确项通常 2~4 个，不要一律全选；题目问「哪两种/哪几项」时按题目要求的数量给，例如「答案：ABD」。\n";
            break;
        case 3:
            prompt += "3. 判断：X 是「对」或「错」，例如「答案：对」。\n";
            break;
        case 4:
            prompt += "3. 填空：每个空一行，每行都以「答案：」开头，例如第 1 空「答案：第一个空的内容」。不要带序号。\n";
            break;
        default:
            prompt += "3. X 是答案本身。\n";
    }
    return prompt;
}

function uniq(arr: string[]): string[] {
    const res: string[] = [];
    for (let i = 0; i < arr.length; i++) {
        if (res.indexOf(arr[i]) < 0) {
            res.push(arr[i]);
        }
    }
    return res;
}

// 把 AI 的回复解析成 correct 选项
export function ParseAIAnswer(raw: string, type: TopicType, options: Option[]): Option[] {
    const text = (raw || "").trim();
    if (!text) {
        return null;
    }
    // 提示词要求最后输出「答案：X」，优先只解析这一段，避免推理过程里的字母干扰
    let finalAns = "";
    try {
        let re = /(?:正确答案|答案)\s*[:：]\s*([^\n]*)/g;
        let m: RegExpExecArray;
        while ((m = re.exec(text)) !== null) {
            if (m[1] && m[1].trim()) {
                finalAns = m[1].trim();
            }
        }
    } catch (e) {
        finalAns = "";
    }
    const textAns = finalAns || text;
    const validLetters = uniq((options || []).map(o => String(o.option || "").toUpperCase())
        .filter(s => /^[A-H]$/.test(s)));

    if (type == 3) {
        const neg = /(错|错误|不对|不正确|×|✗|✘|FALSE)/i.test(textAns);
        const pos = /(对|正确|√|✓|✔|TRUE)/i.test(textAns);
        if (neg && !pos) {
            return [{option: false, content: false}];
        }
        if (pos && !neg) {
            return [{option: true, content: true}];
        }
        return textAns.indexOf("对") >= 0 ? [{option: true, content: true}] : [{option: false, content: false}];
    }

    if (type == 4) {
        // 优先取所有「答案：xxx」行（每空一行）
        let ansLines: string[] = [];
        try {
            let lines = text.split(/\r?\n/);
            for (let i = 0; i < lines.length; i++) {
                let m = lines[i].match(/(?:正确答案|答案)\s*[:：]\s*(.+)$/);
                if (m && m[1] && m[1].trim()) {
                    ansLines.push(m[1].trim());
                }
            }
        } catch (e) {
            ansLines = [];
        }
        let source = ansLines.length > 0 ? ansLines : text.split(/\r?\n/)
            .map(s => s.replace(/^\s*(?:第)?\s*\d+\s*(?:空|题)?\s*[.、:：)）]\s*/, "").trim())
            .filter(s => s.length > 0 && !/^\d+$/.test(s));
        const n = (options && options.length) ? options.length : source.length;
        const res: Option[] = [];
        for (let i = 0; i < n; i++) {
            const content = source[i] !== undefined ? source[i] : (source[0] || "");
            res.push({option: String(i + 1), content: content});
        }
        if (res.length == 1) {
            res[0].option = "1";
        }
        return res;
    }

    // 单选/多选：先试内容匹配，再试字母
    const byContent: Option[] = [];
    for (let i = 0; i < (options || []).length; i++) {
        const content = String(options[i].content || "").trim();
        if (content.length >= 2 && textAns.indexOf(content) >= 0) {
            byContent.push({option: options[i].option, content: ""});
        }
    }
    if (byContent.length > 0 && (type == 2 || byContent.length == 1)) {
        return byContent;
    }

    // 字母：优先整行只有字母的情况
    const lines = textAns.split(/\r?\n/).map(s => s.trim()).filter(s => s.length > 0);
    let letters: string[] = [];
    for (let i = 0; i < lines.length; i++) {
        if (/^[A-Ha-h\s.、,，]+$/.test(lines[i])) {
            letters = lines[i].toUpperCase().match(/[A-H]/g) || [];
        }
    }
    if (letters.length == 0) {
        letters = textAns.toUpperCase().match(/\b[A-H]\b/g) || [];
    }
    letters = uniq(letters).filter(l => validLetters.length == 0 || validLetters.indexOf(l) >= 0);
    if (letters.length == 0) {
        return null;
    }
    if (type == 1) {
        letters = [letters[0]];
    }
    return letters.map(l => ({option: l, content: ""}));
}

export function AskAI(topic: string, type: TopicType, options: Option[]): Promise<AIResult> {
    return new Promise<AIResult>(resolve => {
        const conf = AIConfig();
        if (!conf.key) {
            return resolve({ok: false, correct: null, error: "未配置 ai_key"});
        }
        const body = JSON.stringify({
            model: conf.model,
            temperature: 0,
            max_tokens: 700,
            messages: [
                {role: "system", content: "你是严谨的网课答题助手：先判断，再按格式输出最终答案。"},
                {role: "user", content: BuildAIPrompt(topic, type, options)},
            ],
        });
        try {
            HttpUtils.HttpPost(conf.base + "/chat/completions", body, {
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": "Bearer " + conf.key,
                },
                json: true,
                success: (res: any) => {
                    try {
                        let content = "";
                        if (res && res.choices && res.choices.length > 0) {
                            if (res.choices[0].message) {
                                content = res.choices[0].message.content || "";
                            } else if (res.choices[0].text) {
                                content = res.choices[0].text;
                            }
                        }
                        if (!content && typeof res == "string") {
                            content = res;
                        }
                        if (!content) {
                            return resolve({ok: false, correct: null, error: "AI 返回为空", raw: JSON.stringify(res)});
                        }
                        const correct = ParseAIAnswer(content, type, options);
                        Application.App.log.Debug("AI 原始回复", content);
                        if (!correct) {
                            return resolve({ok: false, correct: null, raw: content, error: "无法解析 AI 回复"});
                        }
                        return resolve({ok: true, correct: correct, raw: content});
                    } catch (e) {
                        return resolve({ok: false, correct: null, error: String(e)});
                    }
                },
                error: () => {
                    return resolve({ok: false, correct: null, error: "网络请求失败（检查 ai_base / 网络 / 代理）"});
                },
            });
        } catch (e) {
            return resolve({ok: false, correct: null, error: "请求发不出去：" + ((e && e.message) ? e.message : e)});
        }
    });
}

// 测试 AI 接口是否连得上：发一个极小的请求，返回耗时和失败原因
// 面板里的「测试连接」和页面加载时的自动检测都用它
export interface AITestResult {
    ok: boolean;
    ms: number;
    status?: number;
    error?: string;
}

export function TestAIConnection(conf?: { base: string, key: string, model: string }): Promise<AITestResult> {
    return new Promise<AITestResult>(resolve => {
        conf = conf || AIConfig();
        const base = (conf.base || "").replace(/\/+$/, "");
        const t0 = Date.now();
        const finish = (r: AITestResult) => {
            r.ms = Date.now() - t0;
            resolve(r);
        };
        if (!conf.key) {
            return finish({ok: false, ms: 0, error: "还没填 API Key"});
        }
        if (!base) {
            return finish({ok: false, ms: 0, error: "还没填接口地址"});
        }
        const url = base + "/chat/completions";
        const payload = JSON.stringify({
            model: conf.model,
            max_tokens: 4,
            temperature: 0,
            messages: [{role: "user", content: "ping"}],
        });
        const handle = (status: number, text: string) => {
            if (status >= 200 && status < 300) {
                return finish({ok: true, ms: 0, status: status});
            }
            if (status == 401 || status == 403) {
                return finish({ok: false, ms: 0, status: status, error: "Key 不对或没有权限(HTTP " + status + ")"});
            }
            if (status == 404) {
                return finish({ok: false, ms: 0, status: status, error: "接口地址不对(HTTP 404)，检查接口地址"});
            }
            if (status == 429) {
                return finish({ok: false, ms: 0, status: status, error: "请求太频繁或额度用完了(HTTP 429)"});
            }
            if (status == 0) {
                return finish({ok: false, ms: 0, status: status, error: "网络错误：连不上接口"});
            }
            return finish({ok: false, ms: 0, status: status, error: "HTTP " + status + "：" + (text || "").slice(0, 80)});
        };
        try {
            let gx = (<any>window).GM_xmlhttpRequest;
            if (typeof gx == "function") {
                gx({
                    method: "POST",
                    url: url,
                    headers: {"Content-Type": "application/json", "Authorization": "Bearer " + conf.key},
                    data: payload,
                    timeout: 15000,
                    onload: (resp: any) => handle(resp.status, resp.responseText),
                    onerror: () => finish({ok: false, ms: 0, error: "网络错误：连不上接口"}),
                    ontimeout: () => finish({ok: false, ms: 0, error: "请求超时（15 秒）"}),
                });
                return;
            }
            fetch(url, {
                method: "POST",
                headers: {"Content-Type": "application/json", "Authorization": "Bearer " + conf.key},
                body: payload,
            }).then(async r => {
                const text = await r.text();
                handle(r.status, text);
            }).catch(() => {
                finish({ok: false, ms: 0, error: "网络错误：连不上接口"});
            });
        } catch (e) {
            finish({ok: false, ms: 0, error: String(e)});
        }
    });
}
