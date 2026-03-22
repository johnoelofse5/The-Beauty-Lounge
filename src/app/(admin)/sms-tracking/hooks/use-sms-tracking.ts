'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { indexedDBService, LookupData } from '@/lib/indexeddb-service';
import { LOOKUP_TYPE_CODES } from '@/constants/lookup-codes';
import { SMSLog, SMSStats, SMSStatus, SMSType } from '../types';

async function fetchAllSMSLogs(): Promise<SMSLog[]> {
  const { data, error } = await supabase
    .from('sms_logs')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data || [];
}

async function fetchSMSStats(): Promise<SMSStats> {
  const { data, error } = await supabase.from('sms_logs').select('status');
  if (error) throw new Error(error.message);
  const logs = data || [];
  return {
    total: logs.length,
    sent: logs.filter((l) => l.status === 'sent').length,
    suppressed: logs.filter((l) => l.status === 'suppressed').length,
    failed: logs.filter((l) => l.status === 'failed').length,
    scheduled: logs.filter((l) => l.status === 'scheduled').length,
  };
}

export function useSmsTracking() {
  const { user, userRoleData } = useAuth();
  const [smsLogs, setSmsLogs] = useState<SMSLog[]>([]);
  const [stats, setStats] = useState<SMSStats>({
    total: 0,
    sent: 0,
    suppressed: 0,
    failed: 0,
    scheduled: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<SMSStatus | 'all'>('all');
  const [filterType, setFilterType] = useState<SMSType | 'all'>('all');
  const [statusOptions, setStatusOptions] = useState<LookupData[]>([]);
  const [typeOptions, setTypeOptions] = useState<LookupData[]>([]);

  useEffect(() => {
    if (user && userRoleData) loadSMSLogs();
  }, [user, userRoleData]);

  useEffect(() => {
    async function loadFilterOptions() {
      const [statuses, types] = await Promise.all([
        indexedDBService.getLookupData(LOOKUP_TYPE_CODES.SMS_STATUS),
        indexedDBService.getLookupData(LOOKUP_TYPE_CODES.SMS_FILTER_TYPE),
      ]);
      setStatusOptions(statuses ?? []);
      setTypeOptions(types ?? []);
    }
    loadFilterOptions();
  }, []);

  const loadSMSLogs = async () => {
    try {
      setLoading(true);
      const [logsData, statsData] = await Promise.all([fetchAllSMSLogs(), fetchSMSStats()]);
      setSmsLogs(logsData);
      setStats(statsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load SMS logs');
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = smsLogs.filter((log) => {
    const matchesStatus = filterStatus === 'all' || log.status === filterStatus;
    const matchesType = filterType === 'all' || log.sms_type === filterType;
    return matchesStatus && matchesType;
  });

  const formatDate = (dateString: string) => new Date(dateString).toLocaleString();

  const getStatusColor = (status: SMSStatus) => {
    switch (status) {
      case 'sent':
        return 'bg-green-100 text-green-800';
      case 'suppressed':
        return 'bg-yellow-100 text-yellow-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'scheduled':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeColor = (type: SMSType) => {
    switch (type) {
      case 'confirmation':
        return 'bg-blue-100 text-blue-800';
      case 'reschedule':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancellation':
        return 'bg-red-100 text-red-800';
      case 'reminder':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return {
    loading,
    error,
    stats,
    smsLogs,
    filteredLogs,
    filterStatus,
    setFilterStatus,
    filterType,
    setFilterType,
    statusOptions,
    typeOptions,
    formatDate,
    getStatusColor,
    getTypeColor,
  };
}
