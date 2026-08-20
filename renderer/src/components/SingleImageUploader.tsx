import { useRef } from 'react';
import { Trash2 } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';

interface Props {
  /** Object key returned by the server — truthy = image exists on server */
  serverImageKey?: string;
  /** Local file chosen but not yet uploaded (create flow) */
  pendingFile?: File;
  pendingPreviewUrl?: string;
  uploading: boolean;
  editing: boolean;
  onFilePick: (file: File) => void;
  onClearPending: () => void;
  onRemoveServer: () => void;
}

export function SingleImageUploader({
  serverImageKey,
  pendingFile: _pendingFile,
  pendingPreviewUrl,
  uploading,
  editing,
  onFilePick,
  onClearPending,
  onRemoveServer,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onFilePick(file);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div className="space-y-3">
      {pendingPreviewUrl && (
        <div className="relative inline-block">
          <img
            src={pendingPreviewUrl}
            alt="Pending"
            className="h-24 w-24 rounded-md border border-border object-cover"
          />
          <button
            type="button"
            onClick={onClearPending}
            className="absolute -right-2 -top-2 rounded-full bg-destructive p-1 text-destructive-foreground shadow"
            aria-label="Remove pending image"
          >
            <Trash2 size={12} />
          </button>
        </div>
      )}

      {!pendingPreviewUrl && serverImageKey && (
        <div className="flex items-center gap-2">
          <span className="rounded-md border border-border px-2 py-1 text-xs">Image set</span>
          {editing && (
            <Button type="button" variant="outline" size="sm" disabled={uploading} onClick={onRemoveServer}>
              Remove
            </Button>
          )}
        </div>
      )}

      <Input
        ref={inputRef}
        type="file"
        accept="image/*"
        disabled={uploading}
        onChange={handleChange}
      />
      <p className="text-xs text-muted-foreground">
        {editing
          ? 'Uploading a new image replaces the existing one.'
          : 'Image will be uploaded after saving.'}
      </p>
    </div>
  );
}
