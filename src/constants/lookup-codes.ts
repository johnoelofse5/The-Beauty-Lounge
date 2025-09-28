/**
 * Lookup Type Codes
 * 
 * This file contains all the lookup type codes used throughout the application.
 * These codes are used to identify different types of lookup data in the database.
 */

export const LOOKUP_TYPE_CODES = {
  // Time-related lookups
  TIME_SLOT_INTERVALS: 'TIME_SLOT_INTERVALS',
  DAYS_OF_WEEK: 'DAYS_OF_WEEK',
  HOURS: 'HOURS',
  
  // Service-related lookups
  SERVICE_CATEGORIES: 'SERVICE_CATEGORIES',
  SERVICE_STATUS: 'SERVICE_STATUS',
  
  // Appointment-related lookups
  APPOINTMENT_STATUS: 'APPOINTMENT_STATUS',
  APPOINTMENT_TYPES: 'APPOINTMENT_TYPES',
  
  // User-related lookups
  USER_ROLES: 'USER_ROLES',
  USER_STATUS: 'USER_STATUS',
  
  // Portfolio-related lookups
  PORTFOLIO_CATEGORIES: 'PORTFOLIO_CATEGORIES',
  
  // Contact-related lookups
  CONTACT_METHODS: 'CONTACT_METHODS',
  PREFERRED_CONTACT_TIMES: 'PREFERRED_CONTACT_TIMES',
  
  // Payment-related lookups
  PAYMENT_METHODS: 'PAYMENT_METHODS',
  PAYMENT_STATUS: 'PAYMENT_STATUS',
  
  // Revenue-related lookups
  REVENUE_TYPES: 'REVENUE_TYPES',
  TRANSACTION_TYPES: 'TRANSACTION_TYPES',
  
  // Notification-related lookups
  NOTIFICATION_TYPES: 'NOTIFICATION_TYPES',
  NOTIFICATION_FREQUENCY: 'NOTIFICATION_FREQUENCY',
  
  // Inventory-related lookups
  MEASUREMENTS: 'MEASUREMENTS',
  
  // General lookups
  YES_NO: 'YES_NO',
  PRIORITY_LEVELS: 'PRIORITY_LEVELS',
  STATUS_TYPES: 'STATUS_TYPES'
} as const

// Type for lookup type codes
export type LookupTypeCode = typeof LOOKUP_TYPE_CODES[keyof typeof LOOKUP_TYPE_CODES]

// Helper function to validate lookup type codes
export function isValidLookupTypeCode(code: string): code is LookupTypeCode {
  return Object.values(LOOKUP_TYPE_CODES).includes(code as LookupTypeCode)
}

// Helper function to get all lookup type codes
export function getAllLookupTypeCodes(): LookupTypeCode[] {
  return Object.values(LOOKUP_TYPE_CODES)
}
