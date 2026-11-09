#Requires AutoHotkey v2.0
#SingleInstance Force
Persistent

; =====================================================================
;  网课「继续学习」自动点击器   AutoHotkey v2
;
;  两个按钮分开：
;    「检测 (F7)」     只扫描，告诉你屏幕上有没有那个按钮、在哪个坐标，不点击
;    「检测继续 (F8)」 扫描 + 真点一下
;  两者都有反馈：结果文字 + 窗口闪烁 + 提示音。
;
;  热键： F7 检测（只检测）  F8 检测并点击  F9 开关自动点击  F10 退出
; =====================================================================

; ------------------------- 可调参数 -------------------------
TemplateFile  := A_ScriptDir "\template-continue.png"
IntervalMs    := 1200        ; 自动检测间隔（毫秒）
Variation     := 5           ; 模板容差：严格匹配，避免把视频画面误判成按钮
ClickCooldown := 8000        ; 两次恢复尝试最短间隔（避免疯狂循环）
RestoreCursor := true        ; 点击后光标回原位
FeedbackSound := true        ; 提示音
PreventSleep  := true        ; 挂机时阻止系统自动休眠/关屏
ImageDetect   := true        ; 图像识别兜底（已收紧容差；误判可改 false 关掉）
Browsers      := ["chrome.exe", "msedge.exe"]
TplW := 142                  ; 模板尺寸
TplH := 58
; ------------------------------------------------------------

global DryRun := false
global SelfTest := false
global GuiCheck := false
global DetectTest := false
for arg in A_Args {
    if (arg = "--dry" || arg = "/dry")
        DryRun := true
    if (arg = "--selftest" || arg = "/selftest")
        SelfTest := true
    if (arg = "--guicheck" || arg = "/guicheck")
        GuiCheck := true
    if (arg = "--detecttest" || arg = "/detecttest")
        DetectTest := true
}

CoordMode "Pixel", "Screen"
CoordMode "Mouse", "Screen"
; 按物理像素工作，避免 150% 缩放带来的坐标错位
try DllCall("SetThreadDpiAwarenessContext", "ptr", -4, "ptr")

global LogFile := A_ScriptDir "\cxmooc-autoclick.log"
global Enabled := true
global LastClick := 0
global ClickCount := 0
global LastEvent := "等待弹窗…"
global mainWin := ""
global txtState := ""
global txtInfo := ""
global txtResult := ""
global btnToggle := ""

Log(text) {
    global LogFile
    try FileAppend(FormatTime(, "yyyy-MM-dd HH:mm:ss") . "  " . text . "`n", LogFile, "UTF-8")
}

; 挂机时阻止系统休眠/关屏（on=false 恢复系统默认）
KeepAwake(on) {
    static ES_CONTINUOUS := 0x80000000
    static ES_SYSTEM_REQUIRED := 0x00000001
    static ES_DISPLAY_REQUIRED := 0x00000002
    flags := ES_CONTINUOUS
    if on
        flags |= ES_SYSTEM_REQUIRED | ES_DISPLAY_REQUIRED
    try DllCall("SetThreadExecutionState", "uint", flags)
}

if !FileExist(TemplateFile) {
    MsgBox("找不到模板图：`n" . TemplateFile, "网课自动继续", "IconX")
    ExitApp()
}

if SelfTest {
    Log("selftest ok  screen=" . A_ScreenWidth . "x" . A_ScreenHeight . " dpi=" . A_ScreenDPI)
    ExitApp()
}

UpdateUI() {
    global txtState, txtInfo, txtResult, btnToggle, Enabled, DryRun, ClickCount, LastEvent
    if Enabled
        txtState.Text := DryRun ? "状态：监控中（试运行·不点击）" : "状态：监控中"
    else
        txtState.Text := "状态：已暂停"
    txtInfo.Text := "已点击：" . ClickCount . " 次"
    txtResult.Text := LastEvent
    btnToggle.Text := Enabled ? "暂停 (F9)" : "继续 (F9)"
}

FlashWin(hwnd) {
    try DllCall("FlashWindow", "ptr", hwnd, "int", 1)
}

