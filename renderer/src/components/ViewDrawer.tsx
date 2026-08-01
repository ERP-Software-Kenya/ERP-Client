import { useState, type ReactNode } from 'react';
import { Button } from './ui/button';
import { FormDrawer } from './FormDrawer';
import { ImageLightbox } from './ImageLightbox';

interface Props {
  open: boolean;
  title: string;
  data: Record<string, unknown> | null;
  onClose: () => void;
  children?: ReactNode;
}

const IMAGE_KEY_RE = /image|photo|avatar|thumbnail|logo|picture|url/i;
const URL_RE = /^https?:\/\//i;

function isImageUrl(key: string, value: unknown): value is string {
  if (typeof value !== 'string' || !value.trim()) return false;
  if (!URL_RE.test(value)) return false;
  if (IMAGE_KEY_RE.test(key)) return true;
  return /\.(png|jpe?g|gif|webp|svg|bmp)(\?|$)/i.test(value);
}

function formatScalar(value: unknown): string {
  if (value == null) return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return String(value);
}

function NestedObject({ value }: { value: Record<string, unknown> }) {
  const entries = Object.entries(value);
  if (entries.length === 0) return <span>—</span>;
  if (entries.length > 12) {
    return <span className="font-mono whitespace-pre-wrap break-words">{JSON.stringify(value, null, 2)}</span>;
  }
  return (
    <dl className="mt-1 space-y-1.5 rounded-md border border-border bg-muted/30 p-2">
      {entries.map(([k, v]) => (
        <div key={k} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)] gap-2 text-xs">
          <dt className="text-muted-foreground">{k}</dt>
          <dd className="break-words">
            {v != null && typeof v === 'object' ? JSON.stringify(v) : formatScalar(v)}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function FieldValue({
  fieldKey,
  value,
  onPreview,
}: {
  fieldKey: string;
  value: unknown;
  onPreview: (src: string) => void;
}) {
  if (isImageUrl(fieldKey, value)) {
    return (
      <button
        type="button"
        onClick={() => onPreview(value)}
        className="mt-1 block overflow-hidden rounded-md border border-border focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label={`Preview ${fieldKey}`}
      >
        <img src={value} alt={fieldKey} className="h-20 w-20 object-cover" />
      </button>
    );
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return <span className="text-muted-foreground">—</span>;
    return <span className="font-mono whitespace-pre-wrap break-words text-sm">{JSON.stringify(value, null, 2)}</span>;
  }

  if (value != null && typeof value === 'object') {
    return <NestedObject value={value as Record<string, unknown>} />;
  }

  return <span className="text-sm break-words">{formatScalar(value)}</span>;
}

export function ViewDrawer({ open, title, data, onClose, children }: Props) {
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const entries = data ? Object.entries(data) : [];

  return (
    <>
      <FormDrawer
        open={open && data != null}
        onClose={onClose}
        title={title}
        footer={
          <Button type="button" variant="outline" onClick={onClose}>
            Close
          </Button>
        }
      >
        <div className="space-y-4">
          {entries.length === 0 ? (
            <p className="text-sm text-muted-foreground">No fields to display.</p>
          ) : (
            <dl className="space-y-4">
              {entries.map(([key, value]) => (
                <div key={key}>
                  <dt className="text-sm font-medium text-muted-foreground">{key}</dt>
                  <dd className="mt-1">
                    <FieldValue fieldKey={key} value={value} onPreview={setPreviewSrc} />
                  </dd>
                </div>
              ))}
            </dl>
          )}
          {children}
        </div>
      </FormDrawer>

      <ImageLightbox src={previewSrc} onClose={() => setPreviewSrc(null)} />
    </>
  );
}

export default ViewDrawer;
