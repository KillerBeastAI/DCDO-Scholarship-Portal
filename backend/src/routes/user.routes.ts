import { Router, Request, Response } from 'express';
import { UserService } from '../services/user.service.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { rbacMiddleware } from '../middleware/rbac.middleware.js';

export const userRouter = Router();

/**
 * @openapi
 * /api/v1/users:
 *   get:
 *     summary: List all internal users
 *     tags: [Users]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: List of users
 */
userRouter.get('/', authMiddleware, rbacMiddleware(['admin']), async (_req: Request, res: Response) => {
  try {
    const users = await UserService.getAllUsers();
    res.json({ data: users });
  } catch (err) {
    const e = err as Error & { statusCode?: number };
    res.status(e.statusCode ?? 500).json({ error: e.message });
  }
});

/**
 * @openapi
 * /api/v1/users/{id}:
 *   get:
 *     summary: Get a single user by ID
 *     tags: [Users]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User record
 *       404:
 *         description: User not found
 */
userRouter.get('/:id', authMiddleware, rbacMiddleware(['admin']), async (req: Request, res: Response) => {
  try {
    const user = await UserService.getUserById(req.params.id as string);
    res.json({ data: user });
  } catch (err) {
    const e = err as Error & { statusCode?: number };
    res.status(e.statusCode ?? 500).json({ error: e.message });
  }
});

/**
 * @openapi
 * /api/v1/users:
 *   post:
 *     summary: Create a new internal user
 *     tags: [Users]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [username, email, password, department, role]
 *             properties:
 *               username:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               department:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [admin, evaluator, finance_auditor]
 *     responses:
 *       201:
 *         description: User created
 *       400:
 *         description: Validation error
 */
userRouter.post('/', authMiddleware, rbacMiddleware(['admin']), async (req: Request, res: Response) => {
  try {
    const user = await UserService.createUser(req.body);
    res.status(201).json({ data: user });
  } catch (err) {
    const e = err as Error & { statusCode?: number };
    res.status(e.statusCode ?? 500).json({ error: e.message });
  }
});

/**
 * @openapi
 * /api/v1/users/{id}:
 *   put:
 *     summary: Update an internal user
 *     tags: [Users]
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
 *         description: User updated
 */
userRouter.put('/:id', authMiddleware, rbacMiddleware(['admin']), async (req: Request, res: Response) => {
  try {
    const user = await UserService.updateUser(req.params.id as string, req.body);
    res.json({ data: user });
  } catch (err) {
    const e = err as Error & { statusCode?: number };
    res.status(e.statusCode ?? 500).json({ error: e.message });
  }
});

/**
 * @openapi
 * /api/v1/users/{id}:
 *   delete:
 *     summary: Deactivate (soft-delete) a user
 *     tags: [Users]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User deactivated
 */
userRouter.delete('/:id', authMiddleware, rbacMiddleware(['admin']), async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    await UserService.deleteUser(id);
    res.json({ message: `User '${id}' deleted successfully.` });
  } catch (err) {
    const e = err as Error & { statusCode?: number };
    res.status(e.statusCode ?? 500).json({ error: e.message });
  }
});
