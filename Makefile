# Makefile
.PHONY: setup build test deploy

# 环境变量
ENV ?= dev
SKIP_PUSH ?= false

# 构建
setup:
	chmod +x scripts/**/*.sh

build:
	./scripts/builder/main.sh --env $(ENV) --skip-push $(SKIP_PUSH)

# 部署
deploy:
	./scripts/deploy/main.sh --env $(ENV)

# 本地测试
test:
	./scripts/builder/main.sh --env dev --skip-push true --local-test true


## usage: make build ENV=production SKIP_PUSH=true