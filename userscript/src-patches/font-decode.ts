// 学习通「字体加密」解密（重写版）
//
// 学习通把题目文字换成私有区码点（U+E000 附近），再用自定义字体重映射显示正确字形。
// 直接读 innerText 得到乱码；AI 自然答不对。
//
// 正确解法（Canvas 字形对比法）：
//   1. 找到页面加密字体（优先取 .font-cxsecret 元素实际使用的那个 @font-face）；
//   2. 乱码字符用「加密字体」渲染 → 得到它的真实字形指纹；
//   3. 常用汉字/字母/符号用「系统字体」渲染 → 得到正确字形指纹；
//   4. 按 32x32 二值图最近距离（汉明距离）匹配，距离太远的保持原样不替换；
//   5. 把页面上 .font-cxsecret 的文字换成正确字符，并去掉加密字体类名。
//
// 另外处理两种情况：
//   - 页面文字本来就是正常汉字（只有字体被换成乱序字体）：直接去掉加密类名即可显示正常；
//   - 字体数据无效（渲染全是空白）：放弃解密，绝不破坏原文本。
import { Application } from "@App/internal/application";

const FONT_NAME = "cxfontdec";
const SYS_FONT = '"Microsoft YaHei", "SimHei", "PingFang SC", sans-serif';

// 候选字符集：常用汉字 + 数字字母 + 常见符号
const COMMON_CHARS =
    "的一是在不了有和人这中大为上个国我以要他时来用们生到作地于出就分对成会可主发年动同工也能下过子说产种面而方后多定行学法所民得经十三之进着等部度家电力里如水化高自二理起小物实现加量都两体制机当使点从业本去把性好应开它合还因由其些然前外天政四日那社义事平形相全表间样与关各重新线内数正心反你明看原又么利比或但质气第向道命此变条只没结解问意建月公无系军很情者最立代想已通并提直题党程展五果料象员革位入常文总次品式活设及管特件长求老头基资边流路级少图山统接知较将组见计别她手角期根论运农指几九区强放决西被干做必战先回则任取据处队南给色光门即保治北造百规热领七海口东导器压志世金增争济阶油思术极交受联什认六共权收证改清己美再采转更单风切打白教速花带安场身车例真务具万每目至达走积示议声报斗完类八离华名确才科张信马节话米整空元况今集温传土许步群广石记需段研界拉林律叫且究观越织装影算低持音众书布复容儿须际商非验连断深难近千周委素技备半办青省列习响约支般史感劳便团往酸历市克何除消构府称太准精值号率族维划选标写存候毛亲快效斯院查江型眼王按格养易置派层片始却专状育厂京识适属圆包火住调满县局照参红细引听该铁价严龙飞" +
    "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz" +
    "，。、；：？！“”‘’（）《》〈〉【】[]{}·—…%＋－×÷＝√（）+-×÷=%/\\.,;:!?_*&#@" +
    "一二三四五六七八九十百千万亿年月日时分秒甲乙丙丁戊己庚辛壬癸子丑寅卯辰巳午未申酉戌亥";

let _canvas: HTMLCanvasElement = null;
let _ctx: CanvasRenderingContext2D = null;

// 用指定字体渲染一个字符，返回 32x32 二值化的字形指纹（'1'=有笔画）
function glyphBits(doc: Document, ch: string, fontFamily: string): string {
    if (!_canvas) {
        _canvas = doc.createElement("canvas");
        _canvas.width = 32;
        _canvas.height = 32;
        _ctx = <CanvasRenderingContext2D>_canvas.getContext("2d");
    }
    _ctx.clearRect(0, 0, 32, 32);
    _ctx.font = '28px ' + fontFamily;
    _ctx.textAlign = "center";
    _ctx.textBaseline = "middle";
    _ctx.fillStyle = "#000";
    _ctx.fillText(ch, 16, 17);
    let d = _ctx.getImageData(0, 0, 32, 32).data;
    let s = "";
    for (let i = 0; i < d.length; i += 4) {
        s += d[i + 3] > 120 ? "1" : "0";
    }
    return s;
}

function bitCount(s: string): number {
    let n = 0;
    for (let i = 0; i < s.length; i++) {
        if (s.charAt(i) == "1") {
            n++;
        }
    }
    return n;
}

// 汉明距离（两图不同的像素数）
function hamDist(a: string, b: string): number {
    let n = 0;
    let len = Math.min(a.length, b.length);
    for (let i = 0; i < len; i++) {
        if (a.charAt(i) != b.charAt(i)) {
            n++;
        }
    }
    return n + Math.abs(a.length - b.length);
}

