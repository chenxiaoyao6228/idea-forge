简体中文 | [English](README.md)

<h1 align="center">Idea Forge</h1>

## 介绍

Idea Forge 是一个强大的文档协作工具，结合了 Notion 的功能和 AI 的智能。它提供了一个无缝的环境，用于实时协作编辑、AI 驱动的写作辅助和高效的文档管理。

## 快速开始

1. 从[Docker 官网](https://www.docker.com/products/docker-desktop/)下载并安装适用于您操作系统的 Docker Desktop

> 由于 docker 被墙，国内用户请使用 docker 镜像加速，或者使用科学上网，不然镜像无法拉取

2. 设置 tiptap pro 扩展

访问 https://tiptap.dev/ 注册并登录 Tiptap 网站，然后访问 https://cloud.tiptap.dev/pro-extensions 获取您的令牌。

在项目根目录创建 `.npmrc` 文件，内容如下：

```bash
link-workspace-packages=true

@tiptap-pro:registry=https://registry.tiptap.dev/
//registry.tiptap.dev/:_authToken={your_token}
```

3. 在继续设置之前，请确保 Docker Desktop 正在运行

```bash
## 安装并设置服务器的本地 docker 环境，包括 postgresql、redis
pnpm install && pnpm run setup

## 运行服务器
pnpm run dev
```
