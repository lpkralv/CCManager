import { z } from "zod";
import { ProjectType, ProjectStatus, RelationshipType } from "./enums.js";
import { TechnologyStack } from "./technology.js";
import { GitInfo } from "./git.js";
import { ProjectConfiguration } from "./configuration.js";
import { ResourceConstraints } from "./constraints.js";

export const ProjectRelationship = z.object({
  type: RelationshipType,
  targetProject: z.string(),
  description: z.string().optional(),
});
export type ProjectRelationship = z.infer<typeof ProjectRelationship>;

export const ProjectMetadata = z.object({
  hasClaudeMd: z.boolean(),
  claudeMdHash: z.string().optional(),
  lastScanned: z.coerce.date(),
  lastModified: z.coerce.date(),
});
export type ProjectMetadata = z.infer<typeof ProjectMetadata>;

export const Project = z.object({
  id: z.string(),
  name: z.string(),
  path: z.string(),
  description: z.string(),
  projectType: ProjectType,
  status: ProjectStatus,

  technology: TechnologyStack,
  git: GitInfo,
  configuration: ProjectConfiguration,
  constraints: ResourceConstraints.optional(),
  relationships: z.array(ProjectRelationship).default([]),

  metadata: ProjectMetadata,
});
export type Project = z.infer<typeof Project>;

export const ProjectInventory = z.object({
  version: z.string(),
  lastUpdated: z.coerce.date(),
  projects: z.array(Project),
});
export type ProjectInventory = z.infer<typeof ProjectInventory>;