BuildGui() {
    global mainWin, txtState, txtInfo, txtResult, btnToggle
    mainWin := Gui("+AlwaysOnTop -MaximizeBox", "网课自动继续")
    mainWin.SetFont("s9", "Microsoft YaHei UI")
    txtState := mainWin.Add("Text", "w318", "状态：")
    txtInfo := mainWin.Add("Text", "w318", "已点击：0 次")
    txtResult := mainWin.Add("Text", "w318", "等待弹窗…")
    bDetect := mainWin.Add("Button", "w70", "检测 (F7)")
    bContinue := mainWin.Add("Button", "x+6 w100 yp", "检测继续 (F8)")
    btnToggle := mainWin.Add("Button", "x+6 w74 yp", "暂停 (F9)")
    bExit := mainWin.Add("Button", "x+6 w48 yp", "退出")
    bDetect.OnEvent("Click", (*) => DetectOnly())
    bContinue.OnEvent("Click", (*) => DetectAndClick())
    btnToggle.OnEvent("Click", (*) => Toggle())
    bExit.OnEvent("Click", (*) => QuitApp())
    mainWin.OnEvent("Close", (*) => mainWin.Hide())
    mainWin.Show("x" . (A_ScreenWidth - 380) . " y40 NoActivate")
    UpdateUI()
}

BrowserRegions() {
    global Browsers
    regions := []
    for proc in Browsers {
        try windows := WinGetList("ahk_exe " . proc)
        catch
            continue
        for hwnd in windows {
            try {
                if (WinGetMinMax(hwnd) = -1)
                    continue
                if (WinGetTitle(hwnd) = "")
                    continue
                WinGetPos(&x, &y, &w, &h, hwnd)
                if (w < 200 || h < 200)
                    continue
                if (x <= -10000 || y <= -10000)
                    continue
                x1 := Max(x, 0), y1 := Max(y, 0)
                x2 := Min(x + w - 1, A_ScreenWidth - 1)
                y2 := Min(y + h - 1, A_ScreenHeight - 1)
                if (x2 > x1 && y2 > y1)
                    regions.Push([x1, y1, x2, y2])
            }
        }
    }
    return regions
}

FindButtonIn(regions, &cx, &cy) {
    global TemplateFile, Variation, TplW, TplH
    for r in regions {
        if !ImageSearch(&fx, &fy, r[1], r[2], r[3], r[4], "*" . Variation . " " . TemplateFile)
            continue
        cx := fx + TplW // 2
        cy := fy + TplH // 2
        for r2 in regions {
            if (cx >= r2[1] && cx <= r2[3] && cy >= r2[2] && cy <= r2[4])
                return true
        }
    }
    return false
}

FindButton(&cx, &cy) {
    return FindButtonIn(BrowserRegions(), &cx, &cy)
}

; 点击：先悬停再点，点完复检按钮是否消失；没消失就重试
; 返回带「需继续」标记的窗口标题，没有则返回空
MarkerTitle() {
    global Browsers
    static MARKER := "【需继续】"
    for proc in Browsers {
        try windows := WinGetList("ahk_exe " . proc)
        catch
            continue
        for hwnd in windows {
            try {
                t := WinGetTitle(hwnd)
                if (t != "" && InStr(t, MARKER))
                    return t
            }
        }
    }
    return ""
}

; 把包含该坐标的浏览器窗口激活（避免"第一次点击只用来激活窗口"）
ActivateAt(x, y) {
    global Browsers
    for proc in Browsers {
        try windows := WinGetList("ahk_exe " . proc)
        catch
            continue
        for hwnd in windows {
            try {
                WinGetPos(&wx, &wy, &ww, &wh, hwnd)
                if (x >= wx && x <= wx + ww && y >= wy && y <= wy + wh) {
                    WinActivate("ahk_id " . hwnd)
                    Sleep(80)
                    return hwnd
                }
            }
        }
    }
    return 0
}

