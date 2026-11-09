// 学习通「字体加密」解密
//
// 学习通会把题目文字用自定义字体重映射：DOM 里存的是错误码点，浏览器用加密字体渲染出正确字形。
// 所以直接读 innerText 会得到乱码（例如「敦煌石窟」→「敦吖石窟」），AI 自然答不对。
//
// 解密思路（Canvas 字形对比法，参考 DaRin1403/xuexitong-autostudy，MIT）：
//   1. 找到页面里的加密字体（<style>/@font-face 里的 base64 字体）；
//   2. 用该字体渲染「乱码字符」得到 32x32 字形指纹；
//   3. 用同一字体渲染常用汉字/字母/符号，字形指纹相同 → 就是同一个字；
//   4. 把页面上 .font-cxsecret 元素的文字换成正确的字，并去掉加密字体类名。
import { Application } from "@App/internal/application";

const FONT_NAME = "cxfontdec";

// 候选字符集：常用汉字 + 数字字母 + 常见符号（课程题目用字基本都在内）
const COMMON_CHARS =
    "的一是在不了有和人这中大为上个国我以要他时来用们生到作地于出就分对成会可主发年动同工也能下过子说产种面而方后多定行学法所民得经十三之进着等部度家电力里如水化高自二理起小物实现加量都两体制机当使点从业本去把性好应开它合还因由其些然前外天政四日那社义事平形相全表间样与关各重新线内数正心反你明看原又么利比或但质气第向道命此变条只没结解问意建月公无系军很情者最立代想已通并提直题党程展五果料象员革位入常文总次品式活设及管特件长求老头基资边流路级少图山统接知较将组见计别她手角期根论运农指几九区强放决西被干做必战先回则任取据处队南给色光门即保治北造百规热领七海口东导器压志世金增争济阶油思术极交受联什认六共权收证改清己美再采转更单风切打白教速花带安场身车例真务具万每目至达走积示议声报斗完类八离华名确才科张信马节话米整空元况今集温传土许步群广石记需段研界拉林律叫且究观越织装影算低持音众书布复容儿须际商非验连断深难近千周委素技备半办青省列习响约支般史感劳便团往酸历市克何除消构府称太准精值号率族维划选标写存候毛亲快效斯院查江型眼王按格养易置派层片始却专状育厂京识适属圆包火住调满县局照参红细引听该铁价严龙飞" +
    "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz" +
    "，。、；：？！“”‘’（）《》〈〉【】[]{}·—…%＋－×÷＝√（）+-×÷=%/\\.,;:!?_*&#@" +
    "一二三四五六七八九十百千万亿年月日时分秒甲乙丙丁戊己庚辛壬癸子丑寅卯辰巳午未申酉戌亥";

let _canvas: HTMLCanvasElement = null;
let _ctx: CanvasRenderingContext2D = null;

// 用解密字体渲染一个字符，返回二值化的字形指纹
function glyphBits(doc: Document, ch: string): string {
    if (!_canvas) {
        _canvas = doc.createElement("canvas");
        _canvas.width = 32;
        _canvas.height = 32;
        _ctx = <CanvasRenderingContext2D>_canvas.getContext("2d");
    }
    _ctx.clearRect(0, 0, 32, 32);
    _ctx.font = "28px " + FONT_NAME;
    _ctx.textAlign = "center";
    _ctx.textBaseline = "middle";
    _ctx.fillText(ch, 16, 17);
    let d = _ctx.getImageData(0, 0, 32, 32).data;
    let s = "";
    for (let i = 3; i < d.length; i += 4) {
        s += d[i] > 120 ? "1" : "0";
    }
    return s;
}

function pickBase64(cssText: string): string {
    if (!cssText) {
        return null;
    }
    let m = cssText.match(/base64,([^'")\s]+)/);
    return m ? m[1] : null;
}

// 从 <style> 内联样式和 @font-face 规则里找加密字体的 base64 数据
function extractFontData(doc: Document, win: any): string {
    // 1) 内联 <style> 里直接搜 @font-face
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
                    return "data:font/ttf;base64," + b64;
                }
            }
        }
    } catch (e) {
        // ignore
    }
    // 2) 样式表 cssRules 里的 @font-face
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
                    return "data:font/ttf;base64," + b64;
                }
            }
        }
    } catch (e) {
        // ignore
    }
    // 3) 兜底：整个文档 HTML 里搜
    try {
        let html = doc.documentElement.innerHTML || "";
        let m = html.match(/base64,([^'")\s]{200,})/);
        if (m) {
            return "data:font/ttf;base64," + m[1];
        }
    } catch (e) {
        // ignore
    }
    return null;
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
        let fontData = extractFontData(doc, win);
        if (!fontData) {
            Application.App.log.Warn("检测到字体加密，但没找到字体定义，题目可能是乱码");
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
        // 收集乱码字符
        let targets: string[] = [];
        let seen: { [k: string]: boolean } = {};
        for (let i = 0; i < els.length; i++) {
            let t = String(els[i].textContent || "");
            for (let k = 0; k < t.length; k++) {
                let ch = t.charAt(k);
                if (!seen[ch]) {
                    seen[ch] = true;
                    targets.push(ch);
                }
            }
        }
        if (targets.length == 0) {
            return false;
        }
        let tHashes: { [k: string]: string } = {};
        for (let i = 0; i < targets.length; i++) {
            try {
                tHashes[targets[i]] = glyphBits(doc, targets[i]);
            } catch (e) {
                // ignore
            }
        }
        Application.App.log.Info("检测到字体加密，正在还原 " + targets.length + " 个字符...");
        let resolved: { [k: string]: string } = {};
        let done = 0;
        let start = Date.now();
        for (let ci = 0; ci < COMMON_CHARS.length && done < targets.length; ci++) {
            let ch = COMMON_CHARS.charAt(ci);
            let bits = "";
            try {
                bits = glyphBits(doc, ch);
            } catch (e) {
                continue;
            }
            for (let ti = 0; ti < targets.length; ti++) {
                let t = targets[ti];
                if (!resolved[t] && tHashes[t] == bits) {
                    resolved[t] = ch;
                    done++;
                }
            }
            if (Date.now() - start > 15000) {
                break;
            }
        }
        if (done == 0) {
            Application.App.log.Warn("字体解密没匹配上（可能含非常用字）");
            return false;
        }
        // 替换页面文字并去掉加密字体类名
        for (let i = 0; i < els.length; i++) {
            let el = <HTMLElement>els[i];
            let text = String(el.textContent || "");
            for (let t in resolved) {
                text = text.split(t).join(resolved[t]);
            }
            el.textContent = text;
            el.classList.remove("font-cxsecret");
        }
        (<any>win).__cxFontDecodeDone = true;
        Application.App.log.Info("字体解密完成，还原 " + done + " 个字符");
        return true;
    } catch (e) {
        return false;
    }
}
