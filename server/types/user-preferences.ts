import { insertUserPreferencesSchema } from "@shared/schema";
import { z } from "zod";

export const updateUserPreferencesSchema = insertUserPreferencesSchema.partial();
export type UpdateUserPreferences = z.infer<typeof updateUserPreferencesSchema>;