; 恢复播放：激活浏览器后依次尝试「空格 → 单击 → K 键」，每一步都复查提示是否消失
ResumeAt(cx, cy) {
    global ClickCount, LastEvent, RestoreCursor, FeedbackSound, mainWin
    MouseGetPos(&ox, &oy)
    hwnd := ActivateAt(cx, cy)
    Sleep(200)
    ; 确保焦点在浏览器；如果焦点被本脚本的小窗口抢走，重新激活
    if (hwnd) {
        if !WinActive("ahk_id " . hwnd) {
            try WinActivate("ahk_id " . hwnd)
            Sleep(200)
        }
        if WinActive("ahk_id " . mainWin.Hwnd) {
            try WinActivate("ahk_id " . hwnd)
            Sleep(200)
        }
    }

    ok := false
    method := ""
    target := "?"

    ; 记录点击点下面是哪个窗口，方便排查
    try {
        MouseMove(cx, cy)
        Sleep(80)
        MouseGetPos(&mx, &my, &hwndUnder)
        try {
            target := WinGetTitle(hwndUnder) . " / " . WinGetClass(hwndUnder)
        } catch {
            target := "?"
        }
    }

    ; 记录浏览器窗口标题（判断油猴标记是否生效）
    winTitle := ""
    if (hwnd) {
        try winTitle := WinGetTitle("ahk_id " . hwnd)
    }
    Log("开始恢复：按钮 (" . cx . "," . cy . ")  浏览器标题=" . winTitle)

    ; ① 第 1 次点击（多半只是激活窗口，会被吞掉）
    if !ok {
        MouseMove(cx, cy)
        Sleep(120)
        MouseClick("Left", cx, cy)
        Sleep(600)
        if !FindButton(&nx, &ny) {
            ok := true
            method := "单击1"
        } else {
            Log("第 1 次单击无效，按钮仍在 " . nx . "," . ny)
            cx := nx
            cy := ny
        }
    }

    ; ② 第 2 次点击（窗口已激活，这次是真点）
    if !ok {
        MouseMove(cx, cy)
        Sleep(150)
        MouseClick("Left", cx, cy)
        Sleep(600)
        if !FindButton(&nx, &ny) {
            ok := true
            method := "单击2"
        } else {
            Log("第 2 次单击无效，按钮仍在 " . nx . "," . ny)
            cx := nx
            cy := ny
        }
    }

    ; ③ 点视频画面区域（不点药丸）：video.js 点击画面本身就能切换播放/暂停
    ;    药丸在视频右下角，往左上偏移取几个点，都可以落在视频画面内
    offsets := [[-450, -300], [-300, -200], [-600, -400], [-150, -100]]
    for off in offsets {
        if ok
            break
        tx := cx + off[1]
        ty := cy + off[2]
        if (tx < 10 || ty < 10 || tx > A_ScreenWidth - 10 || ty > A_ScreenHeight - 10)
            continue
        MouseMove(tx, ty)
        Sleep(120)
        MouseClick("Left", tx, ty)
        Sleep(700)
        if !FindButton(&nx, &ny) {
            ok := true
            method := "点画面" . off[1] . "," . off[2]
        } else {
            Log("点画面无效 " . tx . "," . ty . "，按钮仍在 " . nx . "," . ny)
            cx := nx
            cy := ny
        }
    }

    ; ④ 空格键
    if !ok {
        Send("{Space}")
        Sleep(800)
        if !FindButton(&nx, &ny) {
            ok := true
            method := "空格"
        } else {
            Log("空格无效，按钮仍在 " . nx . "," . ny)
            cx := nx
            cy := ny
        }
    }

    ; ⑤ K 键
    if !ok {
        Send("k")
        Sleep(800)
        if !FindButton(&nx, &ny) {
            ok := true
            method := "K 键"
        } else {
            Log("K 键也无效，按钮仍在")
        }
    }

    Log("恢复播放 坐标 " . cx . "," . cy . "  目标窗口: " . target)
    if ok {
        ClickCount += 1
        LastEvent := "√ 已恢复播放（" . method . "） " . FormatTime(, "HH:mm:ss") . "  (" . cx . "," . cy . ")"
        Log("已恢复播放（" . method . "）  " . cx . "," . cy)
        if FeedbackSound
            SoundBeep(1200, 60)
    } else {
        LastEvent := "⚠ 单击×2/空格/K 都试过，提示仍在  " . FormatTime(, "HH:mm:ss")
        Log("警告：单击两次、空格、K 都没能恢复播放  浏览器标题=" . winTitle)
        if FeedbackSound
            SoundBeep(300, 200)
    }
    UpdateUI()
    FlashWin(mainWin.Hwnd)
    if RestoreCursor
        try MouseMove(ox, oy)
}

