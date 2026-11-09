// 目录监听：当前章节「变绿」（任务点全部完成）后，自动切到下一个还没变绿的章节
//
// 新版学习通的左侧「目录」里，完成的任务点/章节会变成绿色或出现 ✓，
// 而任务内容区是 iframe，原来的「下一节」按钮在新版里不一定存在。
// 这里直接盯目录列表：谁刚从"没绿"变成"绿"，就把后面第一个还没绿的章节点开。
import { Application } from "@App/internal/application";

interface CatalogItem {
    num: string;
    el: HTMLElement;
}

function isVisible(el: HTMLElement): boolean {
    if (!el) {
        return false;
    }
    try {
        let r = el.getBoundingClientRect();
        return r.width > 4 && r.height > 4;
    } catch (e) {
        return false;
    }
}

function colorIsGreen(el: HTMLElement): boolean {
    try {
        let c = window.getComputedStyle(el).color || "";
        let m = c.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
        if (!m) {
            return false;
        }
        let r = parseInt(m[1], 10);
        let g = parseInt(m[2], 10);
        let b = parseInt(m[3], 10);
        // 绿色：G 明显大于 R 和 B（兼容 #67C23A / #009900 这类）
        return g > 100 && g > r + 25 && g > b + 25;
    } catch (e) {
        return false;
    }
}

// 这一项是否"已完成"（绿色 / 打勾 / 类名提示）
function isDone(el: HTMLElement): boolean {
    try {
        let t = el.innerText || el.textContent || "";
        if (/[✓√✔]/.test(t)) {
            return true;
        }
        let hints = el.querySelectorAll(
            "[class*=dui],[class*=complete],[class*=finish],[class*=success],[class*=green],[class*=yiwancheng],[class*=icondone]"
        );
        if (hints.length > 0) {
            return true;
        }
        if (colorIsGreen(el)) {
            return true;
        }
        let kids = el.querySelectorAll("span,i,em,b,a,div");
        for (let i = 0; i < kids.length && i < 60; i++) {
            if (colorIsGreen(<HTMLElement>kids[i])) {
                return true;
            }
        }
    } catch (e) {
        // ignore
    }
    return false;
}

function isLocked(el: HTMLElement): boolean {
    try {
        let t = el.innerText || "";
        if (t.indexOf("锁") >= 0) {
            return true;
        }
        return el.querySelector("[class*=lock],[class*=suo]") != null;
    } catch (e) {
        return false;
    }
}

// 收集目录里的章节项（4.19 机械之美：... 这种），按章节号排序
function collectCatalogItems(): CatalogItem[] {
    let out: CatalogItem[] = [];
    let seen: { [k: string]: boolean } = {};
    let docs: Document[] = [document];
    try {
        let frames = document.querySelectorAll("iframe");
        for (let i = 0; i < frames.length; i++) {
            try {
                let d = (<HTMLIFrameElement>frames[i]).contentDocument;
                if (d) {
                    docs.push(d);
                }
            } catch (e) {
                // 跨域 iframe 跳过
            }
        }
    } catch (e) {
        // ignore
    }
    for (let di = 0; di < docs.length; di++) {
        let nodes: NodeListOf<Element>;
        try {
            nodes = docs[di].querySelectorAll("a,div,li,span,p");
        } catch (e) {
            continue;
        }
        for (let i = 0; i < nodes.length; i++) {
            let el = <HTMLElement>nodes[i];
            if (!isVisible(el)) {
                continue;
            }
            let t = (el.innerText || "").trim();
            let m = t.match(/^(\d+(?:\.\d+)+)\s*\S/);
            if (!m) {
                continue;
            }
            // 排除整块容器（只认条目级元素）
            if (el.getElementsByTagName("*").length > 15) {
                continue;
            }
            let num = m[1];
            if (seen[num]) {
                continue;
            }
            seen[num] = true;
            out.push({num: num, el: el});
        }
    }
    out.sort((a, b) => {
        let pa = a.num.split(".");
        let pb = b.num.split(".");
        for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
            let va = parseInt(pa[i] || "0", 10);
            let vb = parseInt(pb[i] || "0", 10);
            if (va != vb) {
                return va - vb;
            }
        }
        return 0;
    });
    return out;
}

export function StartCatalogWatch() {
    if (window.top != window.self) {
        return;
    }
    if (location.href.indexOf("studentstudy") < 0) {
        return;
    }
    let prev: { [k: string]: boolean } = null;
    let cooldownUntil = 0;
    setInterval(() => {
        try {
            if (!Application.App || !Application.App.config || !Application.App.config.auto) {
                return;
            }
            let now = Date.now();
            if (now < cooldownUntil) {
                return;
            }
            let items = collectCatalogItems();
            if (items.length == 0) {
                return;
            }
            let snap: { [k: string]: boolean } = {};
            for (let i = 0; i < items.length; i++) {
                snap[items[i].num] = isDone(items[i].el);
            }
            if (!prev) {
                // 第一次先记录基线，避免把"本来就已经完成"的章节当成刚完成
                prev = snap;
                return;
            }
            let newly: string[] = [];
            for (let k in snap) {
                if (snap[k] && !prev[k]) {
                    newly.push(k);
                }
            }
            prev = snap;
            if (newly.length == 0) {
                return;
            }
            // 取文档顺序里最靠后的"刚变绿"的章节
            let lastIdx = -1;
            for (let i = 0; i < items.length; i++) {
                if (newly.indexOf(items[i].num) >= 0) {
                    lastIdx = i;
                }
            }
            if (lastIdx < 0) {
                return;
            }
            for (let i = lastIdx + 1; i < items.length; i++) {
                let it = items[i];
                if (snap[it.num]) {
                    continue;
                }
                if (isLocked(it.el)) {
                    Application.App.log.Info("目录：「" + it.num + "」还没解锁，先等一会儿");
                    continue;
                }
                Application.App.log.Info("目录：当前章节已完成，切到下一节「" + it.num + "」");
                cooldownUntil = now + 15000;
                // 给课程翻页逻辑一个"我刚导航过"的标记，避免两边同时点造成跳两节
                (<any>window).__cxNavByCatalog = now;
                try {
                    it.el.click();
                } catch (e) {
                    Application.App.log.Warn("目录：点击下一节失败 " + e);
                }
                return;
            }
            Application.App.log.Info("目录：后面已经没有未完成的章节了");
        } catch (e) {
            // ignore
        }
    }, 2500);
}
