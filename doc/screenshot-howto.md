# README 主截图的重拍方法

`README.md` 引用的 `screenshot-app.png` 是**真实浏览器截图**（不是示意图），
由无头 Edge 直接渲染运行中的应用得到。改动界面后按下面步骤重拍即可。

## 步骤

```powershell
# 1. 起开发服务器（挑一个空闲端口）
.\node_modules\.bin\vite.cmd --port 5288 --strictPort

# 2. 等它 ready 后，用无头 Edge 截图
$edge = 'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
$prof = Join-Path $env:TEMP ('edge-shot-' + [guid]::NewGuid().ToString('N'))
& $edge --headless=new --disable-gpu --hide-scrollbars --no-first-run --no-default-browser-check `
  --user-data-dir="$prof" --window-size=1360,2450 --virtual-time-budget=12000 `
  --screenshot="$PWD\screenshot-app.png" 'http://localhost:5288/'

# 3. 关掉开发服务器
Stop-Process -Id (Get-NetTCPConnection -LocalPort 5288 -State Listen).OwningProcess -Force
```

## 踩过的坑

| 现象 | 原因 | 对策 |
| --- | --- | --- |
| 截图内容与代码不符（例如口径按钮数量对不上） | 端口被**更早启动的 dev 实例**占着，`--strictPort` 让新实例直接退出，截图拍的是旧页面 | 换端口重拍；并先 `Get-NetTCPConnection -LocalPort <port>` 确认占用者 |
| 小视口（如 900×760）不出文件 | Edge headless 对窗口尺寸有限制 | 用 1360×2250 以上 |
| `--dump-dom` 输出为空 | 新版 headless 不再支持该开关 | 想核对 DOM 就挂载组件断言（见 `src/tests/render.test.ts`），别依赖读图 |
| stderr 冒出 `QQBrowser user data path not found` 等 | Edge 常规噪音 | 忽略 |

## 想要更小的图

`--window-size` 只截视口内的内容；要只保留四柱与神煞面板，可临时把窗口高度调小
（例如 `1360,1500`，此时大运/流年在折叠线以下），或用任意图片工具裁切。
