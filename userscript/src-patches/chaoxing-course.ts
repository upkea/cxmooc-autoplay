import {Application} from "@App/internal/application";
import {CxTask} from "@App/mooc/chaoxing/task";
import {TaskFactory} from "@App/mooc/chaoxing/factory";
import {Mooc, MoocTaskSet, MoocEvent} from "@App/internal/app/mooc";
import {Task} from "@App/internal/app/task";
import {EventListener} from "@App/internal/utils/event";

//课程任务
export class CxCourse extends EventListener<MoocEvent> implements MoocTaskSet {

    protected taskList: Array<CxTask>;
    protected attachments: Array<any>;

    public Init(): Promise<any> {
        return new Promise(resolve => {
            let first = true;
            document.addEventListener("load", ev => {
                let el = <HTMLIFrameElement>(ev.srcElement || ev.target);
                if (el.id == "iframe") {
                    Application.App.log.Info("超星新窗口加载");
                    this.OperateCard(el);
                    // 超星会有多次加载,所以使用一个flag变量,只回调一次
                    first && resolve(undefined);
                    first = false;
                }
            }, true);
        });
    }

    public Stop(): Promise<any> {
        throw new Error("Method not implemented.");
    }

    protected taskIndex: number = 0;

    public Next(): Promise<Task> {
        return new Promise(resolve => {
            if (this.taskList.length > this.taskIndex) {
                resolve(this.taskList[this.taskIndex]);
                return this.taskIndex++;
            }
            // 当页任务点全部结束,翻页.由于会重新加载窗口调用reload,在加载完成之后再返回任务点.(本方法是同步调用,所以使用此种方法)
            this.addEventListenerOnce("reload", async () => {
                resolve(await this.Next());
            })
            this.nextPage(null);
        });
    }

    public SetTaskPointer(index: number): void {
        this.taskIndex = index;
    }

