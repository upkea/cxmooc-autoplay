// 学习通「字体加密」解密（第三版，稳妥优先）
//
// 学习通防作弊字体的真实形态（两种都可能出现）：
//   A. DOM 里是错别字（例如「揵悻」实为「抽象」），靠 @font-face 加密字体把错误码点
//      渲染成正确字形。此时 innerText 是错字，必须用 Glyph 对比还原成正确文字。
//   B. DOM 里本来就是正确文字，只是被换成乱序字体显示——去掉类名即可。
//
// 判断依据：用加密字体渲染目标字符 vs 用系统字体渲染同一字符，字形差异是否显著。
//   - 差异显著 → 字体在重映射 → 走 Canvas 对比还原（乱码字用加密字体、候选字用系统字体、
//     按 32x32 二值图汉明距离最近匹配，距离超过阈值的不替换）；
//   - 差异不显著且文字是普通汉字 → 情况 B，去掉 encrypt 类名；
//   - 字体拿不到 / 数据无效 / 匹配失败 → 什么都不做，绝不破坏页面原貌。
import { Application } from "@App/internal/application";

const FONT_NAME = "cxfontdec";
const SYS_FONT = '"Microsoft YaHei", "SimHei", "PingFang SC", sans-serif';

const COMMON_CHARS =
    "的一是在不了有和人这中大为上个国我以要他时来用们生到作地于出就分对成会可主发年动同工也能下过子说产种面而方后多定行学法所民得经十三之进着等部度家电力里如水化高自二理起小物实现加量都两体制机当使点从业本去把性好应开它合还因由其些然前外天政四日那社义事平形相全表间样与关各重新线内数正心反你明看原又么利比或但质气第向道命此变条只没结解问意建月公无系军很情者最立代想已通并提直题党程展五果料象员革位入常文总次品式活设及管特件长求老头基资边流路级少图山统接知较将组见计别她手角期根论运农指几九区强放决西被干做必战先回则任取据处队南给色光门即保治北造百规热领七海口东导器压志世金增争济阶油思术极交受联什认六共权收证改清己美再采转更单风切打白教速花带安场身车例真务具万每目至达走积示议声报斗完类八离华名确才科张信马节话米整空元况今集温传土许步群广石记需段研界拉林律叫且究观越织装影算低持音众书布复容儿须际商非验连断深难近千周委素技备半办青省列习响约支般史感劳便团往酸历市克何除消构府称太准精值号率族维划选标写存候毛亲快效斯院查江型眼王按格养易置派层片始却专状育厂京识适属圆包火住调满县局照参红细引听该铁价严龙飞" +
    "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz" +
    "，。、；：？！“”‘’（）《》〈〉【】[]{}·—…%＋－×÷＝√（）+-×÷=%/\\.,;:!?_*&#@" +
    "一二三四五六七八九十百千万亿年月日时分秒甲乙丙丁戊己庚辛壬癸子丑寅卯辰巳午未申酉戌亥";

let _canvas: HTMLCanvasElement = null;
let _ctx: CanvasRenderingContext2D = null;

// 用指定字体渲染一个字符，返回 32x32 二值化字形指纹
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

function isPrivateUse(ch: string): boolean {
    let c = ch.charCodeAt(0);
    return (c >= 0xE000 && c <= 0xF8FF) || (c >= 0xF0000 && c <= 0x10FFFF);
}

