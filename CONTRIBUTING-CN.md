# 为 Idea Forge 做贡献

感谢你有兴趣参与贡献！Idea Forge 是一个协作文档平台，将 Notion 式的编辑体验与 AI 能力相结合。
本指南介绍如何搭建项目、我们遵循的规范，以及如何提交改动。

> For the English version, see [CONTRIBUTING.md](CONTRIBUTING.md).

## 贡献方式

- 🐛 报告 bug 和问题
- 💡 提出新功能建议
- 🎨 改进 UI/UX
- 📚 完善文档
- 🌍 添加翻译

对于 bug 和功能请求，请在开始较大改动前先[提交 issue](https://github.com/chenxiaoyao6228/idea-forge/issues)，
以便我们讨论实现方案。

## 环境要求

- **Node.js** `>=18`
- **pnpm** `>=8.5.1`（本仓库强制使用 pnpm，npm/yarn 已被禁用）
- **Docker** 和 **Docker Compose**（用于在本地运行 PostgreSQL、Redis 和 MinIO）

## 快速开始

```bash
# 1. 在 GitHub 上 fork 仓库，然后克隆你的 fork
git clone git@github.com:<你的用户名>/idea-forge.git
cd idea-forge

# 2. 安装依赖并执行一次性初始化
pnpm install && pnpm run setup
```

`pnpm run setup` 会：

- 从示例文件创建 `.vscode/settings.json`（如果不存在）
- 将 `.env.example` 复制为 `.env`
- 通过 `docker-compose-dev.yml` 启动 Docker 服务（PostgreSQL、Redis、MinIO）
- 创建默认的 MinIO bucket
- 生成 Prisma client 并执行数据库迁移
- 安装 Lefthook git hooks

初始化完成后，启动开发服务器：

```bash
pnpm dev          # 同时启动 API 和客户端，支持热更新
```

默认端口：API (5000)、WebSocket (5001)、客户端 (5173)、PostgreSQL (5432)、
Redis (6379)、MinIO (9000/9001)。配置详见 `.env.example`。

> **提示：** 如需在不冲突端口的情况下并行开发多个功能，可使用 git worktree 辅助脚本：
> `./scripts/development/create-worktree.sh <名称> <偏移量>`。

## 开发流程

1. 基于 `master` 创建分支：
   ```bash
   git checkout -b fix/简短描述
   ```
2. 进行你的修改。
3. 在本地运行 lint、类型检查和测试（见下文）。
4. 使用 Conventional Commits 规范提交。
5. 推送到你的 fork，并向 `chenxiaoyao6228/idea-forge:master` 提交 Pull Request。

## 代码质量

本项目使用 **[Biome](https://biomejs.dev/)** 进行 lint 和格式化（而非 ESLint/Prettier），
采用 2 个空格缩进、160 字符行宽。

```bash
pnpm lint           # 检查所有包的 lint
pnpm lint:fix       # 自动修复 lint 问题
pnpm format         # 检查格式
pnpm format:fix     # 应用格式化

# 类型检查
pnpm -F @idea/api typecheck
pnpm -F @idea/client typecheck
```

Lefthook 会在 pre-commit 时运行 format/lint，因此提交会被自动检查。

## 提交信息

提交必须遵循 [Conventional Commits](https://www.conventionalcommits.org/) 规范——
这由 commitlint（`@commitlint/config-conventional`）强制执行。请使用类型前缀：

- `feat:` — 新功能
- `fix:` — bug 修复
- `docs:` — 仅文档改动
- `refactor:`、`test:`、`chore:`、`perf:` 等

示例：

```
fix: prevent empty paragraph from unique id extension
```

## 测试

```bash
pnpm test                          # 通过 Turbo 运行所有测试
pnpm test:e2e                      # Playwright 端到端测试

# API 测试
pnpm -F @idea/api test:unit        # 单元测试（*.unit.test.ts）
pnpm -F @idea/api test:int         # 集成测试（*.int.test.ts）

# 客户端测试
pnpm -F @idea/client test
```

集成测试使用 Testcontainers（真实的 PostgreSQL/Redis），因此需要运行 Docker。

## 国际化（i18n）

使用 **英文原文本身作为翻译 key**，而不是嵌套的 key 路径：

```tsx
// ✅ 正确
t("Login")
t("Are you sure you want to delete \"{{name}}\"?", { name: item.name })

// ❌ 错误
t("auth.login.title")
```

语言文件位于 `apps/api/public/locales/{lang}.json`。

## Pull Request

- 让每个 PR 聚焦于单一关注点。
- 关联相关的 issue（例如 `Closes #123`）。
- 确保 lint、类型检查和测试均通过。
- 说明改动内容、原因，以及你是如何验证的。

## 许可证

提交贡献即表示你同意你的贡献将基于项目的 [MIT 许可证](LICENSE) 进行授权。
