import { z } from 'zod'
import { VALIDATION_RULES } from './constants'

// Common validation schemas
export const emailSchema = z
  .string()
  .min(1, 'Email is required')
  .email('Please enter a valid email address')

export const phoneSchema = z
  .string()
  .min(1, 'Phone number is required')
  .regex(VALIDATION_RULES.PHONE.PATTERN, 'Please enter a valid 10-digit phone number')

export const passwordSchema = z
  .string()
  .min(VALIDATION_RULES.PASSWORD.MIN_LENGTH, `Password must be at least ${VALIDATION_RULES.PASSWORD.MIN_LENGTH} characters`)
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/\d/, 'Password must contain at least one number')

export const nameSchema = z
  .string()
  .min(VALIDATION_RULES.NAME.MIN_LENGTH, `Name must be at least ${VALIDATION_RULES.NAME.MIN_LENGTH} characters`)
  .max(VALIDATION_RULES.NAME.MAX_LENGTH, `Name must be less than ${VALIDATION_RULES.NAME.MAX_LENGTH} characters`)
  .regex(/^[a-zA-Z\s]+$/, 'Name can only contain letters and spaces')

export const pincodeSchema = z
  .string()
  .min(1, 'Pincode is required')
  .regex(VALIDATION_RULES.PINCODE.PATTERN, 'Please enter a valid 6-digit pincode')

// Auth validation schemas
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required')
})

export const registerSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  phone: phoneSchema,
  password: passwordSchema,
  confirmPassword: z.string().min(1, 'Please confirm your password'),
  businessName: z.string().min(1, 'Business name is required'),
  businessType: z.string().min(1, 'Business type is required'),
  address: z.string().min(1, 'Address is required'),
  pincode: pincodeSchema,
  terms: z.boolean().refine(val => val === true, 'You must accept the terms and conditions')
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"]
})

export const forgotPasswordSchema = z.object({
  email: emailSchema
})