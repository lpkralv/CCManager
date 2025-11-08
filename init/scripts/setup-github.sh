#!/bin/bash
# GitHub Auto-Setup Script for CCSTARTUP
# Creates a GitHub repository and initializes git

set -e  # Exit on error

PROJECT_ROOT="${1:-.}"
PROJECT_NAME="${2:-$(basename "$(cd "$PROJECT_ROOT" && pwd)")}"
DESCRIPTION="${3:-Created with CCSTARTUP template}"

echo "🚀 Setting up GitHub repository..."
echo "Project: $PROJECT_NAME"
echo "Description: $DESCRIPTION"
echo ""

# Check if gh CLI is installed
if ! command -v gh &> /dev/null; then
    echo "❌ Error: GitHub CLI (gh) is not installed"
    echo "Install with: brew install gh"
    exit 1
fi

# Check if authenticated
if ! gh auth status &> /dev/null; then
    echo "❌ Error: Not authenticated with GitHub"
    echo "Run: gh auth login"
    exit 1
fi

cd "$PROJECT_ROOT"

# Initialize git if not already
if [ ! -d ".git" ]; then
    echo "📝 Initializing git repository..."
    git init
    echo "✅ Git initialized"
else
    echo "✅ Git already initialized"
fi

# Create .gitignore if it doesn't exist
if [ ! -f ".gitignore" ]; then
    echo "📝 Creating .gitignore..."
    cat > .gitignore << 'EOF'
# Claude Code local settings
.claude/settings.local.json

# OS files
.DS_Store
Thumbs.db

# IDE
.vscode/
.idea/

# Build outputs
build/
dist/
*.o
*.elf
*.hex
*.bin

# Dependencies
node_modules/
venv/
__pycache__/

# PlatformIO
.pio/
.pioenvs/
.piolibdeps/

# Temporary files
*.log
*.tmp
*~
EOF
    echo "✅ Created .gitignore"
fi

# Check if remote already exists
if git remote get-url origin &> /dev/null; then
    echo "✅ Git remote 'origin' already exists"
    REMOTE_URL=$(git remote get-url origin)
    echo "   URL: $REMOTE_URL"
else
    # Create GitHub repository
    echo "📝 Creating GitHub repository..."
    gh repo create "$PROJECT_NAME" --private --description "$DESCRIPTION" --source=. --remote=origin
    echo "✅ GitHub repository created"
fi

# Add all files
echo "📝 Staging files..."
git add .

# Create initial commit if no commits exist
if ! git rev-parse HEAD &> /dev/null; then
    echo "📝 Creating initial commit..."
    git commit -m "Initial commit - CCSTARTUP template

🤖 Generated with CCSTARTUP template for Claude Code
"
    echo "✅ Initial commit created"
else
    echo "✅ Repository already has commits"
fi

# Push to GitHub
echo "📝 Pushing to GitHub..."
if git push -u origin main 2>/dev/null || git push -u origin master 2>/dev/null; then
    echo "✅ Pushed to GitHub"
else
    echo "⚠️  Note: Branch may already be pushed"
fi

echo ""
echo "🎉 GitHub setup complete!"
echo ""
echo "Repository URL: $(gh repo view --json url -q .url)"
echo ""
echo "Next steps:"
echo "1. Add collaborators: gh repo edit --add-collaborator <username>"
echo "2. Configure branch protection: gh repo edit --enable-branch-protection"
