import { z } from "zod";

export const ProjectType = z.enum([
  "embedded",
  "python",
  "nodejs",
  "documentation",
  "utility",
]);
export type ProjectType = z.infer<typeof ProjectType>;

export const ProjectStatus = z.enum([
  "active",
  "design",
  "stable",
  "archived",
]);
export type ProjectStatus = z.infer<typeof ProjectStatus>;

export const Language = z.enum([
  "typescript",
  "javascript",
  "python",
  "c",
  "cpp",
  "markdown",
]);
export type Language = z.infer<typeof Language>;

export const PackageManager = z.enum([
  "npm",
  "yarn",
  "pnpm",
  "pip",
  "uv",
  "platformio",
]);
export type PackageManager = z.infer<typeof PackageManager>;

export const RelationshipType = z.enum([
  "depends-on",
  "related-to",
  "part-of",
]);
export type RelationshipType = z.infer<typeof RelationshipType>;
