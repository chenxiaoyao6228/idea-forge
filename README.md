# Idea Forge

Idea Forge is a powerful document collaboration tool that combines the functionality of Notion with the intelligence of AI. It provides a seamless environment for real-time collaborative editing, AI-powered writing assistance, and efficient document management.

## Getting Started

1. Install Docker Desktop for your operating system from the [official Docker website](https://www.docker.com/products/docker-desktop/)

2. Setup tiptap pro extension

Register and log in to the Tiptap website at https://tiptap.dev/, then visit https://cloud.tiptap.dev/pro-extensions and get your token.

Create a `.npmrc` file in the root directory of the project with the following content:

```bash
@tiptap-pro:registry=https://registry.tiptap.dev/
//registry.tiptap.dev/:_authToken={your_token}
```


3. Ensure Docker Desktop is running before proceeding with the setup

```bash
## Install && Setup local docker environment for the server, including postgresql, redis
pnpm install && pnpm run setup

## Run the server
pnpm run dev
```
