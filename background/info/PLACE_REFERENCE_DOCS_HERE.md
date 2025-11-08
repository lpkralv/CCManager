# Reference Documentation Directory

Place datasheets, technical documentation, and reference materials here.

## What to Include

- **Datasheets** (PDFs) for components and ICs
- **Application notes** from manufacturers
- **Technical articles** and whitepapers
- **API documentation** from third-party services
- **Standards and specifications** (RFC, IEEE, etc.)
- **Research papers** relevant to your project

## Examples

### Embedded Projects
- Microcontroller datasheets (e.g., ATtiny85_datasheet.pdf)
- Component datasheets (sensors, displays, motor drivers)
- Communication protocol specifications (UART, I2C, SPI)
- Application notes on low-power design
- PCB design guidelines

### Python Projects
- API documentation for external services
- Library reference manuals
- Data format specifications (JSON schema, Protobuf)
- Algorithm papers
- Performance benchmarking studies

### Web Projects
- OAuth/JWT specifications
- REST API guidelines
- Database schema documentation
- Frontend framework guides
- Accessibility standards (WCAG)

## How Claude Uses This

Claude Code can:
1. Look up electrical specifications (voltage, current, timing)
2. Understand communication protocols
3. Follow API contracts
4. Learn about algorithms and techniques
5. Verify compliance with specifications

## File Formats

Supported formats:
- ✅ **PDF** - Datasheets, papers (Claude can read PDFs)
- ✅ **Markdown** (.md) - Technical notes
- ✅ **Text** (.txt) - Specifications
- ✅ **HTML** - Saved web documentation
- ⚠️ **Binary formats** - May not be readable

## Organization Tips

```
background/info/
├── datasheets/
│   ├── ATtiny85.pdf
│   ├── LM358.pdf
│   └── SSD1306.pdf
├── protocols/
│   ├── UART_specification.md
│   └── I2C_app_note.pdf
├── apis/
│   ├── stripe_api_docs.pdf
│   └── openai_api_reference.md
└── research/
    ├── low_power_techniques.pdf
    └── audio_synthesis_algorithms.pdf
```

## Note

This is NOT where your project's documentation goes!
- Your project docs → `docs/`
- Reference materials → `background/info/`
