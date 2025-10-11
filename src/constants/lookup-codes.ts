/**
 * Lookup Type Codes
 * 
 * This file contains all the lookup type codes used throughout the application.
 * These codes are used to identify different types of lookup data in the database.
 */

export const LOOKUP_TYPE_CODES = {
  
  TIME_SLOT_INTERVALS: 'TIME_SLOT_INTERVALS',
  DAYS_OF_WEEK: 'DAYS_OF_WEEK',
  HOURS: 'HOURS',
  
  
  SERVICE_CATEGORIES: 'SERVICE_CATEGORIES',
  SERVICE_STATUS: 'SERVICE_STATUS',
  
  
  APPOINTMENT_STATUS: 'APPOINTMENT_STATUS',
  APPOINTMENT_TYPES: 'APPOINTMENT_TYPES',
  
  
  USER_ROLES: 'USER_ROLES',
  USER_STATUS: 'USER_STATUS',
  
  
  PORTFOLIO_CATEGORIES: 'PORTFOLIO_CATEGORIES',
  
  
  CONTACT_METHODS: 'CONTACT_METHODS',
  PREFERRED_CONTACT_TIMES: 'PREFERRED_CONTACT_TIMES',
  
  
  PAYMENT_METHODS: 'PAYMENT_METHODS',
  PAYMENT_STATUS: 'PAYMENT_STATUS',
  
  
  REVENUE_TYPES: 'REVENUE_TYPES',
  TRANSACTION_TYPES: 'TRANSACTION_TYPES',
  
  
  NOTIFICATION_TYPES: 'NOTIFICATION_TYPES',
  NOTIFICATION_FREQUENCY: 'NOTIFICATION_FREQUENCY',
  
  
  MEASUREMENTS: 'MEASUREMENTS',
  
  
  YES_NO: 'YES_NO',
  PRIORITY_LEVELS: 'PRIORITY_LEVELS',
  STATUS_TYPES: 'STATUS_TYPES'
} as const


export type LookupTypeCode = typeof LOOKUP_TYPE_CODES[keyof typeof LOOKUP_TYPE_CODES]


export function isValidLookupTypeCode(code: string): code is LookupTypeCode {
  return Object.values(LOOKUP_TYPE_CODES).includes(code as LookupTypeCode)
}


export function getAllLookupTypeCodes(): LookupTypeCode[] {
  return Object.values(LOOKUP_TYPE_CODES)
}
