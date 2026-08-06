import { Router, Request, Response } from 'express';
import { ProgramService } from '../services/program.service.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { rbacMiddleware } from '../middleware/rbac.middleware.js';

export const programRouter = Router();

/**
 * @openapi
 * /api/v1/scholarship-programs:
 *   get:
 *     summary: List scholarship programs
 *     tags: [Scholarship Programs]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: fiscal_year
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of scholarship programs
 */
programRouter.get('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const fiscalYear = req.query.fiscal_year ? parseInt(req.query.fiscal_year as string, 10) : undefined;
    const programs = await ProgramService.getAllPrograms(fiscalYear);
    res.json({ data: programs });
  } catch (err) {
    const e = err as Error & { statusCode?: number };
    res.status(e.statusCode ?? 500).json({ error: e.message });
  }
});

/**
 * @openapi
 * /api/v1/scholarship-programs/{id}:
 *   get:
 *     summary: Get a single scholarship program by ID
 *     tags: [Scholarship Programs]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Scholarship program record
 *       404:
 *         description: Not found
 */
programRouter.get('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const program = await ProgramService.getProgramById(req.params.id as string);
    res.json({ data: program });
  } catch (err) {
    const e = err as Error & { statusCode?: number };
    res.status(e.statusCode ?? 500).json({ error: e.message });
  }
});

/**
 * @openapi
 * /api/v1/scholarship-programs:
 *   post:
 *     summary: Create a new scholarship program
 *     tags: [Scholarship Programs]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [program_code, program_name, fiscal_year]
 *             properties:
 *               program_code:
 *                 type: string
 *               program_name:
 *                 type: string
 *               fiscal_year:
 *                 type: integer
 *               total_allocated:
 *                 type: number
 *               total_disbursed:
 *                 type: number
 *     responses:
 *       201:
 *         description: Scholarship program created
 */
programRouter.post('/', authMiddleware, rbacMiddleware(['admin', 'evaluator']), async (req: Request, res: Response) => {
  try {
    const program = await ProgramService.createProgram(req.body);
    res.status(201).json({ data: program });
  } catch (err) {
    const e = err as Error & { statusCode?: number };
    res.status(e.statusCode ?? 500).json({ error: e.message });
  }
});

/**
 * @openapi
 * /api/v1/scholarship-programs/{id}:
 *   put:
 *     summary: Update a scholarship program
 *     tags: [Scholarship Programs]
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
 *         description: Program updated
 */
programRouter.put('/:id', authMiddleware, rbacMiddleware(['admin', 'evaluator']), async (req: Request, res: Response) => {
  try {
    const program = await ProgramService.updateProgram(req.params.id as string, req.body);
    res.json({ data: program });
  } catch (err) {
    const e = err as Error & { statusCode?: number };
    res.status(e.statusCode ?? 500).json({ error: e.message });
  }
});

/**
 * @openapi
 * /api/v1/scholarship-programs/{id}:
 *   delete:
 *     summary: Delete a scholarship program
 *     tags: [Scholarship Programs]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Program deleted
 */
programRouter.delete('/:id', authMiddleware, rbacMiddleware(['admin']), async (req: Request, res: Response) => {
  try {
    await ProgramService.deleteProgram(req.params.id as string);
    res.json({ message: `Scholarship program '${req.params.id as string}' deleted successfully.` });
  } catch (err) {
    const e = err as Error & { statusCode?: number };
    res.status(e.statusCode ?? 500).json({ error: e.message });
  }
});
