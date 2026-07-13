.PHONY: build build-web build-cli dev clean

BINARY := digit
EXE := $(shell go env GOEXE)

build: build-web build-cli

build-web:
	cd web && pnpm install && pnpm run build

build-cli:
	go build -o $(BINARY)$(EXE) .

dev:
	cd web && pnpm run dev

clean:
	rm -f $(BINARY) $(BINARY).exe
