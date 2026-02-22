import { ServiceWithCategory } from '@/types'

export type ViewMode = 'day' | 'week' | 'month'

export const formatTime = (time: string): string => {
  if (time.includes('T') || time.includes('Z')) {
    const date = new Date(time)
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
    })
  }
  const [hours, minutes] = time.split(':').map(Number)
  const period = hours >= 12 ? 'PM' : 'AM'
  const displayHours = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`
}

export const formatDate = (date: string): string => {
  if (date.includes('T') || date.includes('Z')) {
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
    })
  }
  const [year, month, day] = date.split('-').map(Number)
  const localDate = new Date(year, month - 1, day)
  return localDate.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  })
}

export const formatPrice = (price: number): string => `R${price.toFixed(2)}`

export const getTotalPrice = (services: ServiceWithCategory[]): number =>
  services.reduce((total, service) => total + (service.price || 0), 0)

export const formatDateForAPI = (date: Date): string => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export const getDateRange = (date: Date, mode: ViewMode) => {
  const startDate = new Date(date)
  const endDate = new Date(date)

  switch (mode) {
    case 'week': {
      const dayOfWeek = startDate.getDay()
      startDate.setDate(startDate.getDate() - dayOfWeek)
      endDate.setDate(endDate.getDate() + (6 - dayOfWeek))
      break
    }
    case 'month':
      startDate.setDate(1)
      endDate.setMonth(endDate.getMonth() + 1)
      endDate.setDate(0)
      break
    default:
      break
  }

  return {
    startDate: formatDateForAPI(startDate),
    endDate: formatDateForAPI(endDate)
  }
}