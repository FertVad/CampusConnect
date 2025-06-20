import { Express } from "express";
import bcrypt from "bcrypt";
import { User as SelectUser, Request as SelectRequest } from "../shared/schema";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { supabase } from "./supabaseClient";
import { verifySupabaseJwt } from "./middleware/verifySupabaseJwt";
import { logger } from "./utils/logger";
import { testConnection } from "./db/index";

// Import storage helpers and interface
import { IStorage, setStorage, getStorage, DatabaseStorage } from "./storage";

export const mockData: { requests: SelectRequest[] } = {
  requests: [
    {
      id: 1,
      studentId: 1,
      type: "general",
      description: "Example request 1",
      status: "pending",
      createdAt: new Date(),
      resolvedBy: null,
      resolvedAt: null,
      resolution: null,
    },
    {
      id: 2,
      studentId: 2,
      type: "financial",
      description: "Example request 2",
      status: "approved",
      createdAt: new Date(),
      resolvedBy: 1,
      resolvedAt: new Date(),
      resolution: "Approved",
    },
  ],
};

declare global {
  namespace Express {
    interface User extends SelectUser {
      user_metadata?: SupabaseUser['user_metadata'];
    }
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
      // Проверяем соединение с базой данных
      const isConnected = await testConnection();
      if (!isConnected) {
        logger.error("Failed to connect to the database");
        return false;
      }

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

  app.get("/api/user", verifySupabaseJwt, async (req, res) => {
    logger.info("GET /api/user route hit");

    if (req.user) {
      const authUserId = req.user.id;
      logger.info(`JWT user ID: ${authUserId}`);

      try {
        // Сначала ищем пользователя в public.users
        const { data: existingUser, error: fetchError } = await supabase
          .from("users")
          .select("*")
          .eq("auth_user_id", authUserId)
          .single();

        if (fetchError && fetchError.code !== 'PGRST116') {
          // PGRST116 = "not found", остальные ошибки логируем
          logger.error("Error fetching user:", fetchError);
          return res.status(500).json({ message: "Database error" });
        }

        let userData = existingUser as any;

        // Если пользователь не найден - создаем из auth данных
        if (!userData) {
          logger.info("User not found in public.users, creating from auth data");

          const { data: newUser, error: insertError } = await supabase
            .from("users")
            .insert({
              auth_user_id: req.user.id,
              first_name: req.user.user_metadata?.first_name || 'Unknown',
              last_name: req.user.user_metadata?.last_name || 'User',
              email: req.user.email,
              role: req.user.user_metadata?.role || 'student',
              password: 'supabase_managed'
            })
            .select()
            .single();

          if (insertError) {
            logger.error("Error creating user:", insertError);
            return res.status(500).json({ message: "Failed to create user profile" });
          }

          userData = newUser as any;
          logger.info("Successfully created user in public.users");
        }

        // Возвращаем данные пользователя
        return res.json({
          id: userData.auth_user_id,
          firstName: userData.first_name,
          lastName: userData.last_name,
          email: userData.email,
          role: userData.role,
        });

      } catch (error) {
        logger.error("Unexpected error in /api/user:", error);
        return res.status(500).json({ message: "Internal server error" });
      }
    }

    logger.info("Returning 401 for /api/user - not authenticated");
    return res.status(401).json({ message: "Not authenticated" });
  });

  app.get("/api/debug/user-sync", verifySupabaseJwt, async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const authUser = req.user;

    const { data: publicUser, error } = await supabase
      .from("users")
      .select("*")
      .eq("auth_user_id", authUser.id)
      .single();

    res.json({
      auth_user_exists: !!authUser,
      auth_user_id: authUser.id,
      auth_user_email: authUser.email,
      auth_user_metadata: authUser.user_metadata,
      public_user_exists: !!publicUser,
      public_user_data: publicUser,
    error: error?.message
  });
  });
}

export const authRoutes = {
  getRequests: async (_req: any, res: any) => {
    try {
      const { data, error } = await supabase
        .from('requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        logger.warn('Requests fetch error, returning mock data:', error);
        return res.json(mockData.requests);
      }

      return res.json(data || mockData.requests);
    } catch (error) {
      logger.error('Error in /api/requests:', error);
      return res.json(mockData.requests);
    }
  },
};
}