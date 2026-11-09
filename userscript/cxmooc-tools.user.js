// ==UserScript==
// @name         超星慕课小工具
// @namespace    https://github.com/CodFrm/cxmooc-tools
// @version      2.5.0
// @description  一个超星慕课刷课工具,火狐,谷歌,油猴支持.全自动任务,视频倍速秒过,作业考试题库,验证码自动打码(੧ᐛ੭挂科模式,启动)
// @author       CodFrm
// @run-at       document-start
// @match        *://*/mycourse/studentstudy?*
// @match        *://*/ztnodedetailcontroller/visitnodedetail?*
// @match        *://*/antispiderShowVerify.ac*
// @match        *://*/html/processVerify.ac?*
// @match        *://*/exam/test/reVersionPaperMarkContentNew?*
// @match        *://*/exam/test/reVersionTestStartNew?*
// @match        *://*/work/selectWorkQuestionYiPiYue?*
// @match        *://*/work/doHomeWorkNew?*
// @match        *://*/ananas/modules/*/index.html?*
// @match        *://*/exam/test?*
// @match        *://*/course/*.html?*
// @grant        GM_xmlhttpRequest
// @grant        GM_notification
// @grant        unsafeWindow
// @license      MIT
// @connect      *
// ==/UserScript==

let config = {
    answer_ignore: false, //忽略题目,勾选此处将不会答题
    auto: true, //全自动挂机,无需手动操作,即可自动观看视频等
    interval: 1, //时间间隔,当任务点完成后,会等待1分钟然后跳转到下一个任务点
    rand_answer: false, //随机答案,没有答案的题目将自动的生成一个答案
    video_multiple: 1, //视频播放倍速,视频播放的倍数,建议不要改动,为1即可,这是危险的功能
    video_mute: true, //视频静音,视频自动静音播放
    video_cdn: "公网1", //锁定视频播放源,为空为记录最后一次选中的源(公网1,公网2等)
    super_mode: true, //解锁flash弹幕视频等,详情请看文档
    topic_interval: 5,//题目答题间隔,单位为秒
    vtoken: "",
    // ===== AI 答题（填了 ai_key 就不再请求题库，直接让 AI 作答）=====
    ai_enable: true,//是否启用 AI 答题
    ai_base: "https://api.siliconflow.cn/v1",//OpenAI 兼容接口地址，如 https://api.deepseek.com/v1 或 http://127.0.0.1:11434/v1
    ai_key: "",//API Key（必填，填了才会启用 AI）
    ai_model: "Qwen/Qwen2.5-7B-Instruct",//模型名
};

// 用户在面板里改过的 AI 配置（更改API / 自动答题开关）单独存一份，刷新后恢复
let cxCustomConfig = {};
try {
    cxCustomConfig = JSON.parse(localStorage.getItem("cx_ai_custom") || "{}") || {};
} catch (e) {
    cxCustomConfig = {};
}
Object.keys(config).forEach(k => {
    localStorage[k] = config[k];
});
Object.keys(cxCustomConfig).forEach(k => {
    localStorage[k] = cxCustomConfig[k];
});

/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId]) {
/******/ 			return installedModules[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// define getter function for harmony exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		if(!__webpack_require__.o(exports, name)) {
/******/ 			Object.defineProperty(exports, name, { enumerable: true, get: getter });
/******/ 		}
/******/ 	};
/******/
/******/ 	// define __esModule on exports
/******/ 	__webpack_require__.r = function(exports) {
/******/ 		if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 			Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 		}
/******/ 		Object.defineProperty(exports, '__esModule', { value: true });
/******/ 	};
/******/
/******/ 	// create a fake namespace object
/******/ 	// mode & 1: value is a module id, require it
/******/ 	// mode & 2: merge all properties of value into the ns
/******/ 	// mode & 4: return value when already ns object
/******/ 	// mode & 8|1: behave like require
/******/ 	__webpack_require__.t = function(value, mode) {
/******/ 		if(mode & 1) value = __webpack_require__(value);
/******/ 		if(mode & 8) return value;
/******/ 		if((mode & 4) && typeof value === 'object' && value && value.__esModule) return value;
/******/ 		var ns = Object.create(null);
/******/ 		__webpack_require__.r(ns);
/******/ 		Object.defineProperty(ns, 'default', { enumerable: true, value: value });
/******/ 		if(mode & 2 && typeof value != 'string') for(var key in value) __webpack_require__.d(ns, key, function(key) { return value[key]; }.bind(null, key));
/******/ 		return ns;
/******/ 	};
/******/
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};
/******/
/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = "./src/tampermonkey/cxmooc-pack.ts");
/******/ })
/************************************************************************/
/******/ ({

/***/ "./src/config.ts":
/*!***********************!*\
  !*** ./src/config.ts ***!
  \***********************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.SystemConfig = void 0;
var SystemConfig = /** @class */ (function () {
    function SystemConfig() {
    }
    SystemConfig.version = 2.5;
    SystemConfig.url = "https://cx.icodef.com/";
    SystemConfig.hotVersion = "2.5.2";
    //TODO:优化规则,可以通过ci自动生成匹配规则到tampermonkey和manifest文件中
    SystemConfig.match = {
        "cx": [
            "*://*/mycourse/studentstudy?*",
            "*://*/work/doHomeWorkNew?*",
            "*://*/work/selectWorkQuestionYiPiYue?*",
            "*://*/exam/test/reVersionTestStartNew?*",
            "*://*/ztnodedetailcontroller/visitnodedetail?*",
            "*://*/antispiderShowVerify.ac*",
            "*://*/html/processVerify.ac?*",
            "*://*/exam/test/reVersionPaperMarkContentNew?*",
            "*://*/ananas/modules/*/index.html?*",
            "*://*/exam/test?*",
            "*://*/course/*.html?*"
        ], "zhs": [
            "*://examh5.zhihuishu.com/stuExamWeb.html*",
            "*://onlineexamh5new.zhihuishu.com/stuExamWeb.html*",
            "*://studyh5.zhihuishu.com/videoStudy.html*",
        ], "mooc163": [
            "*://www.icourse163.org/learn/*",
            "*://www.icourse163.org/spoc/learn/*"
        ]
    };
    SystemConfig.config = {
        cx: {
            name: "超星",
            items: [{
                    title: "随机答案",
                    description: "如果题库没有正确的答案会随机选择",
                    type: "checkbox",
                    key: "rand_answer",
                    value: false,
                }, {
                    title: "自动挂机",
                    description: "进入一个页面就会自动开始挂机,完成一个任务之后会自动进行下一个",
                    type: "checkbox",
                    key: "auto",
                    value: true,
                }, {
                    title: "视频静音",
                    description: "播放视频时,自动开启静音",
                    type: "checkbox",
                    key: "video_mute",
                    value: true,
                }, {
                    title: "忽略题目",
                    description: "自动挂机时,忽略掉题目不做,直接跳过",
                    type: "checkbox",
                    key: "answer_ignore",
                    value: false,
                }, {
                    title: "超级模式",
                    description: "超星平台下,超级模式会自动将flash播放器换成h5播放器",
                    type: "checkbox",
                    key: "super_mode",
                    value: true,
                }, {
                    title: "播放源",
                    description: "锁定视频播放源,为空为记录最后一次选中的源(公网1,公网2等)",
                    type: "text",
                    key: "video_cdn",
                    value: "默认"
                }, {
                    title: "播放倍速",
                    description: "视频播放的倍数,1为正常速度(最高16倍,该功能有一定危险)",
                    type: "text",
                    key: "video_multiple",
                    prompt: "这是一个很危险的功能,建议不要进行调整,如果你想调整播放速度请在下方填写yes(智慧树平台播放速度和视频进度无关,最高只能1.5倍速)",
                    unit: "倍",
                    value: "1",
                }, {
                    title: "跳转间隔",
                    description: "视频(题目,任务点)完成后n分钟再继续下一个任务,可以有小数点,例如:0.5=30秒",
                    type: "text",
                    key: "interval",
                    unit: "分",
                    value: "1",
                }, {
                    title: "做题间隔",
                    description: "每一道题之间填写答案的时间间隔",
                    type: "text",
                    key: "topic_interval",
                    unit: "秒",
                    value: "5",
                }],
        }, zhs: {
            name: "智慧树",
            items: [{
                    title: "随机答案",
                    description: "如果题库没有正确的答案会随机选择",
                    type: "checkbox",
                    key: "rand_answer",
                    value: false,
                }, {
                    title: "自动挂机",
                    description: "进入一个页面就会自动开始挂机,完成一个任务之后会自动进行下一个",
                    type: "checkbox",
                    key: "auto",
                    value: true,
                }, {
                    title: "视频静音",
                    description: "播放视频时,自动开启静音",
                    type: "checkbox",
                    key: "video_mute",
                    value: true,
                }, {
                    title: "超级模式",
                    description: "智慧树平台下,超级模式会让任务完成的倍速成真",
                    type: "checkbox",
                    key: "super_mode",
                    value: true,
                }, {
                    title: "播放倍速",
                    description: "视频播放的倍数,1为正常速度(最高16倍,该功能有一定危险)",
                    type: "text",
                    key: "video_multiple",
                    prompt: "这是一个很危险的功能,建议不要进行调整,如果你想调整播放速度请在下方填写yes(智慧树平台播放速度和视频进度无关,最高只能1.5倍速)",
                    unit: "倍",
                    value: "1",
                }, {
                    title: "跳转间隔",
                    description: "视频完成后n分钟再继续播放下一个,可以有小数点,例如:0.5=30秒",
                    type: "text",
                    key: "interval",
                    unit: "分",
                    value: "1",
                }, {
                    title: "做题间隔",
                    description: "每一道题之间填写答案的时间间隔",
                    type: "text",
                    key: "topic_interval",
                    unit: "秒",
                    value: "5",
                }],
        }, mooc163: {
            name: "中国大学MOOC",
            items: [{
                    title: "随机答案",
                    description: "如果题库没有正确的答案会随机选择",
                    type: "checkbox",
                    key: "rand_answer",
                    value: false,
                }, {
                    title: "自动挂机",
                    description: "进入一个页面就会自动开始挂机,完成一个任务之后会自动进行下一个",
                    type: "checkbox",
                    key: "auto",
                    value: true,
                }, {
                    title: "视频静音",
                    description: "播放视频时,自动开启静音",
                    type: "checkbox",
                    key: "video_mute",
                    value: true,
                }, {
                    title: "忽略题目",
                    description: "自动挂机时,忽略掉题目不做,直接跳过",
                    type: "checkbox",
                    key: "answer_ignore",
                    value: false,
                }, {
                    title: "播放倍速",
                    description: "视频播放的倍数,1为正常速度(最高16倍,该功能有一定危险)",
                    type: "text",
                    key: "video_multiple",
                    prompt: "这是一个很危险的功能,建议不要进行调整,如果你想调整播放速度请在下方填写yes(智慧树平台播放速度和视频进度无关,最高只能1.5倍速)",
                    unit: "倍",
                    value: "1",
                }, {
                    title: "跳转间隔",
                    description: "视频完成后n分钟再继续播放下一个,可以有小数点,例如:0.5=30秒",
                    type: "text",
                    key: "interval",
                    unit: "分",
                    value: "1",
                }, {
                    title: "做题间隔",
                    description: "每一道题之间填写答案的时间间隔",
                    type: "text",
                    key: "topic_interval",
                    unit: "秒",
                    value: "5",
                }],
        },
    };
    return SystemConfig;
}());
exports.SystemConfig = SystemConfig;


/***/ }),

/***/ "./src/internal/app/ai.ts":
/*!********************************!*\
  !*** ./src/internal/app/ai.ts ***!
  \********************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TestAIConnection = exports.AskAI = exports.ParseAIAnswer = exports.BuildAIPrompt = exports.AIEnabled = exports.AIConfig = void 0;
var application_1 = __webpack_require__(/*! ../application */ "./src/internal/application.ts");
var utils_1 = __webpack_require__(/*! ../utils/utils */ "./src/internal/utils/utils.ts");
function cfg(key, def) {
    try {
        var val = application_1.Application.App.config.GetConfig(key, def);
        if (val === undefined || val === null || String(val).trim() === "") {
            return def;
        }
        return String(val).trim();
    }
    catch (e) {
        return def;
    }
}
function AIConfig() {
    return {
        base: cfg("ai_base", "https://api.siliconflow.cn/v1").replace(/\/+$/, ""),
        key: cfg("ai_key", ""),
        model: cfg("ai_model", "Qwen/Qwen2.5-7B-Instruct"),
    };
}
exports.AIConfig = AIConfig;
function AIEnabled() {
    try {
        var c = AIConfig();
        return cfg("ai_enable", "true") != "false" && !!c.key;
    }
    catch (e) {
        return false;
    }
}
exports.AIEnabled = AIEnabled;
function typeText(type) {
    switch (type) {
        case 1:
            return "单选题";
        case 2:
            return "多选题";
        case 3:
            return "判断题";
        case 4:
            return "填空题";
        default:
            return "题目";
    }
}
function BuildAIPrompt(topic, type, options) {
    var prompt = "";
    // 给弱模型一个格式示例，避免它把推理过程当答案
    prompt += "【示例】\n";
    prompt += "题型：单选题\n题目：下列哪一项是哺乳动物？\n选项：\nA. 鲨鱼\nB. 鲸鱼\nC. 鳄鱼\nD. 金鱼\n答案：B\n\n";
    prompt += "【题目】\n";
    prompt += "题型：" + typeText(type) + "\n";
    prompt += "题目：" + topic + "\n";
    if (options && options.length > 0) {
        prompt += "选项：\n";
        for (var i = 0; i < options.length; i++) {
            prompt += String(options[i].option) + ". " + String(options[i].content || "") + "\n";
        }
    }
    prompt += "\n作答要求：\n";
    prompt += "1. 先在心里逐项判断每个选项，不要输出长篇分析；\n";
    prompt += "2. 最后单独一行输出最终答案，格式必须是「答案：X」；\n";
    switch (type) {
        case 1:
            prompt += "3. 单选：只有一个正确项，X 是一个字母，例如「答案：B」。\n";
            break;
        case 2:
            prompt += "3. 多选：正确项通常 2~4 个，不要一律全选；题目问「哪两种/哪几项」时按题目要求的数量给，例如「答案：ABD」。\n";
            break;
        case 3:
            prompt += "3. 判断：X 是「对」或「错」，例如「答案：对」。\n";
            break;
        case 4:
            prompt += "3. 填空：每个空一行，每行都以「答案：」开头，例如第 1 空「答案：第一个空的内容」。不要带序号。\n";
            break;
        default:
            prompt += "3. X 是答案本身。\n";
    }
    return prompt;
}
exports.BuildAIPrompt = BuildAIPrompt;
function uniq(arr) {
    var res = [];
    for (var i = 0; i < arr.length; i++) {
        if (res.indexOf(arr[i]) < 0) {
            res.push(arr[i]);
        }
    }
    return res;
}
// 把 AI 的回复解析成 correct 选项
function ParseAIAnswer(raw, type, options) {
    var text = (raw || "").trim();
    if (!text) {
        return null;
    }
    // 提示词要求最后输出「答案：X」，优先只解析这一段，避免推理过程里的字母干扰
    var finalAns = "";
    try {
        var re = /(?:正确答案|答案)\s*[:：]\s*([^\n]*)/g;
        var m = void 0;
        while ((m = re.exec(text)) !== null) {
            if (m[1] && m[1].trim()) {
                finalAns = m[1].trim();
            }
        }
    }
    catch (e) {
        finalAns = "";
    }
    var textAns = finalAns || text;
    var validLetters = uniq((options || []).map(function (o) { return String(o.option || "").toUpperCase(); })
        .filter(function (s) { return /^[A-H]$/.test(s); }));
    if (type == 3) {
        var neg = /(错|错误|不对|不正确|×|✗|✘|FALSE)/i.test(textAns);
        var pos = /(对|正确|√|✓|✔|TRUE)/i.test(textAns);
        if (neg && !pos) {
            return [{ option: false, content: false }];
        }
        if (pos && !neg) {
            return [{ option: true, content: true }];
        }
        return textAns.indexOf("对") >= 0 ? [{ option: true, content: true }] : [{ option: false, content: false }];
    }
    if (type == 4) {
        // 优先取所有「答案：xxx」行（每空一行）
        var ansLines = [];
        try {
            var lines_1 = text.split(/\r?\n/);
            for (var i = 0; i < lines_1.length; i++) {
                var m = lines_1[i].match(/(?:正确答案|答案)\s*[:：]\s*(.+)$/);
                if (m && m[1] && m[1].trim()) {
                    ansLines.push(m[1].trim());
                }
            }
        }
        catch (e) {
            ansLines = [];
        }
        var source = ansLines.length > 0 ? ansLines : text.split(/\r?\n/)
            .map(function (s) { return s.replace(/^\s*(?:第)?\s*\d+\s*(?:空|题)?\s*[.、:：)）]\s*/, "").trim(); })
            .filter(function (s) { return s.length > 0 && !/^\d+$/.test(s); });
        var n = (options && options.length) ? options.length : source.length;
        var res = [];
        for (var i = 0; i < n; i++) {
            var content = source[i] !== undefined ? source[i] : (source[0] || "");
            res.push({ option: String(i + 1), content: content });
        }
        if (res.length == 1) {
            res[0].option = "1";
        }
        return res;
    }
    // 单选/多选：先试内容匹配，再试字母
    var byContent = [];
    for (var i = 0; i < (options || []).length; i++) {
        var content = String(options[i].content || "").trim();
        if (content.length >= 2 && textAns.indexOf(content) >= 0) {
            byContent.push({ option: options[i].option, content: "" });
        }
    }
    if (byContent.length > 0 && (type == 2 || byContent.length == 1)) {
        return byContent;
    }
    // 字母：优先整行只有字母的情况
    var lines = textAns.split(/\r?\n/).map(function (s) { return s.trim(); }).filter(function (s) { return s.length > 0; });
    var letters = [];
    for (var i = 0; i < lines.length; i++) {
        if (/^[A-Ha-h\s.、,，]+$/.test(lines[i])) {
            letters = lines[i].toUpperCase().match(/[A-H]/g) || [];
        }
    }
    if (letters.length == 0) {
        letters = textAns.toUpperCase().match(/\b[A-H]\b/g) || [];
    }
    letters = uniq(letters).filter(function (l) { return validLetters.length == 0 || validLetters.indexOf(l) >= 0; });
    if (letters.length == 0) {
        return null;
    }
    if (type == 1) {
        letters = [letters[0]];
    }
    return letters.map(function (l) { return ({ option: l, content: "" }); });
}
exports.ParseAIAnswer = ParseAIAnswer;
function AskAI(topic, type, options) {
    return new Promise(function (resolve) {
        var conf = AIConfig();
        if (!conf.key) {
            return resolve({ ok: false, correct: null, error: "未配置 ai_key" });
        }
        var body = JSON.stringify({
            model: conf.model,
            temperature: 0,
            max_tokens: 700,
            messages: [
                { role: "system", content: "你是严谨的网课答题助手：先判断，再按格式输出最终答案。" },
                { role: "user", content: BuildAIPrompt(topic, type, options) },
            ],
        });
        try {
            utils_1.HttpUtils.HttpPost(conf.base + "/chat/completions", body, {
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": "Bearer " + conf.key,
                },
                json: true,
                success: function (res) {
                    try {
                        var content = "";
                        if (res && res.choices && res.choices.length > 0) {
                            if (res.choices[0].message) {
                                content = res.choices[0].message.content || "";
                            }
                            else if (res.choices[0].text) {
                                content = res.choices[0].text;
                            }
                        }
                        if (!content && typeof res == "string") {
                            content = res;
                        }
                        if (!content) {
                            return resolve({ ok: false, correct: null, error: "AI 返回为空", raw: JSON.stringify(res) });
                        }
                        var correct = ParseAIAnswer(content, type, options);
                        application_1.Application.App.log.Debug("AI 原始回复", content);
                        if (!correct) {
                            return resolve({ ok: false, correct: null, raw: content, error: "无法解析 AI 回复" });
                        }
                        return resolve({ ok: true, correct: correct, raw: content });
                    }
                    catch (e) {
                        return resolve({ ok: false, correct: null, error: String(e) });
                    }
                },
                error: function () {
                    return resolve({ ok: false, correct: null, error: "网络请求失败（检查 ai_base / 网络 / 代理）" });
                },
            });
        }
        catch (e) {
            return resolve({ ok: false, correct: null, error: "请求发不出去：" + ((e && e.message) ? e.message : e) });
        }
    });
}
exports.AskAI = AskAI;
function TestAIConnection(conf) {
    var _this = this;
    return new Promise(function (resolve) {
        conf = conf || AIConfig();
        var base = (conf.base || "").replace(/\/+$/, "");
        var t0 = Date.now();
        var finish = function (r) {
            r.ms = Date.now() - t0;
            resolve(r);
        };
        if (!conf.key) {
            return finish({ ok: false, ms: 0, error: "还没填 API Key" });
        }
        if (!base) {
            return finish({ ok: false, ms: 0, error: "还没填接口地址" });
        }
        var url = base + "/chat/completions";
        var payload = JSON.stringify({
            model: conf.model,
            max_tokens: 4,
            temperature: 0,
            messages: [{ role: "user", content: "ping" }],
        });
        var handle = function (status, text) {
            if (status >= 200 && status < 300) {
                return finish({ ok: true, ms: 0, status: status });
            }
            if (status == 401 || status == 403) {
                return finish({ ok: false, ms: 0, status: status, error: "Key 不对或没有权限(HTTP " + status + ")" });
            }
            if (status == 404) {
                return finish({ ok: false, ms: 0, status: status, error: "接口地址不对(HTTP 404)，检查接口地址" });
            }
            if (status == 429) {
                return finish({ ok: false, ms: 0, status: status, error: "请求太频繁或额度用完了(HTTP 429)" });
            }
            if (status == 0) {
                return finish({ ok: false, ms: 0, status: status, error: "网络错误：连不上接口" });
            }
            return finish({ ok: false, ms: 0, status: status, error: "HTTP " + status + "：" + (text || "").slice(0, 80) });
        };
        try {
            var gx = window.GM_xmlhttpRequest;
            if (typeof gx == "function") {
                gx({
                    method: "POST",
                    url: url,
                    headers: { "Content-Type": "application/json", "Authorization": "Bearer " + conf.key },
                    data: payload,
                    timeout: 15000,
                    onload: function (resp) { return handle(resp.status, resp.responseText); },
                    onerror: function () { return finish({ ok: false, ms: 0, error: "网络错误：连不上接口" }); },
                    ontimeout: function () { return finish({ ok: false, ms: 0, error: "请求超时（15 秒）" }); },
                });
                return;
            }
            fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json", "Authorization": "Bearer " + conf.key },
                body: payload,
            }).then(function (r) { return __awaiter(_this, void 0, void 0, function () {
                var text;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, r.text()];
                        case 1:
                            text = _a.sent();
                            handle(r.status, text);
                            return [2 /*return*/];
                    }
                });
            }); }).catch(function () {
                finish({ ok: false, ms: 0, error: "网络错误：连不上接口" });
            });
        }
        catch (e) {
            finish({ ok: false, ms: 0, error: String(e) });
        }
    });
}
exports.TestAIConnection = TestAIConnection;


/***/ }),

