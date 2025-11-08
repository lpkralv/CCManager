# Background Materials

This directory contains reference materials that provide context to Claude Code but are not part of your project's source code or documentation.

## Structure

### `/background/code/`
Place reference implementations, example code, or code snippets here:
- Working examples from similar projects
- Code samples from tutorials or articles
- Reference implementations of algorithms
- Open-source libraries to study

**Example**:
```
background/code/
├── uart_example.c          # Reference UART implementation
├── state_machine.py        # Example state machine pattern
└── audio_synthesis/        # Complete example project
    └── ...
```

### `/background/info/`
Place technical documentation and reference materials here:
- Datasheets (PDFs)
- Application notes
- Technical articles
- API documentation
- Standards and specifications

**Example**:
```
background/info/
├── ATtiny85_datasheet.pdf
├── UART_protocol_spec.md
├── piezo_speaker_tuning.pdf
└── low_power_techniques.md
```

## Usage

Claude Code can read these files to:
- Understand hardware constraints (datasheets)
- Learn design patterns (reference code)
- Follow specifications (technical docs)
- Get implementation ideas (example projects)

## Best Practices

1. **Organize by topic**: Group related materials together
2. **Use descriptive names**: `ATtiny85_datasheet.pdf` not `datasheet.pdf`
3. **Include README**: Add README.md in subdirectories if complex
4. **Keep it relevant**: Only include materials Claude might need
5. **Don't duplicate src/docs**: Source code goes in `src/`, project docs in `docs/`

## Difference from `/docs`

- **`/docs`**: YOUR project's documentation (design decisions, architecture, guides)
- **`/background`**: REFERENCE materials from external sources

Think of `/background` as your project's research library.