// 从 @font-face 里提取 base64 数据（有专门 base64 则优先）
function pickBase64(cssText: string): string {
    let m = cssText.match(/base64,([^'")\s;]+)/);
    return m ? m[1] : null;
}

// 提取加密字体：优先匹配元素的 font-family；返回 data: 或 http(s) URL
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
    let candidates: Array<{ family: string, src: string }> = [];
    let addFromCss = (css: string) => {
        let blocks = css.match(/@font-face\s*\{[^}]*\}/g) || [];
        for (let b = 0; b < blocks.length; b++) {
            let block = blocks[b];
            let fam = (block.match(/font-family\s*:\s*['"]?([^'"；;}]+)/) || [])[1] || "";
            let b64 = pickBase64(block);
            if (b64) {
                candidates.push({ family: fam.toLowerCase(), src: "data:font/ttf;base64," + b64 });
                continue;
            }
            let url = (block.match(/url\(\s*['"]?([^'")]+)['"]?\s*\)/) || [])[1];
            if (url) {
                candidates.push({ family: fam.toLowerCase(), src: url });
            }
        }
    };
    // 1) 内联 <style>
    try {
        let styles = doc.querySelectorAll("style");
        for (let i = 0; i < styles.length; i++) {
            addFromCss(styles[i].textContent || "");
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
            let text = "";
            for (let j = 0; j < rules.length; j++) {
                text += ((rules[j] && rules[j].cssText) || "") + "\n";
            }
            addFromCss(text);
        }
    } catch (e) {
        // ignore
    }
    if (candidates.length == 0) {
        return null;
    }
    // 优先 family 匹配
    if (wantedFamily) {
        for (let i = 0; i < candidates.length; i++) {
            let fam = candidates[i].family.replace(/['"]/g, "").trim();
            if (fam && wantedFamily.indexOf(fam) >= 0) {
                return candidates[i].src;
            }
        }
    }
    return candidates[0].src;
}

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

        // 收集目标字符（每个字符只记一次）
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

        let puaCount = 0;
        for (let i = 0; i < targets.length; i++) {
            if (isPrivateUse(targets[i])) {
                puaCount++;
            }
        }

        // 加载加密字体（拿不到就什么都不做）
        let fontData = extractFontData(doc, win, els);
        let fontLoaded = false;
        if (fontData) {
            let FF: any = (<any>win).FontFace || (<any>window).FontFace;
            if (FF) {
                try {
                    let ff = new FF(FONT_NAME, "url(" + fontData + ")");
                    doc.fonts.add(ff);
                    await ff.load();
                    fontLoaded = true;
                } catch (e) {
                    Application.App.log.Warn("加密字体加载失败：" + ((e && e.message) ? e.message : e));
                }
            }
        }

        // 判断字体是否真的在重映射字形（加密字体 vs 系统字体，渲染同一字符看差异）
        let sample = targets.slice(0, 40);
        let remap = 0;
        let checked = 0;
        let encHashes: { [k: string]: string } = {};
        if (fontLoaded) {
            for (let i = 0; i < sample.length; i++) {
                let ch = sample[i];
                try {
                    let be = glyphBits(doc, ch, FONT_NAME);
                    let bs = glyphBits(doc, ch, SYS_FONT);
                    encHashes[ch] = be;
                    if (bitCount(be) >= 6) {
                        checked++;
                        if (hamDist(be, bs) > 60) {
                            remap++;
                        }
                    }
                } catch (e) {
                    // ignore
                }
            }
        }
        let isRemap = fontLoaded && checked > 0 && remap >= Math.max(1, checked * 0.3);

        // 情况 B：字体没在重映射 + 文字是普通汉字 → 只是显示字体被换，去掉类名即可
        if (!isRemap && puaCount == 0) {
            for (let i = 0; i < els.length; i++) {
                let el = <HTMLElement>els[i];
                el.classList.remove("font-cxsecret");
            }
            (<any>win).__cxFontDecodeDone = true;
            Application.App.log.Info("字体加密未生效（文字本身正常），已去掉乱序字体类名");
            return true;
        }
        if (!isRemap) {
            // 字体拿不到/没重映射但文字是私有区乱码 → 无能为力，保持原样
            Application.App.log.Warn("无法确认加密字体是否生效，跳过解密（保持页面原样）");
            return false;
        }

        Application.App.log.Info("检测到字体加密（重映射生效），正在还原 " + targets.length + " 个字符...");

        // 用加密字体渲染所有目标字符
        let tHashes: { [k: string]: string } = {};
        let blankAll = 0;
        for (let i = 0; i < targets.length; i++) {
            try {
                let bits = encHashes[targets[i]] || glyphBits(doc, targets[i], FONT_NAME);
                tHashes[targets[i]] = bits;
                if (bitCount(bits) < 6) {
                    blankAll++;
                }
            } catch (e) {
                // ignore
            }
        }
        if (blankAll == targets.length) {
            Application.App.log.Warn("加密字体的字形全空白，跳过解密");
            return false;
        }

        // 候选字用系统字体渲染，最近距离匹配
        let resolved: { [k: string]: string } = {};
        for (let ti = 0; ti < targets.length; ti++) {
            let t = targets[ti];
            let targetBits = tHashes[t];
            if (!targetBits || bitCount(targetBits) < 6) {
                continue;
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
            if (bestChar && bestDist <= 300) {
                resolved[t] = bestChar;
            }
        }

        let done = 0;
        let uniqVals: { [k: string]: boolean } = {};
        for (let k in resolved) {
            if (resolved.hasOwnProperty(k)) {
                done++;
                uniqVals[resolved[k]] = true;
            }
        }
        let uniqCount = 0;
        for (let k in uniqVals) {
            if (uniqVals.hasOwnProperty(k)) {
                uniqCount++;
            }
        }
        if (done == 0) {
            Application.App.log.Warn("字体解密没匹配上（可能含非常用字），保持页面原样");
            return false;
        }
        if (done > 3 && uniqCount <= 1) {
            Application.App.log.Warn("字体解密结果异常（全解析成同一个字），已放弃替换");
            return false;
        }

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
        Application.App.log.Info("字体解密完成，还原 " + done + "/" + targets.length + " 个字符");
        return true;
    } catch (e) {
        return false;
    }
}