/***/ "./src/internal/app/question.ts":
/*!**************************************!*\
  !*** ./src/internal/app/question.ts ***!
  \**************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ToolsQuestionBankFacade = exports.ToolsQuestionBank = exports.GuessTopicType = exports.SwitchTopicType = exports.QuestionStatusString = exports.TopicStatusString = exports.PushAnswer = void 0;
var utils_1 = __webpack_require__(/*! ../utils/utils */ "./src/internal/utils/utils.ts");
var config_1 = __webpack_require__(/*! @App/config */ "./src/config.ts");
var application_1 = __webpack_require__(/*! ../application */ "./src/internal/application.ts");
var ai_1 = __webpack_require__(/*! ./ai */ "./src/internal/app/ai.ts");
var PushAnswer = /** @class */ (function () {
    function PushAnswer() {
    }
    PushAnswer.prototype.Equal = function (content1, content2) {
        return content1 == content2;
    };
    return PushAnswer;
}());
exports.PushAnswer = PushAnswer;
var topicStatusMap = new Map();
topicStatusMap.set("ok", "搜索成功").set("random", "随机答案").set("no_support_random", "不支持的随机答案类型").set("no_answer", "题库中没有搜索到答案").set("no_match", "题库中没有符合的答案");
var questionStatusMap = new Map();
questionStatusMap.set("success", "搜索成功").set("network", "题库网络错误").set("incomplete", "题库不全").set("processing", "搜索中...");
function TopicStatusString(status) {
    return topicStatusMap.get(status) || "未知错误";
}
exports.TopicStatusString = TopicStatusString;
function QuestionStatusString(status) {
    return questionStatusMap.get(status) || "未知错误";
}
exports.QuestionStatusString = QuestionStatusString;
function SwitchTopicType(title) {
    if (!title) {
        return null;
    }
    var t = String(title);
    var norm = t.replace(/\s+/g, "");
    switch (norm) {
        case "单选题":
        case "单选":
        case "单项选择题": {
            return 1;
        }
        case "多选题":
        case "多选":
        case "多项选择题": {
            return 2;
        }
        case "判断题":
        case "判断": {
            return 3;
        }
        case "填空题":
        case "填空":
        case "简答题":
        case "名词解释":
        case "论述题": {
            return 4;
        }
        default: {
            // 兜底：截取开头两个字判断（页面有时带序号等前缀）
            var head = norm.slice(0, 4);
            if (head.indexOf("单选") >= 0) {
                return 1;
            }
            if (head.indexOf("多选") >= 0) {
                return 2;
            }
            if (head.indexOf("判断") >= 0) {
                return 3;
            }
            if (head.indexOf("填空") >= 0 || head.indexOf("简答") >= 0 || head.indexOf("论述") >= 0) {
                return 4;
            }
            return null;
        }
    }
}
exports.SwitchTopicType = SwitchTopicType;
// 按页面 DOM 结构推断题型：没有题型标题时的兜底
// 单选：radio 一组；多选：checkbox 一组；判断：两个 radio（对/错）；填空：input/textarea
// 另外向上找分类标题（「一. 单选题（共1题）」），很多新版页面选项不是 input 元素
function GuessTopicType(el) {
    try {
        var root = el || document.body;
        // 0) 先看自身文字里有没有题型标记
        var selfText = String(root.innerText || "").slice(0, 80);
        if (/多选题|多选/.test(selfText)) {
            return 2;
        }
        if (/判断题|判断/.test(selfText)) {
            return 3;
        }
        if (/填空题|填空/.test(selfText)) {
            return 4;
        }
        if (/单选题|单选/.test(selfText)) {
            return 1;
        }
        // 1) 向上找分类标题
        var node = root;
        for (var depth = 0; depth < 8 && node; depth++) {
            var prev = node.previousElementSibling;
            var guard = 0;
            while (prev && guard < 6) {
                var t = String(prev.innerText || "").slice(0, 40);
                if (/多选题|多选/.test(t)) {
                    return 2;
                }
                if (/判断题|判断/.test(t)) {
                    return 3;
                }
                if (/填空题|填空/.test(t)) {
                    return 4;
                }
                if (/单选题|单选/.test(t)) {
                    return 1;
                }
                prev = prev.previousElementSibling;
                guard++;
            }
            node = node.parentElement;
        }
        // 2) 按控件类型判断
        var checkbox = root.querySelectorAll('input[type="checkbox"]');
        var radio = root.querySelectorAll('input[type="radio"]');
        var input = root.querySelectorAll('input[type="text"],input[type="input"],textarea');
        if (checkbox.length > 0 && radio.length == 0) {
            return 2;
        }
        if (radio.length > 0) {
            return radio.length <= 2 ? 3 : 1;
        }
        if (input.length > 0) {
            return 4;
        }
    }
    catch (e) {
        // ignore
    }
    return null;
}
exports.GuessTopicType = GuessTopicType;
// 小工具题库
var ToolsQuestionBank = /** @class */ (function () {
    function ToolsQuestionBank(platform, info) {
        this.platform = platform;
        this.info = info;
    }
    ToolsQuestionBank.prototype.SetInfo = function (info) {
        this.info = info;
    };
    ToolsQuestionBank.prototype.GetInfo = function () {
        return encodeURIComponent(JSON.stringify(this.info));
    };
    ToolsQuestionBank.prototype.Answer = function (topic, resolve) {
        var _this = this;
        application_1.Application.App.log.Debug("答案查询", topic);
        var num = 20;
        var answer = new Array();
        var retStatus = "success";
        var next = function (index) {
            var body = "info=" + _this.GetInfo() + "&";
            var t = index;
            for (; t < index + num && t < topic.length; t++) {
                var val = topic[t];
                body += "topic[" + (t - index) + "]=" + encodeURIComponent((val.topic)) + "&type[" + (t - index) + "]=" + val.type + "&";
            }
            utils_1.HttpUtils.HttpPost(config_1.SystemConfig.url + "v2/answer?platform=" + _this.platform, body, {
                headers: {
                    "Authorization": application_1.Application.App.config.vtoken,
                    "X-Version": config_1.SystemConfig.version.toString(),
                },
                json: true,
                success: function (result) { return __awaiter(_this, void 0, void 0, function () {
                    var status, tmpResult, i, val;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0:
                                status = "success";
                                tmpResult = new Array();
                                for (i = 0; i < result.length; i++) {
                                    if (result[i].result == undefined || result[i].result.length <= 0) {
                                        tmpResult.push({
                                            index: index + result[i].index,
                                            topic: result[i].topic,
                                            type: -1,
                                            status: "no_answer",
                                            answers: null,
                                            correct: null,
                                            Equal: this.Equal,
                                        });
                                        status = "incomplete";
                                        continue;
                                    }
                                    val = result[i].result[0];
                                    tmpResult.push({
                                        index: index + result[i].index,
                                        topic: val.topic,
                                        type: val.type,
                                        correct: val.correct,
                                        status: "ok",
                                        Equal: this.Equal,
                                    });
                                }
                                answer = answer.concat(tmpResult);
                                if (status != "success") {
                                    retStatus = status;
                                }
                                return [4 /*yield*/, resolve({ status: "processing", answer: tmpResult })];
                            case 1:
                                _a.sent();
                                if (t < topic.length) {
                                    next(t);
                                }
                                else {
                                    return [2 /*return*/, resolve({ status: retStatus, answer: answer })];
                                }
                                return [2 /*return*/];
                        }
                    });
                }); },
                error: function () {
                    return resolve({ status: "network", answer: answer });
                }
            });
        };
        next(0);
    };
    ToolsQuestionBank.prototype.Push = function (answer) {
        var _this = this;
        return new Promise(function (resolve) {
            application_1.Application.App.log.Debug("采集提交", answer);
            utils_1.HttpUtils.HttpPost(config_1.SystemConfig.url + "answer?platform=" + _this.platform, "info=" + _this.GetInfo() + "&data=" + encodeURIComponent(JSON.stringify(answer)), {
                headers: {
                    "Authorization": application_1.Application.App.config.vtoken,
                    "X-Version": config_1.SystemConfig.version.toString(),
                },
                json: true,
                success: function (result) {
                    application_1.Application.App.log.Info("答案自动记录成功,成功获得" + result.add_token_num + "个打码数,剩余数量:" + result.token_num);
                    resolve("success");
                },
                error: function () {
                    resolve("network");
                }
            });
        });
    };
    ToolsQuestionBank.prototype.Equal = function (content1, content2) {
        return utils_1.removeHTML(content1) == utils_1.removeHTML(content2);
    };
    ToolsQuestionBank.prototype.CheckCourse = function (info) {
        var _this = this;
        return new Promise(function (resolve) {
            info = info || [_this.info];
            utils_1.HttpUtils.HttpPost(config_1.SystemConfig.url + "v2/check?platform=" + _this.platform, "info=" + encodeURIComponent(JSON.stringify(info)), {
                headers: {
                    "Authorization": application_1.Application.App.config.vtoken,
                    "X-Version": config_1.SystemConfig.version.toString(),
                },
                success: function () {
                    resolve(0);
                }, error: function () {
                    resolve(-1);
                }
            });
            resolve();
        });
    };
    return ToolsQuestionBank;
}());
exports.ToolsQuestionBank = ToolsQuestionBank;
var ToolsQuestionBankFacade = /** @class */ (function () {
    function ToolsQuestionBankFacade(platform, info) {
        if (typeof platform == "string") {
            this.bank = new ToolsQuestionBank(platform, info);
        }
        else {
            this.bank = platform;
        }
        this.question = new Array();
    }
    ToolsQuestionBankFacade.prototype.ClearQuestion = function () {
        this.question = new Array();
    };
    ToolsQuestionBankFacade.prototype.AddQuestion = function (q) {
        this.question.push(q);
    };
    ToolsQuestionBankFacade.prototype.GetQuestionCount = function () {
        return this.question.length;
    };
    ToolsQuestionBankFacade.prototype.Answer = function (callback) {
        var _this = this;
        // 配置了 AI 就直接走 AI 答题，不再请求题库
        var useAI = ai_1.AIEnabled();
        application_1.Application.App.log.Info("开始答题：识别到 " + this.question.length + " 道题，" + (useAI ? "用 AI 作答" : "走原题库"));
        if (useAI) {
            this.answerWithAI(callback);
            return;
        }
        var topic = new Array();
        this.question.forEach(function (val) {
            var type = val.GetType();
            if (type == -1) {
                return;
            }
            topic.push({
                topic: (val.GetTopic()),
                type: type,
            });
        });
        var status = "success";
        this.bank.Answer(topic, function (ret) {
            return new Promise(function (resolve) { return __awaiter(_this, void 0, void 0, function () {
                var t, i, answer, question, tmpStatus;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            if (ret.status != "processing") {
                                application_1.Application.App.log.Debug("题库返回", ret);
                                if (ret.status != "success" || status == "success") {
                                    callback(ret.status);
                                    return [2 /*return*/, resolve()];
                                }
                                callback(status);
                                return [2 /*return*/, resolve()];
                            }
                            t = application_1.Application.App.config.topic_interval * 1000;
                            i = 0;
                            _a.label = 1;
                        case 1:
                            if (!(i < ret.answer.length)) return [3 /*break*/, 11];
                            answer = ret.answer[i];
                            question = this.question[answer.index];
                            tmpStatus = answer.status;
                            if (!(answer.status == "no_answer")) return [3 /*break*/, 3];
                            status = this.randAnswer(status, tmpStatus, question);
                            return [4 /*yield*/, utils_1.Sleep(t)];
                        case 2:
                            _a.sent();
                            return [3 /*break*/, 10];
                        case 3:
                            if (!(answer.type != question.GetType())) return [3 /*break*/, 4];
                            tmpStatus = "no_match";
                            return [3 /*break*/, 6];
                        case 4: return [4 /*yield*/, question.Fill(answer)];
                        case 5:
                            tmpStatus = _a.sent();
                            _a.label = 6;
                        case 6:
                            if (!(tmpStatus == "no_match")) return [3 /*break*/, 8];
                            status = this.randAnswer(status, tmpStatus, question);
                            return [4 /*yield*/, utils_1.Sleep(t)];
                        case 7:
                            _a.sent();
                            return [3 /*break*/, 10];
                        case 8:
                            question.SetStatus(tmpStatus);
                            if (!(i < ret.answer.length - 1)) return [3 /*break*/, 10];
                            return [4 /*yield*/, utils_1.Sleep(t)];
                        case 9:
                            _a.sent();
                            _a.label = 10;
                        case 10:
                            i++;
                            return [3 /*break*/, 1];
                        case 11: return [2 /*return*/, resolve()];
                    }
                });
            }); });
        });
    };
    // 用 AI 逐题作答（不经过题库）
    ToolsQuestionBankFacade.prototype.answerWithAI = function (callback) {
        return __awaiter(this, void 0, void 0, function () {
            var list, i, status, interval, i, q, type, options, title, parts, k, ret, r2, r3, voted, e_1, rate, wrong, correct, wantTrue, mapped, k, text, isTrue, isFalse, idx, answer, tmp, e3_1, e_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        list = new Array();
                        for (i = 0; i < this.question.length; i++) {
                            if (this.question[i].GetType() == -1) {
                                continue;
                            }
                            list.push(this.question[i]);
                        }
                        if (list.length == 0) {
                            application_1.Application.App.log.Warn("页面上没识别到题目（选择器 .TiMu 没命中），可能是题目还没加载出来或页面结构变了");
                            return [2 /*return*/, callback("incomplete")];
                        }
                        status = "success";
                        interval = application_1.Application.App.config.topic_interval * 1000;
                        i = 0;
                        _a.label = 1;
                    case 1:
                        if (!(i < list.length)) return [3 /*break*/, 22];
                        q = list[i];
                        _a.label = 2;
                    case 2:
                        _a.trys.push([2, 18, , 19]);
                        type = q.GetType();
                        options = [];
                        try {
                            options = q.GetOptions ? (q.GetOptions() || []) : [];
                        }
                        catch (e) {
                            application_1.Application.App.log.Warn("读取选项失败（不影响作答）：" + ((e && e.message) ? e.message : e));
                            options = [];
                        }
                        title = "";
                        try {
                            title = q.GetTopic() || "";
                        }
                        catch (e) {
                            title = "";
                        }
                        application_1.Application.App.log.Info("AI 答题中（" + (i + 1) + "/" + list.length + "）：" + title.substring(0, 40));
                        // 诊断：把实际发给 AI 的选项打出来（内容为空说明页面没取到选项文字）
                        try {
                            if (options.length > 0) {
                                parts = [];
                                for (k = 0; k < options.length; k++) {
                                    parts.push(String(options[k].option) + "=" + String(options[k].content || "").slice(0, 20));
                                }
                                application_1.Application.App.log.Info("AI 选项：" + parts.join(" | "));
                            }
                            else {
                                application_1.Application.App.log.Info("AI 选项：没取到选项文字");
                            }
                        }
                        catch (e) {
                            // ignore
                        }
                        return [4 /*yield*/, ai_1.AskAI(title, type, options)];
                    case 3:
                        ret = _a.sent();
                        if (!((type == 1 || type == 2 || type == 3) && ret.ok)) return [3 /*break*/, 10];
                        _a.label = 4;
                    case 4:
                        _a.trys.push([4, 9, , 10]);
                        return [4 /*yield*/, ai_1.AskAI(title, type, options)];
                    case 5:
                        r2 = _a.sent();
                        if (!this.sameAIResult(ret, r2)) return [3 /*break*/, 6];
                        application_1.Application.App.log.Info("AI 复核一致");
                        return [3 /*break*/, 8];
                    case 6: return [4 /*yield*/, ai_1.AskAI(title, type, options)];
                    case 7:
                        r3 = _a.sent();
                        voted = this.voteAIResults([ret, r2, r3]);
                        application_1.Application.App.log.Info("AI 两次不一致，三次投票 -> " + this.aiVoteKey(voted));
                        ret = voted;
                        _a.label = 8;
                    case 8: return [3 /*break*/, 10];
                    case 9:
                        e_1 = _a.sent();
                        return [3 /*break*/, 10];
                    case 10:
                        // 拟人化：故意答错率（wrong_rate，百分比，默认 0 = 永远答对；只对单选/判断生效）
                        if (ret.ok && (type == 1 || type == 3)) {
                            try {
                                rate = parseFloat(application_1.Application.App.config.GetConfig("wrong_rate", "0"));
                                if (!isNaN(rate) && rate > 0 && Math.random() * 100 < rate) {
                                    wrong = this.pickWrongAnswer(type, options, ret.correct);
                                    if (wrong && wrong.length > 0) {
                                        application_1.Application.App.log.Warn("拟人化：这道题故意答错（wrong_rate=" + rate + "%）");
                                        ret = { ok: true, correct: wrong, raw: ret.raw };
                                    }
                                }
                            }
                            catch (e) {
                                // ignore
                            }
                        }
                        if (!(!ret.ok || !ret.correct || ret.correct.length == 0)) return [3 /*break*/, 13];
                        application_1.Application.App.log.Warn("AI 没给出答案：" + (ret.error || "无法解析"));
                        status = this.randAnswer(status, "no_answer", q);
                        if (!(i < list.length - 1)) return [3 /*break*/, 12];
                        return [4 /*yield*/, this.aiSleep(interval)];
                    case 11:
                        _a.sent();
                        _a.label = 12;
                    case 12: return [3 /*break*/, 21];
                    case 13:
                        application_1.Application.App.log.Info("AI 回答：" + String(ret.raw || "").replace(/\s+/g, " ").slice(0, 60));
                        correct = ret.correct;
                        if (type == 3 && options.length > 0) {
                            wantTrue = !!ret.correct[0].option;
                            mapped = new Array();
                            for (k = 0; k < options.length; k++) {
                                text = String(options[k].content || "") + " " + String(options[k].option || "");
                                isTrue = /对|正确|√|✓|TRUE/i.test(text);
                                isFalse = /错|错误|×|✗|FALSE/i.test(text);
                                if ((wantTrue && isTrue && !isFalse) || (!wantTrue && isFalse && !isTrue)) {
                                    mapped.push({ option: String(options[k].option || ""), content: "" });
                                    break;
                                }
                            }
                            if (mapped.length == 0) {
                                idx = wantTrue ? 0 : 1;
                                if (options[idx]) {
                                    mapped.push({ option: String(options[idx].option || ""), content: "" });
                                }
                            }
                            if (mapped.length > 0) {
                                correct = mapped;
                            }
                        }
                        answer = {
                            index: i,
                            topic: title,
                            type: type,
                            status: "ok",
                            answers: options,
                            correct: correct,
                            Equal: function (content1, content2) { return utils_1.removeHTML(content1) == utils_1.removeHTML(content2); },
                        };
                        application_1.Application.App.log.Info("准备勾选：" + JSON.stringify(correct.map(function (v) { return v.option; })));
                        tmp = void 0;
                        _a.label = 14;
                    case 14:
                        _a.trys.push([14, 16, , 17]);
                        return [4 /*yield*/, q.Fill(answer)];
                    case 15:
                        tmp = _a.sent();
                        return [3 /*break*/, 17];
                    case 16:
                        e3_1 = _a.sent();
                        application_1.Application.App.log.Warn("勾选答案失败：" + this.errText(e3_1));
                        tmp = "no_match";
                        return [3 /*break*/, 17];
                    case 17:
                        if (tmp == "ok") {
                            q.SetStatus("ok");
                            application_1.Application.App.log.Info("AI 答案已填写：" + JSON.stringify(correct.map(function (v) { return v.option; })));
                        }
                        else {
                            status = this.randAnswer(status, tmp, q);
                        }
                        return [3 /*break*/, 19];
                    case 18:
                        e_2 = _a.sent();
                        application_1.Application.App.log.Warn("AI 答题异常（第 " + (i + 1) + " 题）：" + this.errText(e_2));
                        try {
                            status = this.randAnswer(status, "no_answer", q);
                        }
                        catch (e2) {
                            status = "incomplete";
                        }
                        return [3 /*break*/, 19];
                    case 19:
                        if (!(i < list.length - 1)) return [3 /*break*/, 21];
                        return [4 /*yield*/, this.aiSleep(interval)];
                    case 20:
                        _a.sent();
                        _a.label = 21;
                    case 21:
                        i++;
                        return [3 /*break*/, 1];
                    case 22: return [2 /*return*/, callback(status)];
                }
            });
        });
    };
    // 拟人化：每题之间在 topic_interval 基础上加 0~3 秒随机延迟
    ToolsQuestionBankFacade.prototype.aiSleep = function (interval) {
        return __awaiter(this, void 0, Promise, function () {
            var r, extra, e_3;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 4]);
                        r = application_1.Application.App.config.GetConfig("random_delay", "true");
                        extra = r != "false" ? Math.floor(Math.random() * 3000) : 0;
                        return [4 /*yield*/, utils_1.Sleep(interval + extra)];
                    case 1:
                        _a.sent();
                        return [3 /*break*/, 4];
                    case 2:
                        e_3 = _a.sent();
                        return [4 /*yield*/, utils_1.Sleep(interval)];
                    case 3:
                        _a.sent();
                        return [3 /*break*/, 4];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    // 把一次 AI 结果压成可比对的字符串（选项按字母排序）
    ToolsQuestionBankFacade.prototype.aiVoteKey = function (r) {
        try {
            if (!r || !r.ok || !r.correct || r.correct.length == 0) {
                return "";
            }
            var keys = new Array();
            for (var i = 0; i < r.correct.length; i++) {
                keys.push(String(r.correct[i].option));
            }
            keys.sort();
            return keys.join(",");
        }
        catch (e) {
            return "";
        }
    };
    ToolsQuestionBankFacade.prototype.sameAIResult = function (a, b) {
        var ka = this.aiVoteKey(a);
        return ka != "" && ka == this.aiVoteKey(b);
    };
    // 多次结果里取出现次数最多的那个（同票取第一次的）
    ToolsQuestionBankFacade.prototype.voteAIResults = function (list) {
        try {
            var map = {};
            for (var i = 0; i < list.length; i++) {
                var k = this.aiVoteKey(list[i]);
                if (k == "") {
                    continue;
                }
                if (!map[k]) {
                    map[k] = { count: 0, res: list[i] };
                }
                map[k].count++;
            }
            var best = "";
            for (var k in map) {
                if (best == "" || map[k].count > map[best].count) {
                    best = k;
                }
            }
            return best != "" ? map[best].res : list[0];
        }
        catch (e) {
            return list[0];
        }
    };
    // 拟人化辅助：挑一个"错"的答案（单选换一个字母；判断翻转对错）
    ToolsQuestionBankFacade.prototype.pickWrongAnswer = function (type, options, correct) {
        try {
            if (!correct || correct.length == 0) {
                return null;
            }
            if (type == 3) {
                var want = correct[0].option;
                return [{ option: !want, content: !want }];
            }
            var right = String(correct[0].option || "").toUpperCase();
            var cands = [];
            for (var i = 0; i < (options || []).length; i++) {
                var o = String(options[i].option || "").toUpperCase();
                if (o && o != right) {
                    cands.push({ option: options[i].option, content: "" });
                }
            }
            if (cands.length == 0) {
                return null;
            }
            return [cands[Math.floor(Math.random() * cands.length)]];
        }
        catch (e) {
            return null;
        }
    };
    ToolsQuestionBankFacade.prototype.errText = function (e) {
        try {
            if (e && e.stack) {
                return String(e.stack).split("\n").slice(0, 3).join(" | ").substring(0, 220);
            }
        }
        catch (e2) {
            // ignore
        }
        return (e && e.message) ? String(e.message) : String(e);
    };
    ToolsQuestionBankFacade.prototype.randAnswer = function (status, tmpStatus, question) {
        if (application_1.Application.App.config.rand_answer) {
            tmpStatus = question.Random();
        }
        else {
            status = "incomplete";
        }
        if (tmpStatus == "no_support_random") {
            status = "incomplete";
        }
        // AI 模式下别显示「题库中没有搜索到答案」，那是原题库的文案
        try {
            var q = question;
            if (tmpStatus == "no_answer" && ai_1.AIEnabled() && typeof q.AddNotice == "function") {
                q.AddNotice("AI 没有给出答案");
                return status;
            }
        }
        catch (e) {
            // ignore
        }
        question.SetStatus(tmpStatus);
        return status;
    };
    ToolsQuestionBankFacade.prototype.Push = function (callback) {
        var answer = new Array();
        this.question.forEach(function (val) {
            var correct = val.Correct();
            if (correct == null || correct.correct == null || correct.type == -1) {
                return;
            }
            answer.push(correct);
        });
        this.bank.Push(answer).then(function (ret) {
            application_1.Application.App.log.Debug("题库返回", ret);
            return callback(ret);
        });
    };
    ToolsQuestionBankFacade.prototype.dealOption = function (options) {
        for (var i = 0; i < options.length; i++) {
            if (typeof options[i].content == "string") {
                options[i].content = (options[i].content);
            }
        }
        return options;
    };
    ToolsQuestionBankFacade.prototype.CheckCourse = function () {
        return this.bank.CheckCourse();
    };
    return ToolsQuestionBankFacade;
}());
exports.ToolsQuestionBankFacade = ToolsQuestionBankFacade;


/***/ }),

/***/ "./src/internal/app/task.ts":
/*!**********************************!*\
  !*** ./src/internal/app/task.ts ***!
  \**********************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.Task = void 0;
var event_1 = __webpack_require__(/*! @App/internal/utils/event */ "./src/internal/utils/event.ts");
var Task = /** @class */ (function (_super) {
    __extends(Task, _super);
    function Task() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    // 初始化任务
    Task.prototype.Init = function () {
        return new Promise(function (resolve) {
            return resolve();
        });
    };
    // 提交任务,例如topic的类型,可以在本接口内进行提交操作
    Task.prototype.Submit = function () {
        return new Promise(function (resolve) {
            return resolve();
        });
    };
    // 停止任务
    Task.prototype.Stop = function () {
        return new Promise(function (resolve) {
            return resolve();
        });
    };
    // 任务的上下文(对于某些iframe的可能会用到)
    Task.prototype.Context = function () {
        return window;
    };
    return Task;
}(event_1.EventListener));
exports.Task = Task;


/***/ }),

/***/ "./src/internal/app/topic.ts":
/*!***********************************!*\
  !*** ./src/internal/app/topic.ts ***!
  \***********************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.Topic = void 0;
var application_1 = __webpack_require__(/*! ../application */ "./src/internal/application.ts");
var config_1 = __webpack_require__(/*! @App/config */ "./src/config.ts");
// 题目任务点
var Topic = /** @class */ (function () {
    function Topic(content, answer) {
        this.answer = answer;
        this.context = content;
    }
    Topic.prototype.SetQueryQuestions = function (queryQuestions) {
        this.queryQuestions = queryQuestions;
    };
    Topic.prototype.addQuestion = function () {
        var _this = this;
        var questions = this.queryQuestions.QueryQuestions();
        this.answer.ClearQuestion();
        questions.forEach(function (val) {
            _this.answer.AddQuestion(val);
        });
    };
    Topic.prototype.QueryAnswer = function () {
        var _this = this;
        return new Promise(function (resolve) {
            if (_this.lock) {
                return resolve("processing");
            }
            _this.lock = true;
            application_1.Application.App.log.Info("题目搜索中...");
            // 题目可能是异步渲染的，页面刚加载完时可能一道都取不到；
            // 先等题目出现，再开始作答，避免"0 道题"被当成答完直接跳过
            var tries = 0;
            var attempt = function () {
                _this.addQuestion();
                var count = _this.answer.GetQuestionCount ? _this.answer.GetQuestionCount() : -1;
                if (count == 0 && tries < 12) {
                    tries++;
                    if (tries == 1) {
                        application_1.Application.App.log.Info("页面上暂时还没有题目，等待加载...");
                    }
                    setTimeout(attempt, 800);
                    return;
                }
                if (count <= 0) {
                    application_1.Application.App.log.Warn("等了约 10 秒仍没在页面上找到题目，跳过这个任务点");
                }
                _this.answer.Answer(function (status) {
                    _this.lock = false;
                    resolve(status);
                    if (status == "network") {
                        return application_1.Application.App.log.Error("题库无法访问,请查看:" + config_1.SystemConfig.url);
                    }
                    else if (status == "incomplete") {
                        return application_1.Application.App.log.Warn("题库答案不全,请手动填写操作");
                    }
                });
            };
            attempt();
        });
    };
    Topic.prototype.CollectAnswer = function () {
        var _this = this;
        return new Promise(function (resolve) {
            application_1.Application.App.log.Debug("收集题目答案", _this.context);
            _this.addQuestion();
            _this.answer.Push(function (status) {
                application_1.Application.App.log.Debug("采集答案返回", status);
                resolve();
            });
        });
    };
    return Topic;
}());
exports.Topic = Topic;


/***/ }),

/***/ "./src/internal/app/vcode.ts":
/*!***********************************!*\
  !*** ./src/internal/app/vcode.ts ***!
  \***********************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.VCode = void 0;
var utils_1 = __webpack_require__(/*! @App/internal/utils/utils */ "./src/internal/utils/utils.ts");
var config_1 = __webpack_require__(/*! @App/config */ "./src/config.ts");
var application_1 = __webpack_require__(/*! ../application */ "./src/internal/application.ts");
var VCode = /** @class */ (function () {
    function VCode(listen) {
        this.listen = listen;
    }
    VCode.prototype.Init = function () {
        var _this = this;
        this.listen.Listen(function (fill) {
            application_1.Application.App.log.Info("准备进行打码");
            _this.getVcode(fill);
        });
    };
    VCode.prototype.getVcode = function (fill) {
        var img = fill.GetImage();
        var base64 = "";
        if (typeof img == "string") {
            base64 = img;
        }
        else {
            base64 = utils_1.getImageBase64(img, 'jpeg');
        }
        utils_1.HttpUtils.HttpPost(config_1.SystemConfig.url + 'vcode', 'img=' + encodeURIComponent(base64.substr('data:image/jpeg;base64,'.length)), {
            headers: {
                "Authorization": application_1.Application.App.config.vtoken,
                "X-Version": config_1.SystemConfig.version.toString(),
            },
            json: false,
            success: function (ret) {
                var json = JSON.parse(ret);
                application_1.Application.App.log.Debug(json);
                if (json.code == -2) {
                    fill.Fill("error", json.msg, "");
                }
                else if (json.code == -1) {
                    fill.Fill("error", "打码服务器发生错误", "");
                }
                else if (json.msg) {
                    fill.Fill("ok", "打码成功", json.msg);
                }
                else {
                    fill.Fill("error", "未知错误", "");
                }
            },
            error: function () {
                fill.Fill("network", "网络请求失败", "");
            }
        });
    };
    return VCode;
}());
exports.VCode = VCode;


/***/ }),

/***/ "./src/internal/application.ts":
/*!*************************************!*\
  !*** ./src/internal/application.ts ***!
  \*************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Application = exports.AppName = exports.Content = exports.Frontend = exports.Backend = void 0;
var message_1 = __webpack_require__(/*! ./utils/message */ "./src/internal/utils/message.ts");
var utils_1 = __webpack_require__(/*! ./utils/utils */ "./src/internal/utils/utils.ts");
var config_1 = __webpack_require__(/*! @App/config */ "./src/config.ts");
exports.Backend = "backend";
exports.Frontend = "frontend";
exports.Content = "content";
exports.AppName = "cxmooc-tools";
var Application = /** @class */ (function () {
    function Application(runEnv, launcher, component) {
        Application.app = this;
        Application.runEnv = runEnv;
        this.runEnvSwitch(runEnv);
        this.launcher = launcher;
        this.component = component;
    }
    Object.defineProperty(Application, "App", {
        get: function () {
            return Application.app;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Application.prototype, "debug", {
        get: function () {
            return "development" == "development";
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Application.prototype, "prod", {
        get: function () {
            return "development" == "production";
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Application.prototype, "config", {
        get: function () {
            return this.component.get("config");
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Application.prototype, "log", {
        get: function () {
            return this.component.get("logger");
        },
        enumerable: false,
        configurable: true
    });
    Application.prototype.run = function () {
        this.launcher.start();
    };
    Object.defineProperty(Application.prototype, "IsFrontend", {
        get: function () {
            return Application.IsFrontend;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Application.prototype, "IsBackend", {
        get: function () {
            return Application.IsBackend;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Application.prototype, "IsContent", {
        get: function () {
            return Application.IsContent;
        },
        enumerable: false,
        configurable: true
    });
    Application.prototype.runEnvSwitch = function (env) {
        switch (env) {
            case exports.Frontend:
                Application.IsFrontend = true;
                break;
            case exports.Backend:
                Application.IsBackend = true;
                break;
            case exports.Content:
                Application.IsContent = true;
                break;
        }
        ;
    };
    Object.defineProperty(Application.prototype, "Client", {
        get: function () {
            if (Application.IsFrontend) {
                return message_1.NewChromeClientMessage(exports.AppName);
            }
            return message_1.NewExtensionClientMessage(exports.AppName);
        },
        enumerable: false,
        configurable: true
    });
    Application.CheckUpdate = function (callback) {
        if (Application.IsContent) {
            chrome.storage.local.get(["version", "enforce", "hotversion", "url"], function (item) {
                return __awaiter(this, void 0, void 0, function () {
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, callback((config_1.SystemConfig.version < item.version), item)];
                            case 1:
                                _a.sent();
                                return [2 /*return*/];
                        }
                    });
                });
            });
            return;
        }
        utils_1.HttpUtils.HttpGet(config_1.SystemConfig.url + "update?ver=" + config_1.SystemConfig.version, {
            json: true,
            success: function (json) {
                return __awaiter(this, void 0, void 0, function () {
                    var data;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0:
                                data = {
                                    version: json.version,
                                    url: json.url,
                                    enforce: json.enforce,
                                    hotversion: json.hotversion,
                                    injection: json.injection,
                                };
                                Application.IsContent && chrome.storage.local.set(data);
                                return [4 /*yield*/, callback((config_1.SystemConfig.version < data.version), data)];
                            case 1:
                                _a.sent();
                                return [2 /*return*/];
                        }
                    });
                });
            }, error: function () {
                return __awaiter(this, void 0, void 0, function () {
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, callback(false, undefined)];
                            case 1:
                                _a.sent();
                                return [2 /*return*/];
                        }
                    });
                });
            }
        });
    };
    return Application;
}());
exports.Application = Application;


/***/ }),

