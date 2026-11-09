import { Application } from "../application";
import "../../views/common";
import { Noifications } from "@App/internal/utils/utils";
import { TestAIConnection } from "@App/internal/app/ai";

export interface Logger {
    Debug(...args: any): Logger;

    Info(...args: any): Logger;

    Warn(...args: any): Logger;

    Error(...args: any): Logger;

    Fatal(...args: any): Logger;
}

// 开发者工具f12处打印日志
export class ConsoleLog implements Logger {
    protected getNowTime(): string {
        let time = new Date();
        return time.getHours() + ":" + time.getMinutes() + ":" + time.getSeconds();
    }

    public Debug(...args: any): Logger {
        Application.App.debug && console.info("[debug", this.getNowTime(), "]", ...args);
        return this;
    }

    public Info(...args: any): Logger {
        Application.App.debug && console.info("[info", this.getNowTime(), "]", ...args);
        return this;
    }

    public Warn(...args: any): Logger {
        console.warn("[warn", this.getNowTime(), "]", ...args);
        return this;
    }

    public Error(...args: any): Logger {
        console.error("[error", this.getNowTime(), "]", ...args);
        return this;
    }

    public Fatal(...args: any): Logger {
        console.error("[fatal", this.getNowTime(), "]", ...args);
        return this;
    }
}

export class PageLog implements Logger {
    protected el: HTMLElement;
    protected div: HTMLElement;
    protected is_notify: boolean;

    protected getNowTime(): string {
        let time = new Date();
        return time.getHours() + ":" + time.getMinutes() + ":" + time.getSeconds();
    }

    first(text: string, color: string, background: string) {
        let new_log = document.createElement("div");
        new_log.innerHTML =
            `
                <div class="log" style="border-color: ` +
            background +
            `; background-color: ` +
            background +
            `;">
                    <p><span style="color:` +
            color +
            `;">` +
            text +
            `</span></p>
                </div>
            `;
        //插入第一个元素前
        var first = document
            .getElementsByClassName("tools-notice-content")[0]
            .getElementsByTagName("div");
        document.querySelector(".tools-notice-content").insertBefore(new_log, first[0]);
    }

