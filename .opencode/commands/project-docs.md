# /project-docs

Description: Generates standard project documentation using templates from the global `opencode-config` repository.

Usage: `bash scripts/project-docs.sh`

Logic:
1. Detects global templates repository path using `OPENCODE_CONFIG_REPO` env var or standard location conventions (`~/Scrivania/Progetti/opencode-config` or `~/opencode-config`).
2. Checks for missing files in `docs/project/`.
3. Copies templates to `docs/project/` only if they don't exist locally (idempotent).
