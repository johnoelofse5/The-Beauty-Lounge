export function normalizeSAPhone(phone: string): string {
  const cleaned = phone.replace(/[\s\-()]/g, '');

  if (cleaned.startsWith('+27')) {
    return cleaned.slice(1);
  }

  if (cleaned.startsWith('0') && cleaned.length === 10) {
    return '27' + cleaned.slice(1);
  }

  return cleaned;
}

export function formatSAPhoneForDisplay(phone: string): string {
  const normalized = normalizeSAPhone(phone);
  if (normalized.startsWith('27') && normalized.length === 11) {
    const local = '0' + normalized.slice(2);
    return `${local.slice(0, 3)} ${local.slice(3, 6)} ${local.slice(6)}`;
  }
  return phone;
}
