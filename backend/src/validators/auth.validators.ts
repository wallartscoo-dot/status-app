import { z } from "zod";

const usernameSchema = z
  .string()
  .trim()
  .min(3, "Username must be at least 3 characters")
  .max(24, "Username must be at most 24 characters")
  .regex(/^[a-zA-Z0-9_.]+$/, "Username can only contain letters, numbers, underscores and dots");

const passwordSchema = z.string().min(8, "Password must be at least 8 characters");

export const signupSchema = z
  .object({
    fullName: z.string().trim().min(2, "Full name is required").max(80),
    username: usernameSchema,
    email: z.string().trim().toLowerCase().email("Invalid email"),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type SignupInput = z.infer<typeof signupSchema>;

export const loginSchema = z.object({
  identifier: z.string().trim().min(1, "Email or username is required"), // email or username
  password: z.string().min(1, "Password is required"),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email("Invalid email"),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1, "refreshToken is required"),
});

export const updateMeSchema = z.object({
  fullName: z.string().trim().min(2).max(80).optional(),
  bio: z.string().trim().max(160).optional(),
  avatarUrl: z.string().url().optional(),
  // Settings screen (spec section 16: "Add notification preferences in
  // Settings"). Partial updates are merged with existing prefs, not replaced.
  notificationPrefs: z
    .object({
      favorites: z.boolean().optional(),
      newFromCreator: z.boolean().optional(),
      trending: z.boolean().optional(),
      system: z.boolean().optional(),
    })
    .optional(),
});