    constructor() {
        this.el = undefined;
        window.addEventListener("load", () => {
            this.div = document.createElement("div");
            // 主要布局
            this.div.innerHTML = `
            <div class="head" id="tools-head"> 
               <span>小工具通知条</span> 
               <label class="switch" style="width:90px">
                  <input class="checkbox-input" id="checkbox" type="checkbox" checked="checked">
                  <label class="checkbox" for="checkbox"></label>
                  <span>桌面通知</span>
               </label>
               <span class="close" style="float:right; cursor:pointer; margin-right:5px;">x</span>
            </div>
            <div class="tools-ai-bar" id="tools-ai-bar">
               <button class="cx-btn tools-ai-btn" id="tools-ai-btn" title="选服务商、粘贴 Key，接口和模型自动填好">更改API</button>
               <label class="switch">
                  <input class="checkbox-input" id="ai-auto-checkbox" type="checkbox">
                  <label class="checkbox" for="ai-auto-checkbox"></label>
                  <span>自动答题</span>
               </label>
               <span class="tools-ai-status" id="ai-status">未配置</span>
            </div>
            <div class="tools-ai-form" id="tools-ai-form">
               <div class="row"><span>服务商</span>
                  <select id="ai-provider-select">
                     <option value="zhipu">智谱 GLM（glm-4-flash，免费）</option>
                     <option value="siliconflow">硅基流动</option>
                     <option value="deepseek">DeepSeek</option>
                     <option value="custom">自定义（自己填地址和模型）</option>
                  </select>
               </div>
               <div class="row"><span>API Key</span><input id="ai-key-input" type="password" spellcheck="false" placeholder="粘贴你申请到的 key"></div>
               <div class="row"><span>接口地址</span><input id="ai-base-input" type="text" spellcheck="false"></div>
               <div class="row"><span>模型名</span><input id="ai-model-input" type="text" spellcheck="false"></div>
               <div class="row tools-ai-actions">
                  <button class="cx-btn" id="ai-test-btn">测试连接</button>
                  <button class="cx-btn" id="ai-save-btn">保存</button>
                  <button class="cx-btn" id="ai-cancel-btn">取消</button>
                  <span class="tools-ai-hint" id="ai-test-result"></span>
               </div>
            </div>
            <div class="tools-btn-bar" id="tools-btn-bar"></div>
            <div class="main">
               <div class="tools-notice-content"></div>
            </div>
            `;

            this.div.className = "tools-logger-panel";
            document.body.appendChild(this.div);
            this.el = this.div.querySelector(".tools-notice-content");
            (<HTMLButtonElement>this.div.querySelector(".close")).onclick = () => {
                // 面板关掉时，把按钮栏里的按钮挪到悬浮小条，避免"暂停挂机"点不到
                let bar = <HTMLElement>this.div.querySelector("#tools-btn-bar");
                let aiBar = <HTMLElement>this.div.querySelector("#tools-ai-bar");
                if ((bar && bar.children.length > 0) || aiBar) {
                    let holder = document.createElement("div");
                    holder.id = "tools-btn-float";
                    holder.style.cssText = "position:fixed;right:16px;top:130px;z-index:2147483000;background:#fff;border:1px solid #eee;border-radius:6px;box-shadow:0 2px 10px rgba(0,0,0,.18);padding:4px;display:flex;flex-wrap:wrap;gap:4px;max-width:220px;";
                    if (aiBar) {
                        aiBar.style.cssText = "display:flex;flex-wrap:wrap;gap:4px;padding:0 0 4px;border-bottom:1px solid #eee;width:100%;";
                        holder.appendChild(aiBar);
                    }
                    if (bar) {
                        while (bar.firstChild) {
                            holder.appendChild(bar.firstChild);
                        }
                    }
                    document.body.appendChild(holder);
                }
                this.el = undefined;
                this.div.remove();
            };
            let checkbox = <HTMLInputElement>this.div.querySelector("#checkbox");
            checkbox.checked = (Application.App.config.GetConfig("is_notify") || "true") == "true";
            this.is_notify = checkbox.checked;
            if (!checkbox.checked) {
                checkbox.removeAttribute("checked");
            }
            let self = this;
            checkbox.addEventListener("change", function () {
                self.is_notify = this.checked;
                Application.App.config.SetConfig("is_notify", this.checked.toString());
            });

            // ===== AI 答题：更改API 按钮 + 自动答题开关 =====
            let readConf = (key: string, def: string): string => {
                try {
                    let v = Application.App.config.GetConfig(key, def);
                    if (v === undefined || v === null || String(v).trim() === "") {
                        return def;
                    }
                    return String(v).trim();
                } catch (e) {
                    return def;
                }
            };
            let writeConf = (key: string, val: string) => {
                try {
                    Application.App.config.SetConfig(key, val);
                } catch (e) {
                    // ignore
                }
                // 额外记一份到 localStorage，刷新后由脚本头部恢复（否则会被默认配置覆盖）
                try {
                    let custom: any = {};
                    try {
                        custom = JSON.parse(localStorage.getItem("cx_ai_custom") || "{}") || {};
                    } catch (e) {
                        custom = {};
                    }
                    custom[key] = val;
                    localStorage.setItem("cx_ai_custom", JSON.stringify(custom));
                } catch (e) {
                    // ignore
                }
            };
            let AI_PRESETS: any = {
                zhipu: {base: "https://open.bigmodel.cn/api/paas/v4", model: "glm-4-flash"},
                siliconflow: {base: "https://api.siliconflow.cn/v1", model: "Qwen/Qwen2.5-7B-Instruct"},
                deepseek: {base: "https://api.deepseek.com/v1", model: "deepseek-chat"},
                custom: {base: "", model: ""},
            };
            let aiBtn = <HTMLElement>this.div.querySelector("#tools-ai-btn");
            let aiForm = <HTMLElement>this.div.querySelector("#tools-ai-form");
            let aiProvider = <HTMLSelectElement>this.div.querySelector("#ai-provider-select");
            let aiBaseInput = <HTMLInputElement>this.div.querySelector("#ai-base-input");
            let aiKeyInput = <HTMLInputElement>this.div.querySelector("#ai-key-input");
            let aiModelInput = <HTMLInputElement>this.div.querySelector("#ai-model-input");
            let aiAuto = <HTMLInputElement>this.div.querySelector("#ai-auto-checkbox");
            let aiStatus = <HTMLElement>this.div.querySelector("#ai-status");
            let aiTestBtn = <HTMLButtonElement>this.div.querySelector("#ai-test-btn");
            let aiTestResult = <HTMLElement>this.div.querySelector("#ai-test-result");

            let setAIStatus = (text: string, color: string, title?: string) => {
                aiStatus.innerText = text;
                aiStatus.style.color = color;
                aiStatus.title = title || "";
            };

            // 选服务商 -> 自动填好接口地址和模型（只有「自定义」才允许手改）
            let applyAIProvider = (id: string) => {
                let preset = AI_PRESETS[id];
                if (id != "custom" && preset) {
                    aiBaseInput.value = preset.base;
                    aiModelInput.value = preset.model;
                }
                let readonly = id != "custom";
                aiBaseInput.readOnly = readonly;
                aiModelInput.readOnly = readonly;
                aiBaseInput.style.background = readonly ? "#f3f3f3" : "#fff";
                aiModelInput.style.background = readonly ? "#f3f3f3" : "#fff";
            };

            let fillAIApiForm = () => {
                let base = readConf("ai_base", AI_PRESETS.zhipu.base);
                aiKeyInput.value = readConf("ai_key", "");
                aiBaseInput.value = base;
                aiModelInput.value = readConf("ai_model", AI_PRESETS.zhipu.model);
                let matched = "custom";
                for (let k in AI_PRESETS) {
                    if (AI_PRESETS[k].base && AI_PRESETS[k].base == base) {
                        matched = k;
                        break;
                    }
                }
                aiProvider.value = matched;
                applyAIProvider(matched);
            };

            let formConf = () => {
                let base = aiBaseInput.value.trim().replace(/\/+$/, "");
                if (base && base.indexOf("http") != 0) {
                    base = "https://" + base;
                }
                return {base: base, key: aiKeyInput.value.trim(), model: aiModelInput.value.trim() || AI_PRESETS.zhipu.model};
            };

            // 测试连接：fromForm=true 用表单里的值测（不必先保存）
            let runAITest = async (fromForm: boolean) => {
                let conf = fromForm ? formConf() : {
                    base: readConf("ai_base", AI_PRESETS.zhipu.base).replace(/\/+$/, ""),
                    key: readConf("ai_key", ""),
                    model: readConf("ai_model", AI_PRESETS.zhipu.model),
                };
                if (!conf.key) {
                    setAIStatus("● 未配置 Key", "#c33");
                    if (fromForm) {
                        aiTestResult.innerText = "先填 API Key";
                        aiTestResult.style.color = "#c33";
                    }
                    return;
                }
                setAIStatus("● 检测中…", "#888");
                aiTestBtn.disabled = true;
                if (fromForm) {
                    aiTestResult.innerText = "检测中…";
                    aiTestResult.style.color = "#888";
                }
                let ret = await TestAIConnection(conf);
                aiTestBtn.disabled = false;
                if (ret.ok) {
                    setAIStatus("● 已连接", "#3a9", conf.model + " · " + ret.ms + "ms");
                    if (fromForm) {
                        aiTestResult.innerText = "连接成功 " + ret.ms + "ms";
                        aiTestResult.style.color = "#3a9";
                    }
                    this.Info("AI 连接正常（" + conf.model + "，" + ret.ms + "ms）");
                } else {
                    setAIStatus("● 连接失败", "#c33", ret.error);
                    if (fromForm) {
                        aiTestResult.innerText = ret.error || "连接失败";
                        aiTestResult.style.color = "#c33";
                    }
                    this.Warn("AI 连接失败：" + (ret.error || "未知错误"));
                }
            };

            let refreshAIStatus = () => {
                aiAuto.checked = readConf("ai_enable", "true") != "false";
                if (!aiAuto.checked) {
                    setAIStatus("● 自动答题：关", "#c33");
                    return;
                }
                runAITest(false);
            };

            fillAIApiForm();
            refreshAIStatus();

            aiProvider.onchange = () => {
                applyAIProvider(aiProvider.value);
                aiTestResult.innerText = "";
            };
            aiBtn.onclick = () => {
                if (aiForm.style.display == "block") {
                    aiForm.style.display = "none";
                    return;
                }
                fillAIApiForm();
                aiTestResult.innerText = "";
                aiForm.style.display = "block";
            };
            aiTestBtn.onclick = () => {
                runAITest(true);
            };
            (<HTMLElement>this.div.querySelector("#ai-save-btn")).onclick = () => {
                let conf = formConf();
                writeConf("ai_base", conf.base || AI_PRESETS.zhipu.base);
                writeConf("ai_key", conf.key);
                writeConf("ai_model", conf.model);
                aiForm.style.display = "none";
                this.Info("AI 配置已保存：" + (conf.base || "默认接口") + " / " + conf.model +
                    (conf.key ? "" : "（Key 为空，自动答题不会生效）"));
                runAITest(false);
            };
            (<HTMLElement>this.div.querySelector("#ai-cancel-btn")).onclick = () => {
                aiForm.style.display = "none";
                fillAIApiForm();
            };
            aiAuto.addEventListener("change", () => {
                writeConf("ai_enable", aiAuto.checked ? "true" : "false");
                this.Info(aiAuto.checked ? "自动答题已开启（用 AI 作答）" : "自动答题已关闭（改走原题库逻辑）");
                refreshAIStatus();
            });

            setTimeout(() => {
                Application.CheckUpdate((isnew, data) => {
                    if (data == undefined) {
                        this.Info("检查更新失败.");
                        return;
                    }
                    let html = "";
                    if (isnew) {
                        html += "<span>[有新版本]</span>";
                    }
                    html += data.injection;
                    this.Info(html);
                });
            }, 1000);

            //支持拖拽移动
            function getProperty(ele: HTMLElement, prop: any) {
                return parseInt(window.getComputedStyle(ele)[prop]);
            }

            const windowWidth = window.innerWidth;
            const windowHeight = window.innerHeight;
            const containerWidth = getProperty(this.div, "width");
            const containerHeight = getProperty(this.div, "height");
            let x = parseInt(Application.App.config.GetConfig("notify_tools_x", "60px").replace('px', ''));
            if (x < 0) {
                x = 0;
            }
            if (x >= windowWidth - containerWidth)
                x = windowWidth - containerWidth;
            this.div.style.left = x + "px";
            let y = parseInt(Application.App.config.GetConfig("notify_tools_y", "40px").replace('px', ''));
            if (y < 0) {
                y = 0;
            }
            if (y >= windowHeight - containerHeight)
                y = windowHeight - containerHeight;
            this.div.style.top = y + "px";

            let head = <HTMLElement>this.div.querySelector("#tools-head");
            head.onmousedown = (downEvent) => {
                let relaX = downEvent.clientX - this.div.offsetLeft;
                let relaY = downEvent.clientY - this.div.offsetTop;

                const windowWidth = window.innerWidth;
                const windowHeight = window.innerHeight;
                const containerWidth = getProperty(this.div, "width");
                const containerHeight = getProperty(this.div, "height");

                document.onmousemove = (moveEvent) => {
                    let targetX = moveEvent.clientX - relaX;
                    let targetY = moveEvent.clientY - relaY;

                    if (targetX <= 0) targetX = 0;
                    if (targetY <= 0) targetY = 0;
                    if (targetX >= windowWidth - containerWidth)
                        targetX = windowWidth - containerWidth;
                    if (targetY >= windowHeight - containerHeight)
                        targetY = windowHeight - containerHeight;

                    this.div.style.left = targetX + "px";
                    this.div.style.top = targetY + "px";
                };
                document.onmouseup = () => {
                    document.onmouseup = null;
                    document.onmousemove = null;
                    Application.App.config.SetConfig("notify_tools_x", this.div.style.left);
                    Application.App.config.SetConfig("notify_tools_y", this.div.style.top);
                };
            };
        });
    }

