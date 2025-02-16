# Makefile
.PHONY: setup build test deploy

# 环境变量
ENV ?= PRODUCTION

# 构建
setup:
	chmod +x scripts/**/*.sh

build:
	./scripts/builder/main.sh  --skip-push false

local-build:
	./scripts/builder/main.sh  --skip-push true 

# 部署
local-deploy:
	./scripts/deploy/main.sh

local-test-deploy:
	make local-build && make local-deploy

## usage: make build ENV=production SKIP_PUSH=true