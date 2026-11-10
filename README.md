# 伦理委员会（Ethics Committee）

《三角机构》TRPG 的个人轨道记录网站，包含职能、现实、异常三条轨道，以及「伦理委员会」扩展的人伦条。支持电脑与手机，每位玩家使用自己的账号记录进度。

[打开公开版](https://azuraqua.github.io/ethics-committee-preview/) · [v0.2.0 发布页](https://github.com/AzurAqua/ethics-committee/releases/tag/v0.2.0) · [玩家使用说明](PLAYER-GUIDE.md) · [项目进度](PLAN.md)

面向首批玩家的第一版为 [v0.1.0](https://github.com/AzurAqua/ethics-committee/releases/tag/v0.1.0)，继续提供维护者预建账号的独立入口。

本分支 `feat/public-release` 提供公开版 **v0.2.0**，已完成最小验收，支持邮箱自助注册、重发验证邮件、密码找回和页面内帮助，仍为每个账号一份记录。公开版使用独立后台，账号与记录和第一版分开；首批玩家继续使用[第一版入口](https://azuraqua.github.io/ethics-committee/)。验证范围与证据见 [公开版验收](PUBLIC-ACCEPTANCE.md)。

## 点击格子的规则

每条轨道从全空白开始，只能操作边界格。

- **从左端点亮。** 点击最左侧空白格，变成对应轨道的亮色。点击最后一个已点亮格，可撤回为空白。
- **从右端划去。** 点击最右侧空白格，使它变灰。点击第一个灰格，可撤回为空白。
- **只剩一格空白时**，点击后选择点亮或变灰。其余合法操作点击即生效。

四条轨道各自独立，游戏中的联动效果由玩家手动操作。每次变化会自动保存，打开或切回页面时读取最新记录。若其他设备已保存更新，网页会载入最新状态并提示玩家重新操作。

职能、现实、异常各 30 格，人伦条 15 格，每行 10 格。保留格内编号、职能轨道的职级标注及轨道说明。

## 本地开发

需要 Node.js 24、pnpm 11.25.0、Python 3.10 或更新版本，以及 Git。

```sh
pnpm install --frozen-lockfile
pnpm dev
```

本地开发默认提供页面内试用，刷新后清空。联网开发可复制 `.env.example` 为 `.env.local`，填写自己 Supabase 项目的 URL 和浏览器发布密钥。

提交前运行检查和生产构建。

```sh
python scripts/verify.py
pnpm test
pnpm build
```

测试覆盖轨道边界、最后一格的选择、数据库访问隔离、旧版本冲突，以及使用 Supabase SDK 的注册、重发、邮件链接和重置请求。这些自动测试使用测试响应，不能代替真实收信验收。数据库结构位于 [supabase/migrations](supabase/migrations)。

## 部署

网站使用 GitHub Pages，玩家记录存储在 Supabase。生产配置中的 URL 和 publishable key 用于浏览器连接服务，记录权限由数据库访问规则控制。

第一版的 `main` 分支更新后，`Deploy website` 工作流会验证、构建并发布原网站。本分支只提交到功能分支，且部署工作流限制为 `main` 才能运行，防止手动从功能分支覆盖原站。

公开版使用单独的 Pages 仓库，只发布构建文件，保留现有 `/ethics-committee-preview/` 入口。Supabase 项目与第一版不同，构建配置会拒绝公开版连接第一版的后台。部署的 `version.json` 记录版本号和对应源码提交，GitHub Release 从功能分支的提交建立版本标签。

使用自己的部署时，请配置自己的 Supabase 项目、访问规则及站点地址。邮箱注册需要自定义 SMTP，并使用 [邮件模板](supabase/templates) 中的确认和重置模板，让邮件可以在另一台设备打开。服务端密钥由维护者在服务端管理。

## 当前状态与反馈

第一版已交付给首批五位玩家。公开版已在独立环境通过真实账号接口、浏览器交互、注册收信、重发验证及密码重置验收。用户在中国大陆手机关闭 VPN 后完成跨设备邮件验证、保存刷新、旧密码失效和新密码登录；后台核对重置前后记录完全一致。两版进度分别记录在 [PLAN.md](PLAN.md)。

遇到问题可在 [Issues](https://github.com/AzurAqua/ethics-committee/issues) 中说明设备、浏览器、发生时间、页面提示和复现步骤。
