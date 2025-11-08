# Project Initialization Command

You are initializing a new project from the CCSTARTUP template. Follow these steps in order:

## Step 1: Read Master Instructions

First, read the master initialization instructions:

```bash
cat init/INIT_INSTRUCTIONS.md
```

This file contains the complete initialization workflow and context.

## Step 2: Detect Project Type

Run the project detection script to identify the project type:

```bash
python3 init/scripts/detect-project.py .
```

Parse the JSON output to determine:
- `detected_type`: The project type (embedded-platformio, python, nodejs, cpp, unknown)
- `confidence`: Detection confidence level (high, medium, low, none)
- `indicators_found`: Files that led to this detection

If `detected_type` is "unknown", ask the user to specify the project type.

## Step 3: Analyze Existing Content

Examine the following directories to understand the project:

1. **src/**: Check for existing source code
   - If empty: This is a new project from scratch
   - If populated: This is an existing codebase being initialized

2. **docs/**: Check for existing documentation
   - Read any existing documentation to understand project requirements
   - Look for architecture diagrams, specifications, requirements

3. **background/**: Check for reference materials
   - **background/code/**: Reference implementations
   - **background/info/**: Datasheets, technical documentation

## Step 4: Interview User (If Needed)

Based on the project type and existing content, ask the user to fill in template placeholders.

For each project type, you'll need:

### Embedded-PlatformIO
- MCU name (e.g., ATtiny85, STM32F4, ESP32)
- Clock speed (e.g., 8 MHz, 168 MHz)
- Flash and RAM sizes
- Operating voltage
- Pin assignments
- Peripherals used
- Framework (Arduino, Zephyr, bare metal)

### Python
- Python version requirement
- Dependency management tool (pip, poetry, conda)
- Project type (CLI, web service, library, ML/AI)
- Key dependencies
- Style guide (PEP 8, Black, Google)

### Node.js
- Node.js version
- Package manager (npm, yarn, pnpm)
- Language (TypeScript, JavaScript, both)
- Framework (Express, Next.js, NestJS, etc.)
- Module system (ESM, CommonJS)

### C/C++
- Compiler (GCC, Clang, MSVC)
- C++ standard (C++17, C++20, C++23)
- Build system (CMake, Make, Meson)
- Package manager (vcpkg, Conan)
- Key libraries

### All Projects
- Project description (1-2 sentences)
- GitHub username
- Repository name (can auto-generate from folder name)

**Important**: Ask questions efficiently. Group related questions together. If information can be inferred from existing files, don't ask the user.

## Step 5: Generate Project-Specific CLAUDE.md

1. Read the appropriate template from `init/templates/{{PROJECT_TYPE}}/CLAUDE.md.template`

2. Replace all placeholders (marked with `{{PLACEHOLDER}}`) with actual values from:
   - User responses
   - Detected files (e.g., read platformio.ini for MCU info)
   - Inferred defaults

3. For optional placeholders (marked with `<!--Example:...-->`), either:
   - Fill with appropriate content based on project
   - Remove the section if not applicable

4. Write the generated CLAUDE.md to the project root:
   ```bash
   # Write to CLAUDE.md (overwrite the template selector)
   ```

5. Verify the CLAUDE.md is valid and complete

## Step 6: Configure Project-Specific Agents

Based on the detected project type, activate appropriate agents:

### For Embedded Projects
Copy these agents from templates to `.claude/agents/`:
- `hardware-reviewer.md`
- `power-optimizer.md`
- `memory-monitor.md`

### For All Projects
Ensure these universal agents are present:
- `code-reviewer.md`
- `test-generator.md`

## Step 7: Setup MCP Servers

Run the MCP setup script:

```bash
bash init/scripts/setup-mcp.sh .
```

This ensures Serena and IDE MCPs are configured in `.mcp.json`.

Verify the configuration was successful.

## Step 8: Setup GitHub Repository

Ask the user: "Would you like me to create a GitHub repository for this project?"

If yes:
1. Confirm repository name (default: folder name)
2. Confirm repository description (default: from project description)
3. Confirm visibility (default: private)

Then run:
```bash
bash init/scripts/setup-github.sh . "repo-name" "description"
```

Handle any errors (e.g., gh not installed, not authenticated).

## Step 9: Create .gitignore

If `.gitignore` doesn't exist, the GitHub setup script creates one. Verify it includes appropriate entries for the project type.

## Step 10: Final Verification

Check that all essential files exist:
- [x] `CLAUDE.md` (project-specific, not template)
- [x] `.mcp.json` (configured)
- [x] `.claude/agents/` (appropriate agents)
- [x] `.gitignore` (project-appropriate)
- [x] `.git/` (initialized)
- [x] GitHub remote configured (if user requested)

## Step 11: Summary

Present a completion summary to the user:

```
✅ Project initialization complete!

**Project Type**: {{detected_type}}
**MCU/Framework**: {{key_info}}

**Configured**:
- ✅ CLAUDE.md generated with project-specific context
- ✅ MCP servers configured (Serena, IDE)
- ✅ Agents activated: {{agent_list}}
- ✅ Git repository initialized
- ✅ GitHub repository created: {{github_url}} (if applicable)

**Next Steps**:
1. Review CLAUDE.md and adjust if needed
2. Add your code to src/
3. Add documentation to docs/
4. Run project-specific build/test commands
5. Start coding with Claude Code!

**Useful Commands**:
- {{project_specific_commands}}
```

## Error Handling

If any step fails:
1. Log the error clearly
2. Explain what went wrong
3. Suggest remediation steps
4. Don't continue to dependent steps
5. Provide a way to resume from the failed step

## Notes

- This initialization is **smart**: It adapts based on detected project type and existing content
- You can re-run `/init` to update the CLAUDE.md if needed (it will detect changes)
- The `init/` folder can be deleted after initialization, but keeping it allows re-initialization
- All template files remain in `init/templates/` for reference
