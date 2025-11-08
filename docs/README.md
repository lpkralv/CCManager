# Documentation Directory

Place your project's documentation here.

## What Goes Here

All documentation specific to YOUR project:
- Architecture documentation
- Design decisions (ADRs - Architecture Decision Records)
- API documentation
- User guides
- Development guides
- Hardware specifications (for embedded projects)

## Recommended Structure

### For All Projects
```
docs/
├── README.md                  # Documentation index
├── architecture.md            # System architecture
├── getting_started.md         # Setup guide
├── api/                       # API documentation
│   └── endpoints.md
└── decisions/                 # ADRs
    └── 001-use-typescript.md
```

### For Embedded Projects
```
docs/
├── HardwareDefinition.md      # Pin assignments, specs
├── Design_Summary.md          # Overall design
├── power_budget.md            # Power consumption analysis
├── memory_budget.md           # Flash/RAM allocation
└── testing_procedures.md      # Hardware testing
```

## Document Types

### Architecture Documentation
- High-level system design
- Component relationships
- Data flow diagrams
- Technology choices

### Design Decisions (ADRs)
- Why certain choices were made
- Alternatives considered
- Trade-offs evaluated
- Template:
  ```markdown
  # ADR-001: Decision Title

  ## Status
  Accepted

  ## Context
  [What is the issue we're facing?]

  ## Decision
  [What is the decision we've made?]

  ## Consequences
  [What are the trade-offs?]
  ```

### API Documentation
- Endpoint descriptions
- Request/response formats
- Authentication requirements
- Usage examples

### Hardware Specifications (Embedded)
- Pin assignments
- Electrical specifications
- Power requirements
- Memory allocation
- Communication protocols

## During Initialization

When you run `/init`, Claude will:
- Read existing docs to understand project requirements
- Use information to populate CLAUDE.md template
- Reference specs for implementation guidance

## Best Practices

- Keep docs up to date with code
- Use diagrams where helpful
- Include examples
- Link between related docs
- Version control all documentation

## Difference from `/background`

- **`/docs`**: YOUR project's documentation (what you're building)
- **`/background`**: REFERENCE materials (external sources, datasheets)
