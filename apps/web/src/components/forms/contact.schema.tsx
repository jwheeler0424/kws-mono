import * as z from 'zod';

export const contactFormSchema = z.object({
  name: z.string().min(1, { message: 'Please enter your full name' }),
  email: z.email('Please enter a valid email address'),
  phone: z
    .string()
    .refine((value) => /^\+?(\d{1,3})?[-.\s]?(\d{3})[-.\s]?(\d{3})[-.\s]?(\d{4})$/.test(value), {
      message: 'Please enter a valid phone number',
    }),
  message: z
    .string()
    .trim()
    .refine((value) => value.length === 0 || value.length >= 4, {
      message: 'Please enter a valid contact message',
    }),
});
