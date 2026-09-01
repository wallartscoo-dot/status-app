import { z } from "zod";
import { ANALYTICS_EVENT_TYPES } from "../services/analytics.service";

export const trackEventSchema = z.object({
  eventType: z.enum(ANALYTICS_EVENT_TYPES),
  metadata: z.record(z.unknown()).optional().default({}),
});