; 只检测，不点击
DetectOnly() {
    global LastEvent, FeedbackSound, mainWin
    LastEvent := "… 正在检测"
    UpdateUI()
    mt := MarkerTitle()
    if (mt != "") {
        LastEvent := "√ 标题标记在（页面提示继续学习）：" . SubStr(mt, 1, 40)
        UpdateUI()
        Log("检测：标题标记存在  " . mt)
        if FeedbackSound
            SoundBeep(1000, 60)
        FlashWin(mainWin.Hwnd)
        return
    }
    regions := BrowserRegions()
    if (regions.Length = 0) {
        LastEvent := "× 没找到浏览器窗口（Chrome/Edge 没开？）"
        UpdateUI()
        Log("检测：没有浏览器窗口")
        if FeedbackSound
            SoundBeep(300, 120)
        FlashWin(mainWin.Hwnd)
        return
    }
    if FindButtonIn(regions, &cx, &cy) {
        LastEvent := "√ 找到按钮 (" . cx . "," . cy . ")，窗口 " . regions.Length . " 个 · 未点击"
        UpdateUI()
        Log("检测：找到按钮  " . cx . "," . cy . "  窗口 " . regions.Length . " 个")
        if FeedbackSound
            SoundBeep(1000, 60)
    } else {
        LastEvent := "× 没找到按钮（窗口 " . regions.Length . " 个；弹窗没出现或被挡住？）"
        UpdateUI()
        Log("检测：没找到按钮  窗口 " . regions.Length . " 个")
        if FeedbackSound
            SoundBeep(400, 120)
    }
    FlashWin(mainWin.Hwnd)
}

; 检测 + 点击
DetectAndClick() {
    global Enabled, LastClick, LastEvent, DryRun, FeedbackSound, mainWin, ImageDetect
    LastEvent := "… 正在检测"
    UpdateUI()
    if ResumeByMarker()
        return
    if !ImageDetect {
        LastEvent := "× 没检测到继续提示（自动检测靠页面标题；也可按 F6 手动恢复）"
        UpdateUI()
        Log("检测继续：没有标题标记，图像识别已关闭")
        if FeedbackSound
            SoundBeep(400, 120)
        FlashWin(mainWin.Hwnd)
        return
    }
    regions := BrowserRegions()
    if (regions.Length = 0) {
        LastEvent := "× 没找到浏览器窗口（Chrome/Edge 没开？）"
        UpdateUI()
        Log("检测继续：没有浏览器窗口")
        if FeedbackSound
            SoundBeep(300, 120)
        FlashWin(mainWin.Hwnd)
        return
    }
    if !FindButtonIn(regions, &cx, &cy) {
        LastEvent := "× 没找到按钮（窗口 " . regions.Length . " 个；弹窗没出现或被挡住？）"
        UpdateUI()
        Log("检测继续：没找到按钮  窗口 " . regions.Length . " 个")
        if FeedbackSound
            SoundBeep(400, 120)
        FlashWin(mainWin.Hwnd)
        return
    }
    if DryRun {
        LastEvent := "√ 找到按钮 (" . cx . "," . cy . ") · 试运行不点击"
        UpdateUI()
        Log("检测继续：找到（dry-run）  " . cx . "," . cy)
        FlashWin(mainWin.Hwnd)
        return
    }
    LastClick := A_TickCount
    ResumeAt(cx, cy)
}

; 优先方案：油猴脚本会在「继续学习」出现时把页面标题改成含【需继续】，
; 这里检测标题 → 激活窗口 → 按空格恢复
ResumeByMarker() {
    global Browsers, Enabled, LastClick, ClickCooldown, DryRun, ClickCount
    global LastEvent, FeedbackSound, mainWin
    static MARKER := "【需继续】"
    for proc in Browsers {
        try windows := WinGetList("ahk_exe " . proc)
        catch
            continue
        for hwnd in windows {
            try {
                title := WinGetTitle(hwnd)
                if (title = "" || !InStr(title, MARKER))
                    continue
                if (A_TickCount - LastClick < ClickCooldown)
                    return true
                Log("标题检测到需要继续：" . title)
                if DryRun {
                    LastEvent := "√ 标题标记出现（试运行，不操作）"
                    UpdateUI()
                    return true
                }
                WinActivate("ahk_id " . hwnd)
                Sleep(250)
                Send("{Space}")
                ; 标题标记由油猴每 1 秒刷新一次，等 2.6 秒覆盖两个周期
                Sleep(2600)
                if (InStr(WinGetTitle(hwnd), MARKER) = 0) {
                    LastClick := A_TickCount
                    ClickCount += 1
                    LastEvent := "√ 已恢复播放（标题标记+空格） " . FormatTime(, "HH:mm:ss")
                    Log("已恢复播放（标题标记+空格）")
                    UpdateUI()
                    if FeedbackSound
                        SoundBeep(1200, 60)
                    FlashWin(mainWin.Hwnd)
                    return true
                }
                ; 空格没生效才补 K；K 可能只是暂停，所以补发前重新确认
                if (InStr(WinGetTitle(hwnd), MARKER) != 0) {
                    Send("k")
                    Sleep(2600)
                }
                if (InStr(WinGetTitle(hwnd), MARKER) = 0) {
                    LastClick := A_TickCount
                    ClickCount += 1
                    LastEvent := "√ 已恢复播放（标题标记+K 键） " . FormatTime(, "HH:mm:ss")
                    Log("已恢复播放（标题标记+K 键）")
                    UpdateUI()
                    if FeedbackSound
                        SoundBeep(1200, 60)
                    FlashWin(mainWin.Hwnd)
                    return true
                }
                LastEvent := "⚠ 标题显示需继续，但空格/K 都没生效 " . FormatTime(, "HH:mm:ss")
                Log("警告：标题标记在，空格和 K 都没让它消失")
                UpdateUI()
                if FeedbackSound
                    SoundBeep(300, 200)
                return true
            }
        }
    }
    return false
}

