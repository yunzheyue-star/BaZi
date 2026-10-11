# 迁移到 WSL 的 Fedora：环境说明与踩坑记录

本项目原先在 Windows（`C:\demo\BaZi`）开发，现已迁移到 **WSL2 上的 Fedora Linux 44**。
本文记录迁移做了什么、Linux 侧环境长什么样、以及**在 WSL 里最容易踩的坑**。

## 一键自检

仓库自带 `doc/wsl-verify.sh`，会体检环境 → 校验平台 → 跑 type-check / 测试 / 构建。
**在 Fedora 里直接跑**（推荐，路径解析最自然）：

```sh
bash ~/BaZi/doc/wsl-verify.sh
```

从 Windows 侧调用时**不要**用 `bash -c` 包一层再清 PATH（会把 `bash` 自己滤掉），
也不要在 PowerShell 里拼引号（`wsl.exe` 的引号传递很脆），直接用 `env` 传干净 PATH：

```powershell
wsl.exe --exec env "PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin" `
  bash /home/HikariYuki/BaZi/doc/wsl-verify.sh
```

> 注意：脚本会优先识别**自身所在的仓库**。若从 `/mnt/c/demo/BaZi/doc/` 下运行，
> 它检查的是 Windows 侧那份，会正确地报告「发现 Windows 平台包」并退出——
> 那是预期行为，不是脚本坏了。

## 结论速览

| 项目 | 结果 |
| --- | --- |
| 目标系统 | Fedora Linux 44 (WSL2)，内核 6.18.40.1-microsoft-standard-WSL2，x86_64 |
| 用户 / 家目录 | `HikariYuki` / `/home/HikariYuki` |
| Node | v24.18.0（`/usr/bin/node-24`，**Linux 原生**，`process.platform=linux`） |
| npm / pnpm | 11.16.0 / 10.33.0 |
| git | 2.56.0（原缺失，迁移时装的） |
| 项目位置 | `~/BaZi`（克隆自 GitHub，`main` = `ac8e375`） |
| 验证结果 | type-check 0 · **111/111 测试通过** · 构建产出 330 KB 单文件 · dev 371ms 就绪 |
| Windows 侧 | `C:\demo\BaZi` 保留为备份（含 `node_modules`，Windows 用） |

## 迁移步骤（可复现）

```sh
# 1) 装 git（Fedora WSL 最小镜像默认没有）
sudo dnf install -y git gawk          # gawk 也缺，很多脚本依赖它

# 2) 克隆到家目录（不要放在 /mnt/c，原因见下）
git clone https://github.com/yunzheyue-star/BaZi.git ~/BaZi

# 3) 装依赖（会下载 Linux 版原生模块）
cd ~/BaZi && npm install

# 4) 验证
npm run type-check && npx vitest run && npx vite build
```

## 为什么不能直接在 `/mnt/c/demo/BaZi` 上跑

三个硬理由，不是习惯问题：

1. **`node_modules` 是平台相关的**。Windows 版装的是 `@rolldown/binding-win32-x64-msvc`、
   `lightningcss-win32-x64-msvc` 这类二进制；Linux 需要 `*-linux-x64-gnu`（本机实测已就位）。
   同一份 `node_modules` 两边不能共用。
2. **`/mnt/c` 是 9p/drvfs 挂载**，I/O 明显慢，且**文件监听（inotify）不可靠** ——
   Vite 的 HMR 会时灵时不灵。
3. 在 Linux 文件系统内安装/构建，产出的才是 Linux 原生产物。

## 坑 1（最要命）：WSL 互操作把 Windows 目录塞进 PATH

Fedora 侧的 `PATH` 里**混着 Windows 目录**：

```
/usr/local/bin:/usr/bin:...:/mnt/c/WINDOWS/system32:/mnt/c/Program Files/nodejs/:...
                                                  ^^^^^^^^^^^^^^^^^^^^^^^^^^^^
