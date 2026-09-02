const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

// Pure yyyy-MM-dd values are parsed from their string parts so the calendar day is never shifted by the viewer's timezone; unrecognized legacy free-text passes through unchanged.
export function formatDate(value?: string): string {
  if (!value) return '';
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (dateOnly) {
    const month = MONTHS[Number(dateOnly[2]) - 1];
    if (month) return `${dateOnly[3]} ${month} ${dateOnly[1]}`;
  }
  const dt = new Date(value);
  if (!Number.isNaN(dt.getTime())) {
    const day = String(dt.getDate()).padStart(2, '0');
    return `${day} ${MONTHS[dt.getMonth()]} ${dt.getFullYear()}`;
  }
  return value;
}

// Time-of-day only, with seconds — e.g. blog card/post metadata showing the exact create/update moment.
export function formatTime(value?: string): string {
  if (!value) return '';
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return '';
  return dt.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
}

// Compact "how fresh is this" label for feed-driven content; falls back to the absolute date past a month.
export function timeAgo(value?: string): string {
  if (!value) return '';
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return '';
  const minutes = Math.round((Date.now() - dt.getTime()) / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days === 1) return 'Yesterday';
  if (days < 30) return `${days}d ago`;
  return formatDate(value);
}

// Whole days from today to a yyyy-MM-dd calendar date; both sides are read as local midnight so no timezone shift creeps in.
export function daysUntil(dateOnly?: string): number | null {
  if (!dateOnly) return null;
  const parts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateOnly);
  if (!parts) return null;
  const target = new Date(
    Number(parts[1]),
    Number(parts[2]) - 1,
    Number(parts[3])
  );
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

// Adds time-of-day to formatDate's output, for contexts where the exact time matters (audit log, message detail).
export function formatDateTime(value?: string): string {
  if (!value) return '';
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return value;
  const time = dt.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
  return `${formatDate(value)}, ${time}`;
}