    // 操作任务卡,一个页面会包含很多任务,取出来
    public async OperateCard(iframe: HTMLIFrameElement) {
        let iframeWindow: any = iframe.contentWindow;
        // 判断任务的参数
        if (iframeWindow.mArg == undefined) {
            let match = iframeWindow.document.body.innerHTML.match(/try{\s+?mArg = (.*?);/);
            if (!match) {
                return;
            }
            iframeWindow.mArg = JSON.parse(match[1]);
        }
        // 任务的属性
        this.attachments = <Array<any>>iframeWindow.mArg.attachments;
        this.taskList = new Array();
        // 每加载一批新任务点，先清空通知条里上一批任务的按钮组，否则会越堆越多
        let btnBar = <HTMLElement>document.getElementById("tools-btn-bar");
        if (btnBar) {
            while (btnBar.firstChild) {
                btnBar.removeChild(btnBar.firstChild);
            }
        }
        // 构建任务
        for (let index = 0; index < this.attachments.length; index++) {
            let value = this.attachments[index];
            value.defaults = <Array<any>>iframeWindow.mArg.defaults;
            let task: CxTask;
            // 任务工厂去创建对应的任务对象
            task = TaskFactory.CreateCourseTask(iframeWindow, value);
            if (!task) {
                continue;
            }
            task.jobIndex = index;
            this.taskList.push(task);
            task.addEventListener("complete", () => {
                this.callEvent("taskComplete", index, task);
            });
            await task.Init();
        }
        this.taskIndex = 0;
        this.callEvent("reload");
    }

    protected afterPage(): HTMLElement {
        //感觉奇葩的方法...（旧版目录结构，往下找当前任务点下方的第一个）
        try {
            let els = document.querySelectorAll("div.ncells > *:not(.currents) > .orange01");
            let now = <HTMLElement>document.querySelector("div.ncells > .currents");
            if (now) {
                for (let i = 0; i < els.length; i++) {
                    if (now.getBoundingClientRect().top < els[i].getBoundingClientRect().top) {
                        return <HTMLElement>els[i];
                    }
                }
            }
        } catch (e) {
            // ignore
        }
        return null;
    }

    // 找"下一节/下一章"入口：新版学习通导航结构变了，这里按多种方式兜底。
    // 新版页面的真按钮是可见的 div.prev_next.next（onclick=PCount.next(...)），
    // 另有两个隐藏的 nextChapter 锚点，必须排除掉。
    protected findNextControl(): HTMLElement {
        let sels = [
            ".prev_next.next",
            ".next_prev.next",
            "a.next",
            "button.next",
            ".nav-next",
            "[class*=nextSection]",
            "span.currents ~ span",
        ];
        for (let i = 0; i < sels.length; i++) {
            try {
                let els = document.querySelectorAll(sels[i]);
                for (let j = 0; j < els.length; j++) {
                    let el = <HTMLElement>els[j];
                    if (el && el.offsetParent != null && this.isReallyVisible(el)) {
                        return el;
                    }
                }
            } catch (e) {
                // ignore
            }
        }
        // 按可见文字找
        try {
            let nodes = document.querySelectorAll("span,a,button,div,li");
            for (let i = 0; i < nodes.length; i++) {
                let el = <HTMLElement>nodes[i];
                let t = (el.innerText || el.textContent || "").trim();
                if (/^(下一节|下一章|下一任务点|下一题|下一步|下一页)$/.test(t) && el.offsetParent != null && this.isReallyVisible(el)) {
                    return el;
                }
            }
        } catch (e) {
            // ignore
        }
        return null;
    }

    protected isReallyVisible(el: HTMLElement): boolean {
        try {
            let r = el.getBoundingClientRect();
            return r.width > 4 && r.height > 4;
        } catch (e) {
            return false;
        }
    }

    // 调用页面自带的导航函数 PCount.next（真按钮的 onclick 就是它）
    protected callPCountNext(el: HTMLElement): boolean {
        try {
            let oc = String((el.getAttribute && el.getAttribute("onclick")) || "");
            if (!/PCount\s*\.\s*next\s*\(/.test(oc)) {
                return false;
            }
            let P = (<any>window).PCount;
            if (!P || typeof P.next != "function") {
                return false;
            }
            // 直接用 onclick 里的参数调用（比解析字符串更稳，参数里可能有引号嵌套）
            let fn = new Function(oc);
            fn.call(window);
            Application.App.log.Info("已调用页面导航函数 PCount.next");
            return true;
        } catch (e) {
            Application.App.log.Warn("调用 PCount.next 失败：" + e);
            return false;
        }
    }

    protected nextPage(num: number) {
        // 目录监听刚点过"下一节"，这里就别再点一次，避免一次跳两节
        let navByCatalog = (<any>window).__cxNavByCatalog || 0;
        if (Date.now() - navByCatalog < 15000) {
            Application.App.log.Info("目录监听已经切换过，跳过重复翻页");
            return;
        }
        let el = this.findNextControl();
        if (el) {
            Application.App.log.Info("切换到下一节（" + (((el as any).innerText || el.tagName) + "").slice(0, 20) + "）");
            // 1) 优先直接调用页面自带的 PCount.next（最可靠，不依赖坐标/事件）
            let done = this.callPCountNext(el);
            if (done) {
                return;
            }
            // 2) 可信真实鼠标点击（CDP 派发，学习通只认真实事件）
            try {
                let ck = (<any>window).cxClickEl;
                if (typeof ck == "function") {
                    let pr = ck(el);
                    if (pr && pr.catch) {
                        pr.catch(() => { /* ignore */ });
                    }
                    return;
                }
            } catch (e) {
                // ignore
            }
            // 3) 合成点击兜底
            try {
                el.click();
            } catch (e) {
                Application.App.log.Warn("点击下一节失败：" + e);
            }
            return;
        }
        //只往后执行（旧版目录）
        el = this.afterPage();
        if (el) {
            try {
                (<any>el.parentElement.querySelector("a>span")).click();
                Application.App.log.Info("已点目录里的下一个任务点");
                return;
            } catch (e) {
                Application.App.log.Warn("点下一个任务点失败：" + e);
            }
        }
        //进行有锁任务查找
        if (document.querySelector("div.ncells > *:not(.currents) > .lock") != undefined) {
            if (num > 5) {
                return this.callEvent("error", "被锁卡住了,请手动处理");
            }
            Application.App.log.Info("下一节被锁定，等待解锁...");
            return setTimeout(() => {
                this.nextPage(num + 1);
            }, 5000);
        }
        Application.App.log.Info("没有找到下一节，本页任务点应已全部完成");
        return this.callEvent("complete");
    }
}

// 考试
export class CxExamTopic implements Mooc {
    public Init(): any {
        window.addEventListener("load", () => {
            let el = <HTMLInputElement>document.querySelector("#paperId");
            let info = "0";
            if (el) {
                info = el.value;
            }
            let task = TaskFactory.CreateExamTopicTask(window, {
                refer: document.URL,
                id: "exam-" + info,
                info: info,
            });
            task.Init();
            if (document.URL.indexOf("exam/test/reVersionTestStartNew") > 0) {
                if (Application.App.config.auto) {
                    task.Start();
                }
            }
        });
    }
}

// 作业
export class CxHomeWork implements Mooc {
    public Init(): any {
        window.onload = () => {
            let el = (<HTMLInputElement>document.querySelector("#workLibraryId"));
            let info = "";
            if (el) {
                info = el.value;
            }
            let task = TaskFactory.CreateHomeworkTopicTask(window, {
                refer: document.URL,
                id: info,
                info: info,
            });
            task.Init();
            if (Application.App.config.auto && <HTMLInputElement>document.querySelector("#workLibraryId")) {
                task.Start();
            }
        }
    }
}
