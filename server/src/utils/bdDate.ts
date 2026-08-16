/** Asia/Dhaka calendar-day helpers — job deadlines are local dates, never UTC instants. */
const DHAKA_PARTS = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Dhaka',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const DAY_MS = 86_400_000;

/** `YYYY-MM-DD` for the Bangladesh calendar day containing `date`. */
export const bangladeshDay = (date: Date = new Date()): string => {
  const fields = DHAKA_PARTS.formatToParts(date).reduce<Record<string, string>>(
    (result, part) => {
      if (part.type !== 'literal') result[part.type] = part.value;
      return result;
    },
    {}
  );
  return `${fields.year}-${fields.month}-${fields.day}`;
};

/** The Bangladesh calendar day `days` days before `date`. */
export const bangladeshDayBefore = (
  days: number,
  date: Date = new Date()
): string => bangladeshDay(new Date(date.getTime() - days * DAY_MS));

export const isBangladeshDate = (value: unknown): value is string =>
  typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
