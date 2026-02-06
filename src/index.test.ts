import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  validateProject,
  validateInventory,
  safeValidateProject,
  safeValidateInventory,
} from "./index.js";

function createValidProject() {
  return {
    id: "test-project",
    name: "Test Project",
    path: "/path/to/project",
    description: "A test project",
    projectType: "utility",
    status: "active",
    technology: { primaryLanguage: "typescript" },
    git: { initialized: true },
    configuration: {
      files: {
        claudeMd: true,
        mcpJson: false,
        gitignore: true,
        readme: false,
      },
      directories: { src: true, docs: false, tests: false, background: false },
    },
    metadata: {
      hasClaudeMd: true,
      lastScanned: new Date(),
      lastModified: new Date(),
    },
  };
}

function createValidInventory() {
  return {
    version: "1.0",
    projects: [createValidProject()],
    lastUpdated: new Date(),
  };
}

describe("validateProject", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should accept valid project data", () => {
    const data = createValidProject();
    const result = validateProject(data);

    expect(result.id).toBe("test-project");
    expect(result.name).toBe("Test Project");
    expect(result.path).toBe("/path/to/project");
    expect(result.projectType).toBe("utility");
    expect(result.status).toBe("active");
  });

  it("should throw on invalid data", () => {
    const invalidData = { id: "incomplete" };

    expect(() => validateProject(invalidData)).toThrow();
  });
});

describe("validateInventory", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should accept valid inventory data", () => {
    const data = createValidInventory();
    const result = validateInventory(data);

    expect(result.version).toBe("1.0");
    expect(result.projects).toHaveLength(1);
    expect(result.projects[0].id).toBe("test-project");
    expect(result.lastUpdated).toBeInstanceOf(Date);
  });

  it("should throw on invalid data", () => {
    const invalidData = { version: 123, projects: "not-an-array" };

    expect(() => validateInventory(invalidData)).toThrow();
  });
});

describe("safeValidateProject", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return success for valid data", () => {
    const data = createValidProject();
    const result = safeValidateProject(data);

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data!.id).toBe("test-project");
    expect(result.error).toBeUndefined();
  });

  it("should return error for invalid data", () => {
    const invalidData = { name: 42 };
    const result = safeValidateProject(invalidData);

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.data).toBeUndefined();
  });
});

describe("safeValidateInventory", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return success for valid data", () => {
    const data = createValidInventory();
    const result = safeValidateInventory(data);

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data!.version).toBe("1.0");
    expect(result.data!.projects).toHaveLength(1);
    expect(result.error).toBeUndefined();
  });

  it("should return error for invalid data", () => {
    const invalidData = { version: 123, projects: "not-an-array" };
    const result = safeValidateInventory(invalidData);

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.data).toBeUndefined();
  });
});
