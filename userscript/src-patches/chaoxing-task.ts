import { CssBtn } from "@App/mooc/chaoxing/utils";
import { createBtn, get } from "@App/internal/utils/utils";
import { Application } from "@App/internal/application";
import { Task, TaskEvent } from "@App/internal/app/task";

export abstract class CxTask extends Task {
    public jobIndex: number;
    public taskinfo: any;
    protected context: any;
    public done: boolean;

    public constructor(context: any, taskinfo: any) {
        super();
        this.taskinfo = taskinfo;
        this.context = context;
        if (this.taskinfo.job) {
            this.done = false;
        } else {
            this.done = true;
        }
    }

    protected callEvent(event: TaskEvent, ...args: any) {
        if (event == "complete") {
            this.done = true;
        }
        super.callEvent(event, ...args);
    }

    public Init(): Promise<any> {
        return new Promise(resolve => {
            resolve();
        });
    }

    public abstract Start(): Promise<any>

    public Submit(): Promise<void> {
        return new Promise(resolve => {
            resolve();
        });
    }

    //TODO:停止
    public Stop(): Promise<void> {
        return new Promise(resolve => {
            resolve();
        });
    }

    public Done(): boolean {
        return this.done;
    }
}

export class CxTaskControlBar {
    public task: CxTask;
    protected prev: HTMLElement;

    constructor(prev: HTMLElement, task: CxTask) {
        this.task = task;
        this.prev = document.createElement("div");
        this.prev.style.cssText = "display:flex;flex-wrap:wrap;gap:4px;justify-content:center;";
        // 给按钮组打个任务点标记，同一任务点重复创建时据此去重
        this.prev.setAttribute("data-cx-key", CxTaskControlBar.taskKey(task));
        prev.style.textAlign = "center";
        prev.style.width = "100%";
        prev.prepend(this.prev);
        this.defaultBtn();
        // 优先把按钮挪进「小工具通知条」，别挡住视频；面板还没创建就稍后重试
        this.moveToNoticePanel(0);
    }

    // 任务点唯一标识，用于识别"同一个任务点被创建了两次"
    protected static taskKey(task: CxTask): string {
        let info: any = task && (<any>task).taskinfo;
        let prop: any = info && info.property;
        if (!prop) {
            return "";
        }
        return String(prop.objectid || prop.jobid || prop.mid || "");
    }

    protected moveToNoticePanel(tryCount: number) {
        // 面板开着就挂面板，关掉了就挂它的悬浮替身
        let bar = <HTMLElement>document.getElementById("tools-btn-bar") ||
            <HTMLElement>document.getElementById("tools-btn-float");
        if (bar) {
            // 同一任务点被重复创建（页面多次 load）时，先清掉旧的那一组，避免叠出两排按钮
            let key = this.prev.getAttribute("data-cx-key");
            let olds = bar.querySelectorAll("[data-cx-key='" + key + "']");
            for (let i = 0; i < olds.length; i++) {
                if (olds[i] != this.prev) {
                    (<HTMLElement>olds[i]).remove();
                }
            }
            if (this.prev.parentElement != bar) {
                bar.appendChild(this.prev);
            }
            return;
        }
        if (tryCount < 5) {
            setTimeout(() => {
                this.moveToNoticePanel(tryCount + 1);
            }, 600);
        }
    }

    public defaultBtn() {
        let startBtn = CssBtn(createBtn(Application.App.config.auto ? "暂停挂机" : "开始挂机", "点击开始自动挂机", "cx-btn"));
        startBtn.onclick = () => {
            if (startBtn.innerText == '暂停挂机') {
                Application.App.config.auto = false;
                startBtn.innerText = "开始挂机";
                startBtn.title = "点击开始自动挂机";
                Application.App.log.Info("挂机停止了");
            } else {
                Application.App.config.auto = true;
                startBtn.innerText = '暂停挂机';
                startBtn.title = "停止挂机,开始好好学习";
                Application.App.log.Info("挂机开始了");
                this.task.Start();
            }
        };
        this.prev.append(startBtn);
    }

    public append(el: HTMLElement): void {
        this.prev.append(el);
    }

    public download(): HTMLElement {
        if (!this.task.taskinfo.property.objectid) {
            return;
        }
        let download = CssBtn(createBtn("下载资源", "我要下载下来好好学习", "cx-btn"));
        download.style.background = "#999999";
        download.onclick = () => {
            (<any>get("https://mooc1-1.chaoxing.com/ananas/status/" + this.task.taskinfo.property.objectid, (data: string) => {
                let json = JSON.parse(data);
                prompt("如果打开下载失败，请复制下面链接手动下载", json.download);
                window.open(json.download);
            })).error(() => {
                alert("资源信息获取失败");
            });
        };
        return download;
    }
}