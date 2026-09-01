import { Router } from "express";
import authRoutes from "./auth.routes";
import usersRoutes from "./users.routes";
import statusRoutes from "./status.routes";
import categoriesRoutes from "./categories.routes";
import favoritesRoutes from "./favorites.routes";
import downloadsRoutes from "./downloads.routes";
import creatorsRoutes from "./creators.routes";
import followsRoutes from "./follows.routes";
import notificationsRoutes from "./notifications.routes";
import adminRoutes from "./admin.routes";
import analyticsRoutes from "./analytics.routes";

const router = Router();

router.get("/health", (_req, res) => res.json({ ok: true, service: "status-app-api" }));

router.use("/auth", authRoutes);
router.use("/users", usersRoutes);
router.use("/statuses", statusRoutes);
router.use("/categories", categoriesRoutes);
router.use("/favorites", favoritesRoutes);
router.use("/downloads", downloadsRoutes);
router.use("/creators", creatorsRoutes);
router.use("/follows", followsRoutes);
router.use("/notifications", notificationsRoutes);
router.use("/admin", adminRoutes);
router.use("/analytics", analyticsRoutes);

export default router;
