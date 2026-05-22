export function getValidationMessage(
  errors: unknown,
  fallback = 'Please fix the highlighted fields.'
): string {
  const visit = (value: unknown): string | null => {
    if (!value) return null;
    if (typeof value === 'string') return value;
    if (Array.isArray(value)) {
      for (const item of value) {
        const message = visit(item);
        if (message) return message;
      }
      return null;
    }
    if (typeof value === 'object') {
      const record = value as Record<string, unknown>;
      if (typeof record.message === 'string') return record.message;
      for (const item of Object.values(record)) {
        const message = visit(item);
        if (message) return message;
      }
    }
    return null;
  };

  return visit(errors) ?? fallback;
}
