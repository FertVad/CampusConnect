import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import bcrypt from "bcrypt";
import { User as SelectUser } from "@shared/schema";
import { createDatabaseStorage } from "./db/storage";
import { migrateDatabase, seedDatabase } from "./db/migrations";

// Import storage module and IStorage interface
import { storage, IStorage, setStorage, getStorage } from "./storage";

declare global {
  namespace Express {
    interface User extends SelectUser {}
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

// Initialize the database and switch to PostgreSQL storage
export async function initializeDatabase(): Promise<boolean> {
  try {
    // Run migrations to create tables
    const migrationSuccess = await migrateDatabase();
    if (!migrationSuccess) {
      console.error("Database migration failed, using memory getStorage().");
      
      // Добавляем начальные данные в хранилище в памяти, если это необходимо
      const memStorage = getStorage();
      
      // Создаем учебные планы для in-memory хранилища
      if (typeof (memStorage as any).curriculumPlans === 'undefined') {
        console.log("Initializing curriculum plans map in memory storage");
        (memStorage as any).curriculumPlans = new Map();
        
        // Добавляем базовые учебные планы
        const defaultPlans = [
          {
            id: 1,
            specialtyName: "Информатика и вычислительная техника",
            specialtyCode: "09.03.01",
            yearsOfStudy: 4,
            educationLevel: "ВО",
            description: "Бакалавриат по информатике и вычислительной технике",
            createdBy: 1,
            createdAt: new Date(),
            updatedAt: new Date()
          },
          {
            id: 2,
            specialtyName: "Экономика и управление",
            specialtyCode: "38.03.01",
            yearsOfStudy: 4,
            educationLevel: "ВО",
            description: "Бакалавриат по экономике и управлению",
            createdBy: 1,
            createdAt: new Date(),
            updatedAt: new Date()
          },
          {
            id: 3,
            specialtyName: "Программирование в компьютерных системах",
            specialtyCode: "09.02.03",
            yearsOfStudy: 3,
            educationLevel: "СПО",
            description: "Программирование в компьютерных системах (СПО)",
            createdBy: 1,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        ];
        
        for (const plan of defaultPlans) {
          (memStorage as any).curriculumPlans.set(plan.id, plan);
        }
        
        // Добавляем методы для работы с учебными планами
        if (typeof (memStorage as any).getCurriculumPlans !== 'function') {
          (memStorage as any).getCurriculumPlans = function() {
            return Array.from(this.curriculumPlans.values());
          };
          
          (memStorage as any).getCurriculumPlansByEducationLevel = function(level: string) {
            return Array.from(this.curriculumPlans.values()).filter(
              (plan: any) => plan.educationLevel === level
            );
          };
          
          (memStorage as any).getCurriculumPlan = function(id: number) {
            console.log(`Getting curriculum plan with ID: ${id}`);
            const numId = Number(id);
            return this.curriculumPlans.get(numId) || null;
          };
          
          (memStorage as any).createCurriculumPlan = function(data: any) {
            const id = this.curriculumPlans.size > 0 
              ? Math.max(...Array.from(this.curriculumPlans.keys())) + 1 
              : 1;
            
            const plan = {
              id,
              ...data,
              createdAt: new Date(),
              updatedAt: new Date()
            };
            
            this.curriculumPlans.set(id, plan);
            return plan;
          };
          
          (memStorage as any).updateCurriculumPlan = function(id: number, data: any) {
            const plan = this.curriculumPlans.get(id);
            if (!plan) return null;
            
            const updatedPlan = {
              ...plan,
              ...data,
              id, // Сохраняем оригинальный ID
              updatedAt: new Date()
            };
            
            this.curriculumPlans.set(id, updatedPlan);
            return updatedPlan;
          };
          
          (memStorage as any).deleteCurriculumPlan = function(id: number) {
            return this.curriculumPlans.delete(id);
          };
        }
        
        console.log("Memory storage initialized with curriculum plans functionality");
      }
      
      return false;
    }

    // Seed the database with initial data if needed
    const seedSuccess = await seedDatabase();
    if (!seedSuccess) {
      console.error("Database seeding failed, but continuing with empty database.");
    }

    // Create database storage and replace memory storage
    // Since createDatabaseStorage() returns IStorage, this is type-safe
    const dbStorage = await createDatabaseStorage();
    
    // Обновляем хранилище через сеттер, чтобы обновить его во всех модулях
    setStorage(dbStorage);

    console.log("Successfully initialized database storage");
    return true;
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
    console.log("POST /api/login - Login attempt for email:", req.body.email);

    passport.authenticate("local", (err: Error, user: Express.User, info: any) => {
      if (err) {
        console.error("POST /api/login - Authentication error:", err);
        return next(err);
      }

      if (!user) {
        console.log("POST /api/login - Authentication failed:", info?.message);
        return res.status(401).json({ message: info?.message || "Authentication failed" });
      }

      req.login(user, (err) => {
        if (err) {
          console.error("POST /api/login - Session creation error:", err);
          return next(err);
        }

        // Make sure we're setting the correct cookie and returning the user data
        console.log("POST /api/login - User authenticated successfully:", user.id);
        console.log("POST /api/login - Session ID:", req.sessionID);

        // Don't expose the password hash to the client
        const { password, ...userWithoutPassword } = user;

        // Set headers to help with Safari compatibility
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');

        // Ensure the session is saved immediately
        req.session.save((err) => {
          if (err) {
            console.error("POST /api/login - Session save error:", err);
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
    console.log("GET /api/user - Session ID:", req.sessionID);
    console.log("GET /api/user - Is Authenticated:", req.isAuthenticated ? req.isAuthenticated() : 'method undefined');
    console.log("GET /api/user - Headers:", JSON.stringify(req.headers));
    console.log("GET /api/user - Session:", req.session);

    // Проверяем метод isAuthenticated и наличие пользователя
    if (req.isAuthenticated && req.isAuthenticated() && req.user) {
      console.log("GET /api/user - User authenticated:", (req.user as any).id, "Role:", (req.user as any).role);
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