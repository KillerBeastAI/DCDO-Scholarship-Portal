import { Router, Request, Response } from 'express';
import { DashboardService } from '../services/dashboard.service.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

export const dashboardRouter = Router();

/**
 * @openapi
 * /api/v1/dashboard/summary:
 *   get:
 *     summary: Get executive dashboard KPI summary
 *     tags: [Dashboard]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Dashboard KPI aggregates
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalPrograms:
 *                   type: integer
 *                 totalProviders:
 *                   type: integer
 *                 totalAllocatedBudget:
 *                   type: number
 *                 totalDisbursedBudget:
 *                   type: number
 *                 totalSlots:
 *                   type: integer
 *                 totalEnrolled:
 *                   type: integer
 *                 totalCertified:
 *                   type: integer
 *                 billingsPending:
 *                   type: integer
 *                 billingsVerified:
 *                   type: integer
 */
dashboardRouter.get('/summary', authMiddleware, async (_req: Request, res: Response) => {
  try {
    const summary = await DashboardService.getSummary();
    res.json({ data: summary });
  } catch (err) {
    const e = err as Error & { statusCode?: number };
    res.status(e.statusCode ?? 500).json({ error: e.message });
  }
});

/**
 * @openapi
 * /api/v1/dashboard/budget-by-program:
 *   get:
 *     summary: Get budget allocation and disbursement breakdown by program
 *     tags: [Dashboard]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Budget breakdown per scholarship program
 */
dashboardRouter.get('/budget-by-program', authMiddleware, async (_req: Request, res: Response) => {
  try {
    const data = await DashboardService.getBudgetByProgram();
    res.json({ data });
  } catch (err) {
    const e = err as Error & { statusCode?: number };
    res.status(e.statusCode ?? 500).json({ error: e.message });
  }
});

/**
 * @openapi
 * /api/v1/dashboard/billing-status-counts:
 *   get:
 *     summary: Get billing count and total amount grouped by verification status
 *     tags: [Dashboard]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Billing status counts and totals
 */
dashboardRouter.get('/billing-status-counts', authMiddleware, async (_req: Request, res: Response) => {
  try {
    const data = await DashboardService.getBillingStatusCounts();
    res.json({ data });
  } catch (err) {
    const e = err as Error & { statusCode?: number };
    res.status(e.statusCode ?? 500).json({ error: e.message });
  }
});
