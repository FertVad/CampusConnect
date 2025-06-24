import { Express } from "express";
import { getStorage } from "../storage";
import { insertTaskSchema } from "@shared/schema";
import { z } from "zod";
import type { RouteContext } from "./index";
import { logger } from "../utils/logger";
import { getDbUserBySupabaseUser } from "../utils/userMapping";
import { NotificationService } from "../services/NotificationService";
import { getTaskStatusLabel } from '@shared/utils';

export function registerTaskRoutes(app: Express, { authenticateUser, requireRole }: RouteContext) {
// Tasks Routes
app.get('/api/tasks', authenticateUser, async (req, res) => {
  try {
    const tasks = await getStorage().getTasks();
    res.json(tasks);
  } catch (error) {
    logger.error('Error fetching tasks:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Detailed error:', errorMessage);
    res.status(500).json({ 
      message: "Error fetching tasks", 
      details: errorMessage,
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/api/tasks/client/:clientId', authenticateUser, async (req, res) => {
  try {
    const clientId = req.params.clientId;

    const userId = req.user!.id;
    const userRole = req.user!.role;
    const isAdmin = userRole === 'admin';
    // Только клиент или администратор может просматривать задачи клиента
    if (!isAdmin && userId !== clientId) {
      return res.status(403).json({ message: "Forbidden - You can only view your own tasks" });
    }
    
    const tasks = await getStorage().getTasksByClient(clientId);
    res.json(tasks);
  } catch (error) {
    logger.error('Error fetching client tasks:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Detailed error:', errorMessage);
    res.status(500).json({ 
      message: "Error fetching client tasks", 
      details: errorMessage,
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/api/tasks/executor/:executorId', authenticateUser, async (req, res) => {
  try {
    const executorId = req.params.executorId;

    const userId = req.user!.id;
    const userRole = req.user!.role;
    const isAdmin = userRole === 'admin';
    // Только исполнитель или администратор может просматривать задачи исполнителя
    if (!isAdmin && userId !== executorId) {
      return res.status(403).json({ message: "Forbidden - You can only view tasks assigned to you" });
    }
    
    const tasks = await getStorage().getTasksByExecutor(executorId);
    res.json(tasks);
  } catch (error) {
    logger.error('Error fetching executor tasks:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Detailed error:', errorMessage);
    res.status(500).json({ 
      message: "Error fetching executor tasks", 
      details: errorMessage,
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/api/tasks/status/:status', authenticateUser, async (req, res) => {
  try {
    const status = req.params.status;
    
    // Проверяем, что статус валидный
    const validStatuses = ['new', 'in_progress', 'completed', 'on_hold'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ 
        message: "Invalid status value", 
        details: `Status must be one of: ${validStatuses.join(', ')}`
      });
    }
    
    const tasks = await getStorage().getTasksByStatus(status);

    const { id: userId, role: userRole } = await getDbUserBySupabaseUser(req.user!);

    // Если пользователь не админ, фильтруем только те задачи, которые относятся к нему
    if (userRole !== 'admin') {
      const filteredTasks = tasks.filter(task =>
        task.clientId === userId || task.executorId === userId
      );
      return res.json(filteredTasks);
    }
    
    res.json(tasks);
  } catch (error) {
    logger.error('Error fetching tasks by status:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Detailed error:', errorMessage);
    res.status(500).json({ 
      message: "Error fetching tasks by status", 
      details: errorMessage,
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/api/tasks/due-soon/:days', authenticateUser, async (req, res) => {
  try {
    const days = parseInt(req.params.days);
    
    if (isNaN(days) || days < 0 || days > 30) {
      return res.status(400).json({ 
        message: "Invalid days parameter", 
        details: "The days parameter must be a number between 0 and 30"
      });
    }
    
    const tasks = await getStorage().getTasksDueSoon(days);

    const { id: userId, role: userRole } = await getDbUserBySupabaseUser(req.user!);

    // Если пользователь не админ, фильтруем только те задачи, которые относятся к нему
    if (userRole !== 'admin') {
      const filteredTasks = tasks.filter(task =>
        task.clientId === userId || task.executorId === userId
      );
      return res.json(filteredTasks);
    }
    
    res.json(tasks);
  } catch (error) {
    logger.error('Error fetching due soon tasks:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Detailed error:', errorMessage);
    res.status(500).json({ 
      message: "Error fetching tasks due soon", 
      details: errorMessage,
      timestamp: new Date().toISOString()
    });
  }
});

app.post('/api/tasks', authenticateUser, async (req, res) => {
  try {
    // Модифицируем схему вставки задачи для преобразования строки даты в объект Date
    const modifiedTaskSchema = insertTaskSchema.extend({
      dueDate: z.string().nullable().transform(val => val ? new Date(val) : null)
    });
    
    logger.info('Request body:', req.body);
    const taskData = modifiedTaskSchema.parse(req.body);
    logger.info('Parsed task data:', taskData);
    const dbUser = await getDbUserBySupabaseUser(req.user!);
    logger.info("DB user:", dbUser);

    const { id: userId, role: userRole } = dbUser;

    logger.info('User permissions check:', {
      email: req.user!.email,
      dbUserId: userId,
      dbUserRole: userRole,
      taskClientId: taskData.clientId
    });

    if (!taskData.clientId) {
      taskData.clientId = userId;
    }

    if (userRole !== 'admin' && taskData.clientId !== userId) {
      return res.status(403).json({
        message: "Forbidden - You can only create tasks on your own behalf"
      });
    }
    
    const task = await getStorage().createTask(taskData);
    
    // Создаем уведомление для исполнителя
    await getStorage().createNotification({
      userId: task.executorId,
      title: "New Task Assigned",
      content: `You have been assigned a new task: ${task.title}`,
      relatedId: task.id,
      relatedType: "task"
    });
    
    res.status(201).json(task);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        message: "Validation error", 
        errors: error.errors,
        timestamp: new Date().toISOString()
      });
    }
    logger.error('Error creating task:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Detailed error:', errorMessage);
    res.status(500).json({ 
      message: "Error creating task", 
      details: errorMessage,
      timestamp: new Date().toISOString()
    });
  }
});

// Endpoint для удаления задачи
app.delete('/api/tasks/:id', authenticateUser, async (req, res) => {
  try {
    const taskId = req.params.id;
    const task = await getStorage().getTask(taskId);
    
    if (!task) {
      return res.status(404).json({ 
        message: "Task not found", 
        details: `No task exists with ID ${taskId}`
      });
    }
    
    const { id: userId, role: userRole } = await getDbUserBySupabaseUser(req.user!);
    const canDelete = userRole === 'admin' || task.clientId === userId;

    logger.info('User permissions check:', {
      email: req.user!.email,
      dbUserId: userId,
      dbUserRole: userRole,
      taskId: task.id,
      taskClientId: task.clientId,
      canDelete
    });

    if (!canDelete) {
      return res.status(403).json({
        message: 'Forbidden - Only task creators or admins can delete tasks',
        details: {
          taskId: task.id,
          userId,
          userRole,
          taskClientId: task.clientId,
          canDelete
        }
      });
    }
    
    // Удаляем задачу
    await getStorage().deleteTask(taskId);
    
    // Уведомляем исполнителя о удалении задачи, если задача была назначена
    if (task.executorId && task.executorId !== userId) {
      await getStorage().createNotification({
        userId: task.executorId,
        title: "Task Deleted",
        content: `Task "${task.title}" has been deleted`,
        relatedType: "task"
      });
    }
    
    // Отправляем успешный ответ
    res.status(200).json({ 
      message: "Task deleted successfully",
      taskId: taskId
    });
  } catch (error) {
    logger.error('Error deleting task:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Detailed error:', errorMessage);
    res.status(500).json({ 
      message: "Error deleting task", 
      details: errorMessage,
      timestamp: new Date().toISOString()
    });
  }
});

app.put('/api/tasks/:id', authenticateUser, async (req, res) => {
  try {
    const taskId = req.params.id;
    const task = await getStorage().getTask(taskId);
    
    if (!task) {
      return res.status(404).json({ 
        message: "Task not found", 
        details: `No task exists with ID ${taskId}`
      });
    }
    
    logger.info("Request body:", req.body);
    const dbUser = await getDbUserBySupabaseUser(req.user!);
    logger.info("DB user:", dbUser);
    const { id: userId, role: userRole } = dbUser;
    const isAdmin = userRole === 'admin';
    const isCreator = task.clientId === userId;
    const isExecutor = task.executorId === userId;
    const canEdit = isAdmin || isCreator || isExecutor;

    logger.info('User permissions check:', {
      email: req.user!.email,
      dbUserId: userId,
      dbUserRole: userRole,
      taskId: task.id,
      taskClientId: task.clientId,
      canEdit
    });

    if (!canEdit) {
      if (isExecutor && Object.keys(req.body).length === 1 && 'status' in req.body) {
        // Executor can only update status
      } else {
        return res.status(403).json({
          message: "Forbidden - Only task creators or admins can edit tasks",
          details: "Task executors can only update the status field"
        });
      }
    }
    
    // Модифицируем схему для обновления задачи, чтобы обрабатывать строковые даты
    const modifiedUpdateTaskSchema = insertTaskSchema.partial().extend({
      dueDate: z.string().nullable().optional().transform(val => val ? new Date(val) : null)
    });
    
    const taskData = modifiedUpdateTaskSchema.parse(req.body);
    
    // Ограничиваем поля, которые может изменить исполнитель
    if (!isAdmin && isExecutor && !isCreator) {
      // Исполнитель может изменить только статус и, возможно, добавить описание
      const allowedFields = ['status', 'description'];
      const providedFields = Object.keys(taskData);
      
      const disallowedFields = providedFields.filter(field => !allowedFields.includes(field));
      if (disallowedFields.length > 0) {
        return res.status(403).json({ 
          message: "Forbidden - As an executor, you can only update status and description",
          disallowedFields,
          details: `Attempted to update restricted fields: ${disallowedFields.join(', ')}`
        });
      }
    }
    
    const updatedTask = await getStorage().updateTask(taskId, taskData);
    
    // Создание уведомления при изменении статуса
    if (taskData.status && taskData.status !== task.status) {
      const statusMessages = {
        pending: 'Task moved to pending',
        in_progress: 'Task started and is now in progress',
        completed: 'Task completed successfully',
        on_hold: 'Task put on hold',
        cancelled: 'Task cancelled'
      } as const;

      const notificationTitle =
        statusMessages[taskData.status as keyof typeof statusMessages] ||
        'Task Status Updated';

      await NotificationService.createNotification({
        userId: task.clientId,
        title: notificationTitle,
        message: `Task "${task.title}" status changed from "${task.status}" to "${taskData.status}"`,
        type: 'task_update',
        relatedId: taskId,
        relatedType: 'task'
      });

      console.log(`[INFO] Notification created for task ${taskId} status change: ${task.status} -> ${taskData.status}`);
    }
    
    res.json(updatedTask);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        message: "Validation error", 
        errors: error.errors,
        timestamp: new Date().toISOString() 
      });
    }
    logger.error('Error updating task:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Detailed error:', errorMessage);
    res.status(500).json({ 
      message: "Error updating task", 
      details: errorMessage,
      timestamp: new Date().toISOString()
    });
  }
});



// Этот маршрут должен быть определен после всех других маршрутов с параметрами, 
// чтобы избежать конфликтов с маршрутами tasks/client, tasks/executor и т.д.
app.get('/api/tasks/:id', authenticateUser, async (req, res) => {
  try {
    const taskId = req.params.id;
    
    const task = await getStorage().getTask(taskId);
    
    if (!task) {
      return res.status(404).json({ 
        message: "Task not found",
        details: `No task exists with ID ${taskId}`
      });
    }
    
    const { id: currentUserId, role: currentUserRole } = await getDbUserBySupabaseUser(req.user!);
    // Проверяем, имеет ли пользователь право на просмотр этой задачи
    if (currentUserRole !== 'admin' && currentUserId !== task.clientId && currentUserId !== task.executorId) {
      return res.status(403).json({
        message: "Forbidden",
        details: "You can only view tasks where you are the client, executor, or an admin"
      });
    }
    
    res.json(task);
  } catch (error) {
    logger.error('Error fetching task:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Detailed error:', errorMessage);
    res.status(500).json({ 
      message: "Error fetching task", 
      details: errorMessage,
      timestamp: new Date().toISOString()
    });
  }
});

// GET /api/users/:id/tasks - получить все задачи пользователя (как клиента, так и исполнителя)
app.get('/api/users/:id/tasks', authenticateUser, async (req, res) => {
  try {
    const userId = req.params.id;

    const currentUserId = req.user!.id;
    const currentUserRole = req.user!.role;
    // Админ может видеть задачи любых пользователей
    // Другие пользователи - только свои
    if (currentUserRole !== 'admin' && currentUserId !== userId) {
      return res.status(403).json({ message: "Forbidden" });
    }
    
    // Получаем задачи, где пользователь является клиентом или исполнителем
    const clientTasks = await getStorage().getTasksByClient(userId);
    const executorTasks = await getStorage().getTasksByExecutor(userId);
    
    // Объединяем все задачи в один массив
    const allTasks = [...clientTasks, ...executorTasks];
    
    // Удаляем дубликаты (если пользователь одновременно является и клиентом, и исполнителем)
    const uniqueTasks = allTasks.filter((task, index, self) => 
      index === self.findIndex((t) => t.id === task.id)
    );
    
    res.json(uniqueTasks);
  } catch (error) {
    logger.error('Error getting tasks for user:', error);
    res.status(500).json({ message: "Server error" });
  }
});

// GET /api/users/:id/notifications - получить все уведомления пользователя
app.get('/api/users/:id/notifications', authenticateUser, async (req, res) => {
  try {
    const userId = req.params.id;

    const currentUserId = req.user!.id;
    const currentUserRole = req.user!.role;
    // Админ может видеть уведомления любых пользователей
    // Другие пользователи - только свои
    if (currentUserRole !== 'admin' && currentUserId !== userId) {
      return res.status(403).json({ message: "Forbidden" });
    }
    
    const notifications = await getStorage().getNotificationsByUser(userId);
    res.json(notifications);
  } catch (error) {
    logger.error('Error getting notifications for user:', error);
    res.status(500).json({ message: "Server error" });
  }
});

// PATCH /api/tasks/:id/status - обновить статус задачи
app.patch('/api/tasks/:id/status', authenticateUser, async (req, res) => {
  try {
    const taskId = req.params.id;
    const { status } = req.body;
    
    if (!status || !['new', 'in_progress', 'completed', 'on_hold'].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }
    
    // Получаем текущую задачу
    const task = await getStorage().getTaskById(taskId);
    
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }
    
    const { id: currentUserId, role: currentUserRole } = await getDbUserBySupabaseUser(req.user!);
    // Проверяем права доступа: только админ, клиент или исполнитель задачи могут менять статус
    if (currentUserRole !== 'admin' && currentUserId !== task.clientId && currentUserId !== task.executorId) {
      return res.status(403).json({ message: "Forbidden" });
    }
    
    // Обновляем статус задачи
    const updatedTask = await getStorage().updateTask(taskId, { status });
    
    // Создаем уведомление при изменении статуса задачи
    if (status && status !== task.status) {
      const statusMessages = {
        pending: 'Task moved to pending',
        in_progress: 'Task started and is now in progress',
        completed: 'Task completed successfully',
        on_hold: 'Task put on hold',
        cancelled: 'Task cancelled'
      } as const;

      const notificationTitle =
        statusMessages[status as keyof typeof statusMessages] ||
        'Task Status Updated';

      await NotificationService.createNotification({
        userId: task.clientId,
        title: notificationTitle,
        message: `Task "${task.title}" status changed from "${task.status}" to "${status}"`,
        type: 'task_update',
        relatedId: taskId,
        relatedType: 'task'
      });

      console.log(`[INFO] Notification created for task ${taskId} status change: ${task.status} -> ${status}`);
    }
    
    res.json(updatedTask);
  } catch (error) {
    logger.error('Error updating task status:', error);
    res.status(500).json({ message: "Server error" });
  }
});

}
