#!/usr/bin/env python3
"""
Project Type Detection Script for CCSTARTUP
Scans the project directory and detects the project type based on indicator files.
"""

import os
import sys
import json
from pathlib import Path


def detect_project_type(project_root="."):
    """
    Detect project type based on indicator files.

    Returns:
        str: One of 'embedded-platformio', 'python', 'nodejs', 'cpp', 'unknown'
    """
    project_path = Path(project_root).resolve()

    # Detection rules (order matters - more specific first)
    detectors = [
        {
            "type": "embedded-platformio",
            "indicators": ["platformio.ini"],
            "description": "PlatformIO embedded project"
        },
        {
            "type": "nodejs",
            "indicators": ["package.json"],
            "description": "Node.js project"
        },
        {
            "type": "python",
            "indicators": ["pyproject.toml", "requirements.txt", "setup.py", "setup.cfg"],
            "description": "Python project"
        },
        {
            "type": "cpp",
            "indicators": ["CMakeLists.txt", "Makefile"],
            "description": "C/C++ project",
            "requires_cpp_files": True  # Must also have .cpp/.c/.h files
        }
    ]

    results = {
        "detected_type": "unknown",
        "confidence": "none",
        "indicators_found": [],
        "description": "Unknown project type"
    }

    # Check each detector
    for detector in detectors:
        found_indicators = []

        # Check if any indicator files exist
        for indicator in detector["indicators"]:
            if (project_path / indicator).exists():
                found_indicators.append(indicator)

        if found_indicators:
            # Additional check for C/C++ projects
            if detector.get("requires_cpp_files"):
                cpp_files = list(project_path.rglob("*.cpp")) + \
                           list(project_path.rglob("*.c")) + \
                           list(project_path.rglob("*.h"))
                if not cpp_files:
                    continue  # Not a C/C++ project

            results["detected_type"] = detector["type"]
            results["confidence"] = "high" if len(found_indicators) > 1 else "medium"
            results["indicators_found"] = found_indicators
            results["description"] = detector["description"]
            break

    # Additional checks for better confidence
    if results["detected_type"] == "unknown":
        # Check for source files without project files
        src_path = project_path / "src"
        if src_path.exists():
            py_files = list(src_path.rglob("*.py"))
            cpp_files = list(src_path.rglob("*.cpp")) + list(src_path.rglob("*.c"))
            js_files = list(src_path.rglob("*.js")) + list(src_path.rglob("*.ts"))

            if py_files:
                results["detected_type"] = "python"
                results["confidence"] = "low"
                results["description"] = "Python project (detected from .py files)"
            elif cpp_files:
                results["detected_type"] = "cpp"
                results["confidence"] = "low"
                results["description"] = "C/C++ project (detected from source files)"
            elif js_files:
                results["detected_type"] = "nodejs"
                results["confidence"] = "low"
                results["description"] = "Node.js project (detected from .js/.ts files)"

    return results


def main():
    """Main entry point for CLI usage."""
    project_root = sys.argv[1] if len(sys.argv) > 1 else "."

    result = detect_project_type(project_root)

    # Output as JSON for easy parsing
    print(json.dumps(result, indent=2))

    # Exit code: 0 if detected, 1 if unknown
    return 0 if result["detected_type"] != "unknown" else 1


if __name__ == "__main__":
    sys.exit(main())
