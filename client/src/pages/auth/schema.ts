import { z } from "zod";
import { insertUserSchema } from "@shared/schema";

export const createLoginSchema = (t: any) => z.object({
  email: z.string().email(t('auth.validations.validEmail')),
  password: z.string().min(6, t('auth.validations.passwordLength')),
});

export const createRegisterSchema = (t: any) =>
  insertUserSchema.extend({
    firstName: z.string().min(2, t('auth.validations.firstNameLength')),
    lastName: z.string().min(2, t('auth.validations.lastNameLength')),
    password: z.string().min(6, t('auth.validations.passwordLength')),
    confirmPassword: z.string().min(6, t('auth.validations.confirmPasswordLength')),
  }).refine((data) => data.password === data.confirmPassword, {
    message: t('auth.validations.passwordsMatch'),
    path: ['confirmPassword'],
  });

export type LoginData = z.infer<ReturnType<typeof createLoginSchema>>;
export type RegisterData = z.infer<ReturnType<typeof createRegisterSchema>>;

