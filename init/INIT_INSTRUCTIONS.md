# CCSTARTUP - Initialization Instructions

**Version**: 1.0.0
**Purpose**: Automated project initialization for Claude Code

This document provides complete instructions for Claude Code to automatically initialize a new project from the CCSTARTUP template.

---

## Overview

CCSTARTUP is a universal starter template for Claude Code projects. It supports:
- **Embedded/PlatformIO**: Firmware for microcontrollers (AVR, ARM, ESP32, etc.)
- **Python**: Applications, libraries, data science, ML/AI
- **Node.js/TypeScript**: Web apps, APIs, CLI tools
- **C/C++**: Native applications and libraries

The initialization process:
1. Detects project type automatically
2. Generates project-specific CLAUDE.md
3. Configures MCPs (Serena + IDE)
4. Sets up GitHub repository
5. Activates appropriate agents

---

## Directory Structure

```
CCSTARTUP/
├── init/                          # Initialization system (this folder)
│   ├── INIT_INSTRUCTIONS.md       # This file (master guide)
│   ├── init-config.json           # Configuration and rules
│   ├── templates/                 # Project-type templates
│   │   ├── embedded-platformio/
│   │   │   └── CLAUDE.md.template
│   │   ├── python/
│   │   │   └── CLAUDE.md.template
│   │   ├── nodejs/
│   │   │   └── CLAUDE.md.template
│   │   └── cpp/
│   │       └── CLAUDE.md.template
│   └── scripts/                   # Automation scripts
│       ├── detect-project.py      # Project type detection
│       ├── setup-mcp.sh           # MCP configuration
│       └── setup-github.sh        # GitHub setup
├── .claude/                       # Claude Code configuration
│   ├── agents/                    # Specialized agents
│   │   ├── code-reviewer.md       # Universal: Code quality
│   │   ├── test-generator.md      # Universal: Test generation
│   │   ├── hardware-reviewer.md   # Embedded: HW validation
│   │   ├── power-optimizer.md     # Embedded: Power analysis
│   │   └── memory-monitor.md      # Embedded: Memory tracking
│   └── commands/
│       └── init.md                # /init command definition
├── .mcp.json                      # Pre-configured MCP servers
├── src/                           # User drops code here
├── docs/                          # User drops docs here
└── background/                    # Reference materials
    ├── code/                      # Reference implementations
    └── info/                      # Technical docs, datasheets
```

---

## Initialization Workflow

### Phase 1: Detection & Analysis

#### Step 1.1: Detect Project Type

Run the detection script:

```bash
python3 init/scripts/detect-project.py .
```

**Expected output** (JSON):
```json
{
  "detected_type": "embedded-platformio",
  "confidence": "high",
  "indicators_found": ["platformio.ini"],
  "description": "PlatformIO embedded project"
}
```

**Possible types**:
- `embedded-platformio`: PlatformIO project
- `python`: Python project
- `nodejs`: Node.js/TypeScript project
- `cpp`: C/C++ project
- `unknown`: No indicators found

**If unknown**: Ask user to specify project type.

#### Step 1.2: Analyze Existing Content

Check what the user has already provided:

**src/ directory**:
- Empty → New project from scratch
- Has files → Existing codebase being initialized
- If has files, analyze them to extract information (e.g., read platformio.ini for MCU details)

**docs/ directory**:
- Read any existing documentation
- Look for specifications, requirements, architecture diagrams
- Use this to populate template placeholders

