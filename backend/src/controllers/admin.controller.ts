import type { Request, Response } from "express";
import * as adminService from "../services/admin.service";
import { asyncHandler } from "../utils/asyncHandler";

export const getAnalytics = asyncHandler(async (_req: Request, res: Response) => {
  const analytics = await adminService.getAnalytics();
  res.json({ analytics });
});

export const listUsers = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, search } = req.query as unknown as { page: number; limit: number; search?: string };
  const result = await adminService.listUsers({ page, limit, search });
  res.json(result);
});

export const setUserBanned = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const { banned } = req.body as { banned: boolean };
  const user = await adminService.setUserBanned(id, banned);
  res.json({ user });
});

export const listStatuses = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, visibility } = req.query as unknown as {
    page: number;
    limit: number;
    visibility?: string;
  };
  const result = await adminService.listStatusesForAdmin({ page, limit, visibility });
  res.json(result);
});

export const moderateStatus = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const status = await adminService.moderateStatus(id, req.body);
  res.json({ status });
});

export const deleteStatus = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  await adminService.deleteStatus(id);
  res.status(204).send();
});

export const listReports = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, state } = req.query as unknown as { page: number; limit: number; state?: string };
  const result = await adminService.listReports({ page, limit, state });
  res.json(result);
});

export const updateReport = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const { state } = req.body as { state: string };
  const report = await adminService.updateReportState(id, state);
  res.json({ report });
});

export const listCategories = asyncHandler(async (_req: Request, res: Response) => {
  const categories = await adminService.listCategoriesForAdmin();
  res.json({ categories });
});

export const createCategory = asyncHandler(async (req: Request, res: Response) => {
  const category = await adminService.createCategory(req.body);
  res.status(201).json({ category });
});

export const updateCategory = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const category = await adminService.updateCategory(id, req.body);
  res.json({ category });
});
