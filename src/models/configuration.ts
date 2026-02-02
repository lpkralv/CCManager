import { z } from "zod";

export const ConfigurationFiles = z.object({
  claudeMd: z.boolean().default(false),
  mcpJson: z.boolean().default(false),
  gitignore: z.boolean().default(false),
  readme: z.boolean().default(false),

  // Node.js / TypeScript
  packageJson: z.boolean().optional(),
  tsconfigJson: z.boolean().optional(),

  // PlatformIO / Embedded
  platformioIni: z.boolean().optional(),

  // Python
  pyprojectToml: z.boolean().optional(),
  requirementsTxt: z.boolean().optional(),

  // CMake
  cmakeLists: z.boolean().optional(),
});
export type ConfigurationFiles = z.infer<typeof ConfigurationFiles>;

export const Commands = z.object({
  build: z.array(z.string()).optional(),
  test: z.array(z.string()).optional(),
  run: z.array(z.string()).optional(),
  dev: z.array(z.string()).optional(),
  lint: z.array(z.string()).optional(),
});
export type Commands = z.infer<typeof Commands>;

export const Directories = z.object({
  src: z.boolean().default(false),
  docs: z.boolean().default(false),
  tests: z.boolean().default(false),
  background: z.boolean().default(false),
});
export type Directories = z.infer<typeof Directories>;

export const ProjectConfiguration = z.object({
  files: ConfigurationFiles,
  commands: Commands.optional(),
  directories: Directories,
});
export type ProjectConfiguration = z.infer<typeof ProjectConfiguration>;
