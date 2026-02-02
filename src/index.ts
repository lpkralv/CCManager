import * as models from "./models/index.js";
import type * as types from "./types/index.js";

// Export all schemas
export * from "./models/index.js";

// Export types namespace
export type { types };

// Validation helpers
export function validateProject(data: unknown): types.Project {
  return models.Project.parse(data);
}

export function validateInventory(data: unknown): types.ProjectInventory {
  return models.ProjectInventory.parse(data);
}

export function safeValidateProject(data: unknown): {
  success: boolean;
  data?: types.Project;
  error?: Error;
} {
  const result = models.Project.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}

export function safeValidateInventory(data: unknown): {
  success: boolean;
  data?: types.ProjectInventory;
  error?: Error;
} {
  const result = models.ProjectInventory.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}

// Main entry point for testing
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log("Claude Code Manager - Project Inventory Data Model");
  console.log("Available schemas:", Object.keys(models).join(", "));
}
