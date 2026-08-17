import { Router, Request, Response } from 'express';
import { QMService } from '../services/qm.service.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { rbacMiddleware } from '../middleware/rbac.middleware.js';

export const qmRouter = Router();

/**
 * @openapi
 * /api/v1/qualification-maps:
 *   get:
 *     summary: List qualification maps
 *     tags: [Qualification Maps]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: program_id
 *         schema:
 *           type: string
 *       - in: query
 *         name: provider_id
 *         schema:
 *           type: string
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [draft, approved, completed, cancelled]
 *     responses:
 *       200:
 *         description: List of qualification maps
 */
qmRouter.get('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { program_id, provider_id, status, fiscal_year } = req.query as Record<string, string | undefined>;
    const qms = await QMService.getAllQMs({ program_id, provider_id, status: status as any, fiscal_year });
    res.json({ data: qms });
  } catch (err) {
    const e = err as Error & { statusCode?: number };
    res.status(e.statusCode ?? 500).json({ error: e.message });
  }
});

/**
 * @openapi
 * /api/v1/qualification-maps/{id}:
 *   get:
 *     summary: Get a single qualification map by ID
 *     tags: [Qualification Maps]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Qualification map record
 *       404:
 *         description: Not found
 */
qmRouter.get('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const qm = await QMService.getQMById(req.params.id as string);
    res.json({ data: qm });
  } catch (err) {
    const e = err as Error & { statusCode?: number };
    res.status(e.statusCode ?? 500).json({ error: e.message });
  }
});

/**
 * @openapi
 * /api/v1/qualification-maps:
 *   post:
 *     summary: Create a new qualification map
 *     tags: [Qualification Maps]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [program_id, provider_id, sector, tvet_qualification, qualification_level, delivery_mode, total_slots, training_cost_per_capita]
 *     responses:
 *       201:
 *         description: Qualification map created
 */
qmRouter.post('/', authMiddleware, rbacMiddleware(['admin', 'evaluator']), async (req: Request, res: Response) => {
  try {
    const qm = await QMService.createQM(req.body);
    res.status(201).json({ data: qm });
  } catch (err) {
    const e = err as Error & { statusCode?: number };
    res.status(e.statusCode ?? 500).json({ error: e.message });
  }
});

/**
 * @openapi
 * /api/v1/qualification-maps/{id}:
 *   put:
 *     summary: Update a qualification map
 *     tags: [Qualification Maps]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Qualification map updated
 */
qmRouter.put('/:id', authMiddleware, rbacMiddleware(['admin', 'evaluator']), async (req: Request, res: Response) => {
  try {
    const qm = await QMService.updateQM(req.params.id as string, req.body);
    res.json({ data: qm });
  } catch (err) {
    const e = err as Error & { statusCode?: number };
    res.status(e.statusCode ?? 500).json({ error: e.message });
  }
});

/**
 * @openapi
 * /api/v1/qualification-maps/{id}:
 *   delete:
 *     summary: Delete a qualification map
 *     tags: [Qualification Maps]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Qualification map deleted
 */
qmRouter.delete('/:id', authMiddleware, rbacMiddleware(['admin']), async (req: Request, res: Response) => {
  try {
    await QMService.deleteQM(req.params.id as string);
    res.json({ message: `Qualification map '${req.params.id as string}' deleted successfully.` });
  } catch (err) {
    const e = err as Error & { statusCode?: number };
    res.status(e.statusCode ?? 500).json({ error: e.message });
  }
});
