// 学习通「字体加密」解密（第四版：直接用页面已加载的加密字体）
//
// 机制：DOM 里存的是打乱后的字符，页面用 @font-face("font-cxsecret") 把每个错误码点
// 渲染成正确字形。所以：
//   1. 不能删 .font-cxsecret 类名（删了页面就显示乱码）——除非已经成功替换成正确文字；
//   2. 解密 = 用页面自己的字体（已注册在 document.fonts，canvas 可直接引用）渲染乱码字，
//      和系统字体渲染的候选字做 32x32 字形比对，取最近距离；
//   3. 严格模式：解析成功率不足或匹配质量差时，什么都不做，页面保持原样。
import { Application } from "@App/internal/application";

const SYS_FONT = '"Microsoft YaHei", "SimHei", "PingFang SC", sans-serif';

const COMMON_CHARS =
    "的一是在不了有和人这中大为上个国我以要他时来用们生到作地于出就分对成会可主发年动同工也能下过子说产种面而方后多定行学法所民得经十三之进着等部度家电力里如水化高自二理起小物实现加量都两体制机当使点从业本去把性好应开它合还因由其些然前外天政四日那社义事平形相全表间样与关各重新线内数正心反你明看原又么利比或但质气第向道命此变条只没结解问意建月公无系军很情者最立代想已通并提直题党程展五果料象员革位入常文总次品式活设及管特件长求老头基资边流路级少图山统接知较将组见计别她手角期根论运农指几九区强放决西被干做必战先回则任取据处队南给色光门即保治北造百规热领七海口东导器压志世金增争济阶油思术极交受联什认六共权收证改清己美再采转更单风切打白教速花带安场身车例真务具万每目至达走积示议声报斗完类八离华名确才科张信马节话米整空元况今集温传土许步群广石记需段研界拉林律叫且究观越织装影算低持音众书布复容儿须际商非验连断深难近千周委素技备半办青省列习响约支般史感劳便团往酸历市克何除消构府称太准精值号率族维划选标写存候毛亲快效斯院查江型眼王按格养易置派层片始却专状育厂京识适属圆包火住调满县局照参红细引听该铁价严龙飞" +
    "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz" +
    "，。、；：？！“”‘’（）《》〈〉【】[]{}·—…%＋－×－×÷＝√/*#@&";

const CANDIDATE_FONTS = [
    '"SimSun", "宋体", serif',
    '"SimHei", "黑体", sans-serif',
    '"KaiTi", "楷体", serif',
    SYS_FONT,
];

let _canvas: HTMLCanvasElement = null;
let _ctx: CanvasRenderingContext2D = null;

