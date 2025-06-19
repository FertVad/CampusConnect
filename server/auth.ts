import { Express } from "express";
import bcrypt from "bcrypt";
import { User as SelectUser } from "../shared/schema";
import { supabase } from "./supabaseClient";
import { verifySupabaseJwt } from "./middleware/verifySupabaseJwt";
import { logger } from "./utils/logger";

// Import storage module and IStorage interface
import { storage, IStorage, setStorage, getStorage, DatabaseStorage } from "./storage";

declare global {
  namespace Express {
    interface User extends SelectUser { }
  }
}

// Password hashing function using bcrypt
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

// Password verification function using bcrypt
export async function comparePasswords(supplied: string, stored: string): Promise<boolean> {
  try {
    // Check if the stored password is a bcrypt hash
    if (stored.startsWith('$2b$') || stored.startsWith('$2a$')) {
      return bcrypt.compare(supplied, stored);
    }

    // Fallback for plain text passwords (legacy/seed data)
    logger.warn("Warning: Using plain text password comparison (no hash detected)");
    return supplied === stored;
  } catch (error) {
    console.error("Password comparison error:", error);
    return false;
  }
}

// Initialize the database and switch to Supabase storage
export async function initializeDatabase(): Promise<boolean> {
  try {
    logger.info("Starting database migration...");
    try {
      // Создаем хранилище базы данных Supabase
      logger.info("Creating SupabaseStorage instance...");
      const dbStorage = new DatabaseStorage();

      // Обновляем хранилище через сеттер
      setStorage(dbStorage as unknown as IStorage);

      logger.info("Database migration completed successfully");

      // Проверяем наличие пользователя-администратора
      logger.info("Starting database seeding...");
      const adminUsers = await dbStorage.getUsersByRole('admin');

      if (adminUsers.length === 0) {
        logger.info("No admin user found, creating one...");
        // Создаем admin пользователя, если его нет
        const hashedPassword = await hashPassword("admin");
        await dbStorage.createUser({
          firstName: "Admin",
          lastName: "User",
          email: "admin@example.com",
          password: hashedPassword,
          role: "admin"
        });
        logger.info("Admin user created successfully");
      } else {
        logger.info("Admin user already exists, checking for test users...");
      }

      logger.info("Database connection successful");
      return true;
    } catch (err) {
      console.error("Error during database migration:", err);
      return false;
    }
  } catch (error) {
    console.error("Failed to initialize database:", error);
    return false;
  }
}

export function setupAuth(app: Express) {
  // Authentication routes using Supabase

  app.post("/api/register", async (req, res) => {
    try {
      const { firstName, lastName, email, password, role } = req.body;

      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error || !data.user) {
        return res.status(400).json({ message: error?.message || "Registration failed" });
      }

      // Persist additional user details only after successful sign up
      await getStorage().createUser({
        firstName,
        lastName,
        email,
        password,
        role,
      });

      return res.status(201).json(data);
    } catch (error) {
      return res.status(500).json({ message: "Registration failed" });
    }
  });

  app.post("/api/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error || !data.session) {
        return res.status(401).json({ message: error?.message || "Authentication failed" });
      }
      return res.status(200).json(data);
    } catch (error) {
      return res.status(500).json({ message: "Login failed" });
    }
  });

  app.post("/api/logout", async (_req, res) => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        return res.status(400).json({ message: error.message });
      }
      return res.status(200).json({ message: "Logged out successfully" });
    } catch (error) {
      return res.status(500).json({ message: "Logout failed" });
    }
  });

  app.get("/api/user", verifySupabaseJwt, (req, res) => {
    logger.info("GET /api/user route hit");

    if (req.user) {
      logger.info("Authenticated user:", req.user);

      // Не отправляем пароль клиенту
      const { password, ...userWithoutPassword } = req.user as any;

      // Устанавливаем заголовки для совместимости с Safari
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');

      return res.json(userWithoutPassword);
    }

    logger.info("Returning 401 for /api/user - not authenticated");
    return res.status(401).json({ message: "Not authenticated" });
  });
}