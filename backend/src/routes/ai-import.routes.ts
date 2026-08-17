import { Router, Request, Response } from 'express';
import { AIImportService } from '../services/ai-import.service.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { rbacMiddleware } from '../middleware/rbac.middleware.js';

export const aiImportRouter = Router();

// 1️⃣ Map Excel columns → DB fields using Gemini
aiImportRouter.post(
  '/providers/map-columns',
  authMiddleware,
  rbacMiddleware(['admin', 'evaluator']),
  async (req: Request, res: Response) => {
    try {
      const { headers, sampleRows } = req.body as {
        headers: string[];
        sampleRows: string[][];
      };
      const mapping = await AIImportService.mapProviderColumns(headers, sampleRows);
      res.json({ data: mapping });
    } catch (err) {
      const e = err as Error & { statusCode?: number };
      res.status(e.statusCode ?? 500).json({ error: e.message });
    }
  }
);

// 2️⃣ Import mapped rows into DB (bulk insert)
aiImportRouter.post(
  '/providers/import',
  authMiddleware,
  rbacMiddleware(['admin', 'evaluator']),
  async (req: Request, res: Response) => {
    try {
      const { rows } = req.body as { rows: Record<string, any>[] };
      const result = await AIImportService.importProviders(rows);
      res.json({ data: result });
    } catch (err) {
      const e = err as Error & { statusCode?: number };
      res.status(e.statusCode ?? 500).json({ error: e.message });
    }
  }
);
