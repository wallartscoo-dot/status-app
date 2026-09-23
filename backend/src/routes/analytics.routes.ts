import { Router } from "express";
import rateLimit from "express-rate-limit";
import * as analyticsController from "../controllers/analytics.controller";
import { optionalAuth } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { trackEventSchema } from "../validators/analytics.validators";

const router = Router();

// A generous but present limit — this endpoint fires often (screen views,
// every download/favorite/share) but should still never become an abuse
// vector for filling the events table.
const analyticsLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 120,
  standardHeaders: true,
  legacyHeaders: false,
});

router.post("/events", analyticsLimiter, optionalAuth, validate(trackEventSchema), analyticsController.trackEvent);

export default router;
