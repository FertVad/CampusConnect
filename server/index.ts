import 'dotenv/config';
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { initializeDatabase } from "./auth";
import { setStorage, DatabaseStorage } from "./storage";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Add CORS headers for all requests to support Safari
app.use((req, res, next) => {
  // Allow the host that sent the request
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  // Allow credentials (cookies, authorization headers, etc.)
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  // Allow these HTTP methods
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  // Allow these headers
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  next();
});

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  try {
    // Initialize the database before setting up routes
    log("Initializing database...");

    try {
      // Попробуем инициализировать SupabaseStorage сразу
      const dbStorage = new DatabaseStorage();
      setStorage(dbStorage);
      log("Database connection successful");
      log("Using in-memory session storage for better reliability");
      log("Storage implementation has been updated");
      log("Successfully initialized database storage");
      log("Database initialized successfully");
    } catch (error) {
      log("Error initializing database storage:", error instanceof Error ? error.message : String(error));
      log("Warning: Database initialization failed, falling back to in-memory storage");
      // Fallback на initializeDatabase(), который использует MemStorage
      const dbInitialized = await initializeDatabase();
      if (!dbInitialized) {
        log("Warning: Both database options failed, continuing with in-memory storage");
      }
    }

    // Register API routes
    const server = await registerRoutes(app);

    // Глобальная обработка ошибок
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      // Логирование ошибки для отладки
      console.error('Server error caught in global handler:', err);

      // Определяем статус и сообщение в зависимости от типа ошибки
      let status = err.status || err.statusCode || 500;
      let message = err.message || "Internal Server Error";

      // Проверка специальных случаев ошибок
      if (err.code === 'ENOENT') {
        // Ошибка при отсутствии файла
        status = 404;
        message = "Файл не найден";
      } else if (err.name === 'SyntaxError' && err.message.includes('JSON')) {
        // Ошибка при разборе JSON
        status = 400;
        message = "Неверный формат данных";
      } else if (err.name === 'MulterError') {
        // Ошибки связанные с загрузкой файлов через multer
        status = 400;
        message = err.message || "Ошибка загрузки файла";
      }

      // Отправляем ответ с соответствующим статусом и сообщением об ошибке
      res.status(status).json({
        message,
        error: process.env.NODE_ENV === 'development' ? err.stack : undefined
      });

      // В девелопмент-режиме пробрасываем ошибку дальше для логирования
      if (process.env.NODE_ENV === 'development') {
        console.error('Full error details:', err);
      }
    });

    // importantly only setup vite in development and after
    // setting up all the other routes so the catch-all route
    // doesn't interfere with the other routes
    if (app.get("env") === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    // ALWAYS serve the app on port 5000
    // this serves both the API and the client.
    // It is the only port that is not firewalled.
    const port = 5050;
    server.listen({
      port,
      host: "0.0.0.0",
      reusePort: true,
    }, () => {
      log(`serving on port ${port}`);
    });
  } catch (error) {
    log(`Failed to start server: ${error}`);
    process.exit(1);
  }
})();