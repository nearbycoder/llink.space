#!/usr/bin/env bash
set -euo pipefail

node_bin="$(command -v node)"
if [[ "${node_bin}" == *"bun-node"* ]]; then
	node_bin="$(which -a node | awk '!seen[$0]++' | grep -v "bun-node" | head -n 1)"
fi

if [[ -z "${node_bin}" ]]; then
	echo "Unable to resolve a Node.js binary for Playwright." >&2
	exit 1
fi

"${node_bin}" ./node_modules/@playwright/test/cli.js test "$@"
