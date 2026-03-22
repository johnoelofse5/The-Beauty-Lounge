import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { LookupData } from '@/lib/indexeddb-service';
import { SMSStatus, SMSType } from '../types';

interface SmsFiltersProps {
  filterStatus: SMSStatus | 'all';
  filterType: SMSType | 'all';
  statusOptions: LookupData[];
  typeOptions: LookupData[];
  onStatusChange: (value: SMSStatus | 'all') => void;
  onTypeChange: (value: SMSType | 'all') => void;
}

export default function SmsFilters({
  filterStatus,
  filterType,
  statusOptions,
  typeOptions,
  onStatusChange,
  onTypeChange,
}: SmsFiltersProps) {
  return (
    <div className="bg-white rounded-lg shadow mb-6 p-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Status</label>
          <Select
            value={filterStatus}
            onValueChange={(value) => onStatusChange(value as SMSStatus | 'all')}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {statusOptions.map((option) => (
                <SelectItem key={option.id} value={option.value}>
                  {option.value.charAt(0).toUpperCase() + option.value.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Type</label>
          <Select
            value={filterType}
            onValueChange={(value) => onTypeChange(value as SMSType | 'all')}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {typeOptions.map((option) => (
                <SelectItem key={option.id} value={option.value}>
                  {option.value.charAt(0).toUpperCase() + option.value.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
