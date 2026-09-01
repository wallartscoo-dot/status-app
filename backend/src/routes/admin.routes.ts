import { Router } from "express";
import * as adminController from "../controllers/admin.controller";
import { requireAuth, requireAdmin } from "../middleware/auth";
import { validate } from "../middleware/validate";
import {
  adminUsersQuerySchema,
  banUserSchema,
  adminStatusesQuerySchema,
  moderateStatusSchema,
  adminReportsQuerySchema,
  updateReportSchema,
  createCategorySchema,
  updateCategorySchema,
  idParamSchema,
} from "../validators/admin.validators";

const router = Router();

// Every route here requires an authenticated ADMIN. There's no separate
// "admin login" endpoint — admins sign in through the normal
// POST /api/auth/login; role is checked here, not at login time.
router.use(requireAuth, requireAdmin);

router.get("/analytics", adminController.getAnalytics);

router.get("/users", validate(adminUsersQuerySchema, "query"), adminController.listUsers);
router.patch(
  "/users/:id/ban",
  validate(idParamSchema, "params"),
  validate(banUserSchema),
  adminController.setUserBanned
);

router.get("/statuses", validate(adminStatusesQuerySchema, "query"), adminController.listStatuses);
router.patch(
  "/statuses/:id",
  validate(idParamSchema, "params"),
  validate(moderateStatusSchema),
  adminController.moderateStatus
);
router.delete("/statuses/:id", validate(idParamSchema, "params"), adminController.deleteStatus);

router.get("/reports", validate(adminReportsQuerySchema, "query"), adminController.listReports);
router.patch(
  "/reports/:id",
  validate(idParamSchema, "params"),
  validate(updateReportSchema),
  adminController.updateReport
);

router.get("/categories", adminController.listCategories);
router.post("/categories", validate(createCategorySchema), adminController.createCategory);
router.patch(
  "/categories/:id",
  validate(idParamSchema, "params"),
  validate(updateCategorySchema),
  adminController.updateCategory
);

export default router;
