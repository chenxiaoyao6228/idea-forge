简体中文 | [English](README.md)

<h1 align="center">思连笔记</h1>

`思连笔记` 是一个强大的文档协作平台，结合了类 Notion 的功能和 AI 能力。它提供了一个无缝的环境，用于实时协作编辑、AI 驱动的写作辅助和直观的文档管理。

## ✨ 主要特性

- 💯 免费且开源，支持自托管
- 🔧 丰富的文档元素（文本、表格、任务列表、图片、Mermaid 图表）
- 🤖 AI 驱动的写作辅助
- 👥 实时协作
- 🎨 可自定义主题、封面图片和表情符号
- 🌐 多语言支持（英文、中文等）
- 📝 Markdown 快捷键, 导入和导出 Markdown

立即体验 Idea Forge：[ideaforge.link](https://ideaforge.link/)

> 更多功能正在路上：团队工作区、思维导图、白板、PDF 导出，敬请期待。

## 📸 功能展示

### 文档编辑

创建包含多种元素的丰富文档，包括文本、表格、任务列表、图片和 Mermaid 图表。

<div align="center">
  <figure>
    <a target="_blank" rel="noopener">
       <img src="./docs/marketing/images/idea-forge-banner.png" alt="Idea Forge 界面展示" width="90%" />
    </a>
  </figure>
</div>

### AI 写作助手

只需按 Space 即可激活 AI 驱动的写作建议。

![AI 写作助手演示](./docs/marketing/images/ai-writing.gif)

### 实时协作

通过共享文档与团队实时协作。

![实时协作演示](./docs/marketing/images/real-time-collab.gif)

## 🛠️ 技术栈

Idea Forge 采用现代技术构建：

- **后端**：NestJS、PostgreSQL、Redis、Hocuspocus、Prisma、S3
- **前端**：React、TypeScript、TailwindCSS、Shadcn UI、Tiptap
- **AI 集成**：OpenAI API

## 🚀 开发环境搭建

1. 从 [Docker Desktop](https://www.docker.com/products/docker-desktop/) 下载并安装适用于您操作系统的版本

> ⚠️ 国内用户注意：由于 Docker 被墙，请使用 Docker 镜像加速或科学上网拉取镜像

2. 配置 Tiptap Pro 扩展

   a. 在 [tiptap.dev](https://tiptap.dev/) 注册并登录
   b. 从 [cloud.tiptap.dev/pro-extensions](https://cloud.tiptap.dev/pro-extensions) 获取令牌
   c. 在项目根目录创建 `.npmrc` 文件，内容如下：

```bash
link-workspace-packages=true

@tiptap-pro:registry=https://registry.tiptap.dev/
//registry.tiptap.dev/:_authToken={your_token}
```

3. 启动开发环境

```bash
# 安装依赖并设置本地 Docker 环境
pnpm install && pnpm run setup

# 启动开发服务器
pnpm run dev
```

更多可以参考 [开发文档](./docs/development/CN/README.md)

## 🤝 参与贡献

我们欢迎所有形式的贡献！以下是您可以帮助的方式：

- 🐛 报告 bug 和问题
- 💡 提出新功能建议
- 🎨 改进 UI/UX
- 📚 完善文档
- 🌍 添加翻译

## 📄 许可证

Idea Forge 基于 [MIT 许可证](LICENSE) 开源。
