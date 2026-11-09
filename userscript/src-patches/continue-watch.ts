// 检测「继续学习」提示是否出现，出现时在页面标题上加一个标记
// AHK 脚本会读窗口标题，看到标记就按空格恢复播放（比图像识别可靠）

const MARKER = "【需继续】";

function isVisible(el: HTMLElement): boolean {
    if (!el) {
        return false;
    }
    try {
        const st = window.getComputedStyle(el);
        if (st.display == "none" || st.visibility == "hidden") {
            return false;
        }
        if (parseFloat(st.opacity || "1") < 0.05) {
            return false;
        }
        const r = el.getBoundingClientRect();
        return r.width > 6 && r.height > 6;
    } catch (e) {
        return false;
    }
}

function scanDoc(doc: Document): boolean {
    if (!doc || !doc.body) {
        return false;
    }
    try {
        const text = (doc.body.innerText || "");
        if (text.indexOf("继续学习") < 0 && text.indexOf("请继续学习") < 0) {
            return false;
        }
    } catch (e) {
        return false;
    }
    // 有文字还不行，要确认是"看得见的"
    const selectors = [
        ".vjs-resume-progress-tip",
        ".vjs-resume-progress-text",
        "#videoquiz-continue",
        "[class*=resume]",
        "[class*=continue]",
    ];
    for (let i = 0; i < selectors.length; i++) {
        try {
            const list = doc.querySelectorAll(selectors[i]);
            for (let j = 0; j < list.length; j++) {
                if (isVisible(<HTMLElement>list[j])) {
                    return true;
                }
            }
        } catch (e) {
            // ignore
        }
    }
    // 兜底：找文字刚好是"继续学习"的可见元素
    try {
        const nodes = doc.querySelectorAll("div,span,a,button,p");
        for (let i = 0; i < nodes.length; i++) {
            const el = <HTMLElement>nodes[i];
            if (el.childElementCount > 1) {
                continue;
            }
            const t = (el.textContent || "").replace(/\s+/g, "");
            if (t.indexOf("继续学习") >= 0 && isVisible(el)) {
                return true;
            }
        }
    } catch (e) {
        // ignore
    }
    return false;
}

function needContinue(): boolean {
    if (scanDoc(document)) {
        return true;
    }
    const frames = document.querySelectorAll("iframe");
    for (let i = 0; i < frames.length; i++) {
        try {
            const fdoc = (<HTMLIFrameElement>frames[i]).contentDocument;
            if (fdoc && scanDoc(fdoc)) {
                return true;
            }
        } catch (e) {
            // 跨域 iframe 跳过
        }
    }
    return false;
}

export function StartContinueWatch() {
    if (window.top != window.self) {
        return;
    }
    let last = false;
    setInterval(() => {
        try {
            const need = needContinue();
            if (need == last) {
                return;
            }
            last = need;
            if (need) {
                if (document.title.indexOf(MARKER) < 0) {
                    document.title = MARKER + document.title;
                }
            } else if (document.title.indexOf(MARKER) >= 0) {
                document.title = document.title.replace(MARKER, "");
            }
        } catch (e) {
            // ignore
        }
    }, 1000);
}

// ===== 视频自动播放守护 =====
// 在任意 frame 里跑：发现 video 被暂停就自动 play()，不依赖鼠标/键盘
function guardVideos() {
    let list: NodeListOf<HTMLVideoElement>;
    try {
        list = document.querySelectorAll("video");
    } catch (e) {
        return;
    }
    for (let i = 0; i < list.length; i++) {
        const v = <any>list[i];
        if (v.__cxGuarded) {
            continue;
        }
        v.__cxGuarded = true;
        const tryPlay = () => {
            try {
                if (v.paused && !v.ended) {
                    const p = v.play();
                    if (p && p.catch) {
                        p.catch(() => {});
                    }
                }
            } catch (e) {
                // ignore
            }
        };
        v.addEventListener("pause", () => {
            setTimeout(tryPlay, 700);
            setTimeout(tryPlay, 1800);
        });
        v.addEventListener("loadedmetadata", tryPlay);
        if (v.paused && !v.ended) {
            setTimeout(tryPlay, 500);
        }
    }
}

export function StartVideoGuard() {
    setInterval(guardVideos, 1500);
    guardVideos();
}

