#!/bin/bash
# MCP Auto-Setup Script for CCSTARTUP
# Ensures Serena and IDE MCPs are properly configured

set -e  # Exit on error

PROJECT_ROOT="${1:-.}"
MCP_CONFIG="$PROJECT_ROOT/.mcp.json"

echo "🔧 Setting up MCP servers..."

# Create .mcp.json if it doesn't exist
if [ ! -f "$MCP_CONFIG" ]; then
    echo "📝 Creating .mcp.json..."
    cat > "$MCP_CONFIG" << 'EOF'
{
  "mcpServers": {
    "serena": {
      "command": "uvx",
      "args": [
        "serena-mcp"
      ]
    },
    "ide": {
      "command": "code",
      "args": [
        "--ms-enable-electron-run-as-node",
        "/Applications/Visual Studio Code.app/Contents/Resources/app/extensions/mcp-ide/dist/index.js"
      ]
    }
  }
}
EOF
    echo "✅ Created .mcp.json with Serena and IDE MCPs"
else
    echo "✅ .mcp.json already exists"
fi

# Validate JSON
if ! python3 -m json.tool "$MCP_CONFIG" > /dev/null 2>&1; then
    echo "❌ Error: .mcp.json is not valid JSON"
    exit 1
fi

echo "✅ MCP configuration validated"

# Check if MCPs are accessible
echo ""
echo "🔍 Verifying MCP availability..."

# Check Serena (via uvx)
if command -v uvx &> /dev/null; then
    echo "✅ uvx is available (Serena MCP can be installed)"
else
    echo "⚠️  Warning: uvx not found. Install uv to use Serena MCP"
    echo "   Install with: curl -LsSf https://astral.sh/uv/install.sh | sh"
fi

# Check IDE MCP path (VS Code)
IDE_MCP_PATH="/Applications/Visual Studio Code.app/Contents/Resources/app/extensions/mcp-ide/dist/index.js"
if [ -f "$IDE_MCP_PATH" ]; then
    echo "✅ IDE MCP found at $IDE_MCP_PATH"
else
    echo "⚠️  Warning: IDE MCP not found. Make sure VS Code is installed correctly"
fi

echo ""
echo "🎉 MCP setup complete!"
echo ""
echo "Next steps:"
echo "1. Restart Claude Code to load MCP servers"
echo "2. Verify MCPs with: /mcp list"
