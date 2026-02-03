import { z } from "zod";

export const TaskStatus = z.enum([
  "pending",
  "running",
  "completed",
  "failed",
  "cancelled",
]);
export type TaskStatus = z.infer<typeof TaskStatus>;

export const Task = z.object({
  id: z.string().uuid(),
  projectId: z.string(),
  prompt: z.string(),
  status: TaskStatus,
  maxBudget: z.number().positive().optional(),
  createdAt: z.coerce.date(),
  startedAt: z.coerce.date().optional(),
  completedAt: z.coerce.date().optional(),
  costUsd: z.number().optional(),
  durationMs: z.number().optional(),
  output: z.string().default(""),
  error: z.string().optional(),
});
export type Task = z.infer<typeof Task>;

export const CreateTaskInput = z.object({
  projectId: z.string(),
  prompt: z.string().min(1),
  maxBudget: z.number().positive().optional(),
});
export type CreateTaskInput = z.infer<typeof CreateTaskInput>;

export const TaskResult = z.object({
  taskId: z.string().uuid(),
  success: z.boolean(),
  output: z.string(),
  error: z.string().optional(),
});
export type TaskResult = z.infer<typeof TaskResult>;

export const TaskHistory = z.object({
  tasks: z.array(Task),
  lastUpdated: z.coerce.date(),
});
export type TaskHistory = z.infer<typeof TaskHistory>;
