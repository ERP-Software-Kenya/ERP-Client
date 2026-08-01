export function truncateId(id: string, len = 8): string {
  if (!id) return '—';
  return id.length <= len ? id : `${id.slice(0, len)}…`;
}

export function formatEntityLabel(
  parts: {
    name?: string | null;
    sku?: string | null;
    code?: string | null;
    phone?: string | null;
    id?: string | null;
  },
  fallback = '—',
): string {
  const primary = parts.name?.trim() || parts.sku?.trim() || parts.code?.trim() || parts.phone?.trim();
  if (primary) return primary;
  if (parts.id) return truncateId(parts.id);
  return fallback;
}
