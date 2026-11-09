window.addEventListener("load", () => {
    let css = `
@keyframes aniripple  
{
    0%{
        width:0px;
        height:0px;
        opacity:0.4;
    }
    100%{
        width:500px;
        height:500px;
        opacity:0;
    }
}  

#cxtools {
    position: absolute;
    left: 250px;
    top: 2px;
    width: 210px;
    font-size: 0;
}

.cx-btn {
    outline: none;
    border: 0;
    background: #7d9d35;
    color: #fff;
    border-radius: 4px;
    padding: 2px 8px;
    cursor: pointer;
    font-size: 12px;
    margin-left: 4px;
}

.cx-btn:hover {
    box-shadow: 1px 1px 1px 1px #ccc;
}

.zhs-tools-btn {
    color: #fff;
    background: #ff9d34;
    padding: 4px;
    display: inline-block;
    height: 24px;
    font-size: 14px;
    line-height: 24px;
    margin:0;
    cursor:pointer;
}
.btn-ripple{
    position:absolute;
    background:#000;
    pointer-events:none;
    transform:translate(-50%,-50%);
    border-radius:50%;
    animation:aniripple 1s linear infinite;
}

.zhs-start-btn{
    background: #36ac36;
}

.zhs-start-btn:hover{
    background: #3b8d3b;
}

#zhs-ytbn {
    color: #fff;
    background: #e777ff;
}

#zhs-ytbn:hover {
    background: #e7b7f1;
}

.zhs-search-answer {
    border: 0;
    outline: none;
    padding: 4px;
}

.zhs-search-answer:hover {
    opacity: .85;
}

.mooc163-search{
    background-color: #60b900;
    display: block;
    margin: 0 auto;
}

.tools-logger-panel{
    width: 360px;
    height: auto;
    max-height: 470px;
    color:#000;
    position: fixed;
    margin: 0 auto;
    display: block;
    font-size: 14px;
    border-radius: 4px;
    width: 340px;
    text-align: center;
    overflow: hidden;
    left:60px;
    top: 40px;
    z-index: 100000;
    background: rgba(256, 256, 256, 0.3);
    box-shadow: 0px 0px 5px #bbb;
}

.head {
    width: 100%;
    height: 30px;
    padding: 4px;
    box-sizing: border-box;
    cursor: move;
    transition-property: opacity, background-color;
    transition: 200ms ease-in-out;
}

.head span{
    color:#000;
    float:left;
    font-weight: 550;
}

.status {
    color: #67C23A;
    font-weight: 600;
}

.tools-notice-content {
    width: 100%;
    height: 200px;
    border-top:0px;
    overflow-y: scroll;
    overflow-x: hidden;
}

/* 小工具通知条里的按钮栏（开始挂机/秒过视频/下载资源/下载字幕） */
.tools-btn-bar {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    padding: 6px 4px;
    border-top: 1px solid #eee;
    border-bottom: 1px solid #eee;
    box-sizing: border-box;
}

.tools-btn-bar:empty {
    display: none;
}

.tools-btn-bar .cx-btn {
    margin: 0 !important;
}

/* 小工具通知条里的 AI 答题栏（更改API 按钮 + 自动答题开关 + 状态） */
.tools-ai-bar {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 4px 6px;
    border-top: 1px solid #eee;
    border-bottom: 1px solid #eee;
    box-sizing: border-box;
    background: rgba(255, 255, 255, 0.5);
}

.tools-ai-bar .tools-ai-btn {
    margin: 0 !important;
}

.tools-ai-bar .switch {
    margin: 0;
    width: auto;
}

.tools-ai-bar .switch span {
    color: #000;
    font-size: 12px;
    font-weight: 500;
}

.tools-ai-status {
    font-size: 11px;
    color: #c33;
    margin-left: auto;
    white-space: nowrap;
}

/* 更改API 展开的填写表单 */
.tools-ai-form {
    display: none;
    padding: 6px;
    border-bottom: 1px solid #eee;
    text-align: left;
    box-sizing: border-box;
    background: rgba(255, 255, 255, 0.85);
}

.tools-ai-form .row {
    display: flex;
    align-items: center;
    margin-bottom: 4px;
}

.tools-ai-form .row > span {
    width: 58px;
    flex: none;
    font-size: 12px;
    color: #333;
}

.tools-ai-form .row input {
    flex: 1;
    min-width: 0;
    height: 22px;
    padding: 0 4px;
    font-size: 12px;
    color: #000;
    background: #fff;
    border: 1px solid #ddd;
    border-radius: 3px;
    outline: none;
    box-sizing: border-box;
}

.tools-ai-form .row input:focus {
    border-color: #409EFF;
}

.tools-ai-form .row select {
    flex: 1;
    min-width: 0;
    height: 22px;
    padding: 0 2px;
    font-size: 12px;
    color: #000;
    background: #fff;
    border: 1px solid #ddd;
    border-radius: 3px;
    outline: none;
    box-sizing: border-box;
}

.tools-ai-form .row select:focus {
    border-color: #409EFF;
}

.tools-ai-form button:disabled {
    opacity: 0.6;
    cursor: default;
}

.tools-ai-form .tools-ai-actions {
    gap: 6px;
    margin-bottom: 0;
}

.tools-ai-form .tools-ai-actions .cx-btn {
    margin: 0 !important;
}

.tools-ai-hint {
    font-size: 11px;
    color: #999;
}

.tools-notice-content .log {
    height: auto;
    width: auto;
    text-align: center;
    border: 1px solid #eee;
    overflow: hidden;
}

.tools-notice-content .log p {
    margin: 0;
    color: #aaa;
    font-size: 11px;
    font-weight: 500;
    font-family: Arial, Helvetica, sans-serif;
    line-height: 26px;
}

/* 滚动槽 */
::-webkit-scrollbar {
    width: 10px;
    height: 10px;
}

::-webkit-scrollbar-track {
    border-radius: 3px;
    background: rgba(0, 0, 0, 0.06);
    -webkit-box-shadow: inset 0 0 5px rgba(0, 0, 0, 0.08);
}

/* 滚动条滑块 */
::-webkit-scrollbar-thumb {
    border-radius: 3px;
    background: rgba(0, 0, 0, 0.12);
    -webkit-box-shadow: inset 0 0 10px rgba(0, 0, 0, 0.2);
}

/* 复选框 */
.switch {
    margin: 2px auto;
    display: inline-flex;
    align-items: center;
    width: auto;
}
.checkbox-input {
    display: none
}
.checkbox {
    -webkit-transition: background-color 0.3s;
    transition: background-color 0.3s;
    background-color: #fff;
    border: 1px solid #d7d7d7;
    border-radius: 50px;
    width: 16px;
    height: 16px;
    vertical-align:middle;
    margin: 0 5px;
}
.checkbox-input:checked+.checkbox {
    background-color: #409EFF;
}
.checkbox-input:checked+.checkbox:after {
    // content: "√";
    display: inline-block;
    height: 100%;
    width: 100%;
    color: #fff;
    text-align: center;
    line-height: 16px;
    font-size: 12px;
    box-shadow: 0 0 4px #409EFF;
}

.tools-logger-panel:hover,
.tools-logger-panel:focus-within {
    background: rgba(256, 256, 256, 0.7);
}

.tools-logger-panel .head:active {
    background-color: #E5E5E5;
}

.tools-logger-panel > .close {
    margin: 2px;
}

`
    let style = document.createElement("style");
    style.innerHTML = css;
    document.body.appendChild(style);
});