**background/ directory**:
- **background/code/**: Reference implementations to learn from
- **background/info/**: Datasheets, technical docs, app notes

#### Step 1.3: Load Project Configuration

Read `init/init-config.json` to get:
- Template path for detected project type
- Required vs optional placeholders
- Agents to activate
- Default settings

---

### Phase 2: Information Gathering

#### Step 2.1: Extract Available Information

Before asking user, try to extract information from existing files:

**For embedded-platformio**:
```ini
# Read platformio.ini
[env:attiny85]
platform = atmelavr
board = attiny85
board_build.f_cpu = 8000000L

# Extract:
MCU_NAME = "ATtiny85"
CLOCK_SPEED = "8 MHz"
```

**For Python**:
```toml
# Read pyproject.toml
[project]
name = "my-project"
description = "My awesome project"
requires-python = ">=3.11"

# Extract:
PROJECT_DESCRIPTION = "My awesome project"
PYTHON_VERSION = "3.11+"
PACKAGE_NAME = "my-project"
```

**For Node.js**:
```json
// Read package.json
{
  "name": "my-app",
  "description": "My web app",
  "engines": {
    "node": ">=18.0.0"
  }
}

// Extract:
PROJECT_DESCRIPTION = "My web app"
NODE_VERSION = "18.x"
```

#### Step 2.2: Interview User for Missing Information

**Only ask for information you couldn't extract!**

Use the `AskUserQuestion` tool efficiently. Group related questions:

**Example for embedded project**:
```
Questions:
1. What's the main purpose of this firmware? (1-2 sentences)
2. What peripherals are you using? (Select all that apply)
   - UART
   - SPI
   - I2C
   - ADC
   - PWM
   - Timers
3. What's your GitHub username? (auto-detected from git config if possible)
```

**Smart defaults**:
- GitHub username: Read from `git config user.name`
- Repository name: Use current folder name
- Framework: Infer from platformio.ini or package.json

---

### Phase 3: Template Processing

#### Step 3.1: Read Template

Load the appropriate template based on detected project type:

```bash
cat init/templates/{{PROJECT_TYPE}}/CLAUDE.md.template
```

#### Step 3.2: Replace Placeholders

**Required placeholders** (marked with `{{PLACEHOLDER}}`):
- Must be filled with actual values
- If value missing, use sensible default or ask user

**Optional placeholders** (in `<!--Example:...-->`):
- Fill if information available
- Remove section if not applicable
- Keep example as comment if user might fill later

**Replacement strategy**:
```
{{PROJECT_DESCRIPTION}} → Actual description from user or docs
{{MCU_NAME}} → "ATtiny85" (from platformio.ini)
{{CLOCK_SPEED}} → "8 MHz" (from platformio.ini)

<!--Example: Pin assignments--> →
If known: Replace with actual pin table
If unknown: Keep comment for user to fill later
```

#### Step 3.3: Write Generated CLAUDE.md

Write the processed template to the project root:

```bash
# Overwrites the template file
cat > CLAUDE.md << 'EOF'
[Generated content]
EOF
```

**Important**: The generated CLAUDE.md should be complete, coherent, and project-specific.

---

### Phase 4: Configuration

#### Step 4.1: Verify MCP Configuration

The `.mcp.json` is pre-configured, but verify it's valid:

```bash
bash init/scripts/setup-mcp.sh .
```

This script:
- Creates `.mcp.json` if missing
- Validates JSON syntax
- Checks if MCPs are accessible

**Expected MCPs**:
- **serena**: Semantic code navigation (@serenaai/mcp-server)
- **ide**: VS Code integration (built-in)

#### Step 4.2: Activate Project-Specific Agents

Based on project type, ensure appropriate agents are available:

**For embedded-platformio**:
- ✅ code-reviewer.md (universal)
- ✅ test-generator.md (universal)
- ✅ hardware-reviewer.md (embedded-specific)
- ✅ power-optimizer.md (embedded-specific)
- ✅ memory-monitor.md (embedded-specific)

**For other project types**:
- ✅ code-reviewer.md (universal)
- ✅ test-generator.md (universal)

Agents are already in `.claude/agents/`, so just verify they exist.

---

### Phase 5: GitHub Setup

#### Step 5.1: Ask User Permission

**Always ask before creating GitHub repo**:

```
Would you like me to create a GitHub repository for this project?

Options:
- Yes, create private repository
- Yes, create public repository
- No, I'll do it manually
```

#### Step 5.2: Run GitHub Setup Script

If user agrees:

```bash
bash init/scripts/setup-github.sh . "repo-name" "description"
```

This script:
1. Initializes git (if not already)
2. Creates `.gitignore` (project-appropriate)
3. Creates GitHub repo via `gh` CLI
4. Sets up remote
5. Makes initial commit
6. Pushes to GitHub

**Error handling**:
- If `gh` not installed → Provide installation instructions
- If not authenticated → Run `gh auth login`
- If repo already exists → Ask user to resolve

---

### Phase 6: Validation & Summary

#### Step 6.1: Verify Initialization

Check that all essential components exist:

```bash
# Must exist
- [ ] CLAUDE.md (not template, actual project file)
- [ ] .mcp.json (valid JSON)
- [ ] .claude/agents/code-reviewer.md
- [ ] .claude/agents/test-generator.md
- [ ] .gitignore
- [ ] .git/ (if GitHub setup ran)

# For embedded projects
- [ ] .claude/agents/hardware-reviewer.md
- [ ] .claude/agents/power-optimizer.md
- [ ] .claude/agents/memory-monitor.md
```

#### Step 6.2: Present Summary

Show completion summary to user:

```markdown
✅ **Project Initialization Complete!**

**Project Type**: Embedded PlatformIO (ATtiny85)
**Repository**: https://github.com/username/repo-name

**Configured Components**:
- ✅ CLAUDE.md generated with hardware specs
- ✅ MCP servers: Serena, IDE
- ✅ Agents: code-reviewer, test-generator, hardware-reviewer, power-optimizer, memory-monitor
- ✅ Git initialized
- ✅ GitHub repository created (private)

**Project Details**:
- MCU: ATtiny85 @ 8 MHz
- Flash: 8,192 bytes
- RAM: 512 bytes
- Framework: Arduino/PlatformIO

**Next Steps**:
1. Review and customize CLAUDE.md as needed
2. Add your firmware code to src/
3. Add documentation to docs/
4. Run: `pio run` to build
5. Start coding with Claude Code!

**Useful Commands**:
- Build: `pio run`
- Upload: `pio run --target upload`
- Monitor: `pio device monitor`
- Test: `pio test`

**Need help?** Type `/help` or ask me anything!
```

---

## Template Placeholder Reference

### Common to All Projects

| Placeholder | Description | Example | Required |
|-------------|-------------|---------|----------|
| `{{PROJECT_DESCRIPTION}}` | 1-2 sentence description | "Firmware for coin-watch peripheral controller" | Yes |
| `{{GITHUB_REPO}}` | GitHub URL | "github.com/user/repo" | Yes |
| `{{GITHUB_USER}}` | GitHub username | "lpkralv" | Yes |

### Embedded-Specific

| Placeholder | Description | Example | Required |
|-------------|-------------|---------|----------|
| `{{MCU_NAME}}` | Microcontroller | "ATtiny85" | Yes |
| `{{CLOCK_SPEED}}` | Clock frequency | "8 MHz" | Yes |
| `{{FLASH_SIZE}}` | Program memory | "8 KB" | Yes |
| `{{RAM_SIZE}}` | Data memory | "512 bytes" | Yes |
| `{{VOLTAGE}}` | Operating voltage | "3.3V" | Yes |
| `{{PIN_ASSIGNMENTS}}` | Pin table | See template | No |
| `{{PERIPHERALS_LIST}}` | Used peripherals | "UART, ADC, PWM" | No |
| `{{FRAMEWORK}}` | Development framework | "Arduino" | No |

### Python-Specific

| Placeholder | Description | Example | Required |
|-------------|-------------|---------|----------|
| `{{PYTHON_VERSION}}` | Python version | "3.11+" | Yes |
| `{{PROJECT_TYPE}}` | Type of project | "CLI tool" | Yes |
| `{{DEPENDENCY_TOOL}}` | Package manager | "pip" | Yes |
| `{{REQUIREMENTS_FILE}}` | Dependencies file | "requirements.txt" | Yes |
| `{{TEST_FRAMEWORK}}` | Test framework | "pytest" | No |

### Node.js-Specific

| Placeholder | Description | Example | Required |
|-------------|-------------|---------|----------|
| `{{NODE_VERSION}}` | Node.js version | "18.x" | Yes |
| `{{PROJECT_TYPE}}` | Project type | "web app" | Yes |
| `{{PACKAGE_MANAGER}}` | Package manager | "npm" | Yes |
| `{{LANGUAGE}}` | Language | "TypeScript" | Yes |
| `{{FRAMEWORK}}` | Framework | "Express" | No |

### C/C++-Specific

| Placeholder | Description | Example | Required |
|-------------|-------------|---------|----------|
| `{{COMPILER}}` | Compiler | "GCC 11+" | Yes |
| `{{CPP_STANDARD}}` | C++ standard | "C++20" | Yes |
| `{{BUILD_SYSTEM}}` | Build system | "CMake" | Yes |
| `{{PACKAGE_MANAGER}}` | Dependency manager | "vcpkg" | No |

---

## Error Handling

### Detection Fails (Unknown Project)

```
⚠️  Could not automatically detect project type.

Found in src/:
- 10 .py files
- 3 .js files
- No platformio.ini, package.json, or pyproject.toml

Please select project type manually:
1. Embedded PlatformIO
2. Python
3. Node.js/TypeScript
4. C/C++
```

### Missing Required Information

```
❌ Missing required information for embedded-platformio template:

Required placeholders:
- MCU_NAME: Not found in platformio.ini
- FLASH_SIZE: Not specified
- RAM_SIZE: Not specified

Please provide this information to continue.
```

### GitHub Setup Fails

```
❌ GitHub setup failed:

Error: GitHub CLI (gh) not installed

To fix:
1. Install GitHub CLI: brew install gh
2. Authenticate: gh auth login
3. Re-run: /init
```

### Script Execution Fails

```
❌ Project detection failed:

Error: Python 3 not found

To fix:
1. Install Python 3: brew install python3
2. Re-run: /init

Alternatively, I can proceed with manual project type selection.
```

---

## Best Practices

### 1. Minimize User Friction

- Extract information automatically when possible
- Use smart defaults
- Group questions efficiently
- Don't ask for information you can infer

### 2. Validate Everything

- Check file existence before reading
- Validate JSON syntax
- Verify scripts are executable
- Test that generated CLAUDE.md is complete

### 3. Provide Clear Feedback

- Show progress during initialization
- Explain what each step does
- Report errors clearly with solutions
- Summarize what was configured

### 4. Handle Edge Cases

- Project already initialized (has CLAUDE.md)
- Mixed indicators (multiple project types)
- Missing dependencies (gh, npm, python3)
- Offline mode (can't create GitHub repo)

### 5. Be Idempotent

- Re-running /init should be safe
- Don't overwrite user customizations
- Warn before overwriting files
- Allow selective re-initialization

---

## Maintenance Notes

### Updating Templates

When adding new placeholders or sections to templates:
1. Update `init-config.json` with new placeholders
2. Categorize as required or optional
3. Update this document's placeholder reference
4. Test with real projects

### Adding New Project Types

To add a new project type (e.g., Rust, Go):
1. Create `init/templates/{{TYPE}}/CLAUDE.md.template`
2. Add entry to `init-config.json` under `project_types`
3. Update `detect-project.py` with detection logic
4. Add agents if type-specific (e.g., Rust borrowing checker agent)
5. Test thoroughly

### Version Management

- Bump `version` in `init-config.json` for changes
- Document changes in this file
- Maintain backward compatibility when possible

---

## Appendix: Quick Reference

### Commands to Run During /init

```bash
# 1. Detect project type
python3 init/scripts/detect-project.py .

# 2. Setup MCPs
bash init/scripts/setup-mcp.sh .

# 3. Setup GitHub (if user approves)
bash init/scripts/setup-github.sh . "repo-name" "description"
```

### Files to Create/Modify

```
[Create] CLAUDE.md (from template)
[Verify] .mcp.json (already exists)
[Verify] .claude/agents/* (already exist)
[Create] .gitignore (via setup-github.sh)
[Create] .git/ (via setup-github.sh)
```

### Validation Checklist

- [ ] Project type detected or user-selected
- [ ] All required placeholders filled
- [ ] CLAUDE.md generated and valid
- [ ] .mcp.json exists and valid
- [ ] Appropriate agents present
- [ ] Git initialized (if GitHub setup)
- [ ] GitHub repo created (if user requested)
- [ ] .gitignore appropriate for project type
- [ ] Summary presented to user

---

**End of Initialization Instructions**

For questions or issues, refer to the main CCSTARTUP documentation or ask the user for clarification.