/***/ "./src/internal/utils/config.ts":
/*!**************************************!*\
  !*** ./src/internal/utils/config.ts ***!
  \**************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NewFrontendGetConfig = exports.NewBackendConfig = exports.ChromeConfigItems = void 0;
var utils_1 = __webpack_require__(/*! ./utils */ "./src/internal/utils/utils.ts");
var application_1 = __webpack_require__(/*! ../application */ "./src/internal/application.ts");
var config_1 = __webpack_require__(/*! @App/config */ "./src/config.ts");
// 缓存默认值
var configDefaultValue = new Map();
configDefaultValue.set("vtoken", "");
for (var key in config_1.SystemConfig.config) {
    for (var i = 0; i < config_1.SystemConfig.config[key].items.length; i++) {
        configDefaultValue.set(key + "_" + config_1.SystemConfig.config[key].items[i].key, config_1.SystemConfig.config[key].items[i].value);
    }
}
var ChromeConfigItems = /** @class */ (function () {
    function ChromeConfigItems(config) {
        var _this = this;
        this.Namespace = "";
        this.config = config;
        var list = [];
        configDefaultValue.forEach(function (val, key) {
            list.push(key);
        });
        this.config.Watch(list, function (key, val) {
            _this.localCache[key] = val;
        });
        this.localCache = localStorage;
    }
    // 设置配置的命名空间,储存格式为 namepace_configkey
    ChromeConfigItems.prototype.SetNamespace = function (namespace) {
        this.Namespace = namespace + "_";
    };
    ChromeConfigItems.prototype.ConfigList = function () {
        return this.config.ConfigList();
    };
    ChromeConfigItems.prototype.SetNamespaceConfig = function (namespace, key, val) {
        return this.config.SetConfig(namespace + "_" + key, val);
    };
    ChromeConfigItems.prototype.GetNamespaceConfig = function (namespace, key, defaultVal) {
        return this.config.GetConfig(namespace + "_" + key, defaultVal);
    };
    ChromeConfigItems.prototype.GetConfig = function (key, defaultVal) {
        var val = this.config.GetConfig(this.Namespace + key);
        if (val == undefined) {
            return this.config.GetConfig(key, defaultVal);
        }
        return val || defaultVal;
    };
    ChromeConfigItems.prototype.Watch = function (key, callback) {
        this.config.Watch(key, callback);
    };
    Object.defineProperty(ChromeConfigItems.prototype, "super_mode", {
        get: function () {
            return utils_1.toBool(this.GetConfig("super_mode", "true"));
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(ChromeConfigItems.prototype, "vtoken", {
        get: function () {
            return this.GetConfig("vtoken", "");
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(ChromeConfigItems.prototype, "rand_answer", {
        get: function () {
            return utils_1.toBool(this.GetConfig("rand_answer", "false"));
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(ChromeConfigItems.prototype, "auto", {
        get: function () {
            return utils_1.toBool(this.GetConfig("auto", "true"));
        },
        set: function (val) {
            this.SetConfig("auto", utils_1.boolToString(val));
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(ChromeConfigItems.prototype, "video_mute", {
        get: function () {
            return utils_1.toBool(this.GetConfig("video_mute", "true"));
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(ChromeConfigItems.prototype, "answer_ignore", {
        get: function () {
            return utils_1.toBool(this.GetConfig("answer_ignore", "false"));
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(ChromeConfigItems.prototype, "video_cdn", {
        get: function () {
            var val = this.GetConfig("video_cdn");
            if (val == "默认") {
                return "";
            }
            return val;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(ChromeConfigItems.prototype, "video_multiple", {
        get: function () {
            return parseFloat(this.GetConfig("video_multiple"));
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(ChromeConfigItems.prototype, "interval", {
        get: function () {
            var interval = parseFloat(this.GetConfig("interval", "0.1"));
            interval = interval * 100;
            return Math.floor(utils_1.randNumber(interval - interval / 2, interval + interval / 2)) / 100;
        },
        enumerable: false,
        configurable: true
    });
    ChromeConfigItems.prototype.SetConfig = function (key, val) {
        return this.config.SetConfig(this.Namespace + key, val);
    };
    Object.defineProperty(ChromeConfigItems.prototype, "topic_interval", {
        get: function () {
            return parseInt(this.GetConfig("topic_interval", "5"));
        },
        set: function (val) {
            this.SetConfig("topic_interval", val);
        },
        enumerable: false,
        configurable: true
    });
    return ChromeConfigItems;
}());
exports.ChromeConfigItems = ChromeConfigItems;
// 后台环境中使用
function NewBackendConfig() {
    var _this = this;
    return new Promise(function (resolve) { return __awaiter(_this, void 0, void 0, function () {
        var ret;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    ret = new backendConfig();
                    return [4 /*yield*/, ret.updateCache()];
                case 1:
                    _a.sent();
                    resolve(ret);
                    return [2 /*return*/];
            }
        });
    }); });
}
exports.NewBackendConfig = NewBackendConfig;
var configWatch = /** @class */ (function () {
    function configWatch() {
        this.watchCallback = new Map();
    }
    configWatch.prototype.WatchEvent = function (key, val) {
        var list = this.watchCallback.get(key);
        if (list != undefined) {
            list.forEach(function (v) {
                v(key, val);
            });
        }
        list = this.watchCallback.get("*");
        if (list != undefined) {
            list.forEach(function (v) {
                v(key, val);
            });
        }
    };
    configWatch.prototype.Watch = function (key, callback) {
        var _this = this;
        if (typeof key == "string") {
            this.setWatchMap(key, callback);
            return;
        }
        key.forEach(function (val, index) {
            _this.setWatchMap(val, callback);
        });
    };
    configWatch.prototype.setWatchMap = function (key, callback) {
        var list = this.watchCallback.get(key);
        if (list == undefined) {
            list = new Array();
        }
        list.push(callback);
        this.watchCallback.set(key, list);
    };
    return configWatch;
}());
var backendConfig = /** @class */ (function () {
    function backendConfig() {
        var _this = this;
        this.watch = new configWatch();
        chrome.runtime.onMessage.addListener(function (request) {
            if (request.type && request.type == "cxconfig") {
                _this.cache[request.key] = request.value;
                _this.watch.WatchEvent(request.key, request.value);
                _this.updateConfigStorage();
            }
        });
    }
    // 更新配置转为json,存入
    backendConfig.prototype.updateConfigStorage = function () {
        var txt = JSON.stringify(this.cache);
        chrome.storage.sync.set({ "config_storage": txt });
    };
    // 更新缓存
    backendConfig.prototype.updateCache = function () {
        var _this = this;
        return new Promise(function (resolve) {
            chrome.storage.sync.get("config_storage", function (items) {
                if (items["config_storage"]) {
                    _this.cache = JSON.parse(items["config_storage"]);
                }
                else {
                    _this.cache = {};
                }
                configDefaultValue.forEach(function (val, key) {
                    if (_this.cache[key] === undefined) {
                        _this.cache[key] = val;
                    }
                });
                _this.updateConfigStorage();
                resolve(undefined);
            });
        });
    };
    backendConfig.prototype.GetConfig = function (key, defaultVal) {
        if (this.cache == undefined) {
            application_1.Application.App.log.Fatal("缓存失败!!!");
            return "";
        }
        return this.cache[key] || defaultVal;
    };
    backendConfig.prototype.Watch = function (key, callback) {
        return this.watch.Watch(key, callback);
    };
    backendConfig.prototype.SetConfig = function (key, val) {
        var _this = this;
        return new Promise(function (resolve) {
            var info = {};
            info[key] = val;
            //通知前端和后端
            _this.cache[key] = val;
            chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
                chrome.tabs.sendMessage(tabs[0].id, { type: "cxconfig", key: key, value: val });
            });
            chrome.runtime.sendMessage({ type: "cxconfig", key: key, value: val });
            _this.updateConfigStorage();
            resolve(undefined);
        });
    };
    backendConfig.prototype.ConfigList = function () {
        var _this = this;
        return new Promise(function (resolve) { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (this.cache) {
                            return [2 /*return*/, resolve(this.cache)];
                        }
                        return [4 /*yield*/, this.updateCache()];
                    case 1:
                        _a.sent();
                        resolve(this.cache);
                        return [2 /*return*/];
                }
            });
        }); });
    };
    return backendConfig;
}());
// 前端环境使用
function NewFrontendGetConfig() {
    return new frontendGetConfig();
}
exports.NewFrontendGetConfig = NewFrontendGetConfig;
var frontendGetConfig = /** @class */ (function () {
    function frontendGetConfig() {
        var _this = this;
        this.watch = new configWatch();
        this.cache = window.configData || localStorage;
        window.addEventListener('message', function (event) {
            if (event.data.type && event.data.type == "cxconfig") {
                application_1.Application.App.log.Info("配置更新:" + event.data.key + "=" + event.data.value);
                _this.cache[event.data.key] = event.data.value;
                _this.watch.WatchEvent(event.data.key, event.data.value);
            }
        });
    }
    frontendGetConfig.prototype.GetConfig = function (key, defaultVal) {
        if (window.GM_getValue) {
            return window.GM_getValue(key, defaultVal);
        }
        return this.cache[key] || defaultVal;
    };
    frontendGetConfig.prototype.Watch = function (key, callback) {
        return this.watch.Watch(key, callback);
    };
    frontendGetConfig.prototype.SetConfig = function (key, val) {
        return __awaiter(this, void 0, Promise, function () {
            return __generator(this, function (_a) {
                this.cache[key] = val;
                if (window.GM_setValue) {
                    return [2 /*return*/, window.GM_setValue(key, val)];
                }
                return [2 /*return*/, application_1.Application.App.Client.Send({
                        type: "GM_setValue", details: { key: key, val: val },
                    })];
            });
        });
    };
    frontendGetConfig.prototype.ConfigList = function () {
        return this.cache;
    };
    return frontendGetConfig;
}());


/***/ }),

/***/ "./src/internal/utils/event.ts":
/*!*************************************!*\
  !*** ./src/internal/utils/event.ts ***!
  \*************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.EventListener = void 0;
var EventListener = /** @class */ (function () {
    function EventListener() {
        this.event = {};
    }
    EventListener.prototype.addEventListener = function (event, callback) {
        if (!this.event[event]) {
            this.event[event] = new Array();
        }
        this.event[event].push({
            callback: callback, param: { once: false },
        });
    };
    EventListener.prototype.addEventListenerOnce = function (event, callback) {
        if (!this.event[event]) {
            this.event[event] = new Array();
        }
        this.event[event].push({
            callback: callback, param: { once: true },
        });
    };
    EventListener.prototype.callEvent = function (event) {
        var _this = this;
        var args = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            args[_i - 1] = arguments[_i];
        }
        if (!this.event[event]) {
            return;
        }
        var del = new Array();
        this.event[event].forEach(function (v, index) {
            v.callback.apply(_this, args);
            if (v.param.once) {
                del.push(index);
            }
        });
        del.forEach(function (v, index) {
            _this.event[event].splice(v - index, 1);
        });
    };
    return EventListener;
}());
exports.EventListener = EventListener;


/***/ }),

/***/ "./src/internal/utils/hook.ts":
/*!************************************!*\
  !*** ./src/internal/utils/hook.ts ***!
  \************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.Hook = void 0;
var application_1 = __webpack_require__(/*! @App/internal/application */ "./src/internal/application.ts");
var Hook = /** @class */ (function () {
    function Hook(func, context) {
        this.context = context || window;
        this.func = func;
    }
    Hook.prototype.Middleware = function (call) {
        var name;
        if (typeof this.func == "string") {
            name = this.func;
        }
        else {
            name = this.func.name;
        }
        var old = this.context[name];
        var wrapped = function () {
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
        }
        catch (e) {
            try {
                Object.defineProperty(this.context, name, { configurable: true, writable: true, value: wrapped });
            }
            catch (e2) {
                try {
                    application_1.Application.App.log.Warn("Hook 挂载失败（只读属性），已跳过：", name, String(e2 && (e2.message || e2)));
                }
                catch (e3) {
                    // ignore
                }
            }
        }
    };
    Hook.HookAjaxRespond = function (url, call) {
        var _this = this;
        if (!this.once) {
            this.match_list = new Map();
            var self_1 = this;
            var hookXMLHttpRequest = new Hook("open", application_1.Application.GlobalContext.XMLHttpRequest.prototype);
            hookXMLHttpRequest.Middleware(function (next) {
                var _this = this;
                var args = [];
                for (var _a = 1; _a < arguments.length; _a++) {
                    args[_a - 1] = arguments[_a];
                }
                self_1.match_list.forEach(function (val, key) {
                    if (args[1].indexOf(key) != -1) {
                        Object.defineProperty(_this, "responseText", {
                            configurable: true,
                            get: function () {
                                return val.call(this, args[1], this.response);
                            }
                        });
                    }
                });
                return next.apply(this, args);
            });
            this.once = true;
        }
        if (typeof url == "string") {
            this.match_list.set(url, call);
        }
        else {
            url.forEach(function (v) {
                _this.match_list.set(v, call);
            });
        }
    };
    return Hook;
}());
exports.Hook = Hook;


/***/ }),

/***/ "./src/internal/utils/log.ts":
/*!***********************************!*\
  !*** ./src/internal/utils/log.ts ***!
  \***********************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __spreadArrays = (this && this.__spreadArrays) || function () {
    for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
    for (var r = Array(s), k = 0, i = 0; i < il; i++)
        for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
            r[k] = a[j];
    return r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmptyLog = exports.PageLog = exports.ConsoleLog = void 0;
var application_1 = __webpack_require__(/*! ../application */ "./src/internal/application.ts");
__webpack_require__(/*! ../../views/common */ "./src/views/common.ts");
var utils_1 = __webpack_require__(/*! @App/internal/utils/utils */ "./src/internal/utils/utils.ts");
var ai_1 = __webpack_require__(/*! @App/internal/app/ai */ "./src/internal/app/ai.ts");
// 开发者工具f12处打印日志
var ConsoleLog = /** @class */ (function () {
    function ConsoleLog() {
    }
    ConsoleLog.prototype.getNowTime = function () {
        var time = new Date();
        return time.getHours() + ":" + time.getMinutes() + ":" + time.getSeconds();
    };
    ConsoleLog.prototype.Debug = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        application_1.Application.App.debug && console.info.apply(console, __spreadArrays(["[debug", this.getNowTime(), "]"], args));
        return this;
    };
    ConsoleLog.prototype.Info = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        application_1.Application.App.debug && console.info.apply(console, __spreadArrays(["[info", this.getNowTime(), "]"], args));
        return this;
    };
    ConsoleLog.prototype.Warn = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        console.warn.apply(console, __spreadArrays(["[warn", this.getNowTime(), "]"], args));
        return this;
    };
    ConsoleLog.prototype.Error = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        console.error.apply(console, __spreadArrays(["[error", this.getNowTime(), "]"], args));
        return this;
    };
    ConsoleLog.prototype.Fatal = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        console.error.apply(console, __spreadArrays(["[fatal", this.getNowTime(), "]"], args));
        return this;
    };
    return ConsoleLog;
}());
exports.ConsoleLog = ConsoleLog;
var PageLog = /** @class */ (function () {
    function PageLog() {
        var _this = this;
        // 面板要在 window load 之后才创建，这之前的日志先存着，创建好再补显示
        this.pending = [];
        this.el = undefined;
        window.addEventListener("load", function () {
            _this.div = document.createElement("div");
            // 主要布局
            _this.div.innerHTML = "\n            <div class=\"head\" id=\"tools-head\"> \n               <span>\u5C0F\u5DE5\u5177\u901A\u77E5\u6761</span> \n               <label class=\"switch\" style=\"width:90px\">\n                  <input class=\"checkbox-input\" id=\"checkbox\" type=\"checkbox\" checked=\"checked\">\n                  <label class=\"checkbox\" for=\"checkbox\"></label>\n                  <span>\u684C\u9762\u901A\u77E5</span>\n               </label>\n               <span class=\"close\" style=\"float:right; cursor:pointer; margin-right:5px;\">x</span>\n            </div>\n            <div class=\"tools-ai-bar\" id=\"tools-ai-bar\">\n               <button class=\"cx-btn tools-ai-btn\" id=\"tools-ai-btn\" title=\"\u9009\u670D\u52A1\u5546\u3001\u7C98\u8D34 Key\uFF0C\u63A5\u53E3\u548C\u6A21\u578B\u81EA\u52A8\u586B\u597D\">\u66F4\u6539API</button>\n               <label class=\"switch\">\n                  <input class=\"checkbox-input\" id=\"ai-auto-checkbox\" type=\"checkbox\">\n                  <label class=\"checkbox\" for=\"ai-auto-checkbox\"></label>\n                  <span>\u81EA\u52A8\u7B54\u9898</span>\n               </label>\n               <span class=\"tools-ai-status\" id=\"ai-status\">\u672A\u914D\u7F6E</span>\n            </div>\n            <div class=\"tools-ai-form\" id=\"tools-ai-form\">\n               <div class=\"row\"><span>\u670D\u52A1\u5546</span>\n                  <select id=\"ai-provider-select\">\n                     <option value=\"zhipu\">\u667A\u8C31 GLM\uFF08glm-4-flash\uFF0C\u514D\u8D39\uFF09</option>\n                     <option value=\"siliconflow\">\u7845\u57FA\u6D41\u52A8</option>\n                     <option value=\"deepseek\">DeepSeek</option>\n                     <option value=\"custom\">\u81EA\u5B9A\u4E49\uFF08\u81EA\u5DF1\u586B\u5730\u5740\u548C\u6A21\u578B\uFF09</option>\n                  </select>\n               </div>\n               <div class=\"row\"><span>API Key</span><input id=\"ai-key-input\" type=\"password\" spellcheck=\"false\" placeholder=\"\u7C98\u8D34\u4F60\u7533\u8BF7\u5230\u7684 key\"></div>\n               <div class=\"row\"><span>\u63A5\u53E3\u5730\u5740</span><input id=\"ai-base-input\" type=\"text\" spellcheck=\"false\"></div>\n               <div class=\"row\"><span>\u6A21\u578B\u540D</span><input id=\"ai-model-input\" type=\"text\" spellcheck=\"false\"></div>\n               <div class=\"row tools-ai-actions\">\n                  <button class=\"cx-btn\" id=\"ai-test-btn\">\u6D4B\u8BD5\u8FDE\u63A5</button>\n                  <button class=\"cx-btn\" id=\"ai-save-btn\">\u4FDD\u5B58</button>\n                  <button class=\"cx-btn\" id=\"ai-cancel-btn\">\u53D6\u6D88</button>\n                  <span class=\"tools-ai-hint\" id=\"ai-test-result\"></span>\n               </div>\n            </div>\n            <div class=\"tools-btn-bar\" id=\"tools-btn-bar\"></div>\n            <div class=\"main\">\n               <div class=\"tools-notice-content\"></div>\n            </div>\n            ";
            _this.div.className = "tools-logger-panel";
            document.body.appendChild(_this.div);
            _this.el = _this.div.querySelector(".tools-notice-content");
            // 把面板出现之前产生的日志补上
            if (_this.pending.length > 0) {
                _this.pending.forEach(function (p) {
                    _this.first(p[0], p[1], p[2]);
                });
                _this.pending = [];
            }
            _this.div.querySelector(".close").onclick = function () {
                // 面板关掉时，把按钮栏里的按钮挪到悬浮小条，避免"暂停挂机"点不到
                var bar = _this.div.querySelector("#tools-btn-bar");
                var aiBar = _this.div.querySelector("#tools-ai-bar");
                if ((bar && bar.children.length > 0) || aiBar) {
                    var holder = document.createElement("div");
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
                _this.el = undefined;
                _this.div.remove();
            };
            var checkbox = _this.div.querySelector("#checkbox");
            checkbox.checked = (application_1.Application.App.config.GetConfig("is_notify") || "true") == "true";
            _this.is_notify = checkbox.checked;
            if (!checkbox.checked) {
                checkbox.removeAttribute("checked");
            }
            var self = _this;
            checkbox.addEventListener("change", function () {
                self.is_notify = this.checked;
                application_1.Application.App.config.SetConfig("is_notify", this.checked.toString());
            });
            // ===== AI 答题：更改API 按钮 + 自动答题开关 =====
            var readConf = function (key, def) {
                try {
                    var v = application_1.Application.App.config.GetConfig(key, def);
                    if (v === undefined || v === null || String(v).trim() === "") {
                        return def;
                    }
                    return String(v).trim();
                }
                catch (e) {
                    return def;
                }
            };
            var writeConf = function (key, val) {
                try {
                    application_1.Application.App.config.SetConfig(key, val);
                }
                catch (e) {
                    // ignore
                }
                // 额外记一份到 localStorage，刷新后由脚本头部恢复（否则会被默认配置覆盖）
                try {
                    var custom = {};
                    try {
                        custom = JSON.parse(localStorage.getItem("cx_ai_custom") || "{}") || {};
                    }
                    catch (e) {
                        custom = {};
                    }
                    custom[key] = val;
                    localStorage.setItem("cx_ai_custom", JSON.stringify(custom));
                }
                catch (e) {
                    // ignore
                }
            };
            var AI_PRESETS = {
                zhipu: { base: "https://open.bigmodel.cn/api/paas/v4", model: "glm-4-flash" },
                siliconflow: { base: "https://api.siliconflow.cn/v1", model: "Qwen/Qwen2.5-7B-Instruct" },
                deepseek: { base: "https://api.deepseek.com/v1", model: "deepseek-chat" },
                custom: { base: "", model: "" },
            };
            var aiBtn = _this.div.querySelector("#tools-ai-btn");
            var aiForm = _this.div.querySelector("#tools-ai-form");
            var aiProvider = _this.div.querySelector("#ai-provider-select");
            var aiBaseInput = _this.div.querySelector("#ai-base-input");
            var aiKeyInput = _this.div.querySelector("#ai-key-input");
            var aiModelInput = _this.div.querySelector("#ai-model-input");
            var aiAuto = _this.div.querySelector("#ai-auto-checkbox");
            var aiStatus = _this.div.querySelector("#ai-status");
            var aiTestBtn = _this.div.querySelector("#ai-test-btn");
            var aiTestResult = _this.div.querySelector("#ai-test-result");
            var setAIStatus = function (text, color, title) {
                aiStatus.innerText = text;
                aiStatus.style.color = color;
                aiStatus.title = title || "";
            };
            // 选服务商 -> 自动填好接口地址和模型（只有「自定义」才允许手改）
            var applyAIProvider = function (id) {
                var preset = AI_PRESETS[id];
                if (id != "custom" && preset) {
                    aiBaseInput.value = preset.base;
                    aiModelInput.value = preset.model;
                }
                var readonly = id != "custom";
                aiBaseInput.readOnly = readonly;
                aiModelInput.readOnly = readonly;
                aiBaseInput.style.background = readonly ? "#f3f3f3" : "#fff";
                aiModelInput.style.background = readonly ? "#f3f3f3" : "#fff";
            };
            var fillAIApiForm = function () {
                var base = readConf("ai_base", AI_PRESETS.zhipu.base);
                aiKeyInput.value = readConf("ai_key", "");
                aiBaseInput.value = base;
                aiModelInput.value = readConf("ai_model", AI_PRESETS.zhipu.model);
                var matched = "custom";
                for (var k in AI_PRESETS) {
                    if (AI_PRESETS[k].base && AI_PRESETS[k].base == base) {
                        matched = k;
                        break;
                    }
                }
                aiProvider.value = matched;
                applyAIProvider(matched);
            };
            var formConf = function () {
                var base = aiBaseInput.value.trim().replace(/\/+$/, "");
                if (base && base.indexOf("http") != 0) {
                    base = "https://" + base;
                }
                return { base: base, key: aiKeyInput.value.trim(), model: aiModelInput.value.trim() || AI_PRESETS.zhipu.model };
            };
            // 测试连接：fromForm=true 用表单里的值测（不必先保存）
            var runAITest = function (fromForm) { return __awaiter(_this, void 0, void 0, function () {
                var conf, ret;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            conf = fromForm ? formConf() : {
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
                                return [2 /*return*/];
                            }
                            setAIStatus("● 检测中…", "#888");
                            aiTestBtn.disabled = true;
                            if (fromForm) {
                                aiTestResult.innerText = "检测中…";
                                aiTestResult.style.color = "#888";
                            }
                            return [4 /*yield*/, ai_1.TestAIConnection(conf)];
                        case 1:
                            ret = _a.sent();
                            aiTestBtn.disabled = false;
                            if (ret.ok) {
                                setAIStatus("● 已连接", "#3a9", conf.model + " · " + ret.ms + "ms");
                                if (fromForm) {
                                    aiTestResult.innerText = "连接成功 " + ret.ms + "ms";
                                    aiTestResult.style.color = "#3a9";
                                }
                                this.Info("AI 连接正常（" + conf.model + "，" + ret.ms + "ms）");
                            }
                            else {
                                setAIStatus("● 连接失败", "#c33", ret.error);
                                if (fromForm) {
                                    aiTestResult.innerText = ret.error || "连接失败";
                                    aiTestResult.style.color = "#c33";
                                }
                                this.Warn("AI 连接失败：" + (ret.error || "未知错误"));
                            }
                            return [2 /*return*/];
                    }
                });
            }); };
            var refreshAIStatus = function () {
                aiAuto.checked = readConf("ai_enable", "true") != "false";
                if (!aiAuto.checked) {
                    setAIStatus("● 自动答题：关", "#c33");
                    return;
                }
                runAITest(false);
            };
            fillAIApiForm();
            refreshAIStatus();
            aiProvider.onchange = function () {
                applyAIProvider(aiProvider.value);
                aiTestResult.innerText = "";
            };
            aiBtn.onclick = function () {
                if (aiForm.style.display == "block") {
                    aiForm.style.display = "none";
                    return;
                }
                fillAIApiForm();
                aiTestResult.innerText = "";
                aiForm.style.display = "block";
            };
            aiTestBtn.onclick = function () {
                runAITest(true);
            };
            _this.div.querySelector("#ai-save-btn").onclick = function () {
                var conf = formConf();
                writeConf("ai_base", conf.base || AI_PRESETS.zhipu.base);
                writeConf("ai_key", conf.key);
                writeConf("ai_model", conf.model);
                aiForm.style.display = "none";
                _this.Info("AI 配置已保存：" + (conf.base || "默认接口") + " / " + conf.model +
                    (conf.key ? "" : "（Key 为空，自动答题不会生效）"));
                runAITest(false);
            };
            _this.div.querySelector("#ai-cancel-btn").onclick = function () {
                aiForm.style.display = "none";
                fillAIApiForm();
            };
            aiAuto.addEventListener("change", function () {
                writeConf("ai_enable", aiAuto.checked ? "true" : "false");
                _this.Info(aiAuto.checked ? "自动答题已开启（用 AI 作答）" : "自动答题已关闭（改走原题库逻辑）");
                refreshAIStatus();
            });
            setTimeout(function () {
                application_1.Application.CheckUpdate(function (isnew, data) {
                    if (data == undefined) {
                        _this.Info("检查更新失败.");
                        return;
                    }
                    var html = "";
                    if (isnew) {
                        html += "<span>[有新版本]</span>";
                    }
                    html += data.injection;
                    _this.Info(html);
                });
            }, 1000);
            //支持拖拽移动
            function getProperty(ele, prop) {
                return parseInt(window.getComputedStyle(ele)[prop]);
            }
            var windowWidth = window.innerWidth;
            var windowHeight = window.innerHeight;
            var containerWidth = getProperty(_this.div, "width");
            var containerHeight = getProperty(_this.div, "height");
            var x = parseInt(application_1.Application.App.config.GetConfig("notify_tools_x", "60px").replace('px', ''));
            if (x < 0) {
                x = 0;
            }
            if (x >= windowWidth - containerWidth)
                x = windowWidth - containerWidth;
            _this.div.style.left = x + "px";
            var y = parseInt(application_1.Application.App.config.GetConfig("notify_tools_y", "40px").replace('px', ''));
            if (y < 0) {
                y = 0;
            }
            if (y >= windowHeight - containerHeight)
                y = windowHeight - containerHeight;
            _this.div.style.top = y + "px";
            var head = _this.div.querySelector("#tools-head");
            head.onmousedown = function (downEvent) {
                var relaX = downEvent.clientX - _this.div.offsetLeft;
                var relaY = downEvent.clientY - _this.div.offsetTop;
                var windowWidth = window.innerWidth;
                var windowHeight = window.innerHeight;
                var containerWidth = getProperty(_this.div, "width");
                var containerHeight = getProperty(_this.div, "height");
                document.onmousemove = function (moveEvent) {
                    var targetX = moveEvent.clientX - relaX;
                    var targetY = moveEvent.clientY - relaY;
                    if (targetX <= 0)
                        targetX = 0;
                    if (targetY <= 0)
                        targetY = 0;
                    if (targetX >= windowWidth - containerWidth)
                        targetX = windowWidth - containerWidth;
                    if (targetY >= windowHeight - containerHeight)
                        targetY = windowHeight - containerHeight;
                    _this.div.style.left = targetX + "px";
                    _this.div.style.top = targetY + "px";
                };
                document.onmouseup = function () {
                    document.onmouseup = null;
                    document.onmousemove = null;
                    application_1.Application.App.config.SetConfig("notify_tools_x", _this.div.style.left);
                    application_1.Application.App.config.SetConfig("notify_tools_y", _this.div.style.top);
                };
            };
        });
    }
    PageLog.prototype.getNowTime = function () {
        var time = new Date();
        return time.getHours() + ":" + time.getMinutes() + ":" + time.getSeconds();
    };
    PageLog.prototype.first = function (text, color, background) {
        var new_log = document.createElement("div");
        new_log.innerHTML =
            "\n                <div class=\"log\" style=\"border-color: " +
                background +
                "; background-color: " +
                background +
                ";\">\n                    <p><span style=\"color:" +
                color +
                ";\">" +
                text +
                "</span></p>\n                </div>\n            ";
        //插入第一个元素前
        var first = document
            .getElementsByClassName("tools-notice-content")[0]
            .getElementsByTagName("div");
        document.querySelector(".tools-notice-content").insertBefore(new_log, first[0]);
    };
    PageLog.prototype.toStr = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        var text = "";
        for (var i = 0; i < args.length; i++) {
            if (typeof args[i] == "object") {
                text += args[i].toString() + "\n";
            }
            else {
                text += args[i] + "\n";
            }
        }
        return text.substring(0, text.length - 1);
    };
    PageLog.prototype.Debug = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        console.info.apply(console, __spreadArrays(["[debug", this.getNowTime(), "]"], args));
        return this;
    };
    PageLog.prototype.buffer = function (text, color, background) {
        this.pending.push([text, color, background]);
        if (this.pending.length > 80) {
            this.pending.shift();
        }
    };
    PageLog.prototype.Info = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        var text = this.toStr.apply(this, args);
        if (this.el) {
            this.first(text, "#409EFF", "rgba(121, 187, 255, 0.2)");
        }
        else {
            this.buffer(text, "#409EFF", "rgba(121, 187, 255, 0.2)");
            console.info.apply(console, __spreadArrays(["[info", this.getNowTime(), "]"], args));
        }
        return this;
    };
    PageLog.prototype.Warn = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        var text = this.toStr.apply(this, args);
        if (this.el) {
            this.first(text, "#5C3C00", "rgba(250, 236, 216, 0.4)");
        }
        else {
            this.buffer(text, "#5C3C00", "rgba(250, 236, 216, 0.4)");
        }
        console.warn.apply(console, __spreadArrays(["[warn", this.getNowTime(), "]"], args));
        if (document.hidden && localStorage["is_notify"] == "true") {
            utils_1.Noifications({
                title: "网课小工具",
                text: text + "\n3秒后自动关闭",
                timeout: 3000,
            });
        }
        return this;
    };
    PageLog.prototype.Error = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        var text = this.toStr.apply(this, args);
        if (this.el) {
            this.first(text, "#FFF0F0", "rgba(253, 226, 226, 0.5)");
        }
        else {
            this.buffer(text, "#FFF0F0", "rgba(253, 226, 226, 0.5)");
        }
        console.error.apply(console, __spreadArrays(["[error", this.getNowTime(), "]"], args));
        if (localStorage["is_notify"] == "true") {
            utils_1.Noifications({
                title: "网课小工具",
                text: text,
            });
        }
        return this;
    };
    PageLog.prototype.Fatal = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        var text = this.toStr.apply(this, args);
        if (this.el) {
            this.first(text, "#ff0000", "rgba(253, 226, 226, 0.5)");
        }
        else {
            this.buffer(text, "#ff0000", "rgba(253, 226, 226, 0.5)");
        }
        console.error.apply(console, __spreadArrays(["[fatal", this.getNowTime(), "]"], args));
        utils_1.Noifications({
            title: "网课小工具",
            text: text,
        });
        return this;
    };
    return PageLog;
}());
exports.PageLog = PageLog;
var EmptyLog = /** @class */ (function () {
    function EmptyLog() {
    }
    EmptyLog.prototype.Debug = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        return this;
    };
    EmptyLog.prototype.Info = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        return this;
    };
    EmptyLog.prototype.Warn = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        return this;
    };
    EmptyLog.prototype.Error = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        return this;
    };
    EmptyLog.prototype.Fatal = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        return this;
    };
    return EmptyLog;
}());
exports.EmptyLog = EmptyLog;


