#!/bin/bash
set -e

# 解析参数
while [[ "$#" -gt 0 ]]; do
    case $1 in
        --skip-push) SKIP_PUSH="$2"; shift ;;
        *) echo "Unknown parameter: $1"; exit 1 ;;
    esac
    shift
done

# 定义根目录路径
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

# 加载环境配置
source "${ROOT_DIR}/build-job.env"

# TODO:  npmrc 文件 存在行压缩的问题
# echo "$NPMRC" > "${ROOT_DIR}/.npmrc"

# 版本生成函数
function generate_version() {
    local date_part=$(date +"%Y%m%d")
    local time_part=$(date +"%H%M%S")
    local git_hash=""
    if git rev-parse --git-dir > /dev/null 2>&1; then
        git_hash="$(git rev-parse --short HEAD)"
    fi
    echo "${git_hash}-${date_part}-${time_part}"
}

# 生成版本号
VERSION=$(generate_version)

# Docker 构建函数
function build_image() {
    local VERSION=$1
    
    # 根据 SKIP_PUSH 决定镜像名称格式
    local IMAGE_NAME
    if [ "$SKIP_PUSH" = "true" ]; then
        IMAGE_NAME="${DOCKER_HUB_REPO}"  # 本地镜像格式
    else
        IMAGE_NAME="${DOCKER_HUB_USERNAME}/${DOCKER_HUB_REPO}"  # Docker Hub 格式
    fi
    local IMAGE_TAG="${VERSION}"

    echo "Building Docker image with tag: ${IMAGE_TAG}"
    echo "Environment: ${ENVIRONMENT}"

    # 构建参数数组
    local build_args=(
        # --no-cache
        --progress=plain
        -f "${ROOT_DIR}/scripts/builder/Dockerfile"
        -t "${IMAGE_NAME}:${IMAGE_TAG}"
        --build-arg NODE_ENV="${NODE_ENV}"
        --build-arg SENTRY_AUTH_TOKEN="${SENTRY_AUTH_TOKEN}"
        --build-arg SENTRY_AUTH_TOKEN_REACT="${SENTRY_AUTH_TOKEN_REACT}"
    )

    # Build Docker image
    docker build "${build_args[@]}" "${ROOT_DIR}"

    # Login to Docker Hub if credentials are provided
    if [ -n "$DOCKER_HUB_USERNAME" ] && [ -n "$DOCKER_HUB_PASSWORD" ]; then
        echo "Logging in to Docker Hub..."
        echo "$DOCKER_HUB_PASSWORD" | docker login -u "$DOCKER_HUB_USERNAME" --password-stdin
    fi

    # Push image if SKIP_PUSH is not true
    if [ "$SKIP_PUSH" != "true" ]; then
        echo "Pushing Docker image..."
        docker push "${IMAGE_NAME}:${IMAGE_TAG}"
    else
        echo "Skipping Docker push (SKIP_PUSH=true)"
    fi
}

# 导出环境变量函数
function export_env_vars() {
    echo "ENVIRONMENT=$ENVIRONMENT" > "${ROOT_DIR}/scripts/deploy/run.env"
    echo "SKIP_PULL=$SKIP_PUSH" >> "${ROOT_DIR}/scripts/deploy/run.env"
    echo "IMAGE_TAG=$VERSION" >> "${ROOT_DIR}/scripts/deploy/run.env"
    echo "DOCKER_HUB_USERNAME=$DOCKER_HUB_USERNAME" >> "${ROOT_DIR}/scripts/deploy/run.env"
    echo "DOCKER_HUB_PASSWORD=$DOCKER_HUB_PASSWORD" >> "${ROOT_DIR}/scripts/deploy/run.env"
    echo "DOCKER_HUB_REPO=$DOCKER_HUB_REPO" >> "${ROOT_DIR}/scripts/deploy/run.env"
}

# 执行主要流程
build_image "$VERSION"
export_env_vars

# 如果是本地测试
# if [[ "$LOCAL_TEST" == "true" ]]; then
#     echo "Starting local test environment..."
#     docker-compose -f "${ROOT_DIR}/scripts/deploy/docker-compose.local.yml" up -d
# fi

## ssh login vm

#  ssh root@120.78.192.100

## copy folder to vm
# scp -r root@120.78.192.100:/root/idea-forge/scripts/deploy/docker-compose-production.yml /root/idea-forge/scripts/deploy/docker-compose-production.yml
# scp -r root@120.78.192.100:/root/idea-forge/scripts/deploy/run.env /root/idea-forge/scripts/deploy/run.env
# scp -r root@120.78.192.100:/root/idea-forge/scripts/deploy/main.sh /root/idea-forge/scripts/deploy/main.sh

## 登录 vm 后，执行命令
# cd /root/idea-forge/scripts/deploy

# ./main.sh 