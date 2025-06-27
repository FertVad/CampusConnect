import { Express } from 'express';
import { getStorage } from '../storage';
import type { RouteContext } from './index';
import { insertUserPreferencesSchema } from '@shared/schema';
import { updateUserPreferencesSchema } from '../types/user-preferences';
import { z } from 'zod';
import { logger } from '../utils/logger';

export function registerUserPreferencesRoutes(app: Express, { authenticateUser }: RouteContext) {
  app.get('/api/user-preferences', authenticateUser, async (req, res) => {
    try {
      const userId = req.user!.id;
      let prefs = await getStorage().getUserPreferences(userId);
      if (!prefs) {
        prefs = {
          userId,
          theme: 'light',
          language: 'en',
          notificationsEnabled: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
      }
      res.json(prefs);
    } catch (error) {
      logger.error('Error fetching user preferences:', error);
      const errorId = (error as any)?.id;
      res.status(500).json({
        message: 'Failed to fetch preferences',
        ...(errorId ? { errorId } : {})
      });
    }
  });

  app.post('/api/user-preferences', authenticateUser, async (req, res) => {
    try {
      const data = insertUserPreferencesSchema.parse(req.body);
      const userId = req.user!.id;
      const existing = await getStorage().getUserPreferences(userId);
      if (existing) {
        return res.status(409).json({ message: 'Preferences already exist' });
      }
      const prefs = await getStorage().createUserPreferences(userId, data);
      res.status(201).json(prefs);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Validation error', errors: error.errors });
      }
      logger.error('Error creating user preferences:', error);
      const errorId = (error as any)?.id;
      res.status(500).json({
        message: 'Failed to create preferences',
        ...(errorId ? { errorId } : {})
      });
    }
  });

  app.put('/api/user-preferences', authenticateUser, async (req, res) => {
    try {
      const data = updateUserPreferencesSchema.parse(req.body);
      const userId = req.user!.id;
      let prefs = await getStorage().getUserPreferences(userId);
      if (!prefs) {
        prefs = await getStorage().createUserPreferences(userId, data);
        return res.status(201).json(prefs);
      }
      const updated = await getStorage().updateUserPreferences(userId, data);
      res.json(updated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Validation error', errors: error.errors });
      }
      logger.error('Error updating user preferences:', error);
      const errorId = (error as any)?.id;
      res.status(500).json({
        message: 'Failed to update preferences',
        ...(errorId ? { errorId } : {})
      });
    }
  });
}