/***/ }),

/***/ "./src/internal/utils/message.ts":
/*!***************************************!*\
  !*** ./src/internal/utils/message.ts ***!
  \***************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.NewChromeClientMessage = exports.NewChromeServerMessage = exports.NewExtensionClientMessage = exports.NewExtensionServerMessage = void 0;
function NewExtensionServerMessage(port) {
    return new extensionServerMessage(port);
}
exports.NewExtensionServerMessage = NewExtensionServerMessage;
var extensionServerMessage = /** @class */ (function () {
    function extensionServerMessage(port) {
        this.port = port;
        this.recv();
    }
    extensionServerMessage.prototype.recv = function () {
        var _this = this;
        //监听消息
        chrome.runtime.onConnect.addListener(function (port) {
            if (port.name != _this.port) {
                return;
            }
            port.onMessage.addListener(function (request) {
                _this.acceptCallback(new extensionClientMessage(port), request);
            });
        });
    };
    extensionServerMessage.prototype.Accept = function (callback) {
        this.acceptCallback = callback;
    };
    return extensionServerMessage;
}());
var msg = /** @class */ (function () {
    function msg(tag) {
        this.tag = tag;
    }
    msg.prototype.Recv = function (callback) {
        this.recvCallback = callback;
    };
    return msg;
}());
// 扩展中使用
function NewExtensionClientMessage(tag) {
    return new extensionClientMessage(tag);
}
exports.NewExtensionClientMessage = NewExtensionClientMessage;
var extensionClientMessage = /** @class */ (function (_super) {
    __extends(extensionClientMessage, _super);
    function extensionClientMessage(param) {
        var _this = this;
        if (typeof param === 'string') {
            _this = _super.call(this, param) || this;
            _this.connect();
        }
        else {
            _this.conn = param;
        }
        _this.recv();
        return _this;
    }
    extensionClientMessage.prototype.connect = function () {
        this.conn = chrome.runtime.connect({ name: this.tag });
    };
    extensionClientMessage.prototype.recv = function () {
        var _this = this;
        this.conn.onMessage.addListener(function (response) {
            _this.recvCallback(response);
        });
    };
    extensionClientMessage.prototype.Send = function (msg) {
        this.conn.postMessage(msg);
    };
    return extensionClientMessage;
}(msg));
// 浏览器中使用
function NewChromeServerMessage(tag) {
    return new chromeServerMessage(tag);
}
exports.NewChromeServerMessage = NewChromeServerMessage;
var chromeServerMessage = /** @class */ (function () {
    function chromeServerMessage(tag) {
        this.tag = tag;
        this.recv();
    }
    chromeServerMessage.prototype.recv = function () {
        var _this = this;
        window.addEventListener('message', function (event) {
            if (event.data.tag == _this.tag && event.data.conn_tag && event.data.source == "client") {
                _this.acceptCallback(new chromeClientMessage(_this.tag, event.data.conn_tag), event.data.msg);
            }
        });
    };
    chromeServerMessage.prototype.Accept = function (callback) {
        this.acceptCallback = callback;
    };
    return chromeServerMessage;
}());
function NewChromeClientMessage(tag) {
    return new chromeClientMessage(tag);
}
exports.NewChromeClientMessage = NewChromeClientMessage;
var chromeClientMessage = /** @class */ (function (_super) {
    __extends(chromeClientMessage, _super);
    function chromeClientMessage(tag, conn) {
        var _this = this;
        if (conn !== undefined) {
            _this = _super.call(this, tag) || this;
            _this.connTag = conn;
            _this.source = "server";
        }
        else {
            _this = _super.call(this, tag) || this;
            _this.connect();
            _this.source = "client";
        }
        return _this;
    }
    chromeClientMessage.prototype.connect = function () {
        var _this = this;
        this.connTag = Math.random();
        window.addEventListener('message', function (event) {
            if (event.data.tag == _this.tag && event.data.conn_tag == _this.connTag && event.data.source == "server") {
                _this.recvCallback && _this.recvCallback(event.data.msg);
            }
        });
    };
    chromeClientMessage.prototype.Send = function (msg) {
        window.postMessage({ tag: this.tag, conn_tag: this.connTag, msg: msg, source: this.source }, '*');
    };
    return chromeClientMessage;
}(msg));


/***/ }),

/***/ "./src/internal/utils/utils.ts":
/*!*************************************!*\
  !*** ./src/internal/utils/utils.ts ***!
  \*************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.Sleep = exports.UntrustedClick = exports.boolToString = exports.toBool = exports.Noifications = exports.isPhone = exports.getImageBase64 = exports.protocolPrompt = exports.dealHotVersion = exports.substrex = exports.removeHTML = exports.removeHTMLTag = exports.post = exports.get = exports.createBtn = exports.randNumber = exports.RemoveInjected = exports.syncSetChromeStorageLocal = exports.syncGetChromeStorageLocal = exports.InjectedBySrc = exports.Injected = exports.HttpUtils = void 0;
var application_1 = __webpack_require__(/*! ../application */ "./src/internal/application.ts");
var HttpUtils = /** @class */ (function () {
    function HttpUtils() {
    }
    HttpUtils.Request = function (info) {
        if (application_1.Application.App.IsBackend) {
            fetch(info.url, info).then(function (body) {
                if (info.json) {
                    return body.json();
                }
                else {
                    return body.text();
                }
            }).then(function (body) {
                info.success && info.success(body);
            }).catch(function () {
                info.error && info.error();
            });
            return;
        }
        HttpUtils.crossDomainRequest(info);
    };
    HttpUtils.errorCode = function (ret) {
        if (!ret.code) {
            return false;
        }
        switch (ret.code) {
            case -1: {
                application_1.Application.App.log.Info(ret.msg);
                break;
            }
            case -2: {
                application_1.Application.App.log.Warn(ret.msg);
                break;
            }
            case 1: {
                application_1.Application.App.log.Info(ret.msg);
                return false;
            }
            default: {
                return false;
            }
        }
        return true;
    };
    HttpUtils.crossDomainRequest = function (info) {
        // 超星某些页面会给 window 套 Proxy，hasOwnProperty 会直接抛
        // "Invalid property descriptor"；改用 typeof 判断最安全
        var gx = null;
        try {
            gx = window.GM_xmlhttpRequest;
        }
        catch (e) {
            gx = null;
        }
        if (typeof gx == "function") {
            //兼容油猴
            info.data = info.body;
            info.onreadystatechange = function (response) {
                if (response.readyState == 4) {
                    if (response.status == 200) {
                        if (info.json) {
                            var ret = JSON.parse(response.responseText);
                            if (HttpUtils.errorCode(ret)) {
                                info.error && info.error();
                                return;
                            }
                            info.success && info.success(ret);
                        }
                        else {
                            info.success && info.success(response.responseText);
                        }
                    }
                    else {
                        info.error && info.error();
                    }
                }
            };
            gx(info);
        }
        else {
            var client = application_1.Application.App.Client;
            client.Recv(function (data) {
                if (data.code == 0) {
                    if (info.json) {
                        if (HttpUtils.errorCode(data.body)) {
                            info.error && info.error();
                            return;
                        }
                    }
                    info.success && info.success(data.body);
                }
                else {
                    info.error && info.error();
                }
            });
            client.Send({
                type: "GM_xmlhttpRequest", info: {
                    url: info.url,
                    method: info.method,
                    json: info.json,
                    body: info.body,
                    headers: info.headers,
                }
            });
        }
    };
    HttpUtils.HttpGet = function (url, info) {
        info.url = url;
        this.Request(info);
    };
    HttpUtils.HttpPost = function (url, body, info) {
        info.url = url;
        info.body = body;
        if (!info.headers) {
            info.headers = {};
        }
        if (!info.headers["Content-Type"]) {
            info.headers["Content-Type"] = "application/x-www-form-urlencoded";
        }
        info.method = "POST";
        this.Request(info);
    };
    HttpUtils.SendRequest = function (client, data) {
        if (!data.info) {
            return;
        }
        var info = data.info;
        if (application_1.Application.App.IsBackend) {
            info.success = function (body) {
                client.Send({ body: body, code: 0 });
            };
            info.error = function () {
                client.Send({ code: -1 });
            };
            HttpUtils.Request(info);
        }
        else {
            // content 做转发
            var extClient = application_1.Application.App.Client;
            extClient.Send({ type: "GM_xmlhttpRequest", info: info });
            extClient.Recv(function (data) {
                client.Send(data);
            });
        }
    };
    return HttpUtils;
}());
exports.HttpUtils = HttpUtils;
/**
 * 通过源码注入js资源
 * @param doc
 * @param url
 * @constructor
 */
function Injected(doc, source) {
    var temp = doc.createElement('script');
    temp.setAttribute('type', 'text/javascript');
    temp.innerHTML = source;
    temp.className = "injected-js";
    doc.documentElement.appendChild(temp);
    return temp;
}
exports.Injected = Injected;
/**
 * 通过源码注入js资源
 * @param doc
 * @param url
 * @constructor
 */
function InjectedBySrc(doc, source) {
    var temp = doc.createElement('script');
    temp.setAttribute('type', 'text/javascript');
    temp.src = source;
    temp.className = "injected-js";
    doc.documentElement.appendChild(temp);
    return temp;
}
exports.InjectedBySrc = InjectedBySrc;
function syncGetChromeStorageLocal(key) {
    return new Promise(function (resolve) { return (chrome.storage.local.get(key, function (value) {
        resolve(value[key]);
    })); });
}
exports.syncGetChromeStorageLocal = syncGetChromeStorageLocal;
function syncSetChromeStorageLocal(key, value) {
    var tmp = {};
    tmp[key] = value;
    return new Promise(function (resolve) { return (chrome.storage.local.set(tmp, function () {
        resolve();
    })); });
}
exports.syncSetChromeStorageLocal = syncSetChromeStorageLocal;
/**
 * 移除注入js
 * @param doc
 */
function RemoveInjected(doc) {
    var resource = doc.getElementsByClassName("injected-js");
    for (var i = 0; i < resource.length; i++) {
        resource[i].remove();
    }
}
exports.RemoveInjected = RemoveInjected;
function randNumber(minNum, maxNum) {
    return Math.floor(Math.random() * (maxNum - minNum + 1) + minNum);
}
exports.randNumber = randNumber;
/**
 * 创建一个按钮
 * @param title
 * @param description
 * @param id
 */
function createBtn(title, description, className, id) {
    if (description === void 0) { description = ""; }
    if (className === void 0) { className = ""; }
    if (id === void 0) { id = ""; }
    var btn = document.createElement('button');
    btn.innerText = title;
    btn.id = id;
    btn.title = description;
    btn.className = className;
    return btn;
}
exports.createBtn = createBtn;
/**
 * get请求
 * @param {*} url
 */
function get(url, success) {
    var xmlhttp = createRequest();
    xmlhttp.open("GET", url, true);
    xmlhttp.onreadystatechange = function () {
        if (this.readyState == 4) {
            if (this.status == 200) {
                success && success(this.responseText, this.resource);
            }
            else {
                xmlhttp.errorCallback && xmlhttp.errorCallback(this);
            }
        }
    };
    xmlhttp.send();
    return xmlhttp;
}
exports.get = get;
/**
 * post请求
 * @param {*} url
 * @param {*} data
 * @param {*} json
 */
function post(url, data, json, success) {
    if (json === void 0) { json = true; }
    var xmlhttp = createRequest();
    xmlhttp.open("POST", url, true);
    if (json) {
        xmlhttp.setRequestHeader("Content-Type", "application/json");
    }
    else {
        xmlhttp.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
    }
    xmlhttp.onreadystatechange = function () {
        if (this.readyState == 4) {
            if (this.status == 200) {
                success && success(this.responseText);
            }
            else {
                xmlhttp.errorCallback && xmlhttp.errorCallback(this);
            }
        }
    };
    xmlhttp.send(data);
    return xmlhttp;
}
exports.post = post;
/**
 * 创建http请求
 */
function createRequest() {
    var xmlhttp;
    if (window.XMLHttpRequest) {
        xmlhttp = new XMLHttpRequest();
    }
    else {
        xmlhttp = new ActiveXObject("Microsoft.XMLHTTP");
    }
    xmlhttp.error = function (callback) {
        xmlhttp.errorCallback = callback;
        return xmlhttp;
    };
    xmlhttp.withCredentials = true;
    return xmlhttp;
}
// 移除html tag
function removeHTMLTag(html) {
    var revHtml = /<.*?>/g;
    html = html.replace(revHtml, '');
    html = html.replace(/(^\s+)|(\s+$)/g, '');
    return html;
}
exports.removeHTMLTag = removeHTMLTag;
/**
 * 去除html标签和处理中文
 * @param {string} html
 */
function removeHTML(html) {
    //先处理带src和href属性的标签
    var srcReplace = /<img.*?src="(.*?)".*?>/g;
    html = html.replace(srcReplace, '$1');
    srcReplace = /(<iframe.+?>)\s+?(<\/iframe>)/g;
    html = html.replace(srcReplace, '$1$2');
    srcReplace = /<(iframe|a).*?(src|href)="(.*?)".*?>(.*?)<\/(iframe|a)>/g;
    html = html.replace(srcReplace, '$3$4');
    var revHtml = /<.*?>/g;
    html = html.replace(revHtml, '');
    html = html.replace(/(^\s+)|(\s+$)/g, '');
    html = dealSymbol(html);
    return html.replace(/&nbsp;/g, ' ')
        .replace(/&quot;/g, "\"").replace(/&gt;/g, ">")
        .replace(/&lt;/g, "<").replace(/&amp;/g, '&').trim();
}
exports.removeHTML = removeHTML;
/**
 * 处理符号
 * @param topic
 */
function dealSymbol(topic) {
    topic = topic.replace(/，/g, ',');
    topic = topic.replace(/（/g, '(');
    topic = topic.replace(/）/g, ')');
    topic = topic.replace(/？/g, '?');
    topic = topic.replace(/：/g, ':');
    topic = topic.replace(/。/g, '.');
    topic = topic.replace(/[“”]/g, '"');
    return topic;
}
/**
 * 取中间文本
 * @param str
 * @param left
 * @param right
 */
function substrex(str, left, right) {
    var leftPos = str.indexOf(left) + left.length;
    var rightPos = str.indexOf(right, leftPos);
    return str.substring(leftPos, rightPos);
}
exports.substrex = substrex;
function dealHotVersion(hotversion) {
    hotversion = hotversion.substring(0, hotversion.indexOf(".") + 1) + hotversion.substring(hotversion.indexOf(".") + 1).replace(".", "");
    return Number(hotversion);
}
exports.dealHotVersion = dealHotVersion;
function protocolPrompt(content, key, keyword) {
    keyword = keyword || "yes";
    if (localStorage[key] == undefined || localStorage[key] != 1) {
        var msg = prompt(content + "\n如果以后不想再弹出本对话框并且同意请在下方填写\"" + keyword + "\"");
        if (msg === null)
            return false;
        if (keyword != msg) {
            return false;
        }
        localStorage[key] = 1;
    }
    return true;
}
exports.protocolPrompt = protocolPrompt;
function getImageBase64(img, ext) {
    var canvas = document.createElement("canvas");
    canvas.width = img.width;
    canvas.height = img.height;
    var ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0, img.width, img.height);
    var dataURL = canvas.toDataURL("image/" + ext, 0.75); //节省可怜的流量>_<,虽然好像没有啥
    canvas = null;
    return dataURL;
}
exports.getImageBase64 = getImageBase64;
function isPhone() {
    return /Android|iPhone/i.test(navigator.userAgent);
}
exports.isPhone = isPhone;
function Noifications(details) {
    var gn = null;
    try {
        gn = window.GM_notification;
    }
    catch (e) {
        gn = null;
    }
    if (typeof gn == "function") {
        gn(details);
    }
    else {
        var client = application_1.Application.App.Client;
        client.Send({
            type: "GM_notification", details: details,
        });
        application_1.Application.App.Client.Send(details);
    }
}
exports.Noifications = Noifications;
function toBool(val) {
    if (typeof val == "boolean") {
        return val;
    }
    return val == "true";
}
exports.toBool = toBool;
function boolToString(val) {
    if (val) {
        return "true";
    }
    return "false";
}
exports.boolToString = boolToString;
function UntrustedClick(el) {
    if (window.CAT_click != undefined) {
        CAT_click(el);
        return true;
    }
    var untrusted = new MouseEvent("click", { "clientX": 10086 });
    if (!untrusted.isTrusted) {
        application_1.Application.App.log.Warn("扩展执行错误");
        return false;
    }
    return el.dispatchEvent(untrusted);
}
exports.UntrustedClick = UntrustedClick;
function Sleep(timeout) {
    return new Promise(function (resolve) {
        setTimeout(function () {
            resolve(undefined);
        }, timeout);
    });
}
exports.Sleep = Sleep;


/***/ }),

/***/ "./src/mooc/chaoxing/course.ts":
/*!*************************************!*\
  !*** ./src/mooc/chaoxing/course.ts ***!
  \*************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CxHomeWork = exports.CxExamTopic = exports.CxCourse = void 0;
var application_1 = __webpack_require__(/*! @App/internal/application */ "./src/internal/application.ts");
var factory_1 = __webpack_require__(/*! @App/mooc/chaoxing/factory */ "./src/mooc/chaoxing/factory.ts");
var event_1 = __webpack_require__(/*! @App/internal/utils/event */ "./src/internal/utils/event.ts");
//课程任务
var CxCourse = /** @class */ (function (_super) {
    __extends(CxCourse, _super);
    function CxCourse() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.taskIndex = 0;
        return _this;
    }
    CxCourse.prototype.Init = function () {
        var _this = this;
        return new Promise(function (resolve) {
            var first = true;
            document.addEventListener("load", function (ev) {
                var el = (ev.srcElement || ev.target);
                if (el.id == "iframe") {
                    application_1.Application.App.log.Info("超星新窗口加载");
                    _this.OperateCard(el);
                    // 超星会有多次加载,所以使用一个flag变量,只回调一次
                    first && resolve(undefined);
                    first = false;
                }
            }, true);
        });
    };
    CxCourse.prototype.Stop = function () {
        throw new Error("Method not implemented.");
    };
    CxCourse.prototype.Next = function () {
        var _this = this;
        return new Promise(function (resolve) {
            if (_this.taskList.length > _this.taskIndex) {
                resolve(_this.taskList[_this.taskIndex]);
                return _this.taskIndex++;
            }
            // 当页任务点全部结束,翻页.由于会重新加载窗口调用reload,在加载完成之后再返回任务点.(本方法是同步调用,所以使用此种方法)
            _this.addEventListenerOnce("reload", function () { return __awaiter(_this, void 0, void 0, function () {
                var _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            _a = resolve;
                            return [4 /*yield*/, this.Next()];
                        case 1:
                            _a.apply(void 0, [_b.sent()]);
                            return [2 /*return*/];
                    }
                });
            }); });
            _this.nextPage(null);
        });
    };
    CxCourse.prototype.SetTaskPointer = function (index) {
        this.taskIndex = index;
    };
    // 操作任务卡,一个页面会包含很多任务,取出来
    CxCourse.prototype.OperateCard = function (iframe) {
        return __awaiter(this, void 0, void 0, function () {
            var iframeWindow, match, btnBar, _loop_1, this_1, index;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        iframeWindow = iframe.contentWindow;
                        // 判断任务的参数
                        if (iframeWindow.mArg == undefined) {
                            match = iframeWindow.document.body.innerHTML.match(/try{\s+?mArg = (.*?);/);
                            if (!match) {
                                return [2 /*return*/];
                            }
                            iframeWindow.mArg = JSON.parse(match[1]);
                        }
                        // 任务的属性
                        this.attachments = iframeWindow.mArg.attachments;
                        this.taskList = new Array();
                        btnBar = document.getElementById("tools-btn-bar");
                        if (btnBar) {
                            while (btnBar.firstChild) {
                                btnBar.removeChild(btnBar.firstChild);
                            }
                        }
                        _loop_1 = function (index) {
                            var value, task;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0:
                                        value = this_1.attachments[index];
                                        value.defaults = iframeWindow.mArg.defaults;
                                        // 任务工厂去创建对应的任务对象
                                        task = factory_1.TaskFactory.CreateCourseTask(iframeWindow, value);
                                        if (!task) {
                                            return [2 /*return*/, "continue"];
                                        }
                                        task.jobIndex = index;
                                        this_1.taskList.push(task);
                                        task.addEventListener("complete", function () {
                                            _this.callEvent("taskComplete", index, task);
                                        });
                                        return [4 /*yield*/, task.Init()];
                                    case 1:
                                        _a.sent();
                                        return [2 /*return*/];
                                }
                            });
                        };
                        this_1 = this;
                        index = 0;
                        _a.label = 1;
                    case 1:
                        if (!(index < this.attachments.length)) return [3 /*break*/, 4];
                        return [5 /*yield**/, _loop_1(index)];
                    case 2:
                        _a.sent();
                        _a.label = 3;
                    case 3:
                        index++;
                        return [3 /*break*/, 1];
                    case 4:
                        this.taskIndex = 0;
                        this.callEvent("reload");
                        return [2 /*return*/];
                }
            });
        });
    };
    CxCourse.prototype.afterPage = function () {
        //感觉奇葩的方法...（旧版目录结构，往下找当前任务点下方的第一个）
        try {
            var els = document.querySelectorAll("div.ncells > *:not(.currents) > .orange01");
            var now = document.querySelector("div.ncells > .currents");
            if (now) {
                for (var i = 0; i < els.length; i++) {
                    if (now.getBoundingClientRect().top < els[i].getBoundingClientRect().top) {
                        return els[i];
                    }
                }
            }
        }
        catch (e) {
            // ignore
        }
        return null;
    };
    // 找"下一节/下一章"入口：新版学习通导航结构变了，这里按多种方式兜底
    CxCourse.prototype.findNextControl = function () {
        var sels = [
            "span.currents ~ span",
            ".prev_next.next",
            ".next_prev.next",
            "a.next",
            "button.next",
            ".nav-next",
            "[class*=nextSection]",
        ];
        for (var i = 0; i < sels.length; i++) {
            try {
                var el = document.querySelector(sels[i]);
                if (el && el.offsetParent != null) {
                    return el;
                }
            }
            catch (e) {
                // ignore
            }
        }
        // 按可见文字找
        try {
            var nodes = document.querySelectorAll("span,a,button,div");
            for (var i = 0; i < nodes.length; i++) {
                var el = nodes[i];
                var t = (el.innerText || el.textContent || "").trim();
                if (/^(下一节|下一章|下一任务点|下一题|下一步|下一页)$/.test(t) && el.offsetParent != null) {
                    return el;
                }
            }
        }
        catch (e) {
            // ignore
        }
        return null;
    };
    CxCourse.prototype.nextPage = function (num) {
        var _this = this;
        // 目录监听刚点过"下一节"，这里就别再点一次，避免一次跳两节
        var navByCatalog = window.__cxNavByCatalog || 0;
        if (Date.now() - navByCatalog < 15000) {
            application_1.Application.App.log.Info("目录监听已经切换过，跳过重复翻页");
            return;
        }
        var el = this.findNextControl();
        if (el) {
            application_1.Application.App.log.Info("切换到下一节（" + ((el.innerText || el.tagName) + "").slice(0, 20) + "）");
            try {
                el.click();
                return;
            }
            catch (e) {
                application_1.Application.App.log.Warn("点击下一节失败：" + e);
            }
        }
        //只往后执行（旧版目录）
        el = this.afterPage();
        if (el) {
            try {
                el.parentElement.querySelector("a>span").click();
                application_1.Application.App.log.Info("已点目录里的下一个任务点");
                return;
            }
            catch (e) {
                application_1.Application.App.log.Warn("点下一个任务点失败：" + e);
            }
        }
        //进行有锁任务查找
        if (document.querySelector("div.ncells > *:not(.currents) > .lock") != undefined) {
            if (num > 5) {
                return this.callEvent("error", "被锁卡住了,请手动处理");
            }
            application_1.Application.App.log.Info("下一节被锁定，等待解锁...");
            return setTimeout(function () {
                _this.nextPage(num + 1);
            }, 5000);
        }
        application_1.Application.App.log.Info("没有找到下一节，本页任务点应已全部完成");
        return this.callEvent("complete");
    };
    return CxCourse;
}(event_1.EventListener));
exports.CxCourse = CxCourse;
// 考试
var CxExamTopic = /** @class */ (function () {
    function CxExamTopic() {
    }
    CxExamTopic.prototype.Init = function () {
        window.addEventListener("load", function () {
            var el = document.querySelector("#paperId");
            var info = "0";
            if (el) {
                info = el.value;
            }
            var task = factory_1.TaskFactory.CreateExamTopicTask(window, {
                refer: document.URL,
                id: "exam-" + info,
                info: info,
            });
            task.Init();
            if (document.URL.indexOf("exam/test/reVersionTestStartNew") > 0) {
                if (application_1.Application.App.config.auto) {
                    task.Start();
                }
            }
        });
    };
    return CxExamTopic;
}());
exports.CxExamTopic = CxExamTopic;
// 作业
var CxHomeWork = /** @class */ (function () {
    function CxHomeWork() {
    }
    CxHomeWork.prototype.Init = function () {
        window.onload = function () {
            var el = document.querySelector("#workLibraryId");
            var info = "";
            if (el) {
                info = el.value;
            }
            var task = factory_1.TaskFactory.CreateHomeworkTopicTask(window, {
                refer: document.URL,
                id: info,
                info: info,
            });
            task.Init();
            if (application_1.Application.App.config.auto && document.querySelector("#workLibraryId")) {
                task.Start();
            }
        };
    };
    return CxHomeWork;
}());
exports.CxHomeWork = CxHomeWork;


/***/ }),

