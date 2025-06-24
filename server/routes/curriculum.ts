import { Express } from "express";
import { getStorage } from "../storage";
import { z } from "zod";
import type { RouteContext } from "./index";
import { logger } from "../utils/logger";

export function registerCurriculumRoutes(app: Express, { authenticateUser, requireRole }: RouteContext) {
  app.get('/api/curriculum-plans', authenticateUser, async (req, res) => {
    try {
      const defaultPlans = [
        { id: 1, specialtyName: "Информатика и вычислительная техника", specialtyCode: "09.03.01", yearsOfStudy: 4, educationLevel: "ВО", description: "Бакалавриат по информатике и вычислительной технике", createdBy: 1, createdAt: new Date(), updatedAt: new Date() },
        { id: 2, specialtyName: "Экономика и управление", specialtyCode: "38.03.01", yearsOfStudy: 4, educationLevel: "ВО", description: "Бакалавриат по экономике и управлению", createdBy: 1, createdAt: new Date(), updatedAt: new Date() },
        { id: 3, specialtyName: "Программирование в компьютерных системах", specialtyCode: "09.02.03", yearsOfStudy: 3, educationLevel: "СПО", description: "Программирование в компьютерных системах (СПО)", createdBy: 1, createdAt: new Date(), updatedAt: new Date() }
      ];
      let curriculumPlans: any[] = [];
      try {
        const storage = getStorage();
        if (typeof storage.getCurriculumPlans === 'function') {
          curriculumPlans = await storage.getCurriculumPlans();
        } else {
          curriculumPlans = defaultPlans;
        }
      } catch {
        curriculumPlans = defaultPlans;
      }
      res.json(curriculumPlans);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ message: "Error fetching curriculum plans", details: errorMessage, timestamp: new Date().toISOString() });
    }
  });

  app.get('/api/curriculum-plans/education-level/:level', authenticateUser, async (req, res) => {
    try {
      const level = req.params.level as 'СПО' | 'ВО' | 'Магистратура' | 'Аспирантура';
      const validLevels = ['СПО', 'ВО', 'Магистратура', 'Аспирантура'];
      if (!validLevels.includes(level)) {
        return res.status(400).json({ message: "Invalid education level value", details: `Education level must be one of: ${validLevels.join(', ')}` });
      }
      const defaultPlansByLevel = [
        { id: 3, specialtyName: "Программирование в компьютерных системах", specialtyCode: "09.02.03", yearsOfStudy: 3, educationLevel: "СПО", description: "Программирование в компьютерных системах (СПО)", createdBy: 1, createdAt: new Date(), updatedAt: new Date() }
      ];
      let plans: any[] = [];
      try {
        const storage = getStorage();
        if (typeof storage.getCurriculumPlansByEducationLevel === 'function') {
          plans = await storage.getCurriculumPlansByEducationLevel(level);
        } else {
          plans = defaultPlansByLevel.filter(p => p.educationLevel === level);
        }
      } catch {
        plans = defaultPlansByLevel.filter(p => p.educationLevel === level);
      }
      res.json(plans);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ message: "Error fetching curriculum plans by education level", details: errorMessage, timestamp: new Date().toISOString() });
    }
  });

  app.get('/api/curriculum-plans/:id', authenticateUser, async (req, res) => {
    try {
      const planId = req.params.id;
      const storage = getStorage();
      let plan: any = null;
      if (typeof storage.getCurriculumPlan === 'function') {
        plan = await storage.getCurriculumPlan(planId);
      } else {
        const allPlans = await storage.getCurriculumPlans();
        plan = allPlans.find(p => p.id === planId);
      }
      if (!plan) {
        return res.status(404).json({ message: "Curriculum plan not found", details: `No curriculum plan exists with ID ${planId}` });
      }
      res.json(plan);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ message: "Error fetching curriculum plan", details: errorMessage, timestamp: new Date().toISOString() });
    }
  });

  app.post('/api/curriculum-plans', authenticateUser, requireRole(['admin']), async (req, res) => {
    try {
      const { insertCurriculumPlanSchema } = await import('@shared/schema');
      const modifiedSchema = insertCurriculumPlanSchema.extend({ createdBy: z.number().optional() });
      const planData = modifiedSchema.parse(req.body);
      if (!planData.createdBy) {
        planData.createdBy = req.user!.id;
      }
      const plan = await getStorage().createCurriculumPlan(planData);
      const storage = getStorage();
      const admins = await storage.getUsersByRole('admin');
      for (const admin of admins) {
        if (admin.id !== req.user?.id) {
          await storage.createNotification({ userId: admin.id, title: "Создан учебный план", content: `Учебный план \"${plan.specialtyName}\" (${plan.specialtyCode}) был создан`, relatedId: plan.id, relatedType: "curriculum_plan" });
        }
      }
      res.status(201).json(plan);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors, timestamp: new Date().toISOString() });
      }
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ message: "Error creating curriculum plan", details: errorMessage, timestamp: new Date().toISOString() });
    }
  });

  const updateCurriculumPlan = async (req: any, res: any) => {
    try {
      const planId = req.params.id;
      const plan = await getStorage().getCurriculumPlan(planId);
      if (!plan) {
        return res.status(404).json({ message: "Curriculum plan not found", details: `No curriculum plan exists with ID ${planId}` });
      }
      const { insertCurriculumPlanSchema } = await import('@shared/schema');
      const modifiedSchema = insertCurriculumPlanSchema.partial();
      const bodyData = req.body;
      if (bodyData._method) {
        delete bodyData._method;
      }
      const planData = modifiedSchema.parse(bodyData);
      const updatedPlan = await getStorage().updateCurriculumPlan(planId, planData);
      const storage = getStorage();
      const admins = await storage.getUsersByRole('admin');
      for (const admin of admins) {
        if (admin.id !== req.user?.id) {
          await storage.createNotification({ userId: admin.id, title: "Обновлен учебный план", content: `Учебный план \"${plan.specialtyName}\" (${plan.specialtyCode}) был обновлен`, relatedId: plan.id, relatedType: "curriculum_plan" });
        }
      }
      res.json(updatedPlan);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors, timestamp: new Date().toISOString() });
      }
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ message: "Error updating curriculum plan", details: errorMessage, timestamp: new Date().toISOString() });
    }
  };

  app.put('/api/curriculum-plans/:id', authenticateUser, requireRole(['admin']), updateCurriculumPlan);
  app.patch('/api/curriculum-plans/:id', authenticateUser, requireRole(['admin']), updateCurriculumPlan);
  app.post('/api/curriculum-plans/:id', authenticateUser, requireRole(['admin']), (req, res) => {
    if (req.body._method === 'PUT') {
      return updateCurriculumPlan(req, res);
    }
    return res.status(400).json({ message: "Invalid request method", details: "Expected _method=PUT in the request body" });
  });

  app.delete('/api/curriculum-plans/:id', authenticateUser, requireRole(['admin']), async (req, res) => {
    try {
      const planId = req.params.id;
      const plan = await getStorage().getCurriculumPlan(planId);
      if (!plan) {
        return res.status(404).json({ message: "Curriculum plan not found", details: `No curriculum plan exists with ID ${planId}` });
      }
      const success = await getStorage().deleteCurriculumPlan(planId);
      if (!success) {
        return res.status(500).json({ message: "Failed to delete curriculum plan", details: "An error occurred while attempting to delete the curriculum plan" });
      }
      const storage = getStorage();
      const admins = await storage.getUsersByRole('admin');
      for (const admin of admins) {
        if (admin.id !== req.user?.id) {
          await storage.createNotification({ userId: admin.id, title: "Удален учебный план", content: `Учебный план \"${plan.specialtyName}\" (${plan.specialtyCode}) был удален`, relatedType: "curriculum_plan" });
        }
      }
      res.status(200).json({ message: "Curriculum plan deleted successfully", planId });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ message: "Error deleting curriculum plan", details: errorMessage, timestamp: new Date().toISOString() });
    }
  });

  app.get('/api/documents', authenticateUser, async (req, res) => {
    try {
      const userId = req.query.userId ? (req.query.userId as string) : undefined;
      res.json([]);
    } catch (error) {
      logger.error('Error getting documents:', error);
      res.status(500).json({ message: "Server error" });
    }
  });

  app.post('/api/curriculum-plans/weeks', authenticateUser, requireRole(['admin']), async (req, res) => {
    try {
      const { planId, calendarData } = req.body;
      if (!planId) {
        return res.status(400).json({ message: "Missing plan ID", details: "A planId is required" });
      }
      const id = planId;
      const plan = await getStorage().getCurriculumPlan(id);
      if (!plan) {
        return res.status(404).json({ message: "Curriculum plan not found", details: `No plan found with ID ${id}` });
      }
      const calendarDataString = JSON.stringify(calendarData);
      const updatedPlan = await getStorage().updateCurriculumPlan(id, { calendarData: calendarDataString });
      return res.json({ success: true, message: "Calendar data saved", plan: updatedPlan });
    } catch (error) {
      logger.error('Error saving calendar data:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ message: "Error saving calendar data", details: errorMessage });
    }
  });
}
