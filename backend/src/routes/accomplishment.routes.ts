import { Router, Request, Response } from 'express';
import { AccomplishmentService } from '../services/accomplishment.service.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { rbacMiddleware } from '../middleware/rbac.middleware.js';

export const accomplishmentRouter = Router();

/**
 * @openapi
 * /api/v1/accomplishments:
 *   get:
 *     summary: List physical accomplishment records
 *     tags: [Physical Accomplishments]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: qm_id
 *         schema:
 *           type: string
 *       - in: query
 *         name: program_id
 *         schema:
 *           type: string
 *       - in: query
 *         name: provider_id
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of accomplishment records
 */
accomplishmentRouter.get('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { qm_id, program_id, provider_id } = req.query as Record<string, string | undefined>;
    const records = await AccomplishmentService.getAllAccomplishments({ qm_id, program_id, provider_id });
    res.json({ data: records });
  } catch (err) {
    const e = err as Error & { statusCode?: number };
    res.status(e.statusCode ?? 500).json({ error: e.message });
  }
});

/**
 * @openapi
 * /api/v1/accomplishments/{qm_id}:
 *   get:
 *     summary: Get accomplishment record for a specific qualification map
 *     tags: [Physical Accomplishments]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: qm_id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Accomplishment record
 *       404:
 *         description: Not found
 */
accomplishmentRouter.get('/:qm_id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const record = await AccomplishmentService.getAccomplishmentByQmId(req.params.qm_id as string);
    res.json({ data: record });
  } catch (err) {
    const e = err as Error & { statusCode?: number };
    res.status(e.statusCode ?? 500).json({ error: e.message });
  }
});

/**
 * @openapi
 * /api/v1/accomplishments/{qm_id}:
 *   put:
 *     summary: Upsert physical accomplishment record for a qualification map
 *     tags: [Physical Accomplishments]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: qm_id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               enrolled_male:
 *                 type: integer
 *               enrolled_female:
 *                 type: integer
 *               dropped_male:
 *                 type: integer
 *               dropped_female:
 *                 type: integer
 *               graduated_completed_male:
 *                 type: integer
 *               graduated_completed_female:
 *                 type: integer
 *               graduated_pending_assessment_male:
 *                 type: integer
 *               graduated_pending_assessment_female:
 *                 type: integer
 *               assessed_male:
 *                 type: integer
 *               assessed_female:
 *                 type: integer
 *               certified_male:
 *                 type: integer
 *               certified_female:
 *                 type: integer
 *               employed_male:
 *                 type: integer
 *               employed_female:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Accomplishment record upserted
 */
accomplishmentRouter.put('/:qm_id', authMiddleware, rbacMiddleware(['admin', 'evaluator']), async (req: Request, res: Response) => {
  try {
    const record = await AccomplishmentService.upsertAccomplishment(req.params.qm_id as string, req.body);
    res.json({ data: record });
  } catch (err) {
    const e = err as Error & { statusCode?: number };
    res.status(e.statusCode ?? 500).json({ error: e.message });
  }
});
