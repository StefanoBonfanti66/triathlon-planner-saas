#!/bin/bash
# Logic for /project-docs

# 1. Determine Global Template Path
# Priority:
#   a) OPENCODE_CONFIG_REPO env var
#   b) ~/Scrivania/Progetti/opencode-config
#   c) ~/opencode-config
if [ -n "$OPENCODE_CONFIG_REPO" ]; then
    GLOBAL_TEMPLATES_DIR="$OPENCODE_CONFIG_REPO/templates"
elif [ -d "$HOME/Scrivania/Progetti/opencode-config/templates" ]; then
    GLOBAL_TEMPLATES_DIR="$HOME/Scrivania/Progetti/opencode-config/templates"
elif [ -d "$HOME/opencode-config/templates" ]; then
    GLOBAL_TEMPLATES_DIR="$HOME/opencode-config/templates"
else
    echo "Error: Could not locate global templates repository."
    exit 1
fi

DOCS_DIR="docs/project"
REQUIRED_FILES=("technical-spec.md" "runbook.md" "org-chart.md")

mkdir -p "$DOCS_DIR"

for file in "${REQUIRED_FILES[@]}"; do
    if [ ! -f "$DOCS_DIR/$file" ]; then
        if [ -f "$GLOBAL_TEMPLATES_DIR/$file" ]; then
            echo "Copying $file from $GLOBAL_TEMPLATES_DIR..."
            cp "$GLOBAL_TEMPLATES_DIR/$file" "$DOCS_DIR/$file"
        else
            echo "Warning: $file not found in global templates at $GLOBAL_TEMPLATES_DIR."
        fi
    else
        echo "$DOCS_DIR/$file already exists. Skipping."
    fi
done