/***/ "./src/mooc/chaoxing/factory.ts":
/*!**************************************!*\
  !*** ./src/mooc/chaoxing/factory.ts ***!
  \**************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TaskFactory = void 0;
var video_1 = __webpack_require__(/*! @App/mooc/chaoxing/video */ "./src/mooc/chaoxing/video.ts");
var topic_1 = __webpack_require__(/*! @App/mooc/chaoxing/topic */ "./src/mooc/chaoxing/topic.ts");
var question_1 = __webpack_require__(/*! @App/internal/app/question */ "./src/internal/app/question.ts");
var question_2 = __webpack_require__(/*! @App/mooc/chaoxing/question */ "./src/mooc/chaoxing/question.ts");
var application_1 = __webpack_require__(/*! @App/internal/application */ "./src/internal/application.ts");
var task_1 = __webpack_require__(/*! @App/mooc/chaoxing/task */ "./src/mooc/chaoxing/task.ts");
var utils_1 = __webpack_require__(/*! @App/mooc/chaoxing/utils */ "./src/mooc/chaoxing/utils.ts");
var utils_2 = __webpack_require__(/*! @App/internal/utils/utils */ "./src/internal/utils/utils.ts");
var special_1 = __webpack_require__(/*! @App/mooc/chaoxing/special */ "./src/mooc/chaoxing/special.ts");
// 任务工厂,创建对应的任务
var TaskFactory = /** @class */ (function () {
    function TaskFactory() {
    }
    TaskFactory.CreateCourseTask = function (context, taskinfo) {
        if (taskinfo.property.module == "insertaudio") {
            taskinfo.type = "audio";
        }
        //TODO:优化
        if (taskinfo.type != "video" && taskinfo.type != "workid" && taskinfo.type != "document"
            && taskinfo.type != "audio") {
            return null;
        }
        var task;
        var taskIframe = context.document.querySelector("iframe[jobid='" + taskinfo.jobid + "']");
        var prev;
        if (taskIframe == undefined) {
            taskIframe = context.document.querySelector("iframe[data*='" + taskinfo.property.mid + "'],iframe[objectid='" + taskinfo.property.objectid + "']");
            prev = document.createElement("div");
            taskIframe.parentElement.prepend(prev);
        }
        else {
            prev = taskIframe.previousElementSibling;
        }
        switch (taskinfo.type) {
            case "video": {
                var bar = new video_1.CxVideoControlBar(prev, new video_1.Video(taskIframe.contentWindow, taskinfo));
                task = bar.task;
                task.muted = application_1.Application.App.config.video_mute;
                task.playbackRate = application_1.Application.App.config.video_multiple;
                break;
            }
            case "workid": {
                var contentWindow = taskIframe.contentWindow.document.querySelector("#frame_content").contentWindow;
                taskinfo.refer = context.document.URL;
                taskinfo.id = taskinfo.property.workid;
                taskinfo.info = taskinfo.property.workid;
                var topic = new topic_1.CxCourseTopic(contentWindow, new question_1.ToolsQuestionBankFacade("cx", {
                    refer: context.document.URL,
                    id: taskinfo.property.workid, info: taskinfo.property.workid,
                }));
                topic.SetQueryQuestions(new topic_1.CxCourseQueryQuestion(contentWindow, function (context, el) {
                    return question_2.CxQuestionFactory.CreateCourseQuestion(context, el);
                }));
                var bar = new topic_1.CxTopicControlBar(prev, new topic_1.TopicAdapter(context, taskinfo, topic));
                if (application_1.Application.App.config.answer_ignore) {
                    return null;
                }
                task = bar.task;
                break;
            }
            case "document": {
                var bar = new task_1.CxTaskControlBar(prev, new special_1.CxDocumentTask(taskIframe.contentWindow, taskinfo));
                bar.append(bar.download());
                task = bar.task;
                task.muted = application_1.Application.App.config.video_mute;
                task.playbackRate = application_1.Application.App.config.video_multiple;
                break;
            }
            case "audio": {
                var bar = new special_1.CxAudioControlBar(prev, new special_1.CxAudioTask(taskIframe.contentWindow, taskinfo));
                task = bar.task;
                task.muted = application_1.Application.App.config.video_mute;
                task.playbackRate = application_1.Application.App.config.video_multiple;
                break;
            }
            default:
                return null;
        }
        return task;
    };
    TaskFactory.CreateExamTopicTask = function (context, taskinfo) {
        var topic = new topic_1.ExamTopic(context, new question_1.ToolsQuestionBankFacade("cx", taskinfo));
        var task = new topic_1.TopicAdapter(context, taskinfo, topic);
        if (document.URL.indexOf("exam/test/reVersionTestStartNew") > 0) {
            topic.SetQueryQuestions(topic);
            var btn_1 = utils_1.CssBtn(utils_2.createBtn("搜索答案", "搜索题目答案"));
            document.querySelector(".Cy_ulBottom.clearfix.w-buttom,.Cy_ulTk,.Cy_ulBottom.clearfix").append(btn_1);
            btn_1.onclick = function () {
                btn_1.innerText = "答案搜索中...";
                try {
                    task.Start().then(function (ret) {
                        ret = ret || "搜索题目";
                        btn_1.innerText = question_1.QuestionStatusString(ret);
                    });
                }
                catch (e) {
                }
                return false;
            };
        }
        else {
            topic.SetQueryQuestions(new topic_1.CxCourseQueryQuestion(context, function (context, el) {
                return question_2.CxQuestionFactory.CreateExamCollectQuestion(context, el);
            }));
        }
        return task;
    };
    TaskFactory.CreateHomeworkTopicTask = function (context, taskinfo) {
        var _this = this;
        var bank = new question_1.ToolsQuestionBankFacade("cx", taskinfo);
        var topic = new topic_1.HomeworkTopic(context, bank);
        topic.SetQueryQuestions(new topic_1.CxCourseQueryQuestion(context, function (context, el) {
            return question_2.CxQuestionFactory.CreateHomeWorkQuestion(context, el);
        }));
        var task = new topic_1.TopicAdapter(context, taskinfo, topic);
        var btn = utils_1.CssBtn(utils_2.createBtn("搜索答案", "搜索题目答案"));
        if (document.querySelector("input#workRelationId")) {
            document.querySelector(".CyTop").append(btn);
            btn.onclick = function () { return __awaiter(_this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    btn.innerText = "答案搜索中...";
                    task.Start().then(function (ret) {
                        ret = ret || "搜索题目";
                        btn.innerText = question_1.QuestionStatusString(ret);
                    });
                    return [2 /*return*/];
                });
            }); };
        }
        return task;
    };
    return TaskFactory;
}());
exports.TaskFactory = TaskFactory;


/***/ }),

/***/ "./src/mooc/chaoxing/font-decode.ts":
/*!******************************************!*\
  !*** ./src/mooc/chaoxing/font-decode.ts ***!
  \******************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DecodeChaoxingFont = void 0;
// 学习通「字体加密」解密（第四版：直接用页面已加载的加密字体）
//
// 机制：DOM 里存的是打乱后的字符，页面用 @font-face("font-cxsecret") 把每个错误码点
// 渲染成正确字形。所以：
//   1. 不能删 .font-cxsecret 类名（删了页面就显示乱码）——除非已经成功替换成正确文字；
//   2. 解密 = 用页面自己的字体（已注册在 document.fonts，canvas 可直接引用）渲染乱码字，
//      和系统字体渲染的候选字做 32x32 字形比对，取最近距离；
//   3. 严格模式：解析成功率不足或匹配质量差时，什么都不做，页面保持原样。
var application_1 = __webpack_require__(/*! @App/internal/application */ "./src/internal/application.ts");
var SYS_FONT = '"Microsoft YaHei", "SimHei", "PingFang SC", sans-serif';
var COMMON_CHARS = "的一是在不了有和人这中大为上个国我以要他时来用们生到作地于出就分对成会可主发年动同工也能下过子说产种面而方后多定行学法所民得经十三之进着等部度家电力里如水化高自二理起小物实现加量都两体制机当使点从业本去把性好应开它合还因由其些然前外天政四日那社义事平形相全表间样与关各重新线内数正心反你明看原又么利比或但质气第向道命此变条只没结解问意建月公无系军很情者最立代想已通并提直题党程展五果料象员革位入常文总次品式活设及管特件长求老头基资边流路级少图山统接知较将组见计别她手角期根论运农指几九区强放决西被干做必战先回则任取据处队南给色光门即保治北造百规热领七海口东导器压志世金增争济阶油思术极交受联什认六共权收证改清己美再采转更单风切打白教速花带安场身车例真务具万每目至达走积示议声报斗完类八离华名确才科张信马节话米整空元况今集温传土许步群广石记需段研界拉林律叫且究观越织装影算低持音众书布复容儿须际商非验连断深难近千周委素技备半办青省列习响约支般史感劳便团往酸历市克何除消构府称太准精值号率族维划选标写存候毛亲快效斯院查江型眼王按格养易置派层片始却专状育厂京识适属圆包火住调满县局照参红细引听该铁价严龙飞" +
    "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz" +
    "，。、；：？！“”‘’（）《》〈〉【】[]{}·—…%＋－×－×÷＝√/*#@&";
var CANDIDATE_FONTS = [
    '"SimSun", "宋体", serif',
    '"SimHei", "黑体", sans-serif',
    '"KaiTi", "楷体", serif',
    SYS_FONT,
];
var _canvas = null;
var _ctx = null;
function glyphBits(doc, ch, fontFamily) {
    if (!_canvas) {
        _canvas = doc.createElement("canvas");
        _canvas.width = 32;
        _canvas.height = 32;
        _ctx = _canvas.getContext("2d");
    }
    _ctx.clearRect(0, 0, 32, 32);
    _ctx.font = "28px " + fontFamily;
    _ctx.textAlign = "center";
    _ctx.textBaseline = "middle";
    _ctx.fillStyle = "#000";
    _ctx.fillText(ch, 16, 17);
    var d = _ctx.getImageData(0, 0, 32, 32).data;
    var s = "";
    for (var i = 0; i < d.length; i += 4) {
        s += d[i + 3] > 120 ? "1" : "0";
    }
    return s;
}
function bitCount(s) {
    var n = 0;
    for (var i = 0; i < s.length; i++) {
        if (s.charAt(i) == "1") {
            n++;
        }
    }
    return n;
}
function hamDist(a, b) {
    var n = 0;
    var len = Math.min(a.length, b.length);
    for (var i = 0; i < len; i++) {
        if (a.charAt(i) != b.charAt(i)) {
            n++;
        }
    }
    return n + Math.abs(a.length - b.length);
}
// 取出元素实际使用的第一个字体名（去掉引号）
function firstFamilyName(fontFamily) {
    var f = String(fontFamily || "").split(",")[0] || "";
    f = f.replace(/['"]/g, "").trim();
    return f;
}
// 字形缓存：同一字体家族下，已还原的「乱码字→正确字」映射全局复用，
// 每道新题只对没见过的字做 Canvas 比对（又快又不漏题）。
var charMapCache = {};
var candidateCache = {};
function DecodeChaoxingFont(win) {
    return __awaiter(this, void 0, Promise, function () {
        var doc_1, els, family, cs, targets, seen, i, t, k, ch, fonts, e_1, quoted, tHashes, blankCount, sampleText, attempt, fonts, e_2, i, bits, getTable, cache, newCount, ti, t, targetBits, bestChar, bestDist, fi, table, ci, dist, done, ti, rate, i, el, text, t, e_3;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 15, , 16]);
                    doc_1 = win && win.document;
                    if (!doc_1) {
                        return [2 /*return*/, false];
                    }
                    els = doc_1.querySelectorAll(".font-cxsecret");
                    if (!els || els.length == 0) {
                        return [2 /*return*/, false];
                    }
                    family = "";
                    try {
                        cs = win.getComputedStyle(els[0]);
                        family = firstFamilyName(String((cs && cs.fontFamily) || ""));
                    }
                    catch (e) {
                        family = "";
                    }
                    try {
                        console.log("[CXFONT] enter family=" + family + " els=" + els.length);
                    }
                    catch (e) { /* ignore */ }
                    if (!family) {
                        return [2 /*return*/, false];
                    }
                    targets = [];
                    seen = {};
                    for (i = 0; i < els.length; i++) {
                        t = String(els[i].textContent || "");
                        for (k = 0; k < t.length; k++) {
                            ch = t.charAt(k);
                            if (!seen[ch] && ch.trim() !== "") {
                                seen[ch] = true;
                                targets.push(ch);
                            }
                        }
                    }
                    if (targets.length == 0) {
                        return [2 /*return*/, false];
                    }
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 4, , 5]);
                    fonts = doc_1.fonts;
                    if (!(fonts && fonts.ready)) return [3 /*break*/, 3];
                    return [4 /*yield*/, Promise.race([fonts.ready, new Promise(function (res) { return setTimeout(res, 2000); })])];
                case 2:
                    _a.sent();
                    _a.label = 3;
                case 3: return [3 /*break*/, 5];
                case 4:
                    e_1 = _a.sent();
                    return [3 /*break*/, 5];
                case 5:
                    quoted = '"' + family + '"';
                    tHashes = {};
                    blankCount = 0;
                    sampleText = String(els[0].textContent || "").slice(0, 100);
                    attempt = 0;
                    _a.label = 6;
                case 6:
                    if (!(attempt < 4)) return [3 /*break*/, 14];
                    _a.label = 7;
                case 7:
                    _a.trys.push([7, 10, , 11]);
                    fonts = doc_1.fonts;
                    if (!(fonts && typeof fonts.load === "function")) return [3 /*break*/, 9];
                    return [4 /*yield*/, Promise.race([
                            fonts.load("28px " + quoted, sampleText),
                            new Promise(function (res) { return setTimeout(res, 1200); }),
                        ])];
                case 8:
                    _a.sent();
                    _a.label = 9;
                case 9: return [3 /*break*/, 11];
                case 10:
                    e_2 = _a.sent();
                    return [3 /*break*/, 11];
                case 11:
                    tHashes = {};
                    blankCount = 0;
                    for (i = 0; i < targets.length; i++) {
                        try {
                            bits = glyphBits(doc_1, targets[i], quoted);
                            tHashes[targets[i]] = bits;
                            if (bitCount(bits) < 6) {
                                blankCount++;
                            }
                        }
                        catch (e) {
                            // ignore
                        }
                    }
                    try {
                        console.log("[CXFONT] try#" + (attempt + 1) + " blank=" + blankCount + "/" + targets.length);
                    }
                    catch (e) { /* ignore */ }
                    if (blankCount <= targets.length * 0.5) {
                        return [3 /*break*/, 14];
                    }
                    return [4 /*yield*/, new Promise(function (res) { return setTimeout(res, 500); })];
                case 12:
                    _a.sent();
                    _a.label = 13;
                case 13:
                    attempt++;
                    return [3 /*break*/, 6];
                case 14:
                    // 加密字体渲染不出字形 → 说明拿错了字体（或页面字体未生效），保持原样
                    if (blankCount > targets.length * 0.5) {
                        console.log("[CXFONT] font renders blank, skip (keep page untouched)");
                        return [2 /*return*/, false];
                    }
                    getTable = function (font) {
                        if (candidateCache.hasOwnProperty(font)) {
                            return candidateCache[font];
                        }
                        var table = [];
                        for (var ci = 0; ci < COMMON_CHARS.length; ci++) {
                            var ch = COMMON_CHARS.charAt(ci);
                            try {
                                table.push({ ch: ch, bits: glyphBits(doc_1, ch, font) });
                            }
                            catch (e) {
                                // ignore
                            }
                        }
                        candidateCache[font] = table;
                        return table;
                    };
                    cache = charMapCache[family] || (charMapCache[family] = {});
                    newCount = 0;
                    for (ti = 0; ti < targets.length; ti++) {
                        t = targets[ti];
                        if (cache.hasOwnProperty(t)) {
                            continue;
                        }
                        targetBits = tHashes[t];
                        if (!targetBits || bitCount(targetBits) < 6) {
                            continue;
                        }
                        bestChar = "";
                        bestDist = 1e9;
                        for (fi = 0; fi < CANDIDATE_FONTS.length; fi++) {
                            table = getTable(CANDIDATE_FONTS[fi]);
                            for (ci = 0; ci < table.length; ci++) {
                                dist = hamDist(targetBits, table[ci].bits);
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
                    done = 0;
                    for (ti = 0; ti < targets.length; ti++) {
                        if (cache.hasOwnProperty(targets[ti])) {
                            done++;
                        }
                    }
                    try {
                        console.log("[CXFONT] cached=" + done + "/" + targets.length + " newMatched=" + newCount);
                    }
                    catch (e) { /* ignore */ }
                    if (done == 0) {
                        console.log("[CXFONT] nothing resolved, keep page untouched");
                        return [2 /*return*/, false];
                    }
                    rate = done / targets.length;
                    // 替换页面文字；只有解析率高时才去掉加密字体类名（否则保留页面字体渲染残字）
                    for (i = 0; i < els.length; i++) {
                        el = els[i];
                        text = String(el.textContent || "");
                        for (t in cache) {
                            if (cache.hasOwnProperty(t)) {
                                text = text.split(t).join(cache[t]);
                            }
                        }
                        el.textContent = text;
                        if (rate >= 0.95) {
                            el.classList.remove("font-cxsecret");
                        }
                    }
                    application_1.Application.App.log.Info("字体解密完成，还原 " + done + "/" + targets.length + " 个字符" + (rate >= 0.95 ? "（已去加密字体）" : "（文本已替换，字体类名保留）"));
                    return [2 /*return*/, true];
                case 15:
                    e_3 = _a.sent();
                    return [2 /*return*/, false];
                case 16: return [2 /*return*/];
            }
        });
    });
}
exports.DecodeChaoxingFont = DecodeChaoxingFont;


/***/ }),

/***/ "./src/mooc/chaoxing/platform.ts":
/*!***************************************!*\
  !*** ./src/mooc/chaoxing/platform.ts ***!
  \***************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.CxPlatform = void 0;
var vcode_1 = __webpack_require__(/*! @App/internal/app/vcode */ "./src/internal/app/vcode.ts");
var course_1 = __webpack_require__(/*! ./course */ "./src/mooc/chaoxing/course.ts");
var vcode_2 = __webpack_require__(/*! ./vcode */ "./src/mooc/chaoxing/vcode.ts");
var video_1 = __webpack_require__(/*! ./video */ "./src/mooc/chaoxing/video.ts");
var read_1 = __webpack_require__(/*! @App/mooc/chaoxing/read */ "./src/mooc/chaoxing/read.ts");
var special_1 = __webpack_require__(/*! @App/mooc/chaoxing/special */ "./src/mooc/chaoxing/special.ts");
var application_1 = __webpack_require__(/*! @App/internal/application */ "./src/internal/application.ts");
var CxPlatform = /** @class */ (function () {
    function CxPlatform() {
    }
    CxPlatform.prototype.CreateMooc = function () {
        var url = document.URL;
        var mooc = null;
        if (url.indexOf("mycourse/studentstudy?") > 0) {
            new vcode_1.VCode(new vcode_2.CxCourseVCode()); //添加打码组件
            mooc = new course_1.CxCourse();
        }
        else if (url.indexOf("ananas/modules/video/index.html") > 0) {
            mooc = new video_1.CxVideoOptimization();
        }
        else if (url.indexOf("ananas/modules/audio/index.html") > 0) {
            mooc = new special_1.CxAudioOptimization();
        }
        else if ((url.indexOf("work/doHomeWorkNew") > 0 || url.indexOf("work/selectWorkQuestionYiPiYue") > 0) && self == top) {
            mooc = new course_1.CxHomeWork();
        }
        else if (url.indexOf("exam/test/reVersionTestStartNew") > 0 || url.indexOf("exam/test/reVersionPaperMarkContentNew") > 0) {
            mooc = new course_1.CxExamTopic();
        }
        else if (url.indexOf("/course/") > 0) {
            mooc = new read_1.ReadStartPage();
        }
        else if (url.indexOf("ztnodedetailcontroller/visitnodedetail") > 0) {
            mooc = new read_1.Read();
        }
        else if (url.indexOf("exam/test?") > 0) {
            mooc = new read_1.Exam();
        }
        if (mooc) {
            application_1.Application.App.config.SetNamespace("cx");
        }
        return mooc;
    };
    return CxPlatform;
}());
exports.CxPlatform = CxPlatform;


/***/ }),

