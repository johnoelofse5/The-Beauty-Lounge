export interface ValidationRule {
  required?: boolean
  minLength?: number
  maxLength?: number
  min?: number
  max?: number
  pattern?: RegExp
  custom?: (value: any, formData?: any) => string | null
  message?: string
}

export interface ValidationSchema {
  [key: string]: ValidationRule
}

export interface ValidationResult {
  isValid: boolean
  errors: { [key: string]: string }
}

export interface ValidationFieldResult {
  error: string | null
  isValid: boolean
}

export class ValidationService {
  /**
   * Validate a single field against a rule
   */
  static validateField(value: any, rule: ValidationRule, fieldName: string, formData?: any): string | null {
    // Required validation
    if (rule.required && (!value || (typeof value === 'string' && !value.trim()))) {
      return rule.message || `${fieldName} is required`
    }

    // Skip other validations if value is empty and not required
    if (!value || (typeof value === 'string' && !value.trim())) {
      return null
    }

    // String length validations
    if (typeof value === 'string') {
      if (rule.minLength && value.length < rule.minLength) {
        return rule.message || `${fieldName} must be at least ${rule.minLength} characters`
      }
      if (rule.maxLength && value.length > rule.maxLength) {
        return rule.message || `${fieldName} must be no more than ${rule.maxLength} characters`
      }
    }

    // Number validations
    if (typeof value === 'number') {
      if (rule.min !== undefined && value < rule.min) {
        return rule.message || `${fieldName} must be at least ${rule.min}`
      }
      if (rule.max !== undefined && value > rule.max) {
        return rule.message || `${fieldName} must be no more than ${rule.max}`
      }
    }

    // Pattern validation
    if (rule.pattern && typeof value === 'string' && !rule.pattern.test(value)) {
      return rule.message || `${fieldName} format is invalid`
    }

    // Custom validation
    if (rule.custom) {
      const customError = rule.custom(value, formData)
      if (customError) {
        return customError
      }
    }

    return null
  }

  /**
   * Validate a form against a schema
   */
  static validateForm(data: any, schema: ValidationSchema): ValidationResult {
    const errors: { [key: string]: string } = {}

    for (const [fieldName, rule] of Object.entries(schema)) {
      const error = this.validateField(data[fieldName], rule, fieldName, data)
      if (error) {
        errors[fieldName] = error
      }
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors
    }
  }

  /**
   * Validate a single field against a schema
   */
  static validateSingleField(fieldName: string, value: any, schema: ValidationSchema): string | null {
    const rule = schema[fieldName]
    if (!rule) return null

    return this.validateField(value, rule, fieldName)
  }

  /**
   * Common validation schemas
   */
  static schemas = {
    // Service validation schema
    service: {
      name: {
        required: true,
        minLength: 1,
        maxLength: 100,
        message: 'Service name is required'
      },
      description: {
        maxLength: 500
      },
      duration_minutes: {
        required: true,
        min: 1,
        message: 'Duration must be at least 1 minute'
      },
      price: {
        required: true,
        min: 0,
        message: 'Price cannot be negative'
      },
      category_id: {
        required: true,
        message: 'Please select a category'
      }
    },

    // Category validation schema
    category: {
      name: {
        required: true,
        minLength: 1,
        maxLength: 50,
        message: 'Category name is required'
      },
      description: {
        maxLength: 200
      },
      display_order: {
        required: true,
        min: 0,
        message: 'Display order cannot be negative'
      }
    },

    // User profile validation schema
    profile: {
      first_name: {
        maxLength: 50
      },
      last_name: {
        maxLength: 50
      },
      phone: {
        message: 'Please enter a phone number'
      }
    },

    // Portfolio validation schema
    portfolio: {
      title: {
        required: true,
        minLength: 1,
        maxLength: 100,
        message: 'Title is required'
      },
      description: {
        maxLength: 500
      },
      category: {
        maxLength: 50
      }
    },

    // External client validation schema
    externalClient: {
      firstName: {
        required: true,
        minLength: 1,
        maxLength: 50,
        message: 'First name is required'
      },
      lastName: {
        required: true,
        minLength: 1,
        maxLength: 50,
        message: 'Last name is required'
      },
      email: {
        pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        message: 'Please enter a valid email address'
      },
      phone: {
        message: 'Please enter a phone number'
      },
      contactMethod: {
        custom: (value: any, formData: any) => {
          if (!formData?.email && !formData?.phone) {
            return 'At least one contact method (email or phone) is required'
          }
          return null
        }
      }
    },

    // Email validation schema
    email: {
      email: {
        required: true,
        pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        message: 'Please enter a valid email address'
      }
    },

    // Password validation schema
    password: {
      password: {
        required: true,
        minLength: 6,
        message: 'Password must be at least 6 characters long'
      },
      confirmPassword: {
        required: true,
        custom: (value: string, formData?: any) => {
          if (formData?.password && value !== formData.password) {
            return 'Passwords do not match'
          }
          return null
        }
      }
    }
  }

  /**
   * Get validation result for a single field (for use with validation components)
   */
  static getFieldValidation(
    fieldName: string,
    value: any,
    schema: ValidationSchema
  ): ValidationFieldResult {
    const error = this.validateSingleField(fieldName, value, schema)
    return {
      error,
      isValid: !error
    }
  }

  /**
   * Real-time validation for form fields
   */
  static validateFieldRealtime(
    fieldName: string,
    value: any,
    schema: ValidationSchema,
    formData?: any
  ): string | null {
    const rule = schema[fieldName]
    if (!rule) return null

    // For real-time validation, we might want to be less strict
    // Only validate if there's actually content or if it's required
    if (!value && !rule.required) {
      return null
    }

    return this.validateField(value, rule, fieldName)
  }

  /**
   * Validate file uploads
   */
  static validateFile(
    file: File | null,
    options: {
      required?: boolean
      maxSize?: number // in bytes
      allowedTypes?: string[]
      message?: string
    } = {}
  ): string | null {
    if (!file) {
      if (options.required) {
        return options.message || 'File is required'
      }
      return null
    }

    // Check file size
    if (options.maxSize && file.size > options.maxSize) {
      return options.message || `File size must be less than ${Math.round(options.maxSize / 1024 / 1024)}MB`
    }

    // Check file type
    if (options.allowedTypes && !options.allowedTypes.includes(file.type)) {
      return options.message || `File type must be one of: ${options.allowedTypes.join(', ')}`
    }

    return null
  }

  /**
   * Validate image files specifically
   */
  static validateImage(
    file: File | null,
    options: {
      required?: boolean
      maxSize?: number // in bytes, default 5MB
      message?: string
    } = {}
  ): string | null {
    const defaultOptions = {
      maxSize: 5 * 1024 * 1024, // 5MB
      allowedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
      ...options
    }

    return this.validateFile(file, defaultOptions)
  }
}
