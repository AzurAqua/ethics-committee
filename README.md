# 伦理委员会（Ethics Committee）

“伦理委员会”（Ethics Committee）是面向《三角机构》TRPG 玩家的个人游戏进度记录网页。玩家通过电脑或手机打开链接、点击格子，记录自己在游戏中的进程；不同使用者的数据相互隔离。

第一版先分发给同团的几位玩家，后续希望面向所有使用该规则的玩家开放，优先服务中国大陆用户。网站入口允许任何拿到链接的人访问，要求个人记录在电脑与手机之间自动同步；第一版先保证联网体验，完整离线功能后置，暂不为访问人数过多额外设计流量防护。

第一版界面和轨道规则已实现。云数据库和发信服务待接通。

## 文档入口

| 文档 | 内容 |
| --- | --- |
| [AGENTS.md](AGENTS.md) | 仅适用于本项目及子目录的稳定工作规则 |
| [PLAN.md](PLAN.md) | 完整准备计划、阶段状态、待确认事项和验收记录 |

## 从这里开展工作

可以在已有 Codex 对话中继续工作：显式读取本目录的 `AGENTS.md`，并将项目命令和修改限定在本目录。新会话从本目录启动可自动发现项目规则。已有全局规则继续生效；本项目规则不向父目录或同级目录扩展。

终端中可使用：

```powershell
Set-Location -LiteralPath 'C:\Users\G\Desktop\P\master1\TRPG\伦理委员会'
```

终端切换目录不等于修改当前 Codex 会话的项目根目录，但不妨碍在已有对话中按上述范围继续工作；无需重新开对话、修改全局配置或上级规则。

## 本地运行

使用 Node.js 24、pnpm 11.25.0、Python 3.10 或更新版本，以及 Git。

```powershell
pnpm install --frozen-lockfile
pnpm dev
```

按终端给出的地址打开网页。首次运行可试用格子，刷新后恢复为空白。

```powershell
python scripts/verify.py
pnpm test
pnpm build
pnpm preview
```

GitHub Actions 运行同一组仓库检查、测试及构建。应用测试覆盖轨道边界、最后一格的双选项、数据库权限和写入冲突。

## 本机保管数据库密码

在项目目录的 Windows PowerShell 中运行以下命令，然后在隐藏输入提示中粘贴 Supabase 的数据库密码。

```powershell
.\scripts\database-password.ps1 -Action Save
```

取用时运行以下命令，再粘贴到需要密码的位置。

```powershell
.\scripts\database-password.ps1 -Action Copy
```

加密文件位于 `.local-secrets/database-password.dpapi`。它由 Windows DPAPI 保护，正常情况下只有本机当前 Windows 账户能解密。目录已被 Git 忽略。换电脑或重装后可在 Supabase 后台重置密码。

## 联网部署

1. 建立 Supabase 免费项目，在 SQL Editor 执行 [数据库迁移](supabase/migrations/20261104000000_player_records.sql)。
2. 在 Authentication 中启用邮箱注册及邮箱确认，将密码最小长度设为 8。将正式站点地址设为 Site URL，并加入允许的回跳地址。
3. 配置 [自定义 SMTP](https://supabase.com/docs/guides/auth/auth-smtp)。在 [邮件模板](https://supabase.com/docs/guides/auth/auth-email-templates) 中分别使用以下链接，便于在其他浏览器打开邮件后完成验证。

```html
<a href="{{ .RedirectTo }}/?token_hash={{ .TokenHash }}&amp;type=signup">验证邮箱</a>
<a href="{{ .RedirectTo }}/?token_hash={{ .TokenHash }}&amp;type=recovery">重置密码</a>
```

4. 复制 `.env.example` 为 `.env.local`，填入项目 URL 和浏览器发布密钥 `sb_publishable_…`。运行 `pnpm build` 后上传 `dist/` 产物。数据库管理密钥和 SMTP 密码仅在服务后台使用。
5. 用两个账号测试收信、密码重置及记录隔离。用同一账号在电脑和手机测试自动保存、切回读取和旧版本冲突。开放分享前，用中国大陆实际网络验证页面、数据库和邮件链路。

## Git 与进度工作方式

本地提交身份使用 `AzurAqua` 及其 GitHub noreply 邮箱，仅写入本仓库配置。忽略规则排除本地密钥、私密配置、依赖和生成文件；文本统一使用 LF 行尾。

每个可复核的小步骤选择明确文件暂存，检查变更，再提交。`path/to/file` 和提交说明需替换为本次实际内容：

```powershell
git status --short --branch
git add -- path/to/file
git diff --cached
python scripts/verify.py
git commit -m 'Describe the completed change'
```

远端 `origin` 为 `https://github.com/AzurAqua/ethics-committee.git`，本地 `main` 已跟踪 `origin/main`。完成本地提交后使用 `git push` 同步；本地提交、远端推送和网站发布分别记录。

GitHub CLI 已通过官方浏览器流程授权。CLI 配置位于本项目的 `.git/gh`，Git 凭据辅助程序只在本仓库内配置；无需修改全局 Git 配置。Git 会自动使用项目认证路径。若在新终端直接使用 `gh`，先执行：

```powershell
$env:GH_CONFIG_DIR = Join-Path (Get-Location).Path '.git\gh'
gh repo view AzurAqua/ethics-committee
```

任务使用 GitHub Issue 的“项目任务”模板，记录目标、验收条件、实际结果和阻塞；有 PR 时按模板填写变化、验证和交付事项。[进度 Issue #1](https://github.com/AzurAqua/ethics-committee/issues/1) 跟踪整体准备与第一版交付。

`Repository checks` 在推送、PR 和手动触发时运行仓库格式检查、应用测试及构建。

## 下一步

接通免费 Supabase 与发信服务，验收正式版联网流程。需求和阶段状态见 [PLAN.md](PLAN.md)。
