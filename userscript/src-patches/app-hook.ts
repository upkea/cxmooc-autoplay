import {Application} from "@App/internal/application";

export interface Context {
    (next: Function): void
}

export class Hook {
    public func: Function | string;
    public stack: Array<Context>;
    public context: any;

    public constructor(func: Function | string, context?: any) {
        this.context = context || window;
        this.func = func;
    }

    public Middleware(call: Context) {
        let name: string;
        if (typeof this.func == "string") {
            name = this.func;
        } else {
            name = this.func.name;
        }
        let old = this.context[name];
        let wrapped = function () {
            var args = [old];
            for (var _i = 0; _i < arguments.length; _i++) {
                args[_i + 1] = arguments[_i];
            }
            return call.apply(this, args);
        };
        // 新版页面可能把目标属性定义成只读（read-only property），直接赋值会抛异常
        // 而且会把播放器初始化打断；这里能挂上就挂，挂不上就安静跳过。
        try {
            this.context[name] = wrapped;
        } catch (e) {
            try {
                Object.defineProperty(this.context, name, { configurable: true, writable: true, value: wrapped });
            } catch (e2) {
                try {
                    Application.App.log.Warn("Hook 挂载失败（只读属性），已跳过：", name, String(e2 && (e2.message || e2)));
                } catch (e3) {
                    // ignore
                }
            }
        }
    }

    protected static once: boolean;
    protected static match_list: Map<string, (url: string, resp: string) => string>;

    public static HookAjaxRespond(url: string | Array<string>, call: (url: string, resp: string) => string) {
        if (!this.once) {
            this.match_list = new Map<string, any>();
            let self = this;
            let hookXMLHttpRequest = new Hook("open", Application.GlobalContext.XMLHttpRequest.prototype);
            hookXMLHttpRequest.Middleware(function (next: Context, ...args: any) {
                self.match_list.forEach((val, key) => {
                    if (args[1].indexOf(key) != -1) {
                        Object.defineProperty(this, "responseText", {
                            configurable: true,
                            get: function () {
                                return val.call(this, args[1], this.response)
                            }
                        });
                    }
                });
                return <XMLHttpRequest>next.apply(this, args);
            });
            this.once = true;
        }
        if (typeof url == "string") {
            this.match_list.set(url, call);
        } else {
            url.forEach((v) => {
                this.match_list.set(v, call);
            })
        }
    }
}

