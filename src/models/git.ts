import { z } from "zod";

export const GitStatus = z.object({
  clean: z.boolean(),
  uncommittedChanges: z.number().int().nonnegative(),
  unpushedCommits: z.number().int().nonnegative(),
  lastCommitDate: z.coerce.date().optional(),
  lastCommitHash: z.string().optional(),
});
export type GitStatus = z.infer<typeof GitStatus>;

export const GitInfo = z.object({
  initialized: z.boolean(),
  remoteUrl: z.string().url().optional(),
  owner: z.string().optional(),
  repoName: z.string().optional(),
  defaultBranch: z.string().optional(),

  status: GitStatus.optional(),
});
export type GitInfo = z.infer<typeof GitInfo>;
