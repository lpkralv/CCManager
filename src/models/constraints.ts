import { z } from "zod";

export const McuInfo = z.object({
  name: z.string(),
  clockSpeed: z.string().optional(),
  voltage: z.string().optional(),
});
export type McuInfo = z.infer<typeof McuInfo>;

export const MemoryRegion = z.object({
  total: z.number().int().positive(),
  used: z.number().int().nonnegative().optional(),
  percentUsed: z.number().min(0).max(100).optional(),
});
export type MemoryRegion = z.infer<typeof MemoryRegion>;

export const MemoryConstraints = z.object({
  flash: MemoryRegion,
  ram: MemoryRegion,
});
export type MemoryConstraints = z.infer<typeof MemoryConstraints>;

export const GpioConstraints = z.object({
  total: z.number().int().nonnegative(),
  available: z.number().int().nonnegative(),
});
export type GpioConstraints = z.infer<typeof GpioConstraints>;

export const ResourceConstraints = z.object({
  mcu: McuInfo.optional(),
  memory: MemoryConstraints.optional(),
  gpio: GpioConstraints.optional(),
  powerMode: z.string().optional(),
});
export type ResourceConstraints = z.infer<typeof ResourceConstraints>;
