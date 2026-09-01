import { Router } from "express";
import * as categoriesController from "../controllers/categories.controller";

const router = Router();

router.get("/", categoriesController.listCategories);

export default router;