    protected toStr(...args: any): string {
        let text = "";
        for (let i = 0; i < args.length; i++) {
            if (typeof args[i] == "object") {
                text += args[i].toString() + "\n";
            } else {
                text += args[i] + "\n";
            }
        }
        return text.substring(0, text.length - 1);
    }

    public Debug(...args: any): Logger {
        console.info("[debug", this.getNowTime(), "]", ...args);
        return this;
    }

    public Info(...args: any): Logger {
        let text = this.toStr(...args);
        if (this.el) {
            this.first(text, "#409EFF", "rgba(121, 187, 255, 0.2)");
        } else {
            console.info("[info", this.getNowTime(), "]", ...args);
        }
        return this;
    }

    public Warn(...args: any): Logger {
        let text = this.toStr(...args);
        if (this.el) {
            this.first(text, "#5C3C00", "rgba(250, 236, 216, 0.4)");
        }
        console.warn("[warn", this.getNowTime(), "]", ...args);
        if (document.hidden && localStorage["is_notify"] == "true") {
            Noifications({
                title: "网课小工具",
                text: text + "\n3秒后自动关闭",
                timeout: 3000,
            });
        }
        return this;
    }

    public Error(...args: any): Logger {
        let text = this.toStr(...args);
        if (this.el) {
            this.first(text, "#FFF0F0", "rgba(253, 226, 226, 0.5)");
        }
        console.error("[error", this.getNowTime(), "]", ...args);
        if (localStorage["is_notify"] == "true") {
            Noifications({
                title: "网课小工具",
                text: text,
            });
        }
        return this;
    }

    public Fatal(...args: any): Logger {
        let text = this.toStr(...args);
        if (this.el) {
            this.first(text, "#ff0000", "rgba(253, 226, 226, 0.5)");
        }
        console.error("[fatal", this.getNowTime(), "]", ...args);
        Noifications({
            title: "网课小工具",
            text: text,
        });
        return this;
    }
}

export class EmptyLog implements Logger {
    public Debug(...args: any): Logger {
        return this;
    }

    public Info(...args: any): Logger {
        return this;
    }

    public Warn(...args: any): Logger {
        return this;
    }

    public Error(...args: any): Logger {
        return this;
    }

    public Fatal(...args: any): Logger {
        return this;
    }
}