function isPrivateUse(ch: string): boolean {
    let c = ch.charCodeAt(0);
    return (c >= 0xE000 && c <= 0xF8FF) || (c >= 0xF0000 && c <= 0x10FFFF);
}

function pickBase64(cssText: string): string {
    if (!cssText) {
        return null;
    }
    let m = cssText.match(/base64,([^'")\s;]+)/);
    return m ? m[1] : null;
}

// 找出页面实际使用的加密字体 base64：优先匹配元素实际 font-family 的 @font-face
function extractFontData(doc: Document, win: any, els: NodeListOf<Element>): string {
    let wantedFamily = "";
    try {
        if (els && els.length > 0) {
            let cs = (<any>win).getComputedStyle(els[0]);
            wantedFamily = String(cs && cs.fontFamily ? cs.fontFamily : "").toLowerCase();
        }
    } catch (e) {
        wantedFamily = "";
    }
    let candidates: Array<{ family: string, b64: string }> = [];
    // 1) 内联 <style>
    try {
        let styles = doc.querySelectorAll("style");
        for (let i = 0; i < styles.length; i++) {
            let t = styles[i].textContent || "";
            if (t.indexOf("@font-face") < 0) {
                continue;
            }
            let blocks = t.match(/@font-face\s*\{[^}]*\}/g) || [];
            for (let b = 0; b < blocks.length; b++) {
                let b64 = pickBase64(blocks[b]);
                if (b64) {
                    let fam = (blocks[b].match(/font-family\s*:\s*['"]?([^'"；;}]+)/) || [])[1] || "";
                    candidates.push({ family: fam.toLowerCase(), b64: b64 });
                }
            }
        }
    } catch (e) {
        // ignore
    }
    // 2) cssRules
    try {
        let sheets = doc.styleSheets;
        for (let i = 0; i < sheets.length; i++) {
            let rules: any = null;
            try {
                rules = (<any>sheets[i]).cssRules;
            } catch (e) {
                rules = null;
            }
            if (!rules) {
                continue;
            }
            for (let j = 0; j < rules.length; j++) {
                let css = (rules[j] && rules[j].cssText) || "";
                if (css.indexOf("@font-face") < 0) {
                    continue;
                }
                let b64 = pickBase64(css);
                if (b64) {
                    let fam = (css.match(/font-family\s*:\s*['"]?([^'"；;}]+)/) || [])[1] || "";
                    candidates.push({ family: fam.toLowerCase(), b64: b64 });
                }
            }
        }
    } catch (e) {
        // ignore
    }
    if (candidates.length == 0) {
        // 3) 兜底：整个 HTML 里搜
        try {
            let html = doc.documentElement.innerHTML || "";
            let m = html.match(/base64,([^'")\s;]{200,})/);
            if (m) {
                return "data:font/ttf;base64," + m[1];
            }
        } catch (e) {
            // ignore
        }
        return null;
    }
    // 优先：family 出现在元素 font-family 里的
    if (wantedFamily) {
        for (let i = 0; i < candidates.length; i++) {
            let fam = candidates[i].family.replace(/['"]/g, "").trim();
            if (fam && wantedFamily.indexOf(fam) >= 0) {
                return "data:font/ttf;base64," + candidates[i].b64;
            }
        }
    }
    return "data:font/ttf;base64," + candidates[0].b64;
}

// 解密一页里的加密文字；成功返回 true
export async function DecodeChaoxingFont(win: any): Promise<boolean> {
    try {
        let doc: Document = win && win.document;
        if (!doc) {
            return false;
        }
        let els = doc.querySelectorAll(".font-cxsecret");
        if (!els || els.length == 0) {
            return false;
        }
        if ((<any>win).__cxFontDecodeDone) {
            return true;
        }

        // 收集页面上的目标字符
        let targets: string[] = [];
        let seen: { [k: string]: boolean } = {};
        for (let i = 0; i < els.length; i++) {
            let t = String(els[i].textContent || "");
            for (let k = 0; k < t.length; k++) {
                let ch = t.charAt(k);
                if (!seen[ch] && ch.trim() !== "") {
                    seen[ch] = true;
                    targets.push(ch);
                }
            }
        }
        if (targets.length == 0) {
            return false;
        }

        // 情况 A：文字本来就是正常汉字/字母（只是被换成乱序字体渲染）→ 去掉类名即可正常显示
        let puaCount = 0;
        for (let i = 0; i < targets.length; i++) {
            if (isPrivateUse(targets[i])) {
                puaCount++;
            }
        }
        if (puaCount * 2 < targets.length) {
            for (let i = 0; i < els.length; i++) {
                let el = <HTMLElement>els[i];
                el.classList.remove("font-cxsecret");
            }
            (<any>win).__cxFontDecodeDone = true;
            Application.App.log.Info("字体加密为「正常文字+乱序字体」，已直接还原显示");
            return true;
        }

        // 情况 B：私有区乱码 → Canvas 对比解密
        let fontData = extractFontData(doc, win, els);
        if (!fontData) {
            Application.App.log.Warn("检测到字体加密，但没找到字体定义，跳过解密");
            return false;
        }
        let FF: any = (<any>win).FontFace || (<any>window).FontFace;
        if (!FF) {
            return false;
        }
        try {
            let ff = new FF(FONT_NAME, "url(" + fontData + ")");
            doc.fonts.add(ff);
            await ff.load();
        } catch (e) {
            Application.App.log.Warn("加密字体加载失败：" + ((e && e.message) ? e.message : e));
            return false;
        }

        // 1) 乱码字符用加密字体渲染
        let tHashes: { [k: string]: string } = {};
        let blankCount = 0;
        let distinct: { [k: string]: boolean } = {};
        for (let i = 0; i < targets.length; i++) {
            try {
                let bits = glyphBits(doc, targets[i], FONT_NAME);
                tHashes[targets[i]] = bits;
                if (bitCount(bits) < 6) {
                    blankCount++;
                }
                distinct[bits] = true;
            } catch (e) {
                // ignore
            }
        }
        let distinctNum = 0;
        for (let k in distinct) {
            if (distinct.hasOwnProperty(k)) {
                distinctNum++;
            }
        }
        // 字体数据无效（全空白）或所有字渲染成同一形状 → 放弃，绝不破坏原文本
        if (blankCount == targets.length || (targets.length > 2 && distinctNum <= 1)) {
            Application.App.log.Warn("加密字体数据无效（字形全空白/全相同），已跳过解密，题目保持原样");
            return false;
        }

        Application.App.log.Info("检测到字体加密，正在还原 " + targets.length + " 个字符...");

        // 2) 常用字用系统字体渲染，做最近距离匹配
        let resolved: { [k: string]: string } = {};
        let unresolved: string[] = [];
        for (let ti = 0; ti < targets.length; ti++) {
            let t = targets[ti];
            let targetBits = tHashes[t];
            if (!targetBits) {
                continue;
            }
            if (bitCount(targetBits) < 6) {
                continue; // 空白字保持原样
            }
            let bestChar = "";
            let bestDist = 1e9;
            for (let ci = 0; ci < COMMON_CHARS.length; ci++) {
                let ch = COMMON_CHARS.charAt(ci);
                let bits = "";
                try {
                    bits = glyphBits(doc, ch, SYS_FONT);
                } catch (e) {
                    continue;
                }
                let dist = hamDist(targetBits, bits);
                if (dist < bestDist) {
                    bestDist = dist;
                    bestChar = ch;
                    if (dist == 0) {
                        break;
                    }
                }
            }
            // 距离阈值：1024 像素里差异超过 320（约 31%）视为不可信，保持原样
            if (bestChar && bestDist <= 320) {
                resolved[t] = bestChar;
            } else {
                unresolved.push(t);
            }
        }

        let done = 0;
        for (let k in resolved) {
            if (resolved.hasOwnProperty(k)) {
                done++;
            }
        }
        if (done == 0) {
            Application.App.log.Warn("字体解密没匹配上（可能含非常用字），题目保持原样");
            return false;
        }
        // 保护：全部解析成同一个字说明匹配失效，别破坏原文
        let uniqVals: { [k: string]: boolean } = {};
        for (let k in resolved) {
            if (resolved.hasOwnProperty(k)) {
                uniqVals[resolved[k]] = true;
            }
        }
        let uniqCount = 0;
        for (let k in uniqVals) {
            if (uniqVals.hasOwnProperty(k)) {
                uniqCount++;
            }
        }
        if (done > 2 && uniqCount <= 1) {
            Application.App.log.Warn("字体解密结果异常（全被解析成同一个字），已放弃替换");
            return false;
        }

        // 3) 替换页面文字并去掉加密字体类名
        for (let i = 0; i < els.length; i++) {
            let el = <HTMLElement>els[i];
            let text = String(el.textContent || "");
            for (let t in resolved) {
                if (resolved.hasOwnProperty(t)) {
                    text = text.split(t).join(resolved[t]);
                }
            }
            el.textContent = text;
            el.classList.remove("font-cxsecret");
        }
        (<any>win).__cxFontDecodeDone = true;
        Application.App.log.Info("字体解密完成，还原 " + done + " 个字符（未匹配 " + unresolved.length + " 个保持原样）");
        return true;
    } catch (e) {
        return false;
    }
}
