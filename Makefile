# Makefile
.PHONY: setup build test deploy

build:
	./scripts/builder/main.sh  --skip-push false

local-build:
	./scripts/builder/main.sh  --skip-push true 

local-deploy:
	./scripts/deploy/main.sh

local-test-deploy:
	make local-build && make local-deploy