function glyphBits(doc: Document, ch: string, fontFamily: string): string {
    if (!_canvas) {
        _canvas = doc.createElement("canvas");
        _canvas.width = 32;
        _canvas.height = 32;
        _ctx = <CanvasRenderingContext2D>_canvas.getContext("2d");
    }
    _ctx.clearRect(0, 0, 32, 32);
    _ctx.font = "28px " + fontFamily;
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

// 取出元素实际使用的第一个字体名（去掉引号）
function firstFamilyName(fontFamily: string): string {
    let f = String(fontFamily || "").split(",")[0] || "";
    f = f.replace(/['"]/g, "").trim();
    return f;
}

// 字形缓存：同一字体家族下，已还原的「乱码字→正确字」映射全局复用，
// 每道新题只对没见过的字做 Canvas 比对（又快又不漏题）。
let charMapCache: { [family: string]: { [garbled: string]: string } } = {};
let candidateCache: { [font: string]: Array<{ ch: string, bits: string }> } = {};

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

        // 页面实际使用的加密字体名
        let family = "";
        try {
            let cs = (<any>win).getComputedStyle(els[0]);
            family = firstFamilyName(String((cs && cs.fontFamily) || ""));
        } catch (e) {
            family = "";
        }
        try {
            console.log("[CXFONT] enter family=" + family + " els=" + els.length);
        } catch (e) { /* ignore */ }
        if (!family) {
            return false;
        }

        // 收集目标字符
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

        // 等页面字体就绪（最多 2 秒）
        try {
            let fonts: any = doc.fonts;
            if (fonts && fonts.ready) {
                await Promise.race([fonts.ready, new Promise((res) => setTimeout(res, 2000))]);
            }
        } catch (e) {
            // ignore
        }

        // 目标字符用「页面加密字体」渲染；字体可能还在异步加载，blank 时重试最多 4 次
        let quoted = '"' + family + '"';
        let tHashes: { [k: string]: string } = {};
        let blankCount = 0;
        let sampleText = String(els[0].textContent || "").slice(0, 100);
        for (let attempt = 0; attempt < 4; attempt++) {
            try {
                let fonts: any = doc.fonts;
                if (fonts && typeof fonts.load === "function") {
                    await Promise.race([
                        fonts.load("28px " + quoted, sampleText),
                        new Promise((res) => setTimeout(res, 1200)),
                    ]);
                }
            } catch (e) {
                // ignore
            }
            tHashes = {};
            blankCount = 0;
            for (let i = 0; i < targets.length; i++) {
                try {
                    let bits = glyphBits(doc, targets[i], quoted);
                    tHashes[targets[i]] = bits;
                    if (bitCount(bits) < 6) {
                        blankCount++;
                    }
                } catch (e) {
                    // ignore
                }
            }
            try {
                console.log("[CXFONT] try#" + (attempt + 1) + " blank=" + blankCount + "/" + targets.length);
            } catch (e) { /* ignore */ }
            if (blankCount <= targets.length * 0.5) {
                break;
            }
            await new Promise((res) => setTimeout(res, 500));
        }
        // 加密字体渲染不出字形 → 说明拿错了字体（或页面字体未生效），保持原样
        if (blankCount > targets.length * 0.5) {
            console.log("[CXFONT] font renders blank, skip (keep page untouched)");
            return false;
        }

        // 增量匹配：缓存里已有的字直接复用，只对没见过的字跑 Canvas 比对
        let getTable = (font: string): Array<{ ch: string, bits: string }> => {
            if (candidateCache.hasOwnProperty(font)) {
                return candidateCache[font];
            }
            let table: Array<{ ch: string, bits: string }> = [];
            for (let ci = 0; ci < COMMON_CHARS.length; ci++) {
                let ch = COMMON_CHARS.charAt(ci);
                try {
                    table.push({ ch: ch, bits: glyphBits(doc, ch, font) });
                } catch (e) {
                    // ignore
                }
            }
            candidateCache[font] = table;
            return table;
        };

        let cache = charMapCache[family] || (charMapCache[family] = {});
        let newCount = 0;
        for (let ti = 0; ti < targets.length; ti++) {
            let t = targets[ti];
            if (cache.hasOwnProperty(t)) {
                continue;
            }
            let targetBits = tHashes[t];
            if (!targetBits || bitCount(targetBits) < 6) {
                continue;
            }
            let bestChar = "";
            let bestDist = 1e9;
            for (let fi = 0; fi < CANDIDATE_FONTS.length; fi++) {
                let table = getTable(CANDIDATE_FONTS[fi]);
                for (let ci = 0; ci < table.length; ci++) {
                    let dist = hamDist(targetBits, table[ci].bits);
                    if (dist < bestDist) {
                        bestDist = dist;
                        bestChar = table[ci].ch;
                        if (dist == 0) {
                            break;
                        }
                    }
                }
                if (bestDist <= 40) {
                    break;
                }
            }
            if (bestChar && bestDist <= 240) {
                cache[t] = bestChar;
                newCount++;
            }
        }

        let done = 0;
        for (let ti = 0; ti < targets.length; ti++) {
            if (cache.hasOwnProperty(targets[ti])) {
                done++;
            }
        }
        try {
            console.log("[CXFONT] cached=" + done + "/" + targets.length + " newMatched=" + newCount);
        } catch (e) { /* ignore */ }
        if (done == 0) {
            console.log("[CXFONT] nothing resolved, keep page untouched");
            return false;
        }
        let rate = done / targets.length;

        // 替换页面文字；只有解析率高时才去掉加密字体类名（否则保留页面字体渲染残字）
        for (let i = 0; i < els.length; i++) {
            let el = <HTMLElement>els[i];
            let text = String(el.textContent || "");
            for (let t in cache) {
                if (cache.hasOwnProperty(t)) {
                    text = text.split(t).join(cache[t]);
                }
            }
            el.textContent = text;
            if (rate >= 0.95) {
                el.classList.remove("font-cxsecret");
            }
        }
        Application.App.log.Info("字体解密完成，还原 " + done + "/" + targets.length + " 个字符" + (rate >= 0.95 ? "（已去加密字体）" : "（文本已替换，字体类名保留）"));
        return true;
    } catch (e) {
        return false;
    }
}
