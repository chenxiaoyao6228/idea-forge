#!/bin/bash
set -e

# Parse arguments
while [[ "$#" -gt 0 ]]; do
    case $1 in
        --skip-push) SKIP_PUSH="$2"; shift ;;
        *) echo "Unknown parameter: $1"; exit 1 ;;
    esac
    shift
done

# Define root directory path
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

# Get the directory where the script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"


# Load environment configuration
source "${SCRIPT_DIR}/build-job.env"

function check_env_vars() {
    local missing_vars=()
    
    # Docker Hub related variables
    if [ -z "$DOCKER_HUB_USERNAME" ]; then
        missing_vars+=("DOCKER_HUB_USERNAME")
    fi
    if [ -z "$DOCKER_HUB_PASSWORD" ]; then
        missing_vars+=("DOCKER_HUB_PASSWORD")
    fi
    if [ -z "$DOCKER_HUB_REPO" ]; then
        missing_vars+=("DOCKER_HUB_REPO")
    fi
    
    # Build related variables
    if [ -z "$SENTRY_AUTH_TOKEN" ]; then
        missing_vars+=("SENTRY_AUTH_TOKEN")
    fi
    if [ -z "$SENTRY_AUTH_TOKEN_REACT" ]; then
        missing_vars+=("SENTRY_AUTH_TOKEN_REACT")
    fi
    
    # if [ -z "$SENTRY_DSN" ]; then
    #     missing_vars+=("SENTRY_DSN")
    # fi
    
    # Environment variables
    if [ -z "$ENV" ]; then
        missing_vars+=("ENV")
    fi
    
    # Other required tokens
    if [ -z "$DOTENV_KEY" ]; then
        missing_vars+=("DOTENV_KEY")
    fi
    if [ -z "$TIPTAP_AUTH_TOKEN" ]; then
        missing_vars+=("TIPTAP_AUTH_TOKEN")
    fi
    
    # If any variables are missing, print them and exit
    if [ ${#missing_vars[@]} -ne 0 ]; then
        echo "Error: The following required environment variables are not set:"
        printf '%s\n' "${missing_vars[@]}"
        exit 1
    fi
}

check_env_vars

# Create .npmrc file if it doesn't exist
if [ ! -f "${ROOT_DIR}/.npmrc" ]; then
    cat > "${ROOT_DIR}/.npmrc" << EOL
link-workspace-packages=true
EOL
fi

# Version generation function
function generate_version() {
    local date_part=$(date +"%Y%m%d")
    local time_part=$(date +"%H%M%S")
    local git_hash=""
    if git rev-parse --git-dir > /dev/null 2>&1; then
        git_hash="$(git rev-parse --short HEAD)"
    fi
    echo "${git_hash}-${date_part}-${time_part}"
}

# Generate version number
VERSION=$(generate_version)

# Docker build function
function build_image() {
    local VERSION=$1
    
    # Determine image name format based on SKIP_PUSH
    local IMAGE_NAME
    if [ "$SKIP_PUSH" = "true" ]; then
        IMAGE_NAME="${DOCKER_HUB_REPO}"  # Local image format
    else
        IMAGE_NAME="${DOCKER_HUB_USERNAME}/${DOCKER_HUB_REPO}"  # Docker Hub format
    fi
    local IMAGE_TAG="${VERSION}"

    echo "Building Docker image with tag: ${IMAGE_TAG}"
    echo "Environment: ${ENVIRONMENT}"

    # Build parameter array
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

# Export environment variables function
function export_env_vars() {
    echo "ENVIRONMENT=$ENV" > "${ROOT_DIR}/scripts/deploy/.env"
    echo "SKIP_PULL=$SKIP_PUSH" >> "${ROOT_DIR}/scripts/deploy/.env"
    echo "IMAGE_TAG=$VERSION" >> "${ROOT_DIR}/scripts/deploy/.env"
    echo "DOCKER_HUB_USERNAME=$DOCKER_HUB_USERNAME" >> "${ROOT_DIR}/scripts/deploy/.env"
    echo "DOCKER_HUB_PASSWORD=$DOCKER_HUB_PASSWORD" >> "${ROOT_DIR}/scripts/deploy/.env"
    echo "DOCKER_HUB_REPO=$DOCKER_HUB_REPO" >> "${ROOT_DIR}/scripts/deploy/.env"
    echo "DOTENV_KEY=$DOTENV_KEY" >> "${ROOT_DIR}/scripts/deploy/.env"
    echo "POSTGRES_USER=$POSTGRES_USER" >> "${ROOT_DIR}/scripts/deploy/.env"
    echo "POSTGRES_PASSWORD=$POSTGRES_PASSWORD" >> "${ROOT_DIR}/scripts/deploy/.env"
}

# Execute main process
build_image "$VERSION"
export_env_vars