/***/ "./src/mooc/chaoxing/question.ts":
/*!***************************************!*\
  !*** ./src/mooc/chaoxing/question.ts ***!
  \***************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.CxQuestionFactory = void 0;
var utils_1 = __webpack_require__(/*! @App/internal/utils/utils */ "./src/internal/utils/utils.ts");
var question_1 = __webpack_require__(/*! @App/internal/app/question */ "./src/internal/app/question.ts");
var utils_2 = __webpack_require__(/*! ./utils */ "./src/mooc/chaoxing/utils.ts");
// 只收集"看得见"的文字节点：跳过 display:none / visibility:hidden / 透明 / 字号为 0 的元素。
// 超星部分页面会在题目里混入隐藏的混淆文字，直接 innerText 会拿到乱码。
function visibleText(root) {
    var out = "";
    var walk = function (node, depth) {
        if (!node || depth > 14) {
            return;
        }
        if (node.nodeType == 3) {
            out += node.nodeValue || "";
            return;
        }
        if (node.nodeType != 1) {
            return;
        }
        var e = node;
        try {
            if (e.tagName == "SCRIPT" || e.tagName == "STYLE" || e.tagName == "IMG" || e.tagName == "SVG") {
                return;
            }
            var st = window.getComputedStyle(e);
            if (st.display == "none" || st.visibility == "hidden") {
                return;
            }
            if (parseFloat(st.opacity || "1") < 0.05) {
                return;
            }
            var fs = parseFloat(st.fontSize || "14");
            if (fs > 0 && fs < 1) {
                return;
            }
        }
        catch (err) {
            // ignore
        }
        var kids = e.childNodes;
        for (var i = 0; i < kids.length; i++) {
            walk(kids[i], depth + 1);
        }
    };
    walk(root, 0);
    return out;
}
//TODO: 优化
var CxQuestionFactory = /** @class */ (function () {
    function CxQuestionFactory() {
    }
    CxQuestionFactory.CreateCourseQuestion = function (context, el) {
        var type = question_1.SwitchTopicType(utils_1.substrex(el.innerText, '【', '】'));
        if (type == null) {
            type = question_1.GuessTopicType(el);
        }
        if (type == null) {
            this.AddNotice(el, "不支持的类型");
            return null;
        }
        return this.CreateCourseQuestionByTopicType(context, type, el);
    };
    CxQuestionFactory.CreateExamQuestion = function (context, type, el) {
        var processor = new ExamQuestionProcessor();
        var ret = null;
        this.RemoveNotice(el);
        switch (type) {
            case 1:
            case 2: {
                ret = new cxExamSelectQuestion(context, el, type, processor);
                break;
            }
            case 3: {
                ret = new cxExamJudgeQuestion(context, el, type, processor);
                break;
            }
            case 4: {
                ret = new cxExamFillQuestion(context, el, type, processor);
                break;
            }
            default: {
                this.AddNotice(el, "不支持的类型");
                return null;
            }
        }
        return ret;
    };
    CxQuestionFactory.CreateCourseQuestionByTopicType = function (context, type, el) {
        var ret = null;
        var processor = new CourseQuestionProcessor();
        this.RemoveNotice(el);
        switch (type) {
            case 1:
            case 2: {
                ret = new cxSelectQuestion(context, el, type, processor);
                break;
            }
            case 3: {
                ret = new cxJudgeQuestion(context, el, type, processor);
                break;
            }
            case 4: {
                ret = new cxFillQuestion(context, el, type, processor);
                break;
            }
            default: {
                this.AddNotice(el, "不支持的类型");
                return null;
            }
        }
        return ret;
    };
    CxQuestionFactory.getBeforeType = function (el) {
        var before = el.previousElementSibling;
        do {
            if (before.className == "Cy_TItle1") {
                return before;
            }
            before = before.previousElementSibling;
        } while (before != null);
        return null;
    };
    CxQuestionFactory.CreateHomeWorkQuestion = function (context, el) {
        var before = CxQuestionFactory.getBeforeType(el);
        var type = before ? question_1.SwitchTopicType(utils_1.substrex(before.innerText, ".", "（")) : null;
        if (type == null) {
            type = question_1.SwitchTopicType(utils_1.substrex(el.innerText, '【', '】'));
        }
        if (type == null) {
            type = question_1.GuessTopicType(el);
        }
        if (type == null) {
            this.AddNotice(el, "不支持的类型");
            return null;
        }
        return this.CreateCourseQuestionByTopicType(context, type, el);
    };
    //TODO:写的什么玩意啊
    CxQuestionFactory.CreateExamCollectQuestion = function (context, el) {
        var ret = CxQuestionFactory.getBeforeType(el.parentElement);
        var txt = ret.innerText.match(/、(.*?)[\s|（]/)[1];
        return this.CreateExamQuestionByTopicType(context, question_1.SwitchTopicType(txt), el);
    };
    CxQuestionFactory.CreateExamQuestionByTopicType = function (context, type, el) {
        var ret = null;
        var processor = new CourseQuestionProcessor();
        this.RemoveNotice(el);
        switch (type) {
            case 1:
            case 2: {
                ret = new cxSelectQuestion(context, el, type, processor);
                break;
            }
            case 3: {
                ret = new cxJudgeQuestion(context, el, type, processor);
                break;
            }
            case 4: {
                ret = new cxExamFillQuestion(context, el, type, processor);
                break;
            }
            default: {
                this.AddNotice(el, "不支持的类型");
                return null;
            }
        }
        return ret;
    };
    CxQuestionFactory.RemoveNotice = function (el) {
        var tmpel = el.querySelector(".clearfix > ul,.clearfix > .Py_tk,.Zy_ulTk");
        if (tmpel == undefined) {
            tmpel = el;
        }
        tmpel.querySelectorAll(".prompt-line-answer").forEach(function (v) {
            v.remove();
        });
    };
    CxQuestionFactory.AddNotice = function (el, str) {
        var tmpel = el.querySelector(".clearfix > ul,.clearfix > .Py_tk,.Zy_ulTk");
        if (tmpel == undefined) {
            tmpel = el;
        }
        utils_2.CreateNoteLine(str, "answer", tmpel);
    };
    return CxQuestionFactory;
}());
exports.CxQuestionFactory = CxQuestionFactory;
var CourseQuestionProcessor = /** @class */ (function () {
    function CourseQuestionProcessor() {
    }
    CourseQuestionProcessor.prototype.GetTopic = function (el) {
        var ret = el.querySelector(".Zy_TItle > .clearfix,.Cy_TItle > .clearfix").innerHTML;
        ret = ret.substring(ret.indexOf('】') + 1);
        if (/（(.+?)分）($|\s)/.test(ret)) {
            ret = ret.substring(0, ret.lastIndexOf("（"));
        }
        return ret;
    };
    return CourseQuestionProcessor;
}());
var ExamQuestionProcessor = /** @class */ (function () {
    function ExamQuestionProcessor() {
    }
    ExamQuestionProcessor.prototype.GetTopic = function (el) {
        var ret = el.querySelector(".Cy_TItle.clearfix .clearfix").innerHTML;
        ret = ret.substr(0, ret.lastIndexOf('分）'));
        ret = ret.substr(0, ret.lastIndexOf('（'));
        return ret;
    };
    return ExamQuestionProcessor;
}());
var cxQuestion = /** @class */ (function () {
    function cxQuestion(context, el, type, processor) {
        this.context = context;
        this.el = el;
        this.type = type;
        this.processor = processor;
    }
    cxQuestion.prototype.SetStatus = function (status) {
        this.AddNotice(question_1.TopicStatusString(status));
    };
    cxQuestion.prototype.GetTopic = function () {
        // 优先取"看得见"的文字：超星某些页面会在 DOM 里塞隐藏的混淆文本，
        // 直接读 innerText/innerHTML 会拿到乱的（或夹着假字）
        var raw = "";
        try {
            raw = visibleText(this.el);
        }
        catch (e) {
            raw = "";
        }
        if (!raw.trim()) {
            try {
                raw = String(this.processor.GetTopic(this.el) || "");
            }
            catch (e) {
                raw = "";
            }
        }
        if (!raw.trim()) {
            try {
                raw = this.el.innerText || "";
            }
            catch (e) {
                raw = "";
            }
        }
        raw = raw.replace(/<[^>]*>/g, " ");
        // 去掉【单选题】这类题型标签、去掉（2.0分）、还原实体、压缩空白
        raw = raw.replace(/【[^】]{0,20}】/g, " ");
        raw = raw.replace(/[（(]\s*[\d.]+\s*分\s*[)）]/g, " ");
        raw = raw.replace(/&nbsp;/gi, " ").replace(/&lt;/gi, "<").replace(/&gt;/gi, ">").replace(/&amp;/gi, "&");
        raw = raw.replace(/[\r\n\t]+/g, " ").replace(/\s{2,}/g, " ").trim();
        // 拿到的是整道题（含选项）时，从第一个选项标记处截断
        var m = raw.match(/\s+[A-H][.、．]\s*/);
        if (m && m.index !== undefined && m.index > 6) {
            raw = raw.substring(0, m.index).trim();
        }
        return raw.substring(0, 300);
    };
    cxQuestion.prototype.RemoveNotice = function () {
        CxQuestionFactory.RemoveNotice(this.el);
    };
    cxQuestion.prototype.AddNotice = function (str) {
        CxQuestionFactory.AddNotice(this.el, str);
    };
    cxQuestion.prototype.GetType = function () {
        return this.type;
    };
    cxQuestion.prototype.options = function () {
        var tmpel = this.el.querySelector(".clearfix > ul,.clearfix ul.Zy_ulBottom.clearfix,ul.Zy_ulTk,.Zy_ulTop,ul.Zy_ulTop,.Zy_ulBottom,ul.Zy_ulBottom");
        if (tmpel) {
            return tmpel.querySelectorAll("li");
        }
        // 兜底：题目元素下所有带输入框的 li
        var all = this.el.querySelectorAll("li");
        var ret = new Array();
        for (var i = 0; i < all.length; i++) {
            if (all[i].querySelector("input,a")) {
                ret.push(all[i]);
            }
        }
        if (ret.length > 0) {
            return ret;
        }
        return all;
    };
    cxQuestion.prototype.isCorrect = function () {
        var el = this.el.querySelector(".Py_answer.clearfix,.Py_tk");
        if (el) {
            if (el.querySelectorAll('.fr.dui').length > 0 || el.querySelectorAll('.fr.bandui').length > 0) {
                return el;
            }
            else if (el.innerHTML.indexOf('正确答案') >= 0) {
                return el;
            }
        }
        var topic = this.el.querySelector(".Cy_TItle.clearfix");
        if (!topic) {
            return null;
        }
        var fs = topic.querySelector(".font18.fb");
        if (fs && fs.innerHTML != "0.0") {
            return el;
        }
        return null;
    };
    cxQuestion.prototype.defaultAnswer = function () {
        var ret = new question_1.PushAnswer();
        ret.topic = this.GetTopic();
        ret.type = this.GetType();
        ret.correct = new Array();
        ret.answers = new Array();
        return ret;
    };
    return cxQuestion;
}());
var cxSelectQuestion = /** @class */ (function (_super) {
    __extends(cxSelectQuestion, _super);
    function cxSelectQuestion() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    cxSelectQuestion.prototype.getContent = function (el) {
        var clean = function (s) {
            var t = (s || "").replace(/\s+/g, " ").trim();
            // 去掉内容开头重复的选项字母标记（"A." / "A、" / "A "）
            t = t.replace(/^[A-Ha-h][\s.、．:：)）]+/, "").trim();
            return t;
        };
        // 选项内容：优先用可见文字，取最后一个非字母的 <a>（第一个 <a> 通常是选项字母标记）
        var anchors = el.querySelectorAll("a");
        for (var i = anchors.length - 1; i >= 0; i--) {
            var t = (anchors[i].innerText || anchors[i].textContent || "").trim();
            if (t == "" || /^[A-Ha-h]$/.test(t)) {
                continue;
            }
            return clean(t);
        }
        var tmpel = el.querySelector("label > input,input");
        if (tmpel == null) {
            return clean(visibleText(el));
        }
        var v = String(tmpel.value || "").toLowerCase();
        if (v == "true") {
            return "对√";
        }
        if (v == "false") {
            return "错×";
        }
        return clean(visibleText(el));
    };
    cxSelectQuestion.prototype.getOption = function (el) {
        // 优先 input.value（若是字母或 "true"/"false"）
        var ipt = el.querySelector("input");
        var v = "";
        if (ipt) {
            v = String(ipt.value || "").trim();
            if (v != "") {
                return v;
            }
        }
        // 属性里找字母（aria-label / title / name / data-opt）
        if (ipt) {
            var attr = (ipt.getAttribute("aria-label") || ipt.getAttribute("title") || ipt.getAttribute("data-opt") || ipt.getAttribute("name") || "").trim();
            var m = attr.match(/[A-Ha-h]/);
            if (m) {
                return m[0].toUpperCase();
            }
        }
        // 字母标记元素（i.fl / a.fl / .fl / option-sign）
        var letterEl = el.querySelector("i.fl, a.fl, i.option-sign, b.option-sign, .fl");
        if (letterEl) {
            var t = (letterEl.innerText || letterEl.textContent || "").trim();
            var m = t.match(/[A-Ha-h]/);
            if (m) {
                return m[0].toUpperCase();
            }
        }
        // 文本开头或第一个独立字母
        var txt = (el.innerText || el.textContent || "").trim();
        var m2 = txt.match(/^([A-Ha-h])\s*[.、:：)）]?/) || txt.match(/[A-Ha-h]/);
        if (m2) {
            return m2[1].toUpperCase();
        }
        return "";
    };
    cxSelectQuestion.prototype.GetOptions = function () {
        var res = new Array();
        var opts = this.options();
        for (var i = 0; i < opts.length; i++) {
            res.push({ option: this.getOption(opts[i]), content: this.getContent(opts[i]) });
        }
        return res;
    };
    cxSelectQuestion.prototype.click = function (el, content) {
        if (!el) {
            return;
        }
        var ipt = el.querySelector("label > input,input");
        if (ipt) {
            var isCheckbox = String(ipt.type || "").toLowerCase() == "checkbox";
            try {
                ipt.click();
            }
            catch (e) {
                // 页面脚本可能抛错，忽略
            }
            // 多选（checkbox）：点一次就够，千万别再用 label/li 重复点，否则会取消勾选
            if (isCheckbox) {
                try {
                    this.AddNotice(this.getOption(el) + ":" + content);
                }
                catch (e) {
                    // ignore
                }
                return;
            }
            // 单选（radio）：点完检查，没选中就逐级补
            if (!ipt.checked) {
                try {
                    var label = el.querySelector("label");
                    if (label) {
                        label.click();
                    }
                }
                catch (e) {
                    // ignore
                }
            }
            if (!ipt.checked) {
                try {
                    el.click();
                }
                catch (e) {
                    // ignore
                }
            }
            if (!ipt.checked) {
                // 兜底：强制 checked + 派发事件，绕过页面的 click 处理
                try {
                    ipt.checked = true;
                    ipt.dispatchEvent(new Event("change", { bubbles: true }));
                    ipt.dispatchEvent(new Event("click", { bubbles: true }));
                }
                catch (e) {
                    // ignore
                }
            }
        }
        else {
            try {
                el.click();
            }
            catch (e) {
                // ignore
            }
        }
        try {
            this.AddNotice(this.getOption(el) + ":" + content);
        }
        catch (e) {
            // ignore
        }
    };
    cxSelectQuestion.prototype.Random = function () {
        var options = this.options();
        var pos = utils_1.randNumber(0, options.length - 1);
        this.click(options[pos], this.getContent(options[pos]));
        return "random";
    };
    cxSelectQuestion.prototype.Fill = function (s) {
        var _this = this;
        return new Promise(function (resolve) {
            try {
                var options = _this.options();
                if (!options || options.length == 0) {
                    try {
                        _this.AddNotice("没有找到选项");
                    }
                    catch (e) {
                        // ignore
                    }
                    return resolve("no_match");
                }
                var flag = false;
                for (var i = 0; i < s.correct.length; i++) {
                    var target = s.correct[i];
                    if (!target) {
                        continue;
                    }
                    var targetOpt = String(target.option == undefined ? "" : target.option).trim();
                    var targetContent = String(target.content == undefined ? "" : target.content).trim();
                    var hit = -1;
                    // 1) 按选项自带的 value 匹配（A/B/C/D 或 true/false）
                    for (var j = 0; j < options.length; j++) {
                        var val = String(_this.getOption(options[j]) || "").trim();
                        if (targetOpt != "" && val.toLowerCase() == targetOpt.toLowerCase()) {
                            hit = j;
                            break;
                        }
                    }
                    // 2) 按选项文字匹配
                    if (hit < 0 && targetContent != "") {
                        for (var j = 0; j < options.length; j++) {
                            if (s.Equal(_this.getContent(options[j]), targetContent)) {
                                hit = j;
                                break;
                            }
                        }
                    }
                    // 3) 兜底：字母按顺序（A->第1个，D->第4个）
                    if (hit < 0 && /^[A-Ha-h]$/.test(targetOpt)) {
                        var idx = targetOpt.toUpperCase().charCodeAt(0) - 65;
                        if (idx >= 0 && idx < options.length) {
                            hit = idx;
                        }
                    }
                    if (hit >= 0) {
                        _this.click(options[hit], targetContent);
                        flag = true;
                    }
                }
                if (!flag) {
                    // 诊断：把「要选的」和「实际看到的选项」都打出来，方便定位
                    try {
                        var seen = [];
                        for (var j = 0; j < options.length; j++) {
                            seen.push(String(_this.getOption(options[j]) || "?") + "=" + String(_this.getContent(options[j]) || "").replace(/\s+/g, " ").slice(0, 16));
                        }
                        var want = [];
                        for (var k = 0; k < s.correct.length; k++) {
                            var c = s.correct[k];
                            want.push((c ? String(c.option) + "/" + String(c.content || "") : "?"));
                        }
                        Application.App.log.Warn("选项没匹配上 | 要选:" + JSON.stringify(want) + " | 页面选项:" + JSON.stringify(seen));
                    }
                    catch (e) {
                        // ignore
                    }
                }
                return resolve(flag ? "ok" : "no_match");
            }
            catch (e) {
                return resolve("no_match");
            }
        });
    };
    cxSelectQuestion.prototype.Correct = function () {
        var correct = this.isCorrect();
        if (correct == null) {
            return null;
        }
        var ret = this.defaultAnswer();
        var options = this.el.querySelectorAll(".Zy_ulTop > li.clearfix,.Cy_ulTop li");
        var correctText = correct.querySelector("span").innerText;
        for (var i = 0; i < options.length; i++) {
            var optionText = options[i].querySelector("i.fl").innerText;
            var option = {
                option: optionText.substring(0, 1),
                content: options[i].querySelector("a.fl,a").innerHTML,
            };
            ret.answers.push(option);
            if (correctText.indexOf(option.option) > 0) {
                ret.correct.push(option);
            }
        }
        return ret;
    };
    return cxSelectQuestion;
}(cxQuestion));
var cxJudgeQuestion = /** @class */ (function (_super) {
    __extends(cxJudgeQuestion, _super);
    function cxJudgeQuestion() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    cxJudgeQuestion.prototype.getContent = function (el) {
        var txt = (visibleText(el) || "").replace(/\s+/g, " ").trim();
        var tmpel = el.querySelector("label > input,input");
        if (tmpel) {
            var v = String(tmpel.value || "").toLowerCase();
            if (v == "true") {
                return "对√";
            }
            if (v == "false") {
                return "错×";
            }
        }
        // 没拿到 true/false 就看选项文字本身
        if (/错/.test(txt)) {
            return "错×";
        }
        if (/对/.test(txt)) {
            return "对√";
        }
        return txt;
    };
    cxJudgeQuestion.prototype.click = function (el) {
        if (!el) {
            return;
        }
        try {
            var tmpel = el.querySelector("label > input,input");
            if (tmpel) {
                if (!tmpel.checked) {
                    tmpel.click();
                }
            }
            else {
                el.click();
            }
        }
        catch (e) {
            // 页面自己的脚本可能在这里抛错，忽略它，别让整题失败
        }
        try {
            this.AddNotice(this.getContent(el));
        }
        catch (e) {
            // ignore
        }
    };
    cxJudgeQuestion.prototype.Random = function () {
        var options = this.options();
        var pos = utils_1.randNumber(0, 1);
        this.click(options[pos]);
        return "random";
    };
    cxJudgeQuestion.prototype.Fill = function (answer) {
        var _this = this;
        return new Promise(function (resolve) {
            try {
                var options = _this.options();
                if (!options || options.length == 0) {
                    return resolve("no_match");
                }
                // 判断 AI（或题库）要的是「对」还是「错」
                var wantTrue = null;
                var c = answer.correct && answer.correct[0];
                if (c) {
                    if (typeof c.content == "boolean") {
                        wantTrue = c.content;
                    }
                    else if (typeof c.option == "boolean") {
                        wantTrue = c.option;
                    }
                    else {
                        var txt = String(c.content || "") + " " + String(c.option || "");
                        if (/对|正确|√|✓|TRUE/i.test(txt)) {
                            wantTrue = true;
                        }
                        else if (/错|错误|×|✗|FALSE/i.test(txt)) {
                            wantTrue = false;
                        }
                    }
                }
                var match = -1;
                for (var j = 0; j < options.length; j++) {
                    var val = String(_this.getOption(options[j]) || "").toLowerCase();
                    var content = _this.getContent(options[j]) || "";
                    var isTrue = val == "true" || val == "1" || /对|正确|√/.test(content);
                    var isFalse = val == "false" || val == "0" || /错|错误|×/.test(content);
                    if (wantTrue === true && isTrue) {
                        match = j;
                        break;
                    }
                    if (wantTrue === false && isFalse) {
                        match = j;
                        break;
                    }
                }
                if (match < 0) {
                    match = wantTrue === false ? 1 : 0;
                }
                if (match > options.length - 1) {
                    match = options.length - 1;
                }
                _this.click(options[match]);
                return resolve("ok");
            }
            catch (e) {
                return resolve("no_match");
            }
        });
    };
    cxJudgeQuestion.prototype.Correct = function () {
        var el = this.el.querySelector(".Py_answer.clearfix");
        var ret = this.defaultAnswer();
        var score = this.el.querySelector(".Cy_TItle.clearfix .font18.fb");
        if (el.innerHTML.indexOf('正确答案') !== -1 || (score && score.querySelector(".Cy_TItle.clearfix .font18.fb").innerHTML != "0.0")) {
            var correctText_1 = el.querySelector("span").innerText;
            if (correctText_1.indexOf('×') !== -1) {
                ret.correct.push({ option: false, content: false });
            }
            else {
                ret.correct.push({ option: true, content: true });
            }
            return ret;
        }
        if (!el.querySelectorAll('.fr.dui').length && !el.querySelectorAll('.fr.cuo').length) {
            return null;
        }
        var correctText = el.querySelector("span").innerText;
        if (el.querySelectorAll('.fr.dui').length) {
            if (correctText.indexOf('×') !== -1) {
                ret.correct.push({ option: false, content: false });
            }
            else {
                ret.correct.push({ option: true, content: true });
            }
        }
        else {
            if (correctText.indexOf('×') !== -1) {
                ret.correct.push({ option: true, content: true });
            }
            else {
                ret.correct.push({ option: false, content: false });
            }
        }
        return ret;
    };
    return cxJudgeQuestion;
}(cxSelectQuestion));
var cxFillQuestion = /** @class */ (function (_super) {
    __extends(cxFillQuestion, _super);
    function cxFillQuestion() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    cxFillQuestion.prototype.getOption = function (el) {
        if (el.className == "XztiHover1") {
            return utils_1.substrex(el.previousElementSibling.innerHTML, "第", "空");
        }
        var tmpel = el.querySelector("span.fb");
        return utils_1.substrex(tmpel.innerHTML, "第", "空");
    };
    cxFillQuestion.prototype.GetOptions = function () {
        var res = new Array();
        var opts = this.options();
        if (!opts || opts.length == 0) {
            var box = this.el.querySelector(".Zy_ulTk");
            if (box) {
                opts = box.querySelectorAll(".XztiHover1");
            }
        }
        if (opts) {
            for (var i = 0; i < opts.length; i++) {
                res.push({ option: this.getOption(opts[i]), content: "" });
            }
        }
        return res;
    };
    cxFillQuestion.prototype.Random = function () {
        return "no_support_random";
    };
    cxFillQuestion.prototype.Correct = function () {
        var correct = this.isCorrect();
        if (correct == null) {
            return null;
        }
        var ret = this.defaultAnswer();
        var options = this.el.querySelectorAll(".Py_tk span.font14");
        var isMy = false;
        if (options.length <= 0) {
            isMy = true;
            options = this.el.querySelectorAll(".Py_answer.clearfix .font14");
        }
        for (var i = 0; i < options.length; i++) {
            if (isMy && options[i].querySelectorAll(".fr.dui").length <= 0) {
                continue;
            }
            var optionEl = options[i].querySelector("i.fl");
            var option = {
                option: utils_1.substrex(optionEl.innerHTML, "第", "空"),
                content: options[i].querySelector(".clearfix").innerText,
            };
            ret.correct.push(option);
        }
        return ret;
    };
    cxFillQuestion.prototype.Fill = function (answer) {
        var _this = this;
        return new Promise(function (resolve) {
            var options = _this.options();
            if (!options.length) {
                options = _this.el.querySelector('.Zy_ulTk').querySelectorAll(".XztiHover1");
            }
            var flag = 0;
            for (var i = 0; i < answer.correct.length; i++) {
                for (var j = 0; j < options.length; j++) {
                    if (_this.getOption(options[j]) == answer.correct[i].option) {
                        flag++;
                        var el = options[j].querySelector("input.inp");
                        if (!el) {
                            var uedit = _this.context.$(options[j]).find('textarea');
                            if (uedit.length <= 0) {
                                _this.AddNotice(_this.getOption(options[j]) + "空发生了一个错误");
                                continue;
                            }
                            _this.context.UE.getEditor(uedit.attr('name')).setContent(answer.correct[i].content);
                            _this.AddNotice(_this.getOption(options[j]) + ":" + answer.correct[i].content);
                        }
                        else {
                            el.value = utils_1.removeHTMLTag(answer.correct[i].content);
                            _this.AddNotice(_this.getOption(options[j]) + ":" + answer.correct[i].content);
                        }
                    }
                }
            }
            if (flag == options.length) {
                return resolve("ok");
            }
            return resolve("no_match");
        });
    };
    return cxFillQuestion;
}(cxQuestion));
//TODO: 优化
var cxExamSelectQuestion = /** @class */ (function (_super) {
    __extends(cxExamSelectQuestion, _super);
    function cxExamSelectQuestion() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    cxExamSelectQuestion.prototype.options = function () {
        return this.el.querySelectorAll(".Cy_ulBottom.clearfix.w-buttom li input");
    };
    cxExamSelectQuestion.prototype.getContent = function (el) {
        var textOption = this.el.querySelectorAll(".Cy_ulTop.w-top li div.clearfix a");
        var tmpli = el.parentElement.parentElement;
        var pos = -1;
        do {
            tmpli = tmpli.previousElementSibling;
            pos++;
        } while (tmpli != null);
        return textOption[pos].innerHTML;
    };
    cxExamSelectQuestion.prototype.getOption = function (el) {
        return el.parentElement.innerText;
    };
    cxExamSelectQuestion.prototype.click = function (el, content) {
        el.click();
        this.AddNotice(this.getOption(el) + ":" + content);
    };
    return cxExamSelectQuestion;
}(cxSelectQuestion));
var cxExamFillQuestion = /** @class */ (function (_super) {
    __extends(cxExamFillQuestion, _super);
    function cxExamFillQuestion() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    cxExamFillQuestion.prototype.options = function () {
        return this.el.querySelectorAll(".Cy_ulTk .XztiHover1");
    };
    cxExamFillQuestion.prototype.getOption = function (el) {
        var tmpel = el.querySelector(".fb.font14");
        return utils_1.substrex(tmpel.innerHTML, "第", "空");
    };
    cxExamFillQuestion.prototype.Fill = function (answer) {
        var _this = this;
        return new Promise(function (resolve) {
            var options = _this.options();
            var flag = 0;
            for (var i = 0; i < answer.correct.length; i++) {
                for (var j = 0; j < options.length; j++) {
                    if (_this.getOption(options[j]) == answer.correct[i].option) {
                        flag++;
                        var uedit = window.$(options[j]).find('textarea');
                        if (uedit.length <= 0) {
                            _this.AddNotice(_this.getOption(options[j]) + "空发生了一个错误");
                            continue;
                        }
                        window.UE.getEditor(uedit.attr('name')).setContent(answer.correct[i].content);
                        _this.AddNotice(_this.getOption(options[j]) + ":" + answer.correct[i].content);
                    }
                }
            }
            if (flag == options.length) {
                return resolve("ok");
            }
            return resolve("no_match");
        });
    };
    cxExamFillQuestion.prototype.Correct = function () {
        var correct = this.isCorrect();
        if (correct == null) {
            return null;
        }
        var ret = this.defaultAnswer();
        var options = this.el.querySelectorAll(".Py_tk div[id] span.font14");
        var isMy = false;
        if (options.length <= 0) {
            isMy = true;
            options = this.el.querySelectorAll(".Py_answer.clearfix .font14");
        }
        for (var i = 0; i < options.length; i++) {
            if (isMy && options[i].querySelectorAll(".fr.dui").length <= 0) {
                continue;
            }
            var optionEl = options[i].querySelector("i");
            var option = {
                option: utils_1.substrex(optionEl.innerHTML, "第", "空"),
                content: options[i].innerHTML.substr(options[i].innerHTML.indexOf("</i>") + 4),
            };
            ret.correct.push(option);
        }
        return ret;
    };
    return cxExamFillQuestion;
}(cxFillQuestion));
var cxExamJudgeQuestion = /** @class */ (function (_super) {
    __extends(cxExamJudgeQuestion, _super);
    function cxExamJudgeQuestion() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    cxExamJudgeQuestion.prototype.options = function () {
        return this.el.querySelectorAll(".Cy_ulBottom.clearfix li");
    };
    return cxExamJudgeQuestion;
}(cxJudgeQuestion));


/***/ }),

/***/ "./src/mooc/chaoxing/read.ts":
/*!***********************************!*\
  !*** ./src/mooc/chaoxing/read.ts ***!
  \***********************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.Exam = exports.ReadStartPage = exports.Read = void 0;
var application_1 = __webpack_require__(/*! @App/internal/application */ "./src/internal/application.ts");
var utils_1 = __webpack_require__(/*! @App/internal/utils/utils */ "./src/internal/utils/utils.ts");
var question_1 = __webpack_require__(/*! @App/internal/app/question */ "./src/internal/app/question.ts");
var Read = /** @class */ (function () {
    function Read() {
    }
    Read.prototype.Init = function () {
        var timer;
        var slide = function () {
            if (window.getScrollHeight() - window.getHeight() <= window.getScrollTop() + 40) {
                var next = document.querySelectorAll('.mb15.course_section > a.wh.wh');
                var flag = false;
                for (var i = 0; i < next.length; i++) {
                    if (flag) {
                        next[i].click();
                        return;
                    }
                    if (document.URL == next[i].href) {
                        flag = true;
                    }
                }
                application_1.Application.App.log.Warn("阅读完成啦~");
                clearTimeout(timer);
                return;
            }
            window.scrollTo(0, window.getScrollTop() + utils_1.randNumber(60, 80));
            timer = setTimeout(slide, utils_1.randNumber(10, 20) * 500);
        };
        window.addEventListener("load", function () {
            slide();
        });
    };
    return Read;
}());
exports.Read = Read;
var ReadStartPage = /** @class */ (function () {
    function ReadStartPage() {
    }
    ReadStartPage.prototype.Init = function () {
        window.addEventListener("load", function () {
            if (!application_1.Application.App.config.auto) {
                return application_1.Application.App.log.Info("开启自动挂机能够自动阅读文章哦");
            }
            application_1.Application.App.log.Info("请在10秒内选择章节,否则扩展将从第一章自动开始");
            setTimeout(function () {
                var el = document.querySelector(".mb15.course_section.fix");
                el.querySelector("a").click();
            }, 10000);
        });
    };
    return ReadStartPage;
}());
exports.ReadStartPage = ReadStartPage;
var Exam = /** @class */ (function () {
    function Exam() {
    }
    Exam.prototype.Init = function () {
        var bank = new question_1.ToolsQuestionBank("cx");
        window.addEventListener("load", function () {
            var str = application_1.Application.GlobalContext.document.documentElement.innerHTML;
            var m;
            var regex = new RegExp(/goTest\(.*?,(\d+),\d+,.*?,(\d+),false,/g);
            var info = new Array();
            while ((m = regex.exec(str)) !== null) {
                var tmp = { refer: document.URL, id: "exam-" + m[2], info: m[2] };
                info.push(tmp);
            }
            regex = new RegExp(/lookUpPaper\('(\d+)','\d+','(\d+)'/g);
            while ((m = regex.exec(str)) !== null) {
                var tmp = { refer: document.URL, id: "exam-" + m[2], info: m[2] };
                info.push(tmp);
            }
            bank.CheckCourse(info);
        });
    };
    return Exam;
}());
exports.Exam = Exam;


/***/ }),

/***/ "./src/mooc/chaoxing/special.ts":
/*!**************************************!*\
  !*** ./src/mooc/chaoxing/special.ts ***!
  \**************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.CxAudioControlBar = exports.CxAudioTask = exports.CxAudioOptimization = exports.CxDocumentTask = void 0;
var task_1 = __webpack_require__(/*! @App/mooc/chaoxing/task */ "./src/mooc/chaoxing/task.ts");
var utils_1 = __webpack_require__(/*! @App/internal/utils/utils */ "./src/internal/utils/utils.ts");
var application_1 = __webpack_require__(/*! @App/internal/application */ "./src/internal/application.ts");
var video_1 = __webpack_require__(/*! @App/mooc/chaoxing/video */ "./src/mooc/chaoxing/video.ts");
var utils_2 = __webpack_require__(/*! @App/mooc/chaoxing/utils */ "./src/mooc/chaoxing/utils.ts");
var hook_1 = __webpack_require__(/*! @App/internal/utils/hook */ "./src/internal/utils/hook.ts");
var CxDocumentTask = /** @class */ (function (_super) {
    __extends(CxDocumentTask, _super);
    function CxDocumentTask() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    CxDocumentTask.prototype.Start = function () {
        var _this = this;
        return new Promise(function (resolve) {
            var next = function () {
                var el = _this.context.document.querySelector(".imglook > .mkeRbtn");
                if (el.style.visibility == "hidden") {
                    _this.callEvent("complete");
                    return;
                }
                el.click();
                _this.time = _this.context.setTimeout(next, utils_1.randNumber(1, 5) * 1000);
                resolve();
            };
            _this.time = _this.context.setTimeout(next, utils_1.randNumber(1, 5) * 1000);
        });
    };
    CxDocumentTask.prototype.Type = function () {
        return "document";
    };
    return CxDocumentTask;
}(task_1.CxTask));
exports.CxDocumentTask = CxDocumentTask;
var CxAudioOptimization = /** @class */ (function (_super) {
    __extends(CxAudioOptimization, _super);
    function CxAudioOptimization() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    CxAudioOptimization.prototype.Init = function () {
        var _this = this;
        //对播放器进行优化
        window.addEventListener("load", function () {
            application_1.Application.App.config.super_mode && utils_1.isPhone() && (application_1.Application.GlobalContext.Ext.isChaoxing = true);
        });
        this.hook();
        document.addEventListener("readystatechange", function () {
            _this.hook();
        });
        this.Api();
    };
    CxAudioOptimization.prototype.hook = function () {
        if (document.readyState != "interactive") {
            return;
        }
        application_1.Application.App.log.Debug("hook cx audio");
        var self = this;
        var paramHook = new hook_1.Hook("params2VideoOpt", application_1.Application.GlobalContext.ans.AudioJs.prototype);
        paramHook.Middleware(function (next) {
            var args = [];
            for (var _i = 1; _i < arguments.length; _i++) {
                args[_i - 1] = arguments[_i];
            }
            self.param = args[0];
            return next.apply(this, args);
        });
        application_1.Application.GlobalContext.Ext.isSogou = false;
    };
    return CxAudioOptimization;
}(video_1.CxVideoOptimization));
exports.CxAudioOptimization = CxAudioOptimization;
var CxAudioTask = /** @class */ (function (_super) {
    __extends(CxAudioTask, _super);
    function CxAudioTask() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    CxAudioTask.prototype.queryVideo = function () {
        return this.context.document.getElementById("audio_html5_api");
    };
    return CxAudioTask;
}(video_1.Video));
exports.CxAudioTask = CxAudioTask;
var CxAudioControlBar = /** @class */ (function (_super) {
    __extends(CxAudioControlBar, _super);
    function CxAudioControlBar() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    CxAudioControlBar.prototype.defaultBtn = function () {
        var _this = this;
        _super.prototype.defaultBtn.call(this);
        var pass = utils_2.CssBtn(utils_1.createBtn("秒过嘤频", "秒过会被后台检测到", "cx-btn"));
        pass.style.background = "#F57C00";
        pass.onclick = function () {
            if (!utils_1.protocolPrompt("秒过会产生不良记录,是否继续?", "boom_audio_no_prompt")) {
                return;
            }
            _this.task.sendEndTimePack(function (isPassed) {
                if (isPassed) {
                    alert('秒过成功,刷新后查看效果');
                }
                else {
                    alert('操作失败,错误');
                }
            });
        };
        this.prev.append(pass, this.download());
    };
    return CxAudioControlBar;
}(task_1.CxTaskControlBar));
exports.CxAudioControlBar = CxAudioControlBar;


/***/ }),

/***/ "./src/mooc/chaoxing/task.ts":
/*!***********************************!*\
  !*** ./src/mooc/chaoxing/task.ts ***!
  \***********************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __spreadArrays = (this && this.__spreadArrays) || function () {
    for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
    for (var r = Array(s), k = 0, i = 0; i < il; i++)
        for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
            r[k] = a[j];
    return r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CxTaskControlBar = exports.CxTask = void 0;
var utils_1 = __webpack_require__(/*! @App/mooc/chaoxing/utils */ "./src/mooc/chaoxing/utils.ts");
var utils_2 = __webpack_require__(/*! @App/internal/utils/utils */ "./src/internal/utils/utils.ts");
var application_1 = __webpack_require__(/*! @App/internal/application */ "./src/internal/application.ts");
var task_1 = __webpack_require__(/*! @App/internal/app/task */ "./src/internal/app/task.ts");
var CxTask = /** @class */ (function (_super) {
    __extends(CxTask, _super);
    function CxTask(context, taskinfo) {
        var _this = _super.call(this) || this;
        _this.taskinfo = taskinfo;
        _this.context = context;
        if (_this.taskinfo.job) {
            _this.done = false;
        }
        else {
            _this.done = true;
        }
        return _this;
    }
    CxTask.prototype.callEvent = function (event) {
        var args = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            args[_i - 1] = arguments[_i];
        }
        if (event == "complete") {
            this.done = true;
        }
        _super.prototype.callEvent.apply(this, __spreadArrays([event], args));
    };
    CxTask.prototype.Init = function () {
        return new Promise(function (resolve) {
            resolve();
        });
    };
    CxTask.prototype.Submit = function () {
        return new Promise(function (resolve) {
            resolve();
        });
    };
    //TODO:停止
    CxTask.prototype.Stop = function () {
        return new Promise(function (resolve) {
            resolve();
        });
    };
    CxTask.prototype.Done = function () {
        return this.done;
    };
    return CxTask;
}(task_1.Task));
exports.CxTask = CxTask;
var CxTaskControlBar = /** @class */ (function () {
    function CxTaskControlBar(prev, task) {
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
    CxTaskControlBar.taskKey = function (task) {
        var info = task && task.taskinfo;
        var prop = info && info.property;
        var id = prop ? String(prop.objectid || prop.jobid || prop.mid || "") : "";
        // 没有稳定 id 时给个唯一后缀，避免多个按钮共用一个空 key 导致互相误删
        return id || ("_auto_" + (++CxTaskControlBar.keySeq));
    };
    CxTaskControlBar.prototype.moveToNoticePanel = function (tryCount) {
        var _this = this;
        // 面板开着就挂面板，关掉了就挂它的悬浮替身
        var bar = document.getElementById("tools-btn-bar") ||
            document.getElementById("tools-btn-float");
        if (bar) {
            // 同一任务点的旧按钮组（可能还留在页面别处）也一起清掉，避免页面上浮出一排
            var key = this.prev.getAttribute("data-cx-key");
            var olds = document.querySelectorAll("[data-cx-key='" + key + "']");
            for (var i = 0; i < olds.length; i++) {
                if (olds[i] != this.prev) {
                    olds[i].remove();
                }
            }
            if (this.prev.parentElement != bar) {
                bar.appendChild(this.prev);
            }
            return;
        }
        if (tryCount < 20) {
            setTimeout(function () {
                _this.moveToNoticePanel(tryCount + 1);
            }, 500);
        }
        else {
            // 一直找不到面板（比如在 iframe 里）：藏起来，别浮在页面中间
            this.prev.style.display = "none";
        }
    };
    CxTaskControlBar.prototype.defaultBtn = function () {
        var _this = this;
        var startBtn = utils_1.CssBtn(utils_2.createBtn(application_1.Application.App.config.auto ? "暂停挂机" : "开始挂机", "点击开始自动挂机", "cx-btn"));
        startBtn.onclick = function () {
            if (startBtn.innerText == '暂停挂机') {
                application_1.Application.App.config.auto = false;
                startBtn.innerText = "开始挂机";
                startBtn.title = "点击开始自动挂机";
                application_1.Application.App.log.Info("挂机停止了");
            }
            else {
                application_1.Application.App.config.auto = true;
                startBtn.innerText = '暂停挂机';
                startBtn.title = "停止挂机,开始好好学习";
                application_1.Application.App.log.Info("挂机开始了");
                _this.task.Start();
            }
        };
        this.prev.append(startBtn);
    };
    CxTaskControlBar.prototype.append = function (el) {
        this.prev.append(el);
    };
    CxTaskControlBar.prototype.download = function () {
        var _this = this;
        if (!this.task.taskinfo.property.objectid) {
            return;
        }
        var download = utils_1.CssBtn(utils_2.createBtn("下载资源", "我要下载下来好好学习", "cx-btn"));
        download.style.background = "#999999";
        download.onclick = function () {
            utils_2.get("https://mooc1-1.chaoxing.com/ananas/status/" + _this.task.taskinfo.property.objectid, function (data) {
                var json = JSON.parse(data);
                prompt("如果打开下载失败，请复制下面链接手动下载", json.download);
                window.open(json.download);
            }).error(function () {
                alert("资源信息获取失败");
            });
        };
        return download;
    };
    // 任务点唯一标识，用于识别"同一个任务点被创建了两次"
    CxTaskControlBar.keySeq = 0;
    return CxTaskControlBar;
}());
exports.CxTaskControlBar = CxTaskControlBar;


/***/ }),

