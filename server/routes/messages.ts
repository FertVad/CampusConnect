import { Express } from "express";
import { getStorage } from "../storage";
import type { RouteContext } from "./index";

export function registerMessageRoutes(app: Express, { authenticateUser }: RouteContext) {
  // Chat routes
  app.get('/api/users/chat', authenticateUser, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const users = await getStorage().getUsers();
      const filteredUsers = users.filter(user => user.id !== req.user?.id);
      const sanitizedUsers = filteredUsers.map(({ password, ...rest }) => rest);
      res.json(sanitizedUsers);
    } catch {
      res.status(500).json({ message: "Server error" });
    }
  });

  app.get('/api/messages/:userId', authenticateUser, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const otherUserId = parseInt(req.params.userId);
      const messages = await getStorage().getMessagesBetweenUsers(req.user!.id, otherUserId);
      res.json(messages);
    } catch {
      res.status(500).json({ message: "Server error" });
    }
  });

  app.post('/api/messages/read', authenticateUser, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const { messageIds } = req.body;
      if (!Array.isArray(messageIds) || messageIds.length === 0) {
        return res.status(400).json({ message: "Invalid message IDs" });
      }

      const updatedMessages = [] as any[];
      for (const id of messageIds) {
        const message = await getStorage().getMessage(id);
        if (!message) {
          continue;
        }

        if (message.toUserId !== req.user.id) {
          return res.status(403).json({ message: "Forbidden" });
        }

        const updated = await getStorage().updateMessageStatus(id, 'read');
        if (updated) {
          updatedMessages.push(updated);
        }
      }

      res.json(updatedMessages);
    } catch {
      res.status(500).json({ message: "Server error" });
    }
  });
}
