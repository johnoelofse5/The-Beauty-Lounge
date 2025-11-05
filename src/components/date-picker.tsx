"use client"

import * as React from "react"
import { format } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils"
import { DatePickerProps } from "@/types"

export function DatePicker({
  date,
  onDateChange,
  onChange,
  placeholder = "Select date",
  disabled = false,
  maxDate,
  minDate,
  className,
  allowSameDay = false,
  allowPastDates = false,
  blockedDates = []
}: DatePickerProps & { onChange?: (date: Date | null) => void }) {
  const [open, setOpen] = React.useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={cn(
            "justify-start text-left font-normal",
            !date && "text-muted-foreground",
            className || "w-[280px]"
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? format(date, "PPP") : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 bg-popover border border-border z-[70]" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={(selectedDate) => {
            onDateChange?.(selectedDate)
            onChange?.(selectedDate || null)
            setOpen(false)
          }}
          disabled={(date) => {
            const today = new Date()
            today.setHours(0, 0, 0, 0)
            
            if (!allowPastDates) {
              if (!allowSameDay && date <= today) return true
              if (allowSameDay && date < today) return true
            }
            
            if (minDate) {
              const min = new Date(minDate)
              min.setHours(0, 0, 0, 0)
              if (date < min) return true
            }
            
            if (maxDate) {
              const max = new Date(maxDate)
              max.setHours(23, 59, 59, 999)
              if (date > max) return true
            }
            
            const dateString = format(date, 'yyyy-MM-dd')
            if (blockedDates.includes(dateString)) return true
            
            return false
          }}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  )
}