/***/ "./src/mooc/chaoxing/topic.ts":
/*!************************************!*\
  !*** ./src/mooc/chaoxing/topic.ts ***!
  \************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HomeworkTopic = exports.ExamTopic = exports.CxCourseTopic = exports.CxCourseQueryQuestion = exports.TopicAdapter = exports.CxTopicControlBar = void 0;
var utils_1 = __webpack_require__(/*! ./utils */ "./src/mooc/chaoxing/utils.ts");
var utils_2 = __webpack_require__(/*! @App/internal/utils/utils */ "./src/internal/utils/utils.ts");
var application_1 = __webpack_require__(/*! @App/internal/application */ "./src/internal/application.ts");
var question_1 = __webpack_require__(/*! @App/internal/app/question */ "./src/internal/app/question.ts");
var question_2 = __webpack_require__(/*! ./question */ "./src/mooc/chaoxing/question.ts");
var topic_1 = __webpack_require__(/*! @App/internal/app/topic */ "./src/internal/app/topic.ts");
var task_1 = __webpack_require__(/*! @App/mooc/chaoxing/task */ "./src/mooc/chaoxing/task.ts");
var ai_1 = __webpack_require__(/*! @App/internal/app/ai */ "./src/internal/app/ai.ts");
var font_decode_1 = __webpack_require__(/*! ./font-decode */ "./src/mooc/chaoxing/font-decode.ts");
var CxTopicControlBar = /** @class */ (function (_super) {
    __extends(CxTopicControlBar, _super);
    function CxTopicControlBar() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    CxTopicControlBar.prototype.defaultBtn = function () {
        var _this = this;
        _super.prototype.defaultBtn.call(this);
        var isAI = ai_1.AIEnabled();
        // 用 AI 答题时不显示「搜索题目」（那是走原题库的入口）
        if (!isAI) {
            var topic_2 = utils_1.CssBtn(utils_2.createBtn("搜索题目", "点击搜索题目答案", "cx-btn"));
            topic_2.style.background = "#3fae93";
            this.prev.append(topic_2);
            // 绑定事件
            topic_2.onclick = function () { return __awaiter(_this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    topic_2.innerText = "答案搜索中...";
                    this.task.Start().then(function (ret) {
                        ret = ret || "搜索题目";
                        topic_2.innerText = question_1.QuestionStatusString(ret);
                    });
                    return [2 /*return*/];
                });
            }); };
        }
        // 提交按钮：答案填完后手动点它，或等自动挂机间隔到点自动提交
        var submit = utils_1.CssBtn(utils_2.createBtn("提交答案", "题目填完后点此提交", "cx-btn"));
        submit.style.background = "#e6a23c";
        this.prev.append(submit);
        submit.onclick = function () { return __awaiter(_this, void 0, void 0, function () {
            var e_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (submit.innerText == "提交中...") {
                            return [2 /*return*/];
                        }
                        submit.innerText = "提交中...";
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, this.task.ManualSubmit()];
                    case 2:
                        _a.sent();
                        submit.innerText = "已提交";
                        return [3 /*break*/, 4];
                    case 3:
                        e_1 = _a.sent();
                        submit.innerText = "提交失败 重试";
                        application_1.Application.App.log.Warn("手动提交失败：" + ((e_1 && e_1.message) ? e_1.message : e_1));
                        return [3 /*break*/, 4];
                    case 4: return [2 /*return*/];
                }
            });
        }); };
    };
    return CxTopicControlBar;
}(task_1.CxTaskControlBar));
exports.CxTopicControlBar = CxTopicControlBar;
var TopicAdapter = /** @class */ (function (_super) {
    __extends(TopicAdapter, _super);
    function TopicAdapter(context, taskinfo, topic) {
        var _this = _super.call(this, context, taskinfo) || this;
        _this.topic = topic;
        return _this;
    }
    TopicAdapter.prototype.Init = function () {
        var _this = this;
        return new Promise(function (resolve) { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        application_1.Application.App.log.Debug("题目信息", this.taskinfo);
                        return [4 /*yield*/, this.topic.Init()];
                    case 1:
                        _a.sent();
                        resolve(undefined);
                        return [2 /*return*/];
                }
            });
        }); });
    };
    TopicAdapter.prototype.Start = function () {
        var _this = this;
        return new Promise(function (resolve) { return __awaiter(_this, void 0, void 0, function () {
            var ret;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (this.lock) {
                            return [2 /*return*/, resolve("processing")];
                        }
                        this.lock = true;
                        return [4 /*yield*/, this.topic.QueryAnswer()];
                    case 1:
                        ret = _a.sent();
                        this.status = ret;
                        this.callEvent("complete");
                        this.lock = false;
                        return [2 /*return*/, resolve(ret)];
                }
            });
        }); });
    };
    TopicAdapter.prototype.Type = function () {
        return "topic";
    };
    TopicAdapter.prototype.Submit = function () {
        return __awaiter(this, void 0, Promise, function () {
            var _this = this;
            return __generator(this, function (_a) {
                return [2 /*return*/, new Promise(function (resolve) {
                        if (_this.status == "success") {
                            _this.topic.Submit().then(function () {
                                resolve();
                            }).catch(function () { return resolve(); });
                        }
                        else {
                            resolve();
                        }
                    })];
            });
        });
    };
    // 手动点「提交答案」按钮时走这里：不管状态直接提交
    TopicAdapter.prototype.ManualSubmit = function () {
        return Promise.resolve(this.topic.Submit());
    };
    return TopicAdapter;
}(task_1.CxTask));
exports.TopicAdapter = TopicAdapter;
var CxCourseQueryQuestion = /** @class */ (function () {
    function CxCourseQueryQuestion(content, createQuestion) {
        this.context = content;
        this.createQuestion = createQuestion;
    }
    CxCourseQueryQuestion.prototype.QueryQuestions = function () {
        var _this = this;
        var timu = this.context.document.querySelectorAll(".TiMu");
        var ret = new Array();
        timu.forEach(function (val) {
            var question = _this.createQuestion(_this.context, val);
            if (question == null) {
                return;
            }
            ret.push(question);
        });
        return ret;
    };
    return CxCourseQueryQuestion;
}());
exports.CxCourseQueryQuestion = CxCourseQueryQuestion;
var CxCourseTopic = /** @class */ (function (_super) {
    __extends(CxCourseTopic, _super);
    function CxCourseTopic(content, answer) {
        var _this = _super.call(this, content, answer) || this;
        answer.CheckCourse();
        return _this;
    }
    CxCourseTopic.prototype.Init = function () {
        var _this = this;
        return new Promise(function (resolve) {
            var timer = _this.context.setInterval(function () { return __awaiter(_this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            if (!(this.context.document.readyState == "complete")) return [3 /*break*/, 3];
                            this.context.clearInterval(timer);
                            if (!(this.context.document.URL.indexOf("selectWorkQuestionYiPiYue") > 0)) return [3 /*break*/, 2];
                            return [4 /*yield*/, this.CollectAnswer()];
                        case 1:
                            _a.sent();
                            _a.label = 2;
                        case 2:
                            resolve(undefined);
                            _a.label = 3;
                        case 3: return [2 /*return*/];
                    }
                });
            }); }, 500);
        });
    };
    CxCourseTopic.prototype.QueryAnswer = function () {
        return __awaiter(this, void 0, Promise, function () {
            var e_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (this.context.document.URL.indexOf("selectWorkQuestionYiPiYue") > 0) {
                            return [2 /*return*/, null];
                        }
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, font_decode_1.DecodeChaoxingFont(this.context)];
                    case 2:
                        _a.sent();
                        return [3 /*break*/, 4];
                    case 3:
                        e_2 = _a.sent();
                        return [3 /*break*/, 4];
                    case 4: return [2 /*return*/, _super.prototype.QueryAnswer.call(this)];
                }
            });
        });
    };
    // 元素是否真的看得见（iframe 内也能判断）
    CxCourseTopic.prototype.isVisible = function (el) {
        try {
            if (!el) {
                return false;
            }
            var r = el.getBoundingClientRect();
            if (r.width > 0 && r.height > 0) {
                return true;
            }
            return el.offsetParent != null;
        }
        catch (e) {
            return false;
        }
    };
    // 找页面上的「提交」按钮：先按可见文字精确匹配，再退回旧选择器
    CxCourseTopic.prototype.findSubmitBtn = function (doc) {
        var want = /^(提交|交卷|提交答案|立即提交|提交作业|交卷并查看结果)$/;
        var fallback = null;
        try {
            var nodes = doc.querySelectorAll("button,a,span,div,input[type=submit]");
            for (var i = 0; i < nodes.length; i++) {
                var el = nodes[i];
                var t = (el.innerText || el.value || el.textContent || "").trim();
                if (!t || !want.test(t)) {
                    continue;
                }
                if (!this.isVisible(el)) {
                    continue;
                }
                var tag = (el.tagName || "").toUpperCase();
                if (tag == "BUTTON" || el.type == "submit") {
                    return el;
                }
                if (!fallback) {
                    fallback = el;
                }
            }
        }
        catch (e) {
            // ignore
        }
        if (fallback) {
            return fallback;
        }
        // 旧版选择器兜底：排除「知道了/取消/关闭」这类别的按钮
        var sels = [".Btn_blue_1", ".bluebtn", "#submitBtn", ".btnBlue", ".greenBtn"];
        for (var i = 0; i < sels.length; i++) {
            try {
                var el = doc.querySelector(sels[i]);
                if (el && this.isVisible(el)) {
                    var t = (el.innerText || "").trim();
                    if (!/^(知道了|取消|关闭|返回|×)$/.test(t)) {
                        return el;
                    }
                }
            }
            catch (e) {
                // ignore
            }
        }
        return null;
    };
    // 收集所有能访问的同源 document（当前 iframe → 父帧 → 顶层）
    // 超星的「确认提交？」弹窗有时不在题目 iframe 里，而是挂在父帧/顶层文档上
    CxCourseTopic.prototype.collectDocs = function () {
        var docs = [];
        var win = this.context;
        for (var i = 0; i < 5 && win; i++) {
            try {
                if (win.document && docs.indexOf(win.document) < 0) {
                    docs.push(win.document);
                }
            }
            catch (e) {
                // ignore
            }
            var p = null;
            try {
                p = win.parent;
            }
            catch (e) {
                p = null;
            }
            if (!p || p == win) {
                break;
            }
            win = p;
        }
        try {
            if (docs.indexOf(document) < 0) {
                docs.push(document);
            }
        }
        catch (e) {
            // ignore
        }
        return docs;
    };
    // 在单个 document 里找「确认提交？」弹窗，并返回弹窗里的确认按钮
    CxCourseTopic.prototype.findConfirmInDoc = function (doc) {
        if (!doc) {
            return null;
        }
        var wantBtn = /^(提交|确定|确认|确认提交|是)$/;
        // 1) 找出「可见 + 含确认字样 + 内含候选按钮」的弹窗容器，取最内层那个
        var dialog = null;
        try {
            var nodes = doc.querySelectorAll("div,section,form");
            for (var i = 0; i < nodes.length; i++) {
                var el = nodes[i];
                if (!this.isVisible(el)) {
                    continue;
                }
                var t = (el.innerText || "");
                if (t.indexOf("确认提交") < 0 && t.indexOf("确认") < 0) {
                    continue;
                }
                var hasBtn = false;
                var inner = el.querySelectorAll("button,a,span,div");
                for (var j = 0; j < inner.length; j++) {
                    var b = inner[j];
                    var bt = (b.innerText || b.textContent || "").trim();
                    if (wantBtn.test(bt) && bt.indexOf("取消") < 0 && this.isVisible(b)) {
                        hasBtn = true;
                        break;
                    }
                }
                if (!hasBtn) {
                    continue;
                }
                if (!dialog || el.getElementsByTagName("*").length < dialog.getElementsByTagName("*").length) {
                    dialog = el;
                }
            }
        }
        catch (e) {
            // ignore
        }
        if (!dialog) {
            return null;
        }
        // 2) 在弹窗内找按钮（优先 button 元素）
        var fallback = null;
        try {
            var nodes = dialog.querySelectorAll("button,a,span,div");
            for (var i = 0; i < nodes.length; i++) {
                var el = nodes[i];
                var t = (el.innerText || el.textContent || "").trim();
                if (!wantBtn.test(t) || t.indexOf("取消") >= 0) {
                    continue;
                }
                if (!this.isVisible(el)) {
                    continue;
                }
                if ((el.tagName || "").toUpperCase() == "BUTTON") {
                    return el;
                }
                fallback = el;
            }
        }
        catch (e) {
            // ignore
        }
        return fallback;
    };
    // 跨 document 找确认按钮
    CxCourseTopic.prototype.findConfirmBtn = function (doc) {
        var docs = this.collectDocs();
        if (doc && docs.indexOf(doc) < 0) {
            docs.unshift(doc);
        }
        for (var i = 0; i < docs.length; i++) {
            try {
                var el = this.findConfirmInDoc(docs[i]);
                if (el) {
                    application_1.Application.App.log.Info("确认弹窗在 frame #" + i + " 里");
                    return el;
                }
            }
            catch (e) {
                // ignore
            }
        }
        return null;
    };
    CxCourseTopic.prototype.Submit = function () {
        var _this = this;
        return new Promise(function (resolve) {
            application_1.Application.App.log.Info("准备提交答案");
            var self = _this;
            var doc = _this.context.document;
            _this.context.setTimeout(function () {
                try {
                    var submit = self.findSubmitBtn(doc);
                    if (!submit) {
                        application_1.Application.App.log.Warn("没找到提交按钮，请手动点页面下方的「提交」");
                        return resolve("no_submit_btn");
                    }
                    application_1.Application.App.log.Info("点击提交按钮：" + String(submit.innerText || submit.tagName || ""));
                    try {
                        submit.click();
                    }
                    catch (e) {
                        // ignore
                    }
                    // 等确认弹窗，最多轮询 10 次（每次 800ms，约 8 秒）
                    var tries_1 = 0;
                    var clickConfirm_1 = function () {
                        tries_1++;
                        var confirm = self.findConfirmBtn(doc);
                        if (confirm) {
                            application_1.Application.App.log.Info("点击确认按钮：" + String(confirm.innerText || ""));
                            try {
                                confirm.click();
                            }
                            catch (e) {
                                // ignore
                            }
                            // 再等一下，看有没有二次确认
                            self.context.setTimeout(function () {
                                var again = self.findConfirmBtn(doc);
                                if (again && again != confirm) {
                                    try {
                                        again.click();
                                    }
                                    catch (e) {
                                        // ignore
                                    }
                                    application_1.Application.App.log.Info("点击二次确认：" + String(again.innerText || ""));
                                }
                                resolve(undefined);
                            }, 1500);
                            return;
                        }
                        if (tries_1 < 10) {
                            self.context.setTimeout(clickConfirm_1, 800);
                            return;
                        }
                        application_1.Application.App.log.Warn("等了约 8 秒没找到确认弹窗，可能已直接提交完成；若没提交请手动点一下");
                        resolve(undefined);
                    };
                    self.context.setTimeout(clickConfirm_1, 800);
                }
                catch (e) {
                    application_1.Application.App.log.Warn("提交失败：" + ((e && e.message) ? e.message : e));
                    resolve(undefined);
                }
            }, 2000);
        });
    };
    return CxCourseTopic;
}(topic_1.Topic));
exports.CxCourseTopic = CxCourseTopic;
var ExamTopic = /** @class */ (function (_super) {
    __extends(ExamTopic, _super);
    function ExamTopic() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    ExamTopic.prototype.QueryQuestions = function () {
        var current = document.querySelector(".current");
        var titleEl = (current && current.parentElement && current.parentElement.previousElementSibling);
        var topicType = titleEl ? question_1.SwitchTopicType(titleEl.innerText) : null;
        var tEl = document.querySelector(".leftContent.TiMu");
        if (topicType == null && tEl) {
            topicType = question_1.GuessTopicType(tEl);
        }
        var question = question_2.CxQuestionFactory.CreateExamQuestion(window, topicType, tEl);
        var ret = new Array();
        if (question == null) {
            return ret;
        }
        ret.push(question);
        return ret;
    };
    ExamTopic.prototype.Init = function () {
        if (document.URL.indexOf("exam/test/reVersionPaperMarkContentNew") > 0) {
            this.CollectAnswer();
        }
        return null;
    };
    ExamTopic.prototype.Submit = function () {
        return new Promise(function (resolve) {
            resolve(undefined);
        });
    };
    return ExamTopic;
}(topic_1.Topic));
exports.ExamTopic = ExamTopic;
var HomeworkTopic = /** @class */ (function (_super) {
    __extends(HomeworkTopic, _super);
    function HomeworkTopic(content, answer) {
        return _super.call(this, content, answer) || this;
    }
    HomeworkTopic.prototype.Init = function () {
        var _this = this;
        return new Promise(function (resolve) {
            if (!document.querySelector("input#workRelationId")) {
                _this.CollectAnswer();
            }
            resolve();
        });
    };
    HomeworkTopic.prototype.Submit = function () {
        return new Promise(function (resolve) {
            resolve();
        });
    };
    return HomeworkTopic;
}(CxCourseTopic));
exports.HomeworkTopic = HomeworkTopic;


/***/ }),

/***/ "./src/mooc/chaoxing/utils.ts":
/*!************************************!*\
  !*** ./src/mooc/chaoxing/utils.ts ***!
  \************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateNoteLine = exports.CssBtn = void 0;
/**
 * 美化按钮
 */
function CssBtn(btn) {
    btn.style.outline = 'none';
    btn.style.border = '0';
    btn.style.background = '#7d9d35';
    btn.style.color = '#fff';
    btn.style.borderRadius = '4px';
    btn.style.padding = '2px 8px';
    btn.style.cursor = 'pointer';
    btn.style.fontSize = '12px';
    btn.style.marginLeft = '4px';
    btn.onmousemove = function () {
        btn.style.boxShadow = '1px 1px 1px 1px #ccc';
    };
    btn.onmouseout = function () {
        btn.style.boxShadow = '';
    };
    return btn;
}
exports.CssBtn = CssBtn;
function CreateNoteLine(text, label, append, after) {
    var p = document.createElement("p");
    p.style.color = "red";
    p.style.fontSize = "14px";
    p.className = "prompt-line-" + label;
    p.innerHTML = text;
    if (append != undefined) {
        append.append(p);
    }
    if (after != undefined) {
        after.after(p);
    }
    return p;
}
exports.CreateNoteLine = CreateNoteLine;


/***/ }),

/***/ "./src/mooc/chaoxing/vcode.ts":
/*!************************************!*\
  !*** ./src/mooc/chaoxing/vcode.ts ***!
  \************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.CxCourseVCode = void 0;
var utils_1 = __webpack_require__(/*! ./utils */ "./src/mooc/chaoxing/utils.ts");
var CxCourseVCode = /** @class */ (function () {
    function CxCourseVCode() {
    }
    CxCourseVCode.prototype.Listen = function (callback) {
        var imgel;
        window.addEventListener("load", function () {
            if (imgel = document.getElementById("imgVerCode")) {
                imgel.addEventListener("load", function () {
                    if (imgel.getAttribute("src").indexOf('?') < 0) {
                        return;
                    }
                    var parent = document.querySelector('#sub').parentElement.parentElement;
                    var old = parent.querySelector(".prompt-line-dama");
                    if (old) {
                        old.remove();
                    }
                    var notice = utils_1.CreateNoteLine('cxmooc自动打码中...', 'dama', parent);
                    callback(new CxCourseFillVCode(imgel, notice));
                });
            }
        });
    };
    return CxCourseVCode;
}());
exports.CxCourseVCode = CxCourseVCode;
var CxCourseFillVCode = /** @class */ (function () {
    function CxCourseFillVCode(img, notice) {
        this.img = img;
        this.notice = notice;
    }
    CxCourseFillVCode.prototype.GetImage = function () {
        return this.img;
    };
    CxCourseFillVCode.prototype.Fill = function (status, msg, code) {
        switch (status) {
            case "ok": {
                this.notice.innerText = "cxmooc打码成功,准备提交";
                document.querySelector('input#code').value = code;
                setTimeout(function () {
                    document.querySelector('a#sub').click();
                }, 3000);
                break;
            }
            default: {
                alert(msg);
                this.notice.innerText = msg;
            }
        }
    };
    return CxCourseFillVCode;
}());


/***/ }),

/***/ "./src/mooc/chaoxing/video.ts":
/*!************************************!*\
  !*** ./src/mooc/chaoxing/video.ts ***!
  \************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.Video = exports.CxVideoControlBar = exports.CxVideoOptimization = void 0;
var hook_1 = __webpack_require__(/*! @App/internal/utils/hook */ "./src/internal/utils/hook.ts");
var application_1 = __webpack_require__(/*! @App/internal/application */ "./src/internal/application.ts");
var utils_1 = __webpack_require__(/*! @App/internal/utils/utils */ "./src/internal/utils/utils.ts");
var utils_2 = __webpack_require__(/*! ./utils */ "./src/mooc/chaoxing/utils.ts");
var task_1 = __webpack_require__(/*! @App/mooc/chaoxing/task */ "./src/mooc/chaoxing/task.ts");
// 优化播放器
var CxVideoOptimization = /** @class */ (function () {
    function CxVideoOptimization() {
    }
    CxVideoOptimization.prototype.Init = function () {
        var _this = this;
        //对播放器进行优化
        window.addEventListener("load", function () {
            application_1.Application.App.config.super_mode && utils_1.isPhone() && (application_1.Application.GlobalContext.Ext.isChaoxing = true);
        });
        this.hook();
        document.addEventListener("readystatechange", function () {
            _this.hook();
        });
        this.Api();
    };
    CxVideoOptimization.prototype.hook = function () {
        if (document.readyState != "interactive") {
            return;
        }
        application_1.Application.App.log.Debug("hook cx video");
        var dataHook = new hook_1.Hook("decode", application_1.Application.GlobalContext.Ext);
        var self = this;
        dataHook.Middleware(function (next) {
            var args = [];
            for (var _i = 1; _i < arguments.length; _i++) {
                args[_i - 1] = arguments[_i];
            }
            var ret = next.apply(this, args);
            if (application_1.Application.App.config.super_mode && ret.danmaku == 1) {
                ret.danmaku = 0;
            }
            return ret;
        });
        window.frameElement.setAttribute("fastforward", "");
        window.frameElement.setAttribute("switchwindow", "");
        var paramHook = new hook_1.Hook("params2VideoOpt", application_1.Application.GlobalContext.ans.VideoJs.prototype);
        paramHook.Middleware(function (next) {
            var args = [];
            for (var _i = 1; _i < arguments.length; _i++) {
                args[_i - 1] = arguments[_i];
            }
            self.param = args[0];
            var ret = next.apply(this, args);
            ret.plugins.timelineObjects.url = self.param.rootPath + "/richvideo/initdatawithviewer";
            var cdn = application_1.Application.App.config.video_cdn || localStorage["cdn"] || "公网1";
            for (var i = 0; i < ret.playlines.length; i++) {
                if (ret.playlines[i].label == cdn) {
                    var copy = ret.playlines[i];
                    ret.playlines.splice(i, 1);
                    ret.playlines.splice(0, 0, copy);
                }
            }
            localStorage["cdn"] = ret.playlines[0].label;
            delete ret.plugins.studyControl;
            return ret;
        });
        application_1.Application.GlobalContext.Ext.isSogou = false;
        var errorHook = new hook_1.Hook("afterRender", application_1.Application.GlobalContext.ans.videojs.ErrorDisplay.prototype);
        errorHook.Middleware(function (next) {
            var _this = this;
            var args = [];
            for (var _i = 1; _i < arguments.length; _i++) {
                args[_i - 1] = arguments[_i];
            }
            var ret = next.apply(this, args);
            setTimeout(function () {
                var nowCdn = _this.renderData.selectedIndex;
                var playlines = _this.renderData.playlines;
                var cdn = application_1.Application.App.config.video_cdn || localStorage["cdn"] || "公网1";
                for (var i = 0; i < playlines.length; i++) {
                    if (i != nowCdn) {
                        if (cdn == "") {
                            localStorage["cdn"] = playlines[i].label;
                            return _this.onSelected(i);
                        }
                        else if (cdn == playlines[i].label) {
                            localStorage["cdn"] = playlines[i].label;
                            return _this.onSelected(i);
                        }
                    }
                }
                var index = (nowCdn + 1) % playlines.length;
                localStorage["cdn"] = playlines[index].label;
                return _this.onSelected(index);
            }, 2000);
            return ret;
        });
    };
    /**
     * 操作方法
     */
    CxVideoOptimization.prototype.Api = function () {
        var _this = this;
        application_1.Application.GlobalContext.sendTimePack = function (time, callback) {
            if (time == NaN || time == undefined) {
                time = parseInt(_this.param.duration);
            }
            var playTime = Math.round(time || (_this.param.duration - utils_1.randNumber(1, 2)));
            var enc = '[' + _this.param.clazzId + '][' + _this.param.userid + '][' +
                _this.param.jobid + '][' + _this.param.objectId + '][' +
                (playTime * 1000).toString() + '][d_yHJ!$pdA~5][' + (_this.param.duration * 1000).toString() + '][0_' +
                _this.param.duration + ']';
            enc = application_1.Application.GlobalContext.md5(enc);
            utils_1.get(_this.param.reportUrl + '/' + _this.param.dtoken + '?clipTime=0_' + _this.param.duration +
                '&otherInfo=' + _this.param.otherInfo +
                '&userid=' + _this.param.userid + '&rt=0.9&jobid=' + _this.param.jobid +
                '&duration=' + _this.param.duration + '&dtype=Video&objectId=' + _this.param.objectId +
                '&clazzId=' + _this.param.clazzId +
                '&view=pc&playingTime=' + playTime + '&isdrag=4&enc=' + enc, function (data) {
                var isPassed = JSON.parse(data);
                callback(isPassed.isPassed);
            });
        };
    };
    return CxVideoOptimization;
}());
exports.CxVideoOptimization = CxVideoOptimization;
var CxVideoControlBar = /** @class */ (function (_super) {
    __extends(CxVideoControlBar, _super);
    function CxVideoControlBar() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    CxVideoControlBar.prototype.defaultBtn = function () {
        var _this = this;
        _super.prototype.defaultBtn.call(this);
        var pass = utils_2.CssBtn(utils_1.createBtn("秒过视频", "秒过视频会被后台检测到", "cx-btn"));
        var downloadSubtitle = utils_2.CssBtn(utils_1.createBtn("下载字幕", "我要下载字幕一同食用"));
        pass.style.background = "#F57C00";
        downloadSubtitle.style.background = "#638EE1";
        this.prev.append(pass, this.download(), downloadSubtitle);
        pass.onclick = function () {
            if (!utils_1.protocolPrompt("秒过视频会产生不良记录,是否继续?", "boom_no_prompt")) {
                return;
            }
            _this.task.sendEndTimePack(function (isPassed) {
                if (isPassed) {
                    alert('秒过成功,刷新后查看效果');
                }
                else {
                    alert('操作失败,错误');
                }
            });
        };
        downloadSubtitle.onclick = function () {
            _this.task.downloadSubtitle();
        };
    };
    return CxVideoControlBar;
}(task_1.CxTaskControlBar));
exports.CxVideoControlBar = CxVideoControlBar;
var Video = /** @class */ (function (_super) {
    __extends(Video, _super);
    function Video() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    Video.prototype.queryVideo = function () {
        return this.context.document.getElementById("video_html5_api");
    };
    Video.prototype.Init = function () {
        var _this = this;
        return new Promise(function (resolve) {
            application_1.Application.App.log.Debug("播放器配置", _this.taskinfo);
            var timer = _this.context.setInterval(function () {
                try {
                    var video = _this.queryVideo();
                    if (video == undefined) {
                        if (_this.context.document.querySelector("#reader").innerHTML.indexOf("您没有安装flashplayer") >= 0) {
                            _this.context.clearInterval(timer);
                            _this.flash = true;
                            resolve(undefined);
                        }
                        return;
                    }
                    _this.context.clearInterval(timer);
                    _this.video = video;
                    _this.initPlayer();
                    _this.video.addEventListener("ended", function () {
                        _this.end = true;
                        _this.context.clearInterval(_this.time);
                        _this.callEvent("complete");
                    });
                    resolve(undefined);
                }
                catch (error) {
                    application_1.Application.App.log.Debug("初始化video错误", error);
                }
            }, 500);
        });
    };
    Video.prototype.Type = function () {
        return "video";
    };
    Video.prototype.Start = function () {
        var _this = this;
        return new Promise(function (resolve) {
            application_1.Application.App.log.Debug("开始播放视频");
            if (_this.flash) {
                resolve(undefined);
                return _this.callEvent("complete");
            }
            //定时运行
            _this.time = _this.context.setInterval(function () {
                application_1.Application.App.config.auto && _this.video.paused && _this.video.play();
            }, 5000);
            //同时运行多视频的兼容,后续看看能不能hook
            _this.video.addEventListener("pause", function () {
                if (_this.video.currentTime <= _this.video.duration - 5) {
                    if (!_this.end) {
                        _this.video.play();
                    }
                }
            });
            _this.video.play();
            resolve(undefined);
        });
    };
    Video.prototype.initPlayer = function () {
        this.playbackRate = this._playbackRate;
        this.muted = this._muted;
    };
    /**
     * 秒过
     */
    Video.prototype.sendEndTimePack = function (callback) {
        this.sendTimePack(this.video.duration, callback);
    };
    Video.prototype.sendTimePack = function (time, callback) {
        this.context.sendTimePack(time, function (isPassed) {
            callback(isPassed);
        });
    };
    Video.prototype.downloadSubtitle = function () {
        utils_1.get('/richvideo/subtitle?mid=' + this.taskinfo.property.mid + '&_dc=' +
            Date.parse(new Date().toString()), function (data) {
            var json = JSON.parse(data);
            if (json.length <= 0) {
                alert("没有字幕！");
            }
            else {
                for (var i = 0; i < json.length; i++) {
                    var subtitleURL = json[i]['url'];
                    window.open(subtitleURL);
                }
            }
        });
    };
    Object.defineProperty(Video.prototype, "playbackRate", {
        /**
         * 设置播放速度
         */
        set: function (speed) {
            // 拟人化：倍速上限（speed_limit，默认 2；0 = 不限制）
            try {
                var lim = parseFloat(application_1.Application.App.config.GetConfig("speed_limit", "2"));
                if (isNaN(lim) || lim <= 0) {
                    lim = 0;
                }
                if (lim > 0 && speed > lim) {
                    application_1.Application.App.log.Info("倍速被限制到 " + lim + "x（拟人化设置 speed_limit）");
                    speed = lim;
                }
            }
            catch (e) {
                // ignore
            }
            this._playbackRate = speed;
            if (this.video) {
                this.video.playbackRate = speed;
            }
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Video.prototype, "muted", {
        /**
         * 设置播放静音
         */
        set: function (muted) {
            this._muted = muted;
            if (this.video) {
                this.video.muted = muted;
            }
        },
        enumerable: false,
        configurable: true
    });
    return Video;
}(task_1.CxTask));
exports.Video = Video;


/***/ }),

