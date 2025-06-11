import { Express } from "express";
import { getStorage } from "../storage";
import { insertUserSchema } from "@shared/schema";
import { z } from "zod";
import type { RouteContext } from "./index";

export function registerUserRoutes(app: Express, { authenticateUser, requireRole }: RouteContext) {
// User Routes
app.get('/api/users', authenticateUser, requireRole(['admin']), async (req, res) => {
  try {
    const users = await getStorage().getUsers();
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

app.get('/api/users/:id', authenticateUser, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    
    // Users can only view their own profile unless they're admins
    if (req.user!.id !== userId && req.user!.role !== 'admin') {
      return res.status(403).json({ message: "Forbidden" });
    }
    
    const user = await getStorage().getUser(userId);
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

app.post('/api/users', authenticateUser, requireRole(['admin']), async (req, res) => {
  try {
    const userData = insertUserSchema.parse(req.body);
    const user = await getStorage().createUser(userData);
    
    // Отправляем уведомление всем администраторам кроме текущего пользователя
    const admins = await getStorage().getUsersByRole('admin');
    
    // Получаем полное имя нового пользователя для уведомления
    const fullName = `${user.firstName} ${user.lastName}`;
    
    // Отправляем уведомления всем администраторам, кроме текущего (если он админ)
    for (const admin of admins) {
      if (admin.id !== req.user?.id) {
        await getStorage().createNotification({
          userId: admin.id,
          title: "New User Registered",
          content: `A new user ${fullName} has been registered with role: ${user.role}`,
          relatedId: user.id,
          relatedType: "user"
        });
      }
    }
    
    res.status(201).json(user);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Validation error", errors: error.errors });
    }
    console.error('Error creating user:', error);
    res.status(500).json({ message: "Server error" });
  }
});

app.put('/api/users/:id', authenticateUser, requireRole(['admin']), async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    console.log(`🔄 PUT /api/users/${userId} - Updating user profile. Admin ID: ${req.user?.id}`);
    
    const userData = insertUserSchema.partial().parse(req.body);
    console.log('📋 Update data:', JSON.stringify(userData));
    
    const updatedUser = await getStorage().updateUser(userId, userData);
    
    if (!updatedUser) {
      console.log(`⚠️ User with ID ${userId} not found`);
      return res.status(404).json({ message: "User not found" });
    }
    
    console.log(`✅ User ${userId} updated successfully:`, JSON.stringify(updatedUser));
    
    // Создаем уведомление для пользователя об обновлении его данных
    try {
      console.log(`📣 Creating notifications for user update...`);
      const storage = getStorage();
      const fullName = `${updatedUser.firstName} ${updatedUser.lastName}`;
      
      // Создаем уведомление для самого пользователя (если обновление сделал не он сам)
      if (req.user && req.user.id !== updatedUser.id) {
        console.log(`📨 Creating notification for updated user (ID: ${updatedUser.id})`);
        const userNotification = await storage.createNotification({
          userId: updatedUser.id,
          title: "User Updated",
          content: `Ваш профиль был обновлён администратором.`,
          relatedType: "user",
          relatedId: updatedUser.id
        });
        console.log(`✓ Created notification for user: ${userNotification.id}`);
      }
      
      // Если обновление сделал администратор, создаем уведомление для него
      if (req.user && req.user.role === 'admin') {
        console.log(`📨 Creating notification for admin who made the change (ID: ${req.user.id})`);
        const adminNotification = await storage.createNotification({
          userId: req.user.id,
          title: "User Updated",
          content: `Вы обновили профиль пользователя ${fullName}.`,
          relatedType: "user",
          relatedId: updatedUser.id
        });
        console.log(`✓ Created notification for admin: ${adminNotification.id}`);
        
        // Получаем всех администраторов
        console.log(`🔍 Getting all admin users...`);
        const admins = await storage.getUsersByRole('admin');
        console.log(`📊 Found ${admins.length} admin users`);
        
        // Отправляем уведомления другим администраторам
        let notificationCount = 0;
        for (const admin of admins) {
          // Не отправляем уведомление админу, который сделал изменения
          if (admin.id !== req.user.id) {
            console.log(`📨 Creating notification for other admin (ID: ${admin.id})`);
            const otherAdminNotification = await storage.createNotification({
              userId: admin.id,
              title: "User Updated",
              content: `Профиль пользователя ${fullName} был обновлён.`,
              relatedType: "user",
              relatedId: updatedUser.id
            });
            console.log(`✓ Created notification for other admin: ${otherAdminNotification.id}`);
            notificationCount++;
          }
        }
        console.log(`📊 Created ${notificationCount} notifications for other admins`);
      }
      
      console.log(`🎉 All notifications created successfully!`);
    } catch (notificationError) {
      console.error("❌ Error creating user update notification:", notificationError);
      if (notificationError instanceof Error) {
        console.error("❌ Error details:", {
          name: notificationError.name,
          message: notificationError.message,
          stack: notificationError.stack
        });
      }
      // Продолжаем, даже если не удалось создать уведомление
    }
    
    res.json(updatedUser);
  } catch (error) {
    console.error('❌ Error updating user:', error);
    if (error instanceof z.ZodError) {
      console.error('❌ Validation error:', JSON.stringify(error.errors));
      return res.status(400).json({ message: "Validation error", errors: error.errors });
    }
    res.status(500).json({ message: "Server error" });
  }
});

app.delete('/api/users/:id', authenticateUser, requireRole(['admin']), async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const success = await getStorage().deleteUser(userId);
    
    if (!success) {
      return res.status(404).json({ message: "User not found" });
    }
    
    res.status(204).end();
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

}
