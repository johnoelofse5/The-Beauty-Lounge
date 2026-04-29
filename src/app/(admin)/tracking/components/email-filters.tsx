import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { EmailStatus, EmailType } from '../types';

interface EmailFiltersProps {
  filterStatus: EmailStatus | 'all';
  filterType: EmailType | 'all';
  statusOptions: EmailStatus[];
  typeOptions: EmailType[];
  onStatusChange: (value: EmailStatus | 'all') => void;
  onTypeChange: (value: EmailType | 'all') => void;
  formatType: (type: EmailType) => string;
}

export default function EmailFilters({
  filterStatus,
  filterType,
  statusOptions,
  typeOptions,
  onStatusChange,
  onTypeChange,
  formatType,
}: EmailFiltersProps) {
  return (
    <div className="bg-white rounded-lg shadow mb-6 p-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Status</label>
          <Select
            value={filterStatus}
            onValueChange={(value) => onStatusChange(value as EmailStatus | 'all')}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {statusOptions.map((status) => (
                <SelectItem key={status} value={status}>
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Type</label>
          <Select
            value={filterType}
            onValueChange={(value) => onTypeChange(value as EmailType | 'all')}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {typeOptions.map((type) => (
                <SelectItem key={type} value={type}>
                  {formatType(type)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
