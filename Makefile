# Makefile
.PHONY: setup build test deploy

build:
	chmod +x ./scripts/builder/main.sh
	./scripts/builder/main.sh  --skip-push false

local-build:
	chmod +x ./scripts/builder/main.sh
	./scripts/builder/main.sh  --skip-push true 

local-deploy:
	chmod +x ./scripts/deploy/main.sh
	./scripts/deploy/main.sh

# build and deploy on current machine
local-test-deploy:
	make local-build && make local-deploy

# build and deploy on remote machine
local-deploy-to-remote:
	chmod +x ./scripts/builder/connect-remote.sh
	./scripts/builder/connect-remote.sh

local-connect-remote-deploy:
	make build && make local-deploy-to-remote