import { pool } from '../config/db.js';
import { User, UserRole } from '../types/domain.js';

export class UserModel {
  static async findAll(role?: UserRole): Promise<User[]> {
    if (role) {
      const { rows } = await pool.query<User>(
        `SELECT user_id, username, email, password_plain, department, role, created_at
         FROM internal_users
         WHERE role = $1
         ORDER BY created_at DESC`,
        [role],
      );
      return rows;
    }
    const { rows } = await pool.query<User>(
      `SELECT user_id, username, email, password_plain, department, role, created_at
       FROM internal_users
       ORDER BY created_at DESC`,
    );
    return rows;
  }

  static async findById(id: string): Promise<User | null> {
    const { rows } = await pool.query<User>(
      `SELECT user_id, username, email, password_plain, department, role, created_at
       FROM internal_users
       WHERE user_id = $1`,
      [id],
    );
    return rows[0] || null;
  }

  static async findByEmail(email: string): Promise<User | null> {
    const { rows } = await pool.query<User>(
      `SELECT user_id, username, email, password_hash, password_plain, department, role, created_at
       FROM internal_users
       WHERE LOWER(email) = LOWER($1)`,
      [email],
    );
    return rows[0] || null;
  }

  static async create(data: {
    username: string;
    email: string;
    password_hash?: string;
    password_plain?: string;
    department: string;
    role: UserRole;
  }): Promise<User> {
    const { rows } = await pool.query<User>(
      `INSERT INTO internal_users (username, email, password_hash, password_plain, department, role)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING user_id, username, email, password_plain, department, role, created_at`,
      [
        data.username,
        data.email,
        data.password_hash || null,
        data.password_plain || 'Password123!',
        data.department,
        data.role,
      ],
    );
    return rows[0];
  }

  static async update(
    id: string,
    data: Partial<{
      username: string;
      email: string;
      department: string;
      role: UserRole;
      password_hash: string;
      password_plain: string;
    }>,
  ): Promise<User | null> {
    const fields: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (data.username !== undefined) {
      fields.push(`username = $${idx++}`);
      values.push(data.username);
    }
    if (data.email !== undefined) {
      fields.push(`email = $${idx++}`);
      values.push(data.email);
    }
    if (data.department !== undefined) {
      fields.push(`department = $${idx++}`);
      values.push(data.department);
    }
    if (data.role !== undefined) {
      fields.push(`role = $${idx++}`);
      values.push(data.role);
    }
    if (data.password_hash !== undefined) {
      fields.push(`password_hash = $${idx++}`);
      values.push(data.password_hash);
    }
    if (data.password_plain !== undefined) {
      fields.push(`password_plain = $${idx++}`);
      values.push(data.password_plain);
    }

    if (fields.length === 0) return this.findById(id);

    values.push(id);
    const { rows } = await pool.query<User>(
      `UPDATE internal_users
       SET ${fields.join(', ')}
       WHERE user_id = $${idx}
       RETURNING user_id, username, email, password_plain, department, role, created_at`,
      values,
    );
    return rows[0] || null;
  }

  static async delete(id: string): Promise<boolean> {
    const { rowCount } = await pool.query(
      `DELETE FROM internal_users WHERE user_id = $1`,
      [id],
    );
    return (rowCount ?? 0) > 0;
  }
}
