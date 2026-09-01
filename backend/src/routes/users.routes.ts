import { Router } from "express";
import * as usersController from "../controllers/users.controller";
import { requireAuth } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { updateMeSchema } from "../validators/auth.validators";

const router = Router();

router.get("/me", requireAuth, usersController.getMe);
router.patch("/me", requireAuth, validate(updateMeSchema), usersController.updateMe);

export default router;
