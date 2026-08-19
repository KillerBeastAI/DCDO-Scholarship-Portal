import { UserModel } from '../models/user.model.js';
import { hashPassword } from '../utils/password.js';
import { User, UserRole } from '../types/domain.js';

export class UserService {
  static async getAllUsers(role?: UserRole): Promise<User[]> {
    return UserModel.findAll(role);
  }

  static async getUserById(id: string): Promise<User> {
    const user = await UserModel.findById(id);
    if (!user) {
      const err = new Error(`User with ID '${id}' not found`) as Error & { statusCode?: number };
      err.statusCode = 404;
      throw err;
    }
    return user;
  }

  static async createUser(data: {
    username: string;
    email: string;
    password?: string;
    department: string;
    role: UserRole;
  }): Promise<User> {
    const existing = await UserModel.findByEmail(data.email);
    if (existing) {
      const err = new Error(`User with email '${data.email}' already exists`) as Error & { statusCode?: number };
      err.statusCode = 400;
      throw err;
    }

    const password_plain = data.password || 'Password123!';
    const password_hash = await hashPassword(password_plain);
    return UserModel.create({
      username: data.username,
      email: data.email,
      password_hash,
      password_plain,
      department: data.department,
      role: data.role,
    });
  }

  static async updateUser(
    id: string,
    data: Partial<{
      username: string;
      email: string;
      department: string;
      role: UserRole;
      password?: string;
    }>,
  ): Promise<User> {
    await this.getUserById(id);

    if (data.email) {
      const existing = await UserModel.findByEmail(data.email);
      if (existing && existing.user_id !== id) {
        const err = new Error(`User with email '${data.email}' already exists`) as Error & { statusCode?: number };
        err.statusCode = 400;
        throw err;
      }
    }

    const password_hash = data.password ? await hashPassword(data.password) : undefined;
    const password_plain = data.password ? data.password : undefined;
    const updated = await UserModel.update(id, {
      username: data.username,
      email: data.email,
      department: data.department,
      role: data.role,
      password_hash,
      password_plain,
    });

    if (!updated) {
      const err = new Error(`Failed to update user '${id}'`) as Error & { statusCode?: number };
      err.statusCode = 500;
      throw err;
    }
    return updated;
  }

  static async deleteUser(id: string): Promise<void> {
    await this.getUserById(id);
    await UserModel.delete(id);
  }
}
