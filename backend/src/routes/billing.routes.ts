import { Router, Request, Response } from 'express';
import { BillingService } from '../services/billing.service.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { rbacMiddleware } from '../middleware/rbac.middleware.js';
import { VerificationStatus } from '../types/domain.js';

export const billingRouter = Router();

/**
 * @openapi
 * /api/v1/billings:
 *   get:
 *     summary: List internal billing records
 *     tags: [Internal Billings]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: provider_id
 *         schema:
 *           type: string
 *       - in: query
 *         name: qm_id
 *         schema:
 *           type: string
 *       - in: query
 *         name: verification_status
 *         schema:
 *           type: string
 *           enum: [pending, verified, rejected, returned]
 *     responses:
 *       200:
 *         description: List of billing records
 */
billingRouter.get('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { provider_id, qm_id, verification_status } = req.query as Record<string, string | undefined>;
    const billings = await BillingService.getAllBillings({
      provider_id,
      qm_id,
      verification_status: verification_status as VerificationStatus | undefined,
    });
    res.json({ data: billings });
  } catch (err) {
    const e = err as Error & { statusCode?: number };
    res.status(e.statusCode ?? 500).json({ error: e.message });
  }
});

/**
 * @openapi
 * /api/v1/billings/{id}:
 *   get:
 *     summary: Get a single billing record by ID
 *     tags: [Internal Billings]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Billing record
 *       404:
 *         description: Not found
 */
billingRouter.get('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const billing = await BillingService.getBillingById(req.params.id as string);
    res.json({ data: billing });
  } catch (err) {
    const e = err as Error & { statusCode?: number };
    res.status(e.statusCode ?? 500).json({ error: e.message });
  }
});

/**
 * @openapi
 * /api/v1/billings:
 *   post:
 *     summary: Create a new billing record
 *     tags: [Internal Billings]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [provider_id, qm_id, external_reference_no, claimed_amount, recorded_by]
 *             properties:
 *               provider_id:
 *                 type: string
 *               qm_id:
 *                 type: string
 *               external_reference_no:
 *                 type: string
 *               claimed_amount:
 *                 type: number
 *               recorded_by:
 *                 type: string
 *     responses:
 *       201:
 *         description: Billing record created
 */
billingRouter.post('/', authMiddleware, rbacMiddleware(['admin', 'evaluator', 'finance_auditor']), async (req: Request, res: Response) => {
  try {
    const billing = await BillingService.createBilling(req.body);
    res.status(201).json({ data: billing });
  } catch (err) {
    const e = err as Error & { statusCode?: number };
    res.status(e.statusCode ?? 500).json({ error: e.message });
  }
});

/**
 * @openapi
 * /api/v1/billings/{id}:
 *   put:
 *     summary: Update a billing record
 *     tags: [Internal Billings]
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
 *         description: Billing record updated
 */
billingRouter.put('/:id', authMiddleware, rbacMiddleware(['admin', 'finance_auditor']), async (req: Request, res: Response) => {
  try {
    const billing = await BillingService.updateBilling(req.params.id as string, req.body);
    res.json({ data: billing });
  } catch (err) {
    const e = err as Error & { statusCode?: number };
    res.status(e.statusCode ?? 500).json({ error: e.message });
  }
});

/**
 * @openapi
 * /api/v1/billings/{id}/status:
 *   patch:
 *     summary: Update billing verification status
 *     tags: [Internal Billings]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [verification_status]
 *             properties:
 *               verification_status:
 *                 type: string
 *                 enum: [pending, verified, rejected, returned]
 *     responses:
 *       200:
 *         description: Status updated
 *       422:
 *         description: Invalid status transition
 */
billingRouter.patch('/:id/status', authMiddleware, rbacMiddleware(['admin', 'finance_auditor']), async (req: Request, res: Response) => {
  try {
    const { verification_status } = req.body as { verification_status: VerificationStatus };
    if (!verification_status) {
      res.status(400).json({ error: 'verification_status is required in the request body.' });
      return;
    }
    const billing = await BillingService.updateVerificationStatus(req.params.id as string, verification_status);
    res.json({ data: billing });
  } catch (err) {
    const e = err as Error & { statusCode?: number };
    res.status(e.statusCode ?? 500).json({ error: e.message });
  }
});

/**
 * @openapi
 * /api/v1/billings/{id}:
 *   delete:
 *     summary: Delete a billing record
 *     tags: [Internal Billings]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Billing record deleted
 */
billingRouter.delete('/:id', authMiddleware, rbacMiddleware(['admin']), async (req: Request, res: Response) => {
  try {
    await BillingService.deleteBilling(req.params.id as string);
    res.json({ message: `Billing record '${req.params.id as string}' deleted successfully.` });
  } catch (err) {
    const e = err as Error & { statusCode?: number };
    res.status(e.statusCode ?? 500).json({ error: e.message });
  }
});