/***/ "./src/mooc/mooc.ts":
/*!**************************!*\
  !*** ./src/mooc/mooc.ts ***!
  \**************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.mooc = void 0;
var application_1 = __webpack_require__(/*! @App/internal/application */ "./src/internal/application.ts");
var mooc = /** @class */ (function () {
    function mooc(moocFactory) {
        // 防止taskComplete和reload冲突
        this.once = false;
        this.moocFactory = moocFactory;
    }
    mooc.prototype.start = function () {
        return __awaiter(this, void 0, void 0, function () {
            var state, mooc_1, e_1, isShow_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 3, , 4]);
                        state = document.readyState;
                        application_1.Application.App.log.Debug("Start document state:", state);
                        mooc_1 = this.moocFactory.CreateMooc();
                        if (!(mooc_1 != null)) return [3 /*break*/, 2];
                        return [4 /*yield*/, mooc_1.Init()];
                    case 1:
                        _a.sent();
                        // MoocTaskSet接口判断,接管流程
                        if (mooc_1.Next != undefined) {
                            this.runMoocTask(mooc_1);
                        }
                        _a.label = 2;
                    case 2: return [3 /*break*/, 4];
                    case 3:
                        e_1 = _a.sent();
                        application_1.Application.App.log.Fatal("扩展发生了一个致命错误:", e_1);
                        return [3 /*break*/, 4];
                    case 4:
                        //最小化警告
                        if (top == self) {
                            isShow_1 = false;
                            document.addEventListener("visibilitychange", function () {
                                if (document.hidden) {
                                    if (isShow_1) {
                                        return;
                                    }
                                    application_1.Application.App.log.Warn("请注意!最小化可能导致视频无法正常播放!允许切换窗口.");
                                    isShow_1 = true;
                                }
                            });
                        }
                        return [2 /*return*/];
                }
            });
        });
    };
    mooc.prototype.runMoocTask = function (moocTask) {
        var _this = this;
        moocTask.addEventListener("reload", function () {
            if (application_1.Application.App.config.auto) {
                _this.runTask(moocTask);
            }
            clearTimeout(_this.timer);
        });
        moocTask.addEventListener("complete", function () {
            application_1.Application.App.log.Warn("任务完成了");
            alert("任务完成了");
        });
        moocTask.addEventListener("taskComplete", function (index, task) {
            moocTask.SetTaskPointer(index + 1);
            if (!application_1.Application.App.config.auto) {
                return;
            }
            var interval = application_1.Application.App.config.interval;
            application_1.Application.App.log.Info(interval + "分钟后自动切换下一个任务点");
            _this.timer = setTimeout(function () { return __awaiter(_this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, task.Submit()];
                        case 1:
                            _a.sent();
                            return [4 /*yield*/, this.runTask(moocTask)];
                        case 2:
                            _a.sent();
                            return [2 /*return*/];
                    }
                });
            }); }, interval * 60000);
        });
        moocTask.addEventListener("error", function (msg) {
            application_1.Application.App.log.Fatal(msg);
            alert(msg);
        });
    };
    mooc.prototype.runTask = function (moocTask) {
        return __awaiter(this, void 0, void 0, function () {
            var task;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (this.once) {
                            return [2 /*return*/];
                        }
                        this.once = true;
                        return [4 /*yield*/, moocTask.Next()];
                    case 1:
                        task = _a.sent();
                        _a.label = 2;
                    case 2:
                        if (!(task != null)) return [3 /*break*/, 9];
                        if (!task.Done()) return [3 /*break*/, 4];
                        return [4 /*yield*/, moocTask.Next()];
                    case 3:
                        task = _a.sent();
                        return [3 /*break*/, 2];
                    case 4:
                        if (!(application_1.Application.App.config.answer_ignore && task.Type() == "topic")) return [3 /*break*/, 6];
                        return [4 /*yield*/, moocTask.Next()];
                    case 5:
                        task = _a.sent();
                        return [3 /*break*/, 2];
                    case 6:
                        if (!application_1.Application.App.config.auto) return [3 /*break*/, 8];
                        return [4 /*yield*/, task.Start()];
                    case 7:
                        _a.sent();
                        _a.label = 8;
                    case 8:
                        this.nowTask = task;
                        return [3 /*break*/, 9];
                    case 9:
                        this.once = false;
                        return [2 /*return*/];
                }
            });
        });
    };
    return mooc;
}());
exports.mooc = mooc;


/***/ }),

/***/ "./src/tampermonkey/catalog-watch.ts":
/*!*******************************************!*\
  !*** ./src/tampermonkey/catalog-watch.ts ***!
  \*******************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.StartCatalogWatch = void 0;
// 目录监听：当前章节「变绿」（任务点全部完成）后，自动切到下一个还没变绿的章节
//
// 新版学习通的左侧「目录」里，完成的任务点/章节会变成绿色或出现 ✓，
// 而任务内容区是 iframe，原来的「下一节」按钮在新版里不一定存在。
// 这里直接盯目录列表：谁刚从"没绿"变成"绿"，就把后面第一个还没绿的章节点开。
var application_1 = __webpack_require__(/*! @App/internal/application */ "./src/internal/application.ts");
function isVisible(el) {
    if (!el) {
        return false;
    }
    try {
        var r = el.getBoundingClientRect();
        return r.width > 4 && r.height > 4;
    }
    catch (e) {
        return false;
    }
}
function colorIsGreen(el) {
    try {
        var c = window.getComputedStyle(el).color || "";
        var m = c.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
        if (!m) {
            return false;
        }
        var r = parseInt(m[1], 10);
        var g = parseInt(m[2], 10);
        var b = parseInt(m[3], 10);
        // 绿色：G 明显大于 R 和 B（兼容 #67C23A / #009900 这类）
        return g > 100 && g > r + 25 && g > b + 25;
    }
    catch (e) {
        return false;
    }
}
// 这一项是否"已完成"（绿色 / 打勾 / 类名提示）
function isDone(el) {
    try {
        var t = el.innerText || el.textContent || "";
        if (/[✓√✔]/.test(t)) {
            return true;
        }
        var hints = el.querySelectorAll("[class*=dui],[class*=complete],[class*=finish],[class*=success],[class*=green],[class*=yiwancheng],[class*=icondone]");
        if (hints.length > 0) {
            return true;
        }
        if (colorIsGreen(el)) {
            return true;
        }
        var kids = el.querySelectorAll("span,i,em,b,a,div");
        for (var i = 0; i < kids.length && i < 60; i++) {
            if (colorIsGreen(kids[i])) {
                return true;
            }
        }
    }
    catch (e) {
        // ignore
    }
    return false;
}
function isLocked(el) {
    try {
        var t = el.innerText || "";
        if (t.indexOf("锁") >= 0) {
            return true;
        }
        return el.querySelector("[class*=lock],[class*=suo]") != null;
    }
    catch (e) {
        return false;
    }
}
// 收集目录里的章节项（4.19 机械之美：... 这种），按章节号排序
function collectCatalogItems() {
    var out = [];
    var seen = {};
    var docs = [document];
    try {
        var frames = document.querySelectorAll("iframe");
        for (var i = 0; i < frames.length; i++) {
            try {
                var d = frames[i].contentDocument;
                if (d) {
                    docs.push(d);
                }
            }
            catch (e) {
                // 跨域 iframe 跳过
            }
        }
    }
    catch (e) {
        // ignore
    }
    for (var di = 0; di < docs.length; di++) {
        var nodes = void 0;
        try {
            nodes = docs[di].querySelectorAll("a,div,li,span,p");
        }
        catch (e) {
            continue;
        }
        for (var i = 0; i < nodes.length; i++) {
            var el = nodes[i];
            if (!isVisible(el)) {
                continue;
            }
            var t = (el.innerText || "").trim();
            var m = t.match(/^(\d+(?:\.\d+)+)\s*\S/);
            if (!m) {
                continue;
            }
            // 排除整块容器（只认条目级元素）
            if (el.getElementsByTagName("*").length > 15) {
                continue;
            }
            var num = m[1];
            if (seen[num]) {
                continue;
            }
            seen[num] = true;
            out.push({ num: num, el: el });
        }
    }
    out.sort(function (a, b) {
        var pa = a.num.split(".");
        var pb = b.num.split(".");
        for (var i = 0; i < Math.max(pa.length, pb.length); i++) {
            var va = parseInt(pa[i] || "0", 10);
            var vb = parseInt(pb[i] || "0", 10);
            if (va != vb) {
                return va - vb;
            }
        }
        return 0;
    });
    return out;
}
function StartCatalogWatch() {
    if (window.top != window.self) {
        return;
    }
    if (location.href.indexOf("studentstudy") < 0) {
        return;
    }
    var prev = null;
    var cooldownUntil = 0;
    setInterval(function () {
        try {
            if (!application_1.Application.App || !application_1.Application.App.config || !application_1.Application.App.config.auto) {
                return;
            }
            var now = Date.now();
            if (now < cooldownUntil) {
                return;
            }
            var items = collectCatalogItems();
            if (items.length == 0) {
                return;
            }
            var snap = {};
            for (var i = 0; i < items.length; i++) {
                snap[items[i].num] = isDone(items[i].el);
            }
            if (!prev) {
                // 第一次先记录基线，避免把"本来就已经完成"的章节当成刚完成
                prev = snap;
                return;
            }
            var newly = [];
            for (var k in snap) {
                if (snap[k] && !prev[k]) {
                    newly.push(k);
                }
            }
            prev = snap;
            if (newly.length == 0) {
                return;
            }
            // 取文档顺序里最靠后的"刚变绿"的章节
            var lastIdx = -1;
            for (var i = 0; i < items.length; i++) {
                if (newly.indexOf(items[i].num) >= 0) {
                    lastIdx = i;
                }
            }
            if (lastIdx < 0) {
                return;
            }
            for (var i = lastIdx + 1; i < items.length; i++) {
                var it = items[i];
                if (snap[it.num]) {
                    continue;
                }
                if (isLocked(it.el)) {
                    application_1.Application.App.log.Info("目录：「" + it.num + "」还没解锁，先等一会儿");
                    continue;
                }
                application_1.Application.App.log.Info("目录：当前章节已完成，切到下一节「" + it.num + "」");
                cooldownUntil = now + 15000;
                // 给课程翻页逻辑一个"我刚导航过"的标记，避免两边同时点造成跳两节
                window.__cxNavByCatalog = now;
                try {
                    it.el.click();
                }
                catch (e) {
                    application_1.Application.App.log.Warn("目录：点击下一节失败 " + e);
                }
                return;
            }
            application_1.Application.App.log.Info("目录：后面已经没有未完成的章节了");
        }
        catch (e) {
            // ignore
        }
    }, 2500);
}
exports.StartCatalogWatch = StartCatalogWatch;


/***/ }),

/***/ "./src/tampermonkey/continue-watch.ts":
/*!********************************************!*\
  !*** ./src/tampermonkey/continue-watch.ts ***!
  \********************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

// 检测「继续学习」提示是否出现，出现时在页面标题上加一个标记
// AHK 脚本会读窗口标题，看到标记就按空格恢复播放（比图像识别可靠）
Object.defineProperty(exports, "__esModule", { value: true });
exports.StartVideoGuard = exports.StartContinueWatch = void 0;
var MARKER = "【需继续】";
function isVisible(el) {
    if (!el) {
        return false;
    }
    try {
        var st = window.getComputedStyle(el);
        if (st.display == "none" || st.visibility == "hidden") {
            return false;
        }
        if (parseFloat(st.opacity || "1") < 0.05) {
            return false;
        }
        var r = el.getBoundingClientRect();
        return r.width > 6 && r.height > 6;
    }
    catch (e) {
        return false;
    }
}
function scanDoc(doc) {
    if (!doc || !doc.body) {
        return false;
    }
    try {
        var text = (doc.body.innerText || "");
        if (text.indexOf("继续学习") < 0 && text.indexOf("请继续学习") < 0) {
            return false;
        }
    }
    catch (e) {
        return false;
    }
    // 有文字还不行，要确认是"看得见的"
    var selectors = [
        ".vjs-resume-progress-tip",
        ".vjs-resume-progress-text",
        "#videoquiz-continue",
        "[class*=resume]",
        "[class*=continue]",
    ];
    for (var i = 0; i < selectors.length; i++) {
        try {
            var list = doc.querySelectorAll(selectors[i]);
            for (var j = 0; j < list.length; j++) {
                if (isVisible(list[j])) {
                    return true;
                }
            }
        }
        catch (e) {
            // ignore
        }
    }
    // 兜底：找文字刚好是"继续学习"的可见元素
    try {
        var nodes = doc.querySelectorAll("div,span,a,button,p");
        for (var i = 0; i < nodes.length; i++) {
            var el = nodes[i];
            if (el.childElementCount > 1) {
                continue;
            }
            var t = (el.textContent || "").replace(/\s+/g, "");
            if (t.indexOf("继续学习") >= 0 && isVisible(el)) {
                return true;
            }
        }
    }
    catch (e) {
        // ignore
    }
    return false;
}
function needContinue() {
    if (scanDoc(document)) {
        return true;
    }
    var frames = document.querySelectorAll("iframe");
    for (var i = 0; i < frames.length; i++) {
        try {
            var fdoc = frames[i].contentDocument;
            if (fdoc && scanDoc(fdoc)) {
                return true;
            }
        }
        catch (e) {
            // 跨域 iframe 跳过
        }
    }
    return false;
}
function StartContinueWatch() {
    if (window.top != window.self) {
        return;
    }
    var last = false;
    setInterval(function () {
        try {
            var need = needContinue();
            if (need == last) {
                return;
            }
            last = need;
            if (need) {
                if (document.title.indexOf(MARKER) < 0) {
                    document.title = MARKER + document.title;
                }
            }
            else if (document.title.indexOf(MARKER) >= 0) {
                document.title = document.title.replace(MARKER, "");
            }
        }
        catch (e) {
            // ignore
        }
    }, 1000);
}
exports.StartContinueWatch = StartContinueWatch;
// ===== 视频自动播放守护 =====
// 在任意 frame 里跑：发现 video 被暂停就自动 play()，不依赖鼠标/键盘
function guardVideos() {
    var list;
    try {
        list = document.querySelectorAll("video");
    }
    catch (e) {
        return;
    }
    var _loop_1 = function (i) {
        var v = list[i];
        if (v.__cxGuarded) {
            return "continue";
        }
        v.__cxGuarded = true;
        var tryPlay = function () {
            try {
                if (v.paused && !v.ended) {
                    var p = v.play();
                    if (p && p.catch) {
                        p.catch(function () { });
                    }
                }
            }
            catch (e) {
                // ignore
            }
        };
        v.addEventListener("pause", function () {
            setTimeout(tryPlay, 700);
            setTimeout(tryPlay, 1800);
        });
        v.addEventListener("loadedmetadata", tryPlay);
        if (v.paused && !v.ended) {
            setTimeout(tryPlay, 500);
        }
    };
    for (var i = 0; i < list.length; i++) {
        _loop_1(i);
    }
}
function StartVideoGuard() {
    setInterval(guardVideos, 1500);
    guardVideos();
}
exports.StartVideoGuard = StartVideoGuard;


/***/ }),

/***/ "./src/tampermonkey/cxmooc-pack.ts":
/*!*****************************************!*\
  !*** ./src/tampermonkey/cxmooc-pack.ts ***!
  \*****************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
var config_1 = __webpack_require__(/*! @App/internal/utils/config */ "./src/internal/utils/config.ts");
var log_1 = __webpack_require__(/*! @App/internal/utils/log */ "./src/internal/utils/log.ts");
var application_1 = __webpack_require__(/*! @App/internal/application */ "./src/internal/application.ts");
var mooc_1 = __webpack_require__(/*! @App/mooc/mooc */ "./src/mooc/mooc.ts");
var platform_1 = __webpack_require__(/*! @App/mooc/chaoxing/platform */ "./src/mooc/chaoxing/platform.ts");
var continue_watch_1 = __webpack_require__(/*! ./continue-watch */ "./src/tampermonkey/continue-watch.ts");
var catalog_watch_1 = __webpack_require__(/*! ./catalog-watch */ "./src/tampermonkey/catalog-watch.ts");
var logger;
if (top == self) {
    logger = new log_1.PageLog();
}
else {
    logger = new log_1.ConsoleLog();
}
application_1.Application.GlobalContext = window.unsafeWindow;
var component = new Map().
    set("config", new config_1.ChromeConfigItems(config_1.NewFrontendGetConfig())).
    set("logger", logger);
var app = new application_1.Application(application_1.Frontend, new mooc_1.mooc(new platform_1.CxPlatform()), component);
app.run();
// 「继续学习」出现时给页面标题打标记，供 AutoHotkey 识别
continue_watch_1.StartContinueWatch();
// 视频被暂停时自动恢复播放（在每个 frame 里都跑，视频 iframe 也覆盖）
continue_watch_1.StartVideoGuard();
// 目录监听：当前章节变绿（完成）后，自动切到下一个还没变绿的章节
catalog_watch_1.StartCatalogWatch();


/***/ }),

/***/ "./src/views/common.ts":
/*!*****************************!*\
  !*** ./src/views/common.ts ***!
  \*****************************/
/*! no static exports found */
/***/ (function(module, exports) {

window.addEventListener("load", function () {
    var css = "\n@keyframes aniripple  \n{\n    0%{\n        width:0px;\n        height:0px;\n        opacity:0.4;\n    }\n    100%{\n        width:500px;\n        height:500px;\n        opacity:0;\n    }\n}  \n\n#cxtools {\n    position: absolute;\n    left: 250px;\n    top: 2px;\n    width: 210px;\n    font-size: 0;\n}\n\n.cx-btn {\n    outline: none;\n    border: 0;\n    background: #7d9d35;\n    color: #fff;\n    border-radius: 4px;\n    padding: 2px 8px;\n    cursor: pointer;\n    font-size: 12px;\n    margin-left: 4px;\n}\n\n.cx-btn:hover {\n    box-shadow: 1px 1px 1px 1px #ccc;\n}\n\n.zhs-tools-btn {\n    color: #fff;\n    background: #ff9d34;\n    padding: 4px;\n    display: inline-block;\n    height: 24px;\n    font-size: 14px;\n    line-height: 24px;\n    margin:0;\n    cursor:pointer;\n}\n.btn-ripple{\n    position:absolute;\n    background:#000;\n    pointer-events:none;\n    transform:translate(-50%,-50%);\n    border-radius:50%;\n    animation:aniripple 1s linear infinite;\n}\n\n.zhs-start-btn{\n    background: #36ac36;\n}\n\n.zhs-start-btn:hover{\n    background: #3b8d3b;\n}\n\n#zhs-ytbn {\n    color: #fff;\n    background: #e777ff;\n}\n\n#zhs-ytbn:hover {\n    background: #e7b7f1;\n}\n\n.zhs-search-answer {\n    border: 0;\n    outline: none;\n    padding: 4px;\n}\n\n.zhs-search-answer:hover {\n    opacity: .85;\n}\n\n.mooc163-search{\n    background-color: #60b900;\n    display: block;\n    margin: 0 auto;\n}\n\n.tools-logger-panel{\n    width: 360px;\n    height: auto;\n    max-height: 470px;\n    color:#000;\n    position: fixed;\n    margin: 0 auto;\n    display: block;\n    font-size: 14px;\n    border-radius: 4px;\n    width: 340px;\n    text-align: center;\n    overflow: hidden;\n    left:60px;\n    top: 40px;\n    z-index: 100000;\n    background: rgba(255, 255, 255, 0.98);\n    box-shadow: 0px 0px 8px rgba(0, 0, 0, 0.25);\n}\n\n.head {\n    width: 100%;\n    height: 30px;\n    padding: 4px;\n    box-sizing: border-box;\n    cursor: move;\n    transition-property: opacity, background-color;\n    transition: 200ms ease-in-out;\n}\n\n.head span{\n    color:#000;\n    float:left;\n    font-weight: 550;\n}\n\n.status {\n    color: #67C23A;\n    font-weight: 600;\n}\n\n.tools-notice-content {\n    width: 100%;\n    height: 200px;\n    border-top:0px;\n    overflow-y: auto;\n    overflow-x: hidden;\n}\n\n/* \u5C0F\u5DE5\u5177\u901A\u77E5\u6761\u91CC\u7684\u6309\u94AE\u680F\uFF08\u5F00\u59CB\u6302\u673A/\u79D2\u8FC7\u89C6\u9891/\u4E0B\u8F7D\u8D44\u6E90/\u4E0B\u8F7D\u5B57\u5E55\uFF09 */\n.tools-btn-bar {\n    display: flex;\n    flex-wrap: wrap;\n    gap: 4px;\n    padding: 6px 4px;\n    border-top: 1px solid #eee;\n    border-bottom: 1px solid #eee;\n    box-sizing: border-box;\n}\n\n.tools-btn-bar:empty {\n    display: none;\n}\n\n.tools-btn-bar .cx-btn {\n    margin: 0 !important;\n}\n\n/* \u5C0F\u5DE5\u5177\u901A\u77E5\u6761\u91CC\u7684 AI \u7B54\u9898\u680F\uFF08\u66F4\u6539API \u6309\u94AE + \u81EA\u52A8\u7B54\u9898\u5F00\u5173 + \u72B6\u6001\uFF09 */\n.tools-ai-bar {\n    display: flex;\n    align-items: center;\n    gap: 8px;\n    padding: 4px 6px;\n    border-top: 1px solid #eee;\n    border-bottom: 1px solid #eee;\n    box-sizing: border-box;\n    background: rgba(255, 255, 255, 0.5);\n}\n\n.tools-ai-bar .tools-ai-btn {\n    margin: 0 !important;\n}\n\n.tools-ai-bar .switch {\n    margin: 0;\n    width: auto;\n}\n\n.tools-ai-bar .switch span {\n    color: #000;\n    font-size: 12px;\n    font-weight: 500;\n}\n\n.tools-ai-status {\n    font-size: 11px;\n    color: #c33;\n    margin-left: auto;\n    white-space: nowrap;\n    max-width: 96px;\n    overflow: hidden;\n    text-overflow: ellipsis;\n}\n\n/* \u66F4\u6539API \u5C55\u5F00\u7684\u586B\u5199\u8868\u5355 */\n.tools-ai-form {\n    display: none;\n    padding: 6px;\n    border-bottom: 1px solid #eee;\n    text-align: left;\n    box-sizing: border-box;\n    background: rgba(255, 255, 255, 0.85);\n}\n\n.tools-ai-form .row {\n    display: flex;\n    align-items: center;\n    margin-bottom: 4px;\n}\n\n.tools-ai-form .row > span {\n    width: 58px;\n    flex: none;\n    font-size: 12px;\n    color: #333;\n}\n\n.tools-ai-form .row input {\n    flex: 1;\n    min-width: 0;\n    height: 22px;\n    padding: 0 4px;\n    font-size: 12px;\n    color: #000;\n    background: #fff;\n    border: 1px solid #ddd;\n    border-radius: 3px;\n    outline: none;\n    box-sizing: border-box;\n}\n\n.tools-ai-form .row input:focus {\n    border-color: #409EFF;\n}\n\n.tools-ai-form .row select {\n    flex: 1;\n    min-width: 0;\n    height: 22px;\n    padding: 0 2px;\n    font-size: 12px;\n    color: #000;\n    background: #fff;\n    border: 1px solid #ddd;\n    border-radius: 3px;\n    outline: none;\n    box-sizing: border-box;\n}\n\n.tools-ai-form .row select:focus {\n    border-color: #409EFF;\n}\n\n.tools-ai-form button:disabled {\n    opacity: 0.6;\n    cursor: default;\n}\n\n.tools-ai-form .tools-ai-actions {\n    gap: 6px;\n    margin-bottom: 0;\n}\n\n.tools-ai-form .tools-ai-actions .cx-btn {\n    margin: 0 !important;\n}\n\n.tools-ai-hint {\n    font-size: 11px;\n    color: #999;\n}\n\n.tools-notice-content .log {\n    height: auto;\n    width: auto;\n    text-align: left;\n    border: 1px solid #eee;\n    overflow: hidden;\n}\n\n.tools-notice-content .log p {\n    margin: 0;\n    padding: 3px 6px;\n    color: #666;\n    font-size: 12px;\n    font-weight: 400;\n    font-family: Arial, Helvetica, sans-serif;\n    line-height: 18px;\n    text-align: left;\n    white-space: pre-wrap;\n    word-break: break-word;\n    overflow-wrap: break-word;\n}\n\n/* \u6EDA\u52A8\u69FD */\n::-webkit-scrollbar {\n    width: 10px;\n    height: 10px;\n}\n\n::-webkit-scrollbar-track {\n    border-radius: 3px;\n    background: rgba(0, 0, 0, 0.06);\n    -webkit-box-shadow: inset 0 0 5px rgba(0, 0, 0, 0.08);\n}\n\n/* \u6EDA\u52A8\u6761\u6ED1\u5757 */\n::-webkit-scrollbar-thumb {\n    border-radius: 3px;\n    background: rgba(0, 0, 0, 0.12);\n    -webkit-box-shadow: inset 0 0 10px rgba(0, 0, 0, 0.2);\n}\n\n/* \u590D\u9009\u6846 */\n.switch {\n    margin: 2px auto;\n    display: inline-flex;\n    align-items: center;\n    width: auto;\n}\n.checkbox-input {\n    display: none\n}\n.checkbox {\n    -webkit-transition: background-color 0.3s;\n    transition: background-color 0.3s;\n    background-color: #fff;\n    border: 1px solid #d7d7d7;\n    border-radius: 50px;\n    width: 16px;\n    height: 16px;\n    vertical-align:middle;\n    margin: 0 5px;\n}\n.checkbox-input:checked+.checkbox {\n    background-color: #409EFF;\n}\n.checkbox-input:checked+.checkbox:after {\n    // content: \"\u221A\";\n    display: inline-block;\n    height: 100%;\n    width: 100%;\n    color: #fff;\n    text-align: center;\n    line-height: 16px;\n    font-size: 12px;\n    box-shadow: 0 0 4px #409EFF;\n}\n\n.tools-logger-panel:hover,\n.tools-logger-panel:focus-within {\n    background: #fff;\n}\n\n.tools-logger-panel .head:active {\n    background-color: #E5E5E5;\n}\n\n.tools-logger-panel > .close {\n    margin: 2px;\n}\n\n";
    var style = document.createElement("style");
    style.innerHTML = css;
    document.body.appendChild(style);
});


/***/ })

/******/ });
