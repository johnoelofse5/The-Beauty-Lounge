'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getAllEmailTracking, getEmailTrackingStats } from '@/lib/email-tracking';
import { EmailTracking, EmailStats, EmailStatus, EmailType } from '../types';

export function useEmailTracking() {
  const { user, userRoleData } = useAuth();
  const [emailLogs, setEmailLogs] = useState<EmailTracking[]>([]);
  const [stats, setStats] = useState<EmailStats>({
    total: 0,
    pending: 0,
    sent: 0,
    delivered: 0,
    failed: 0,
    bounced: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<EmailStatus | 'all'>('all');
  const [filterType, setFilterType] = useState<EmailType | 'all'>('all');

  useEffect(() => {
    if (user && userRoleData) loadEmailLogs();
  }, [user, userRoleData]);

  const loadEmailLogs = async () => {
    try {
      setLoading(true);
      const [logsData, statsData] = await Promise.all([
        getAllEmailTracking(),
        getEmailTrackingStats(),
      ]);
      setEmailLogs(logsData);
      setStats(statsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load email logs');
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = emailLogs.filter((log) => {
    const matchesStatus = filterStatus === 'all' || log.status === filterStatus;
    const matchesType = filterType === 'all' || log.email_type === filterType;
    return matchesStatus && matchesType;
  });

  const formatDate = (dateString: string) => new Date(dateString).toLocaleString();

  const getStatusColor = (status: EmailStatus) => {
    switch (status) {
      case 'sent':
        return 'bg-green-100 text-green-800';
      case 'delivered':
        return 'bg-emerald-100 text-emerald-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'bounced':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeColor = (type: EmailType) => {
    switch (type) {
      case 'appointment_confirmation':
        return 'bg-blue-100 text-blue-800';
      case 'appointment_reminder':
        return 'bg-purple-100 text-purple-800';
      case 'appointment_cancelled':
        return 'bg-red-100 text-red-800';
      case 'password_reset':
        return 'bg-yellow-100 text-yellow-800';
      case 'welcome':
        return 'bg-green-100 text-green-800';
      case 'user_invitation':
        return 'bg-indigo-100 text-indigo-800';
      case 'system_notification':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatType = (type: EmailType) =>
    type
      .split('_')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');

  const statusOptions: EmailStatus[] = ['pending', 'sent', 'delivered', 'failed', 'bounced'];
  const typeOptions: EmailType[] = [
    'appointment_confirmation',
    'appointment_reminder',
    'appointment_cancelled',
    'password_reset',
    'welcome',
    'user_invitation',
    'system_notification',
  ];

  return {
    loading,
    error,
    stats,
    emailLogs,
    filteredLogs,
    filterStatus,
    setFilterStatus,
    filterType,
    setFilterType,
    statusOptions,
    typeOptions,
    formatDate,
    formatType,
    getStatusColor,
    getTypeColor,
  };
}
