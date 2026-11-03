# 伦理委员会（Ethics Committee）

“伦理委员会”（Ethics Committee）是面向《三角机构》TRPG 玩家的个人游戏进度记录网页。玩家通过电脑或手机打开链接、点击格子，记录自己在游戏中的进程；不同使用者的数据相互隔离。

第一版先分发给同团的几位玩家，后续希望面向所有使用该规则的玩家开放。网站入口允许任何拿到链接的人访问，暂不为访问人数过多额外设计流量防护。当前处于需求确认阶段；格子的具体机制由用户后续说明，保存、同步与找回方式待确认。GitHub 仓库标识为 `ethics-committee`。

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

## 当前准备状态

| 项目 | 状态 |
| --- | --- |
| 独立项目目录与规则文档 | 已建立 |
| 需求、受众与第一版范围 | 用途、设备、首批受众及公开入口已确认；具体记录机制与功能范围确认中 |
| 页面结构、内容与视觉方向 | 待确认 |
| 技术栈与托管方案 | 待选型 |
| 本地 Git 仓库 | 已初始化，默认分支 `main`，根目录为本目录 |
| GitHub 项目仓库与 Issue | [私有仓库](https://github.com/AzurAqua/ethics-committee) 已创建并同步；[进度 Issue #1](https://github.com/AzurAqua/ethics-committee/issues/1) 已建立 |
| 仓库验证命令 | 已配置 `python scripts/verify.py`；见下文 |
| GitHub Actions | 已接入推送、PR 和手动触发；[首次线上检查通过](https://github.com/AzurAqua/ethics-committee/actions/runs/41639492388) |
| 部署、访问权限与正式链接 | 公开入口与使用者数据隔离已确定；保存方式、身份识别及实际部署待确认 |

## 命令与配置

当前已有 Git 基础、项目文档、任务与 PR 模板及仓库检查。应用运行环境、依赖和业务接口待需求及选型确定后加入。

| 用途 | 当前状态 |
| --- | --- |
| 安装依赖 | 未配置 |
| 本地启动 | 未配置 |
| 检查与构建 | 未配置 |
| 仓库验证入口 | `python scripts/verify.py`，需要 Python 3.10 或更新版本及 Git |
| 应用功能验证 | 未配置 |
| 发布与回滚 | 未配置 |

后续若使用环境变量，只记录变量名称和用途，不在文档中保存真实密钥。

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

`Repository checks` 工作流在推送、PR 和手动触发时运行与本地相同的 `scripts/verify.py`。当前仅验证仓库根目录、存在已纳入版本控制的文件，并检查这些文件的工作区内容是否存在 Git 可检测的空白格式错误；新增文件须先暂存。应用构建和功能测试会在开发阶段加入。

## 下一步

GitHub 基础已接通。当前按 [PLAN.md](PLAN.md) 继续确认记录机制、数据保存及使用环境；共识明确后再确定设计、技术与托管，并补齐应用验证和部署验收。
