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
