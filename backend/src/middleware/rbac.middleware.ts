import { Request, Response, NextFunction } from 'express';

export type UserRole = 'admin' | 'evaluator' | 'finance_auditor';

/**
 * Middleware factory for Role-Based Access Control (RBAC).
 * Enforces role restrictions on API endpoints.
 */
export function rbacMiddleware(allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required before checking permissions.' });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        error: `Access denied. Role '${req.user.role}' is not authorized for this resource. Required role(s): [${allowedRoles.join(', ')}]`,
      });
      return;
    }

    next();
  };
}