DoClick() {
    global Enabled, LastClick, ClickCooldown, DryRun, LastEvent, ImageDetect
    if !Enabled
        return
    if (A_TickCount - LastClick < ClickCooldown)
        return

    ; ① 标题标记（油猴脚本给的信号），最可靠
    if ResumeByMarker()
        return

    ; ② 图像识别兜底：默认关闭——视频画面里会出现类似的蓝色区域导致误判
    if !ImageDetect
        return
    if !FindButton(&cx, &cy)
        return

    LastClick := A_TickCount
    if DryRun {
        LastEvent := "√ 检测到按钮（试运行）" . FormatTime(, "HH:mm:ss")
        Log("检测到按钮（dry-run，不点击）  " . cx . "," . cy)
        UpdateUI()
        return
    }
    ResumeAt(cx, cy)
}

; 手动恢复：F6 —— 激活浏览器窗口并按一下空格（看到视频停住时按这个最直接）
ManuallyResume() {
    global Browsers, LastEvent, ClickCount, LastClick, FeedbackSound, mainWin
    hwnd := 0
    for proc in Browsers {
        try windows := WinGetList("ahk_exe " . proc)
        catch
            continue
        for w in windows {
            try {
                if (WinGetTitle(w) != "") {
                    hwnd := w
                    break 2
                }
            }
        }
    }
    if !hwnd {
        LastEvent := "× 没找到浏览器窗口"
        UpdateUI()
        if FeedbackSound
            SoundBeep(300, 150)
        return
    }
    WinActivate("ahk_id " . hwnd)
    Sleep(300)
    Send("{Space}")
    Sleep(500)
    ClickCount += 1
    LastClick := A_TickCount
    LastEvent := "√ 手动恢复（F6 + 空格） " . FormatTime(, "HH:mm:ss")
    Log("手动恢复（F6 + 空格）")
    UpdateUI()
    if FeedbackSound
        SoundBeep(1200, 60)
    FlashWin(mainWin.Hwnd)
}

Toggle() {
    global Enabled
    Enabled := !Enabled
    Log("开关：" . (Enabled ? "开启" : "关闭"))
    UpdateUI()
}

QuitApp() {
    Log("退出")
    KeepAwake(false)
    ExitApp()
}

F6::ManuallyResume()
F7::DetectOnly()
F8::DetectAndClick()
F9::Toggle()
F10::QuitApp()

Log("===== 启动  screen=" . A_ScreenWidth . "x" . A_ScreenHeight . "  dpi=" . A_ScreenDPI . "  dry=" . (DryRun ? "yes" : "no"))
if (PreventSleep && !GuiCheck && !DetectTest) {
    KeepAwake(true)
    Log("已开启防休眠（挂机时不会自动睡眠/关屏）")
}
BuildGui()

if GuiCheck {
    Log("guicheck ok")
    mainWin.Destroy()
    ExitApp()
}

if DetectTest {
    DetectOnly()
    Log("detecttest result: " . LastEvent)
    mainWin.Destroy()
    ExitApp()
}

SetTimer(DoClick, IntervalMs)
TrayTip("已启动，右上角小窗口显示状态", "网课自动继续", 1)
