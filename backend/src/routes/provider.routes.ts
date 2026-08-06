import { Router, Request, Response } from 'express';
import { ProviderService } from '../services/provider.service.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { rbacMiddleware } from '../middleware/rbac.middleware.js';

export const providerRouter = Router();

/**
 * @openapi
 * /api/v1/training-providers:
 *   get:
 *     summary: List all training providers
 *     tags: [Training Providers]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, inactive, suspended]
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of training providers
 */
providerRouter.get('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { status, search } = req.query as { status?: string; search?: string };
    const providers = await ProviderService.getAllProviders({
      status: status as any,
      search,
    });
    res.json({ data: providers });
  } catch (err) {
    const e = err as Error & { statusCode?: number };
    res.status(e.statusCode ?? 500).json({ error: e.message });
  }
});

/**
 * @openapi
 * /api/v1/training-providers/{id}:
 *   get:
 *     summary: Get a single training provider by ID
 *     tags: [Training Providers]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Training provider record
 *       404:
 *         description: Not found
 */
providerRouter.get('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const provider = await ProviderService.getProviderById(req.params.id as string);
    res.json({ data: provider });
  } catch (err) {
    const e = err as Error & { statusCode?: number };
    res.status(e.statusCode ?? 500).json({ error: e.message });
  }
});

/**
 * @openapi
 * /api/v1/training-providers:
 *   post:
 *     summary: Create a new training provider
 *     tags: [Training Providers]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [institution_name, institution_type, classification, complete_address]
 *             properties:
 *               institution_name:
 *                 type: string
 *               institution_type:
 *                 type: string
 *               classification:
 *                 type: string
 *               school_id:
 *                 type: string
 *               complete_address:
 *                 type: string
 *               contact_number:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [active, inactive, suspended]
 *     responses:
 *       201:
 *         description: Training provider created
 */
providerRouter.post('/', authMiddleware, rbacMiddleware(['admin', 'evaluator']), async (req: Request, res: Response) => {
  try {
    const provider = await ProviderService.createProvider(req.body);
    res.status(201).json({ data: provider });
  } catch (err) {
    const e = err as Error & { statusCode?: number };
    res.status(e.statusCode ?? 500).json({ error: e.message });
  }
});

/**
 * @openapi
 * /api/v1/training-providers/{id}:
 *   put:
 *     summary: Update a training provider
 *     tags: [Training Providers]
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
 *         description: Training provider updated
 */
providerRouter.put('/:id', authMiddleware, rbacMiddleware(['admin', 'evaluator']), async (req: Request, res: Response) => {
  try {
    const provider = await ProviderService.updateProvider(req.params.id as string, req.body);
    res.json({ data: provider });
  } catch (err) {
    const e = err as Error & { statusCode?: number };
    res.status(e.statusCode ?? 500).json({ error: e.message });
  }
});

/**
 * @openapi
 * /api/v1/training-providers/{id}:
 *   delete:
 *     summary: Delete a training provider
 *     tags: [Training Providers]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Provider deleted
 */
providerRouter.delete('/:id', authMiddleware, rbacMiddleware(['admin']), async (req: Request, res: Response) => {
  try {
    await ProviderService.deleteProvider(req.params.id as string);
    res.json({ message: `Training provider '${req.params.id as string}' deleted successfully.` });
  } catch (err) {
    const e = err as Error & { statusCode?: number };
    res.status(e.statusCode ?? 500).json({ error: e.message });
  }
});
