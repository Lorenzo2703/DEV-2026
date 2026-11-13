#!/usr/bin/env sh
set -eu
cd "$(dirname "$0")"
sh ./mvnw --batch-mode --no-transfer-progress verify
