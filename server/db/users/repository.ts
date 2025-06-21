import { db as defaultDb } from '../index';
import * as schema from '@shared/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';
import { User, InsertUser, LoginCredentials } from '@shared/schema';

export class UsersRepository {
  constructor(private database = defaultDb) {}

  async getUsers(): Promise<User[]> {
    return this.database.select().from(schema.users);
  }

  async getUser(id: number): Promise<User | undefined> {
    const users = await this.database.select()
      .from(schema.users)
      .where(eq(schema.users.id, id))
      .limit(1);
    return users[0];
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const users = await this.database.select()
      .from(schema.users)
      .where(eq(schema.users.email, email))
      .limit(1);
    return users[0];
  }

  async getUserByAuthId(authUserId: string): Promise<User | undefined> {
    const users = await this.database.select()
      .from(schema.users)
      .where(eq(schema.users.authUserId, authUserId))
      .limit(1);
    return users[0];
  }

  async getUsersByRole(role: string): Promise<User[]> {
    return this.database.select()
      .from(schema.users)
      .where(eq(schema.users.role, role as any));
  }

  async createUser(userData: InsertUser): Promise<User> {
    const hashedPassword = await this.hashPassword(userData.password);
    const [user] = await this.database.insert(schema.users)
      .values({
        ...userData,
        password: hashedPassword
      })
      .returning();
    return user;
  }

  async updateUser(id: number, userData: Partial<InsertUser>): Promise<User | undefined> {
    if (userData.password) {
      userData.password = await this.hashPassword(userData.password);
    }
    const [user] = await this.database.update(schema.users)
      .set(userData)
      .where(eq(schema.users.id, id))
      .returning();
    return user;
  }

  async deleteUser(id: number): Promise<boolean> {
    const result = await this.database.delete(schema.users)
      .where(eq(schema.users.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async authenticate(credentials: LoginCredentials): Promise<User | undefined> {
    const user = await this.getUserByEmail(credentials.email);
    if (!user) return undefined;
    const isValid = await this.comparePasswords(credentials.password, user.password);
    if (!isValid) return undefined;
    return user;
  }

  private async hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(password, salt);
  }

  private async comparePasswords(supplied: string, stored: string): Promise<boolean> {
    return bcrypt.compare(supplied, stored);
  }
}
