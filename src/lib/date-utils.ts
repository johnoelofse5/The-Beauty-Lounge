export const formatDateLocal = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const parseDateLocal = (dateString: string): Date => {
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(year, month - 1, day, 0, 0, 0, 0);
};

export const createLocalMidnight = (date: Date): Date => {
  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();
  return new Date(year, month, day, 0, 0, 0, 0);
};

export const getTodayLocal = (): Date => {
  return createLocalMidnight(new Date());
};

export const getTodayString = (): string => {
  return formatDateLocal(new Date());
};

export const compareDatesOnly = (date1: Date, date2: Date): number => {
  const d1 = createLocalMidnight(date1);
  const d2 = createLocalMidnight(date2);

  if (d1 < d2) return -1;
  if (d1 > d2) return 1;
  return 0;
};

export const isToday = (date: Date): boolean => {
  return compareDatesOnly(date, new Date()) === 0;
};

export const isPastDate = (date: Date): boolean => {
  return compareDatesOnly(date, new Date()) < 0;
};

export const isFutureDate = (date: Date): boolean => {
  return compareDatesOnly(date, new Date()) > 0;
};

export const addDays = (date: Date, days: number): Date => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

export const addMonths = (date: Date, months: number): Date => {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
};

export const getStartOfWeek = (date: Date): Date => {
  const result = createLocalMidnight(date);
  const day = result.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  result.setDate(result.getDate() + diff);
  return result;
};

export const getEndOfWeek = (date: Date): Date => {
  const start = getStartOfWeek(date);
  return addDays(start, 6);
};

export const getStartOfMonth = (date: Date): Date => {
  return new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);
};

export const getEndOfMonth = (date: Date): Date => {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
};

export const formatDateForDisplay = (
  date: Date,
  includeTime: boolean = false
): string => {
  const options: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "long",
    day: "numeric",
  };

  if (includeTime) {
    options.hour = "numeric";
    options.minute = "2-digit";
    options.hour12 = true;
  }

  return new Intl.DateTimeFormat("en-US", options).format(date);
};

export const formatDateShort = (date: Date): string => {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
};

export const getDateRange = (startDate: Date, endDate: Date): Date[] => {
  const dates: Date[] = [];
  const current = createLocalMidnight(startDate);
  const end = createLocalMidnight(endDate);

  while (current <= end) {
    dates.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }

  return dates;
};

export const parseFlexibleDate = (dateString: string): Date | null => {
  if (!dateString) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    return parseDateLocal(dateString);
  }

  const isoDate = new Date(dateString);
  if (!isNaN(isoDate.getTime())) {
    return createLocalMidnight(isoDate);
  }

  return null;
};

export const daysBetween = (date1: Date, date2: Date): number => {
  const d1 = createLocalMidnight(date1);
  const d2 = createLocalMidnight(date2);
  const diffTime = Math.abs(d2.getTime() - d1.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};
