import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import bcrypt from "bcrypt";
import { User as SelectUser } from "@shared/schema";
import { createDatabaseStorage } from "./db/storage";
import { migrateDatabase, seedDatabase } from "./db/migrations";

// Import storage module, but we'll replace it with our DB storage
import { storage as memStorage } from "./storage";

// Create a variable to hold our storage implementation
let storage = memStorage;

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
      console.error("Database migration failed, using memory storage.");
      return false;
    }
    
    // Seed the database with initial data if needed
    const seedSuccess = await seedDatabase();
    if (!seedSuccess) {
      console.error("Database seeding failed, but continuing with empty database.");
    }
    
    // Create database storage and replace memory storage
    const dbStorage = await createDatabaseStorage();
    storage = dbStorage;
    
    console.log("Successfully initialized database storage");
    return true;
  } catch (error) {
    console.error("Failed to initialize database:", error);
    return false;
  }
}

export function setupAuth(app: Express) {
  // Configure session
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "dev-session-secret", // Should be environment variable in production
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // Only use secure in production
      sameSite: 'lax'
    },
    // Extend session expiration time on each request
    rolling: true
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
        const user = await storage.getUserByEmail(email);
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
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });

  // Authentication routes
  app.post("/api/register", async (req, res, next) => {
    try {
      // Check if email already exists
      const existingUser = await storage.getUserByEmail(req.body.email);
      if (existingUser) {
        return res.status(400).json({ message: "Email already exists" });
      }

      // Create user (password will be hashed in the storage implementation)
      const user = await storage.createUser(req.body);

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
      if (err) return next(err);
      if (!user) return res.status(401).json({ message: info?.message || "Authentication failed" });

      req.login(user, (err) => {
        if (err) return next(err);
        // Make sure we're setting the correct cookie and returning the user data
        console.log("User authenticated successfully:", user.id);
        // Don't expose the password hash to the client
        const { password, ...userWithoutPassword } = user;
        return res.status(200).json(userWithoutPassword);
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
    if (req.isAuthenticated()) {
      // Don't expose the password hash to the client
      const { password, ...userWithoutPassword } = req.user as any;
      return res.json(userWithoutPassword);
    }
    return res.status(401).json({ message: "Not authenticated" });
  });
}

// Export the storage to be used in other parts of the application
export { storage };