```

后果是命令可能解析到 **Windows 版可执行文件**，报出这种看起来莫名其妙的错：

```
/bin/sh^M: bad interpreter: No such file or directory
```

`^M` 就是 Windows 换行符（CR），说明 `sh` 去执行了一个 Windows 脚本。
本项目实测踩到的是 `corepack`：

```
corepack -> /mnt/c/Program Files/nodejs/corepack   ← 命中了 Windows 的 node 安装
```

**判断当前 shell 是否被污染**：

```sh
command -v node            # 出现 /mnt/... 就是被污染了
node -p 'process.platform' # 应为 linux；若为 win32 说明在跑 Windows 版 node
```

**三种应对**：

```sh
# A. 临时：把 /mnt/* 从 PATH 剔除（本文档所有脚本都用这招）
export PATH=$(printf '%s' "$PATH" | tr ':' '\n' | grep -v '^/mnt/' | paste -sd: -)

# B. 永久：禁止 WSL 注入 Windows PATH
sudo tee -a /etc/wsl.conf >/dev/null <<'EOF'

[interop]
appendWindowsPath = false
EOF
# 然后在 Windows 侧执行 wsl --shutdown 生效

# C. 只针对单条命令：用绝对路径，如 /usr/bin/node
```

> 本机现状：`/etc/wsl.conf` 只设了 `[boot] systemd=true`，**未关闭互操作**，
> 所以 shell 里仍需注意 A 或 B。

## 坑 2：git 身份为空，commit 会直接失败

Fedora 侧全新用户，`git config --global user.name/user.email` 都是空的，
首次提交会报 `Please tell me who you are`。本项目已按 Windows 侧既有提交的作者补齐：

```sh
git config --global user.name  "琳筱筱"
git config --global user.email "341178706@qq.com"
```

## 坑 3：换行符（CRLF / LF）

Windows 侧若开了 `core.autocrlf=true`，克隆到 Linux 后源码可能带 CR，
表现为脚本 `bad interpreter: /bin/sh^M` 或 diff 里整文件变化。

```sh
git config --global core.autocrlf input   # Linux 推荐的设置（提交时不转换、检出保持 LF）
git config --global core.eol lf
```

本机实测：Linux 侧 `core.autocrlf` 未设置（默认不转换，正确）。
若要彻底稳定，可在仓库根加 `.gitattributes`：

```gitattributes
* text=auto eol=lf
*.png binary
*.ico binary
```

## 坑 4：Fedora WSL 最小镜像缺常用工具

实测缺 **`awk`**（`gawk` 包）与 **`git`**，都已装。其余 `sed / grep / find / tar / unzip / which / less` 都在。

```sh
sudo dnf install -y git gawk
```

## 坑 5：Linux 侧没有浏览器 → 截图要在 Windows 侧重拍

`google-chrome` / `chromium` / `firefox` 都没装。而 `README.md` 的主截图
`screenshot-app.png` 是用无头 Edge 拍的，只能从 Windows 侧发起
（步骤见 [screenshot-howto.md](./screenshot-howto.md)）。

两种选择：

- 想在 WSL 里也能截图：`sudo dnf install -y chromium`，再把 howto 里的 `$edge` 换成 `chromium`
- 保持现状：截图更新时回 Windows 侧跑一遍脚本

## 两侧日常命令

| 目的 | Windows（PowerShell，`C:\demo\BaZi`） | Fedora（bash，`~/BaZi`） |
| --- | --- | --- |
| 装依赖 | `npm install` | `npm install` |
| 开发 | `npm run dev` | `npm run dev`（建议 `--host` 供 Windows 浏览器访问） |
| 测试 | `npx vitest run` | `npx vitest run` |
| 构建 | `npx vite build` | `npx vite build` |
| 代码同步 | `git push` | `git pull` |

> **注意**：本项目的 Node 版本要求是 `^22.18.0 || >=24.12.0`（见 `package.json` 的 `engines`）。
> 两侧都满足：Windows 侧 v24.x、Fedora 侧 v24.18.0。

## 在 Windows 浏览器里访问 WSL 的 dev server

WSL2 的 `localhost` 会转发到 Windows，直接访问 `http://localhost:5173` 即可。
若不通，用：

```sh
npm run dev -- --host 0.0.0.0     # 然后从 Windows 访问 http://<WSL-IP>:5173
hostname -I | awk '{print $1}'    # 取 WSL IP
```
