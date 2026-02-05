import { z } from "zod";
import { Language, PackageManager } from "./enums.js";

export const Dependency = z.object({
  name: z.string(),
  version: z.string().optional(),
  purpose: z.string().optional(),
});
export type Dependency = z.infer<typeof Dependency>;

export const VersionInfo = z.object({
  language: z.string().optional(),
  framework: z.string().optional(),
  runtime: z.string().optional(),
});
export type VersionInfo = z.infer<typeof VersionInfo>;

export const Dependencies = z.object({
  core: z.array(Dependency).default([]),
  dev: z.array(Dependency).default([]),
});
export type Dependencies = z.infer<typeof Dependencies>;

export const TechnologyStack = z.object({
  primaryLanguage: Language,
  framework: z.string().optional(),
  runtime: z.string().optional(),

  versions: VersionInfo.optional(),

  packageManager: PackageManager.optional(),
  buildSystem: z.string().optional(),
  testFramework: z.string().optional(),

  dependencies: Dependencies.optional(),
});
export type TechnologyStack = z.infer<typeof TechnologyStack>;
