# Source Code Directory

Place your project's source code here.

## What Goes Here

All code that is part of YOUR project:
- Application source files
- Library implementations
- Test files (or in separate `/test` directory)
- Scripts and utilities

## Structure Examples

### Embedded (PlatformIO)
```
src/
├── main.cpp          # Main entry point
├── uart.cpp          # UART driver
├── uart.h            # UART header
├── sensors.cpp       # Sensor interface
└── config.h          # Configuration
```

### Python
```
src/
├── __init__.py
├── main.py           # Entry point
├── api/
│   ├── __init__.py
│   └── client.py
├── models/
│   └── ...
└── utils/
    └── ...
```

### Node.js/TypeScript
```
src/
├── index.ts          # Entry point
├── server.ts         # Server setup
├── routes/
│   └── ...
├── controllers/
│   └── ...
└── models/
    └── ...
```

### C/C++
```
src/
├── main.cpp
├── module_a.cpp
├── module_b.cpp
└── utils/
    └── ...
```

## During Initialization

When you run `/init`:
1. If `src/` is **empty**: Claude assumes new project from scratch
2. If `src/` has **files**: Claude analyzes them to understand project type

## Best Practices

- Keep source organized by feature or module
- Separate headers and implementation (C/C++)
- Follow project-specific conventions (see generated CLAUDE.md)
- Add comments for complex logic
