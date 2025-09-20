import { TimeSlot } from './schedule'

export interface ApiResponse<T> {
    data: T | null;
    error: string | null;
    success: boolean;
}

export interface PaginationParams {
    page: number;
    limit: number;
}

export interface PaginatedResponse<T> {
    data: T[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
    error: string | null;
    success: boolean;
}

export interface DateRange {
    start_date: string;
    end_date: string;
}

export interface AvailabilityResponse {
    date: string;
    time_slots: TimeSlot[];
}