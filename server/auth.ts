import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import bcrypt from "bcrypt";
import { User as SelectUser } from "../shared/schema";

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
    console.log("Warning: Using plain text password comparison (no hash detected)");
    return supplied === stored;
  } catch (error) {
    console.error("Password comparison error:", error);
    return false;
  }
}

// Initialize the database and switch to Supabase storage
export async function initializeDatabase(): Promise<boolean> {
  try {
    console.log("Starting database migration...");
    try {
      // Создаем хранилище базы данных Supabase
      console.log("Creating SupabaseStorage instance...");
      const dbStorage = new DatabaseStorage();

      // Обновляем хранилище через сеттер
      setStorage(dbStorage);

      console.log("Database migration completed successfully");

      // Проверяем наличие пользователя-администратора
      console.log("Starting database seeding...");
      const adminUsers = await dbStorage.getAllAdminUsers();

      if (adminUsers.length === 0) {
        console.log("No admin user found, creating one...");
        // Создаем admin пользователя, если его нет
        const hashedPassword = await hashPassword("admin");
        await dbStorage.createUser({
          firstName: "Admin",
          lastName: "User",
          email: "admin@example.com",
          password: hashedPassword,
          role: "admin"
        });
        console.log("Admin user created successfully");
      } else {
        console.log("Admin user already exists, checking for test users...");
      }

      console.log("Database connection successful");
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
  // Configure session - optimized for MemoryStore
  const isProduction = process.env.NODE_ENV === 'production';

  // Safari-friendly cookie settings and MemoryStore optimization
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "dev-session-secret",
    resave: true, // Сохранять сессию даже если она не изменилась
    saveUninitialized: true, // Сохранять новые сессии
    store: getStorage().sessionStore,
    name: 'eduportal.sid', // Используем уникальное имя куки
    cookie: {
      maxAge: 14 * 24 * 60 * 60 * 1000, // 14 дней
      httpOnly: true,
      secure: isProduction, // В разработке не требуем HTTPS
      sameSite: isProduction ? 'none' : 'lax', // В разработке используем lax для совместимости
      path: '/',
      domain: undefined // Использовать домен запроса
    },
    proxy: true // Доверяем proxy заголовкам
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  // Configure Passport local strategy with email as username field
  passport.use(
    new LocalStrategy({
      usernameField: 'email', // Use email field instead of username
      passwordField: 'password'
    }, async (email, password, done) => {
      try {
        const user = await getStorage().getUserByEmail(email);
        if (!user) {
          return done(null, false, { message: "Invalid email or password" });
        }

        const isValid = await comparePasswords(password, user.password);
        if (!isValid) {
          return done(null, false, { message: "Invalid email or password" });
        }

        return done(null, user);
      } catch (error) {
        return done(error);
      }
    })
  );

  // Serialize and deserialize user
  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await getStorage().getUser(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });

  // Authentication routes
  app.post("/api/register", async (req, res, next) => {
    try {
      // Check if email already exists
      const existingUser = await getStorage().getUserByEmail(req.body.email);
      if (existingUser) {
        return res.status(400).json({ message: "Email already exists" });
      }

      // Create user (password will be hashed in the storage implementation)
      const user = await getStorage().createUser(req.body);

      // Auto login after registration
      req.login(user, (err) => {
        if (err) return next(err);
        // Don't expose the password hash to the client
        const { password, ...userWithoutPassword } = user;
        return res.status(201).json(userWithoutPassword);
      });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err: Error, user: Express.User, info: any) => {
      if (err) {
        return next(err);
      }

      if (!user) {
        return res.status(401).json({ message: info?.message || "Authentication failed" });
      }

      req.login(user, (err) => {
        if (err) {
          return next(err);
        }

        // Don't expose the password hash to the client
        const { password, ...userWithoutPassword } = user;

        // Set headers to help with Safari compatibility
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');

        // Ensure the session is saved immediately
        req.session.save((err) => {
          if (err) {
            console.error("Session save error:", err);
          }
          return res.status(200).json(userWithoutPassword);
        });
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.status(200).json({ message: "Logged out successfully" });
    });
  });

  app.get("/api/user", (req, res) => {
    // Проверяем метод isAuthenticated и наличие пользователя
    if (req.isAuthenticated && req.isAuthenticated() && req.user) {
      // Не отправляем пароль клиенту
      const { password, ...userWithoutPassword } = req.user as any;

      // Устанавливаем заголовки для совместимости с Safari
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');

      return res.json(userWithoutPassword);
    }

    return res.status(401).json({ message: "Not authenticated" });
  });
}