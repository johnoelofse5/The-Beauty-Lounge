'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface ValidationFieldProps {
  label: string
  error?: string
  required?: boolean
  children: React.ReactNode
  className?: string
}

export function ValidationField({ 
  label, 
  error, 
  required = false, 
  children,
  className 
}: ValidationFieldProps) {
  return (
    <div className={cn("relative", className)}>
      <Label className="block text-sm font-medium text-gray-700 mb-1 sm:mb-2">
        {label} {required && <span className="text-red-500">*</span>}
      </Label>
      <div className="relative">
        {children}
        {error && (
          <div className="absolute top-full left-0 mt-1 z-10">
            <div className="bg-red-500 text-white text-xs rounded px-2 py-1 shadow-lg relative">
              {error}
              {/* Tooltip arrow */}
              <div className="absolute -top-1 left-3 w-2 h-2 bg-red-500 transform rotate-45"></div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

interface ValidationInputProps extends React.ComponentProps<typeof Input> {
  label: string
  error?: string
  required?: boolean
  className?: string
}

export function ValidationInput({ 
  label, 
  error, 
  required = false, 
  className,
  ...props 
}: ValidationInputProps) {
  return (
    <ValidationField label={label} error={error} required={required} className={className}>
      <Input 
        {...props}
        className={cn(
          error && "border-red-500 focus:border-red-500 focus:ring-red-500"
        )}
      />
    </ValidationField>
  )
}

interface ValidationTextareaProps extends React.ComponentProps<typeof Textarea> {
  label: string
  error?: string
  required?: boolean
  className?: string
}

export function ValidationTextarea({ 
  label, 
  error, 
  required = false, 
  className,
  ...props 
}: ValidationTextareaProps) {
  return (
    <ValidationField label={label} error={error} required={required} className={className}>
      <Textarea 
        {...props}
        className={cn(
          error && "border-red-500 focus:border-red-500 focus:ring-red-500"
        )}
      />
    </ValidationField>
  )
}

interface ValidationSelectProps {
  label: string
  error?: string
  required?: boolean
  className?: string
  value: string
  onValueChange: (value: string) => void
  placeholder?: string
  children: React.ReactNode
}

export function ValidationSelect({ 
  label, 
  error, 
  required = false, 
  className,
  value,
  onValueChange,
  placeholder,
  children
}: ValidationSelectProps) {
  return (
    <ValidationField label={label} error={error} required={required} className={className}>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className={cn(
          "w-full",
          error && "border-red-500 focus:border-red-500 focus:ring-red-500"
        )}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent className="bg-white border border-gray-300 shadow-lg">
          {children}
        </SelectContent>
      </Select>
    </ValidationField>
  )
}

interface ValidationFileInputProps extends React.ComponentProps<typeof Input> {
  label: string
  error?: string
  required?: boolean
  className?: string
}

export function ValidationFileInput({ 
  label, 
  error, 
  required = false, 
  className,
  ...props 
}: ValidationFileInputProps) {
  return (
    <ValidationField label={label} error={error} required={required} className={className}>
      <Input 
        {...props}
        className={cn(
          error && "border-red-500 focus:border-red-500 focus:ring-red-500"
        )}
      />
    </ValidationField>
  )
}

// Hook for managing validation state
export function useValidation<T extends Record<string, any>>(
  initialData: T,
  schema: any
) {
  const [data, setData] = React.useState<T>(initialData)
  const [errors, setErrors] = React.useState<Record<string, string>>({})

  const updateField = (field: keyof T, value: any) => {
    setData(prev => ({ ...prev, [field]: value }))
    
    // Clear error when user starts typing
    if (errors[field as string]) {
      setErrors(prev => ({ ...prev, [field as string]: '' }))
    }
  }

  const validateField = (field: keyof T) => {
    // This would integrate with the ValidationService
    // For now, just clear the error
    setErrors(prev => ({ ...prev, [field as string]: '' }))
  }

  const validateForm = () => {
    // This would integrate with the ValidationService
    // Return validation result
    return { isValid: true, errors: {} }
  }

  const setFieldError = (field: keyof T, error: string) => {
    setErrors(prev => ({ ...prev, [field as string]: error }))
  }

  const clearErrors = () => {
    setErrors({})
  }

  return {
    data,
    errors,
    updateField,
    validateField,
    validateForm,
    setFieldError,
    clearErrors
  }
}
