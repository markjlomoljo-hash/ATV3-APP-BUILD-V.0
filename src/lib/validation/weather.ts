import { z } from "zod";

export const updateLocationSchema = z.object({
  permissionState: z.enum(["granted", "denied", "not_requested"]),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  labelName: z.string().max(120).optional(),
});
