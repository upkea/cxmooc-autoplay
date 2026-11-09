# 与原版（CodFrm/cxmooc-tools）的差异

README 里说过本项目是「基于原版的增强包」，这里把**到底改了什么**摆出来，方便审查和合并上游。

## 基线

| 项目 | 值 |
|---|---|
| 上游仓库 | [CodFrm/cxmooc-tools](https://github.com/CodFrm/cxmooc-tools) |
| 基线版本 | `v2.5.0`（master 分支） |
| 上游状态 | **2022-02-07 已归档（archived，只读）** |
| 协议 | MIT（本仓库保留原作者版权声明） |

## 代码统计

对原始 master 源码树做全量比对：**12 个文件改动，+1013 行 / -2 行**（除 `common.ts` 里两处样式数值外只增不删，原有功能代码全部保留）。

| 文件 | 类型 | 行数 |
|---|---|---|
| `src/internal/app/ai.ts` | 🆕 新增 | +300 |
| `src/internal/utils/log.ts` | 修改 | +230 |
| `src/tampermonkey/continue-watch.ts` | 🆕 新增 | +161 |
| `src/views/common.ts` | 修改 | +133 / -2 |
| `src/internal/app/question.ts` | 修改 | +65 |
| `src/mooc/chaoxing/task.ts` | 修改 | +40 |
| `src/mooc/chaoxing/question.ts` | 修改 | +26 |
| `src/mooc/chaoxing/course.ts` | 修改 | +7 |
| `src/tampermonkey/cxmooc-pack.ts` | 修改 | +6 |
| `src/tampermonkey/{cxmooc,zhihuishu,course163}.js` | 修改 | +15 ×3 |

> 完整的改动源码见 [`userscript/src-patches/`](src-patches/)；每处改动的上下文说明见 [`userscript/SOURCE.md`](SOURCE.md)。

## 功能对比

| 项目 | 原版 | 本仓库 |
|---|---|---|
| **答题** | 请求 `https://cx.icodef.com/v2/answer` 题库接口 | ⚠️ 该域名现在 **404**，原版答题实际已全部失效；本仓库新增 AI 答题（任意 OpenAI 兼容接口，不经过题库、不需要登录）。`ai_key` 留空时仍走原逻辑 |
| **检查更新** | 走 `cx.icodef.com` | 同样失效（面板里会显示「检查更新失败」） |
| **视频暂停** | 只有「开始挂机」后每 5 秒 `play()` 一次；失焦弹出的「继续学习」需手动点 | 新增独立守卫：监听 `video` 的 `pause` 事件，**不依赖挂机开关**，700ms / 1.8s 两次尝试 `play()`；同时把标题改为 `【需继续】…` 供 AutoHotkey 读取 |
| **界面布局** | 按钮条排在**视频正上方**，遮挡画面 | 移进右上角「小工具通知条」面板；面板关闭时按钮浮到右上角小条，不会丢 |
| **AI 配置方式** | — | 通知条里「更改API」：选服务商（智谱/硅基流动/DeepSeek）自动带出接口地址和模型，只需粘 Key；「自动答题」开关可一键停用 |
| **连接状态** | — | 面板显示 `● 已连接 · 模型 · 耗时` / `● 连接失败 · 原因` / `● 未配置 Key`，打开页面自动检测一次，也可点「测试连接」手动测；401/404/429/超时都会翻译成人话 |
| **切换任务点** | 按钮各自挂在任务容器里，无副作用 | 挪到公共面板后需要去重：同一任务点重复创建只保留一组；切换章节时先清空上一批任务点的按钮 |
| **配置项** | — | 新增 `ai_enable` / `ai_base` / `ai_key` / `ai_model` 四项，`ai_key` 默认为空字符串 |

## 未改动的部分

以下全部保持上游原样，没有重写：

- 视频倍速播放、秒过视频、视频源（CDN）选择
- 验证码识别 / 打码接管
- 作业、考试的题目采集与自动提交流程
- 题库上报逻辑本身（代码保留；只是它所依赖的服务器已经下线）
- 智慧树（知到）、中国大学 MOOC 两个平台的逻辑
- 除视频守卫以外的所有反挂机相关行为

## 为什么改这几处

1. **答题必须换方案**：原版答题完全依赖作者自建题库服务 `cx.icodef.com`，随项目归档一起停服（访问返回 `404 nginx`）。所以补上 OpenAI 兼容接口的 AI 答题，把「搜不到答案」变成「模型直接作答」。
2. **视频恢复必须绕开人**：超星的「继续学习」提示不响应鼠标点击（实测系统级 `mouse_event` 也无效），只有播放按钮/空格有效。油猴脚本里直接 `play()` 最可靠，AutoHotkey 只做兜底。
3. **界面必须让路**：原版按钮条压在视频画面上，播放时看不见字幕和画面细节，所以挪进通知条面板。

## 如何复现上面的统计

```bash
# 1. 取上游 master 源码（归档后仍可下载）
curl -L -o master.tar.gz https://github.com/CodFrm/cxmooc-tools/archive/refs/heads/master.tar.gz
tar -xzf master.tar.gz

# 2. 与本仓库的源码树比对（需要先按 SOURCE.md 准备好可编译的 src/ 目录）
git diff --no-index --stat orig/cxmooc-tools-master/src src
```

## 许可与署名

上游为 MIT。本仓库的修改同样以 MIT 发布，`LICENSE` 中同时保留 `CodFrm`（原作者）与 `upke`（本仓库修改者）的版权行。
