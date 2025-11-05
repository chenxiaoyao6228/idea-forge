#!/bin/bash

# =============================================================================
# VS Code Settings Setup Script
# =============================================================================
# This script copies .vscode/settings-example.json to .vscode/settings.json
# if it doesn't already exist
# =============================================================================

# Get the project root directory (two levels up from this script)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$(dirname "$SCRIPT_DIR")")"

VSCODE_DIR="${PROJECT_ROOT}/.vscode"
EXAMPLE_FILE="${VSCODE_DIR}/settings-example.json"
SETTINGS_FILE="${VSCODE_DIR}/settings.json"

# Check if settings.json already exists
if [ -f "$SETTINGS_FILE" ]; then
    echo "✓ VS Code settings.json already exists"
    exit 0
fi

# Create .vscode directory if it doesn't exist
if [ ! -d "$VSCODE_DIR" ]; then
    mkdir -p "$VSCODE_DIR"
fi

# Copy example settings to settings.json
if [ -f "$EXAMPLE_FILE" ]; then
    cp "$EXAMPLE_FILE" "$SETTINGS_FILE"
    echo "✓ VS Code settings.json created successfully"
else
    echo "✗ settings-example.json not found"
    exit 1
fi
