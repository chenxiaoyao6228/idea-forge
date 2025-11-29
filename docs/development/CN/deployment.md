# Idea Forge 部署指南

Idea Forge 生产环境自部署和本地测试的完整指南。

## 目录

- [生产环境自部署](#生产环境自部署)
  - [前置要求](#前置要求)
  - [快速开始](#快速开始)
  - [环境配置](#环境配置)
  - [Nginx 设置](#nginx-设置)
  - [存储配置](#存储配置)
  - [部署与验证](#部署与验证)
  - [维护与运维](#维护与运维)
- [本地测试](#本地测试)
  - [快速开始(独立端口)](#快速开始独立端口)
  - [备选方案:生产环境端口](#备选方案生产环境端口)

---

## 生产环境自部署

在自己的服务器上使用自定义域名部署 Idea Forge。

### 前置要求

- **服务器**: Linux 服务器(推荐 Ubuntu 20.04+)
- **域名**: 已配置 DNS 的自定义域名
- **Docker**: 已安装 Docker 和 Docker Compose
- **端口**: 80、443 可用(SSH 需要 22)

### 快速开始

#### 方案 1: 一键安装(推荐)

无需克隆完整仓库即可下载部署文件:

```bash
curl -fsSL https://raw.githubusercontent.com/chenxiaoyao6228/idea-forge/master/scripts/deploy/deploy-quick-start.sh | bash
```

这将仅下载部署文件(~10KB)到 `~/idea-forge-deploy/`。

#### 方案 2: 完整仓库克隆

```bash
git clone https://github.com/chenxiaoyao6228/idea-forge
cd idea-forge/scripts/deploy
```

### 环境配置

#### 1. 复制环境变量模板

```bash
cd scripts/deploy  # 或 ~/idea-forge-deploy(如果使用一键安装)
cp env.secrets.example .env
```

#### 2. 配置必需的密钥

编辑 `.env` 并更新以下**必需**的值:

```bash
# === 关键:更新这些值 ===

# 域名和 URLs
CLIENT_APP_URL=https://yourdomain.com
CLIENT_COLLAB_WS_URL=wss://yourdomain.com

# 数据库
POSTGRES_PASSWORD=your_strong_postgres_password

# 安全密钥(使用以下命令生成: openssl rand -base64 32)
SESSION_SECRET=your_session_secret
JWT_SECRET=your_jwt_secret
REFRESH_TOKEN_SECRET=your_refresh_token_secret
COLLAB_SECRET_KEY=your_collab_secret

# 邮件(Resend.com)
RESEND_API_KEY=your_resend_api_key
EMAIL_FROM=noreply@yourdomain.com
SUPER_ADMIN_EMAIL=admin@yourdomain.com

# OAuth(可选 - 用于 Google/GitHub 登录)
OAUTH_GOOGLE_CLIENT_ID=your_google_client_id
OAUTH_GOOGLE_CLIENT_SECRET=your_google_client_secret
OAUTH_GITHUB_CLIENT_ID=your_github_client_id
OAUTH_GITHUB_CLIENT_SECRET=your_github_client_secret

```

#### 3. 配置存储

**选择以下存储方案之一:**

##### 方案 A: 自托管 MinIO(推荐)

完全控制数据且无云服务费用。

**在 `.env` 中配置:**

```bash
OSS_PROVIDER=minio
MINIO_ROOT_USER=minio_admin
MINIO_ROOT_PASSWORD=your_strong_minio_password

# 端口配置
MINIO_PORT=9000              # MinIO API 端口
MINIO_CONSOLE_PORT=9001      # MinIO Web 控制台端口

# 凭证(必须与 MINIO_ROOT_USER/PASSWORD 匹配)
OSS_SECRET_ID=minio_admin
OSS_SECRET_KEY=your_strong_minio_password
OSS_BUCKET=idea-forge-storage
OSS_REGION=us-east-1

# 必需:将 OSS_ENDPOINT 设置为资源子域名
# 重要:使用子域名(assets.yourdomain.com),而非路径(/storage)
# 子域名方式确保 S3 签名验证正确工作
OSS_ENDPOINT=https://assets.yourdomain.com

# 可选:仅在有单独的 CDN 用于全球加速时需要
# 大多数自托管用户应该留空
# OSS_CDN_ENDPOINT=https://cdn.yourdomain.com  # 在 MinIO 前使用 Cloudflare/CloudFront
```

**为什么需要子域名方式:**

✅ **使用子域名(assets.yourdomain.com):**
- S3 预签名 URL 可正确工作
- AWS 签名验证成功
- 无 403 Forbidden 错误
- URL 结构清晰
- 无 CORS 问题

❌ **使用路径(/storage):**
- S3 签名不匹配错误
- 上传时出现 403 Forbidden
- Nginx 配置复杂
- 需要在 URL 中进行路径操作

❌ **不设置 OSS_ENDPOINT:**
- 预签名 URL 使用内部 Docker 主机名 `http://minio:9000`
- 浏览器无法访问内部 Docker 网络
- 需要直接暴露 MinIO 端口(安全风险)

**DNS 配置:**

在部署前,添加 DNS A 记录:
```
assets.yourdomain.com → your_server_ip
```

**部署后**,创建存储桶:
1. 访问 MinIO 控制台: `https://yourdomain.com/minio-console/`
2. 使用 `MINIO_ROOT_USER` / `MINIO_ROOT_PASSWORD` 登录
3. 创建桶: `idea-forge-storage`(必须与 `OSS_BUCKET` 匹配)
4. 将桶策略设为 "public"(或根据需要配置访问策略)

##### 方案 B: 云 OSS(阿里云/腾讯云/AWS)

使用云存储:

```bash
# 在 .env 中:
ENABLE_MINIO_PROFILE=skip  # 禁用 MinIO
OSS_PROVIDER=oss  # 或: cos(腾讯云)、s3(AWS)
OSS_SECRET_ID=your_cloud_access_key
OSS_SECRET_KEY=your_cloud_secret_key
OSS_BUCKET=your-cloud-bucket
OSS_REGION=your-region

# 必需:实际的 OSS 端点(用于 S3 客户端和预签名 URL)
OSS_ENDPOINT=https://oss-ap-southeast-1.aliyuncs.com
# 示例:
#   阿里云: https://oss-ap-southeast-1.aliyuncs.com
#   腾讯云: https://cos.ap-guangzhou.myqcloud.com
#   AWS: https://s3.us-east-1.amazonaws.com

# 可选:CDN 端点(用于更快的浏览器下载)
OSS_CDN_ENDPOINT=https://cdn.yourdomain.com
# 例如: OSS_CDN_ENDPOINT=https://assets.ideaforge.link
# 如果未设置,上传和下载都使用 OSS_ENDPOINT
# 如果设置了,下载使用 CDN,上传使用 OSS_ENDPOINT
```

**重要提示**:
- `OSS_ENDPOINT` 必须是实际的云服务商端点(不是 CDN)
- 预签名上传 URL 使用 `OSS_ENDPOINT` 生成
- `OSS_CDN_ENDPOINT` 是可选的,仅用于下载 URL

### Nginx 设置

#### 1. 安装 Nginx

```bash
sudo apt update
sudo apt install nginx
```

#### 2. 配置 Nginx

```bash
# 复制示例配置
sudo cp scripts/deploy/nginx.conf.example /etc/nginx/nginx.conf

# 编辑配置
sudo nano /etc/nginx/nginx.conf
```

**在 nginx.conf 中更新这些值:**
- 将 `yourdomain.com` 替换为您的实际域名(出现多次)
- 将 `assets.yourdomain.com` 替换为您的实际资源子域名
- 更新 SSL 证书路径(如果使用自定义证书)

**nginx.conf.example 已经包含了 MinIO 子域名配置。**

MinIO 配置的关键点:
- ✅ 使用子域名: `assets.yourdomain.com`
- ✅ Nginx 中无 CORS 头(MinIO 自动处理 CORS)
- ✅ 直接代理到 MinIO 端口(9000)
- ✅ 大文件上传支持(100M)
- ✅ 上传的适当超时设置

**完整的 nginx 配置参考:**
[scripts/deploy/nginx.conf.example](https://github.com/chenxiaoyao6228/idea-forge/blob/master/scripts/deploy/nginx.conf.example)

#### 3. SSL 证书设置

##### 方案 A: Let's Encrypt(推荐 - 免费)

```bash
# 安装 certbot
sudo apt install certbot python3-certbot-nginx

# 为所有域名获取并安装证书
sudo certbot --nginx -d yourdomain.com -d assets.yourdomain.com

# 验证自动续期(模拟测试)
sudo certbot renew --dry-run
```

**注意:** 如果使用 MinIO 子域名(`assets.yourdomain.com`),您必须在证书请求中包含它。

**自动续期:**

Certbot 会自动设置 systemd 计时器用于证书续期。证书将在过期前自动续期。

```bash
# 检查自动续期计时器状态
sudo systemctl status certbot.timer

# 查看计时器下次运行时间
sudo systemctl list-timers certbot.timer

# 手动触发续期(仅在证书在 30 天内过期时续期)
sudo certbot renew

# 查看续期日志
sudo journalctl -u certbot.renew.service
```

续期进程每天运行两次,如果证书已续期,会自动重新加载 nginx。

##### 方案 B: 自定义 SSL 证书

```bash
# 创建 SSL 目录
sudo mkdir -p /etc/nginx/ssl/yourdomain.com

# 复制您的证书文件
sudo cp fullchain.pem /etc/nginx/ssl/yourdomain.com/
sudo cp privkey.pem /etc/nginx/ssl/yourdomain.com/

# 设置权限
sudo chmod 600 /etc/nginx/ssl/yourdomain.com/privkey.pem
sudo chown root:root /etc/nginx/ssl/yourdomain.com/*
```

#### 4. 启用和测试 Nginx

```bash
# 测试配置
sudo nginx -t

# 如果测试通过,重启 nginx
sudo systemctl restart nginx

# 启用 nginx 开机自启
sudo systemctl enable nginx

# 在浏览器中访问您的应用并验证
```

### 存储配置

#### MinIO 设置(如果使用自托管存储)

MinIO 已包含在 docker-compose.yml 中,将自动启动。

**端点:**
- **存储 API**: `http://localhost:9000`(内部), `https://assets.yourdomain.com`(公网)
- **管理控制台**: `https://yourdomain.com/minio-console/`

**首次部署后:**

```bash
# 方案 1: 通过 Web 控制台
# 1. 访问 https://yourdomain.com/minio-console/
# 2. 使用您的 MINIO_ROOT_USER/PASSWORD 登录
# 3. 创建桶 "idea-forge-storage"
# 4. 设置策略为 "public"

# 方案 2: 通过 Docker 命令
docker exec ideaforge-production-minio-1 mc alias set local http://localhost:9000 $MINIO_ROOT_USER $MINIO_ROOT_PASSWORD
docker exec ideaforge-production-minio-1 mc mb local/idea-forge-storage
docker exec ideaforge-production-minio-1 mc anonymous set download local/idea-forge-storage
```

#### 云 OSS 设置(如果使用云存储)

在部署前,在您的云服务商控制台(阿里云/腾讯云/AWS)中配置您的存储桶。

### 部署与验证

#### 1. 部署应用

```bash
cd scripts/deploy  # 或 ~/idea-forge-deploy
./deploy.sh
```

脚本将:
- 从 Docker Hub 拉取最新 Docker 镜像
- 启动 PostgreSQL、Redis 和 MinIO(如果启用)
- 运行数据库迁移
- 启动应用
- 显示服务状态

#### 2. 验证部署

```bash
# 检查所有服务是否运行
docker ps

# 预期的服务:
# - ideaforge-production-idea-forge-1 (healthy)
# - ideaforge-production-postgres-1 (healthy)
# - ideaforge-production-redis-1 (healthy)
# - ideaforge-production-minio-1 (healthy,如果使用 MinIO)

# 查看应用日志
docker logs ideaforge-production-idea-forge-1 -f

# 测试应用
curl https://yourdomain.com/api/health
# 应该返回: {"status":"ok"}

# 访问应用
# 访问: https://yourdomain.com
```

#### 3. 配置防火墙

```bash
# 仅允许必要的端口
sudo ufw allow 22    # SSH
sudo ufw allow 80    # HTTP
sudo ufw allow 443   # HTTPS
sudo ufw enable
```

### 维护与运维

#### 查看日志

```bash
cd scripts/deploy

# 应用日志
docker logs ideaforge-production-idea-forge-1 -f

# 数据库日志
docker logs ideaforge-production-postgres-1 -f

# Nginx 日志
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log
```

#### 更新应用

```bash
cd scripts/deploy

# 拉取最新镜像并重启
./deploy.sh
```

#### 数据库操作

```bash
# 访问 PostgreSQL
docker exec -it ideaforge-production-postgres-1 psql -U postgres -d ideaforge

# 备份数据库
docker exec ideaforge-production-postgres-1 pg_dump -U postgres ideaforge | gzip > backup-$(date +%Y%m%d).sql.gz

# 恢复数据库
gunzip < backup.sql.gz | docker exec -i ideaforge-production-postgres-1 psql -U postgres ideaforge
```

#### MinIO 操作(如果使用 MinIO)

```bash
# 访问 MinIO 控制台
# 访问: https://yourdomain.com/minio-console/

# 备份 MinIO 数据
docker run --rm \
  -v ideaforge_production_minio_data:/data \
  -v $(pwd):/backup \
  alpine tar czf /backup/minio-backup-$(date +%Y%m%d).tar.gz -C /data .

# 检查存储使用情况
docker exec ideaforge-production-minio-1 mc admin info local
```

#### 服务管理

```bash
cd scripts/deploy

# 停止所有服务
docker compose down

# 重启特定服务
docker compose restart idea-forge

# 查看服务状态
docker compose ps
```

#### 故障排查

**应用无法启动:**
```bash
# 检查日志中的错误
docker logs ideaforge-production-idea-forge-1

# 检查必需的服务是否运行
docker ps

# 验证环境变量
docker exec ideaforge-production-idea-forge-1 env | grep DATABASE_URL
```

**数据库连接错误:**
```bash
# 检查 PostgreSQL 是否健康
docker ps | grep postgres

# 测试连接
docker exec ideaforge-production-postgres-1 pg_isready -U postgres -d ideaforge

# 检查 .env 中的 DATABASE_URL
grep DATABASE_URL .env
```

**Nginx 502 Bad Gateway:**
```bash
# 检查应用是否运行
docker ps | grep idea-forge

# 检查端口是否监听
sudo netstat -tulpn | grep -E '5000|5001'

# 检查 nginx 日志
sudo tail -f /var/log/nginx/error.log
```

**MinIO 连接错误(如果使用 MinIO):**
```bash
# 检查 MinIO 是否运行
docker ps | grep minio

# 测试 MinIO 健康状态
curl http://localhost:9000/minio/health/live

# 检查 nginx 代理配置
sudo nginx -t
```

**SSL 证书问题:**
```bash
# 检查证书有效性
sudo certbot certificates

# 手动续期证书
sudo certbot renew --force-renewal

# 检查证书文件是否存在
ls -la /etc/nginx/ssl/yourdomain.com/
```

---

## 本地测试

在推送到生产环境前,在本地测试 Docker 部署。

### 快速开始(独立端口)

**推荐方法** - 使用不同的端口以避免与开发环境冲突。

#### 前置要求

- 已安装 Docker 和 Docker Compose
- 本地已克隆项目仓库

#### 设置

```bash
# 从项目根目录

# 步骤 1: 构建 Docker 镜像
docker build -t idea-forge:latest .

# 步骤 2: 配置本地测试
cd scripts/deploy
cp env.secrets.example .env

# 步骤 3: 编辑 .env 用于本地测试
nano .env

# 更新这些值:
#   SKIP_PULL=true
#   IMAGE_NAME=idea-forge:latest
#   BUILD_CONTEXT=../..
#   NODE_ENV=test
#   更新所有密钥(或使用测试值)

# 步骤 4: 使用独立端口部署
./deploy-local.sh
```

#### 访问点

- **应用**: http://localhost:5100
- **MinIO 控制台**: http://localhost:9101 (minioadmin/minioadmin)

**端口映射:**

| 服务 | 开发环境 | 本地测试 | 生产环境 |
|---------|------------|-----------|------------|
| API | 5000 | **5100** | 5000 |
| WebSocket | 5001 | **5101** | 5001 |
| PostgreSQL | 5432 | **5532** | 5432 |
| Redis | 6379 | **6479** | 6379 |
| MinIO API | 9000 | **9100** | 9000 |
| MinIO Console | 9001 | **9101** | 9001 |

#### 常用命令

```bash
# 查看日志
./deploy-local.sh --logs

# 重新构建并部署
./deploy-local.sh --build

# 清理所有内容
./deploy-local.sh --clean

# 查看帮助
./deploy-local.sh --help
```

### 备选方案:生产环境端口

使用与生产环境相同的端口进行测试(需要停止开发环境)。

#### 前置要求

- 停止开发服务器(pnpm dev)
- PostgreSQL 和 Redis 未在默认端口运行

#### 设置

```bash
# 步骤 1: 构建 Docker 镜像
docker build -t idea-forge:latest .

# 步骤 2: 配置本地测试
cd scripts/deploy
cp env.secrets.example .env

# 编辑 .env:
#   SKIP_PULL=true
#   IMAGE_NAME=idea-forge:latest
#   更新密钥

# 步骤 3: 部署
./deploy.sh
```

#### 访问点

- **应用**: http://localhost:5000
- **健康检查**: http://localhost:5000/api/health
- **WebSocket**: ws://localhost:5001/collaboration

#### 管理部署

```bash
# 查看日志
docker compose -f scripts/deploy/docker-compose.yml logs -f

# 停止服务
docker compose -f scripts/deploy/docker-compose.yml down

# 停止并删除所有数据
docker compose -f scripts/deploy/docker-compose.yml down -v

# 重启服务
docker compose -f scripts/deploy/docker-compose.yml restart
```

#### 故障排查

**端口冲突:**
```bash
# 检查什么在使用该端口
sudo lsof -i :5000
sudo lsof -i :5001

# 杀死使用该端口的进程
sudo kill -9 <PID>
```

**镜像构建失败:**
```bash
# 检查 Docker 磁盘空间
docker system df

# 清理未使用的镜像
docker system prune -a

# 使用详细输出构建
docker build -t idea-forge:latest . --progress=plain
```

**容器无法启动:**
```bash
# 检查日志
docker logs ideaforge-test-idea-forge-1

# 检查所有容器
docker ps -a

# 检查容器
docker inspect ideaforge-test-idea-forge-1
```

---

## 环境变量参考

完整的配置选项列表请参见 `scripts/deploy/env.secrets.example`。

**关键变量:**
- `CLIENT_APP_URL` - 您的域名 URL
- `DATABASE_URL` - PostgreSQL 连接字符串(自动配置)
- `REDIS_URL` - Redis 连接字符串(自动配置)
- `SESSION_SECRET` - 会话加密密钥
- `JWT_SECRET` - JWT 令牌签名密钥
- `OSS_PROVIDER` - 存储提供商(minio/cos/oss/s3)

**可选变量:**
- `OAUTH_*` - OAuth 提供商凭证
- `RESEND_API_KEY` - 邮件服务 API 密钥
- `SENTRY_DSN` - 错误跟踪 DSN

## 数据持久化

所有数据存储在 Docker 卷中:

**生产环境:**
- `ideaforge_production_postgres_data` - PostgreSQL 数据库
- `ideaforge_production_redis_data` - Redis 缓存
- `ideaforge_production_minio_data` - MinIO 文件存储(如果启用)

**测试环境:**
- `ideaforge_test_postgres_data`
- `ideaforge_test_redis_data`
- `ideaforge_test_minio_data`

**备份卷:**
```bash
# 列出卷
docker volume ls | grep ideaforge

# 备份卷
docker run --rm \
  -v ideaforge_production_postgres_data:/data \
  -v $(pwd):/backup \
  alpine tar czf /backup/postgres-backup.tar.gz -C /data .
```

## 安全最佳实践

- ✅ 为所有服务使用强密码(最少 16 个字符)
- ✅ 使用以下命令生成密钥: `openssl rand -base64 32`
- ✅ 使用 Let's Encrypt 证书启用 HTTPS
- ✅ 限制防火墙仅开放端口 22、80、443
- ✅ 定期更新 Docker 镜像: `./deploy.sh`
- ✅ 启用自动安全更新: `sudo apt install unattended-upgrades`
- ✅ 监控日志以发现可疑活动
- ✅ 定期备份数据库
- ✅ 永远不要将 `.env` 文件提交到版本控制

## 支持与资源

- **文档**: [主 README](../../../README.md)
- **问题**: [GitHub Issues](https://github.com/chenxiaoyao6228/idea-forge/issues)
- **讨论**: [GitHub Discussions](https://github.com/chenxiaoyao6228/idea-forge/discussions)

## 许可证

本项目根据 [LICENSE](../../../LICENSE) 授权。
