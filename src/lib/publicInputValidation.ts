import { z } from "zod";

const controlCharacterPattern = /[\u0000-\u001F\u007F]/;

const trimmedText = (fieldName: string, maxLength: number) =>
  z
    .string()
    .trim()
    .min(1, `${fieldName} is required.`)
    .max(maxLength, `${fieldName} must be ${maxLength} characters or less.`)
    .refine((value) => !controlCharacterPattern.test(value), {
      message: `${fieldName} contains unsupported characters.`,
    });

export const waitlistSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Please enter a valid email address.")
    .max(255, "Email must be 255 characters or less."),
  name: z
    .string()
    .trim()
    .max(100, "Name must be 100 characters or less.")
    .optional()
    .or(z.literal("")),
  role: z.enum(["artist", "promoter", "venue", "production", "photo_video"]),
});

export const presaleSignupSchema = z.object({
  name: trimmedText("Name", 100),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Please enter a valid email address.")
    .max(255, "Email must be 255 characters or less."),
  city: trimmedText("City", 100),
});

export type WaitlistInput = z.infer<typeof waitlistSchema>;
export type PresaleSignupInput = z.infer<typeof presaleSignupSchema>;