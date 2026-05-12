'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { fetchRecipients, sendBulkSms } from '../services/send-sms-service';
import type { Recipient } from '../types/send-sms';
import { AlertCircle, MessageSquare, Search, Send, Users } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';

const SMS_HARD_LIMIT = 1530;
const SMS_SEGMENT_SIZE = 160;

export default function SendSmsView() {
  const { user } = useAuth();
  const { showSuccess, showError } = useToast();

  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState('');
  const [search, setSearch] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    setLoadingUsers(true);
    fetchRecipients(user.id)
      .then(setRecipients)
      .catch(() => showError('Failed to load users'))
      .finally(() => setLoadingUsers(false));
  }, [user?.id]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return recipients;
    return recipients.filter(
      (r) =>
        `${r.first_name} ${r.last_name}`.toLowerCase().includes(q) ||
        r.email.toLowerCase().includes(q) ||
        r.phone.includes(q)
    );
  }, [recipients, search]);

  const recipientsWithPhone = useMemo(() => filtered.filter((r) => r.phone), [filtered]);

  const allSelected =
    recipientsWithPhone.length > 0 && recipientsWithPhone.every((r) => selectedIds.has(r.id));

  const toggleSelectAll = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        recipientsWithPhone.forEach((r) => next.delete(r.id));
      } else {
        recipientsWithPhone.forEach((r) => next.add(r.id));
      }
      return next;
    });
  };

  const toggleOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const charCount = message.length;
  const segments = charCount === 0 ? 1 : Math.ceil(charCount / SMS_SEGMENT_SIZE);
  const remaining = SMS_SEGMENT_SIZE * segments - charCount;

  const handleSend = async () => {
    if (!message.trim()) {
      showError('Please enter a message');
      return;
    }
    if (selectedIds.size === 0) {
      showError('Please select at least one recipient');
      return;
    }

    setSending(true);
    try {
      await sendBulkSms(message.trim(), Array.from(selectedIds));
      showSuccess(`SMS sent to ${selectedIds.size} recipient(s)`);
      setMessage('');
      setSelectedIds(new Set());
    } catch (err: unknown) {
      showError(err instanceof Error ? err.message : 'Failed to send SMS');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-1">
            <MessageSquare className="h-6 w-6 text-gray-700" />
            <h1 className="text-2xl font-bold text-gray-900">Send SMS</h1>
          </div>
          <p className="text-gray-500 text-sm ml-9">
            Compose a message and choose who receives it. Only users with a phone number can be
            selected.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Message composer */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 flex flex-col gap-4">
            <h2 className="font-semibold text-gray-800 flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Message
            </h2>

            <textarea
              value={message}
              onChange={(e) => {
                if (e.target.value.length <= SMS_HARD_LIMIT) setMessage(e.target.value);
              }}
              placeholder="Type your SMS message here…"
              rows={10}
              className="w-full resize-none rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-800 placeholder-gray-400 focus:border-pink-400 focus:outline-none focus:ring-2 focus:ring-pink-200 transition"
            />

            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>
                {segments > 1 ? (
                  <span className="text-amber-600 font-medium">
                    {segments} SMS segments · {remaining} chars left in segment
                  </span>
                ) : (
                  <span>{remaining} chars remaining</span>
                )}
              </span>
              <span className="font-mono">
                {charCount} / {SMS_HARD_LIMIT}
              </span>
            </div>

            {charCount > SMS_SEGMENT_SIZE && (
              <div className="flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-700">
                <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <span>
                  Messages over 160 characters are split into multiple SMS segments and may cost
                  extra credits.
                </span>
              </div>
            )}

            <button
              onClick={handleSend}
              disabled={sending || !message.trim() || selectedIds.size === 0}
              className="mt-2 flex items-center justify-center gap-2 rounded-lg px-5 py-3 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: 'linear-gradient(135deg, #F2C7EB, #E8A8D8)', color: '#374151' }}
            >
              <Send className="h-4 w-4" />
              {sending
                ? 'Sending…'
                : `Send to ${selectedIds.size} recipient${selectedIds.size !== 1 ? 's' : ''}`}
            </button>
          </div>

          {/* Recipients panel */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 flex flex-col gap-4">
            <h2 className="font-semibold text-gray-800 flex items-center gap-2">
              <Users className="h-4 w-4" />
              Recipients
              {!loadingUsers && (
                <span className="ml-auto text-xs text-gray-400 font-normal">
                  {selectedIds.size} selected
                </span>
              )}
            </h2>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, email or role…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white pl-9 pr-4 py-2 text-sm text-gray-800 placeholder-gray-400 focus:border-pink-400 focus:outline-none focus:ring-2 focus:ring-pink-200 transition"
              />
            </div>

            {!loadingUsers && recipientsWithPhone.length > 0 && (
              <div
                role="button"
                tabIndex={0}
                onClick={toggleSelectAll}
                onKeyDown={(e) => e.key === 'Enter' && toggleSelectAll()}
                className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition w-fit cursor-pointer select-none"
              >
                <Checkbox checked={allSelected} onCheckedChange={toggleSelectAll} />
                {allSelected ? 'Deselect all' : 'Select all'}
                <span className="text-gray-400 font-normal">
                  ({recipientsWithPhone.length} with phone number)
                </span>
              </div>
            )}

            <div className="flex-1 overflow-y-auto max-h-96 flex flex-col gap-1 pr-1">
              {loadingUsers ? (
                <div className="flex items-center justify-center h-32 text-gray-400 text-sm">
                  Loading users…
                </div>
              ) : filtered.length === 0 ? (
                <div className="flex items-center justify-center h-32 text-gray-400 text-sm">
                  No users found
                </div>
              ) : (
                filtered.map((r) => {
                  const hasPhone = Boolean(r.phone);
                  const checked = selectedIds.has(r.id);
                  return (
                    <div
                      key={r.id}
                      role="button"
                      tabIndex={hasPhone ? 0 : -1}
                      onClick={() => hasPhone && toggleOne(r.id)}
                      onKeyDown={(e) => e.key === 'Enter' && hasPhone && toggleOne(r.id)}
                      className={`flex items-center gap-3 rounded-lg px-3 py-2.5 transition w-full ${
                        hasPhone
                          ? 'cursor-pointer hover:bg-gray-50'
                          : 'opacity-40 cursor-not-allowed'
                      } ${checked ? 'bg-pink-50' : 'bg-white'}`}
                    >
                      <Checkbox
                        checked={checked}
                        disabled={!hasPhone}
                        onCheckedChange={() => hasPhone && toggleOne(r.id)}
                        className="flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium text-gray-800 truncate block">
                          {r.first_name} {r.last_name}
                        </span>
                        <div className="text-xs text-gray-400 truncate">
                          {hasPhone ? r.phone : 'No phone number'}
                          {r.email && ` · ${r.email}`}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
