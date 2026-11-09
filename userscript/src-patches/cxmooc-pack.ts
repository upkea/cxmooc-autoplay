import { ChromeConfigItems, NewFrontendGetConfig } from "@App/internal/utils/config";
import { ConsoleLog, Logger, PageLog } from "@App/internal/utils/log";
import { Application, Frontend } from "@App/internal/application";
import { mooc } from "@App/mooc/mooc";
import { CxPlatform } from "@App/mooc/chaoxing/platform";
import { StartContinueWatch, StartVideoGuard } from "./continue-watch";
import { StartCatalogWatch } from "./catalog-watch";


let logger: Logger;
if (top == self) {
    logger = new PageLog();
} else {
    logger = new ConsoleLog();
}

Application.GlobalContext = (<any>window).unsafeWindow;
let component = new Map<string, any>().
    set("config", new ChromeConfigItems(NewFrontendGetConfig())).
    set("logger", logger);

let app = new Application(Frontend, new mooc(new CxPlatform()), component);
app.run();

// 「继续学习」出现时给页面标题打标记，供 AutoHotkey 识别
StartContinueWatch();
// 视频被暂停时自动恢复播放（在每个 frame 里都跑，视频 iframe 也覆盖）
StartVideoGuard();
// 目录监听：当前章节变绿（完成）后，自动切到下一个还没变绿的章节
StartCatalogWatch();
