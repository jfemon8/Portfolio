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

/**
 * Format a date for display as `dd MonthName yyyy` (e.g. `27 June 2026`) —
 * the single date format used across the UI.
 *
 * A pure `yyyy-MM-dd` value (e.g. the certification issue-date picker) is
 * formatted from its string parts so the calendar day is never shifted by the
 * viewer's timezone. Full ISO timestamps (blog / message `createdAt`) use the
 * local calendar date. Unrecognized legacy free-text (e.g. `June 2024`) is
 * returned unchanged so older records still render sensibly.
 */
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

/**
 * Format a timestamp as `dd MonthName yyyy, h:mm AM/PM`
 * (e.g. `27 June 2026, 10:30 AM`). Used where the exact time matters — audit
 * log entries and message detail. Falls back to the raw value if unparseable.
 */
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
