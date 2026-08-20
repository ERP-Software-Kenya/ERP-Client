import { useState, type RefObject } from 'react';
import { ChevronDown, Trash2 } from 'lucide-react';
import { Input } from '../../../components/ui/input';
import type { ProductImage } from '../../../types';

export interface PendingImage {
  id: string;
  file: File;
  previewUrl: string;
}

interface ProductImageUploaderProps {
  editing: boolean;
  images: ProductImage[] | undefined;
  pendingImages: PendingImage[];
  uploading: boolean;
  fileInputRef: RefObject<HTMLInputElement | null>;
  directInputRef?: RefObject<HTMLInputElement | null>;
  onFilePick: (files: FileList | null) => void;
  /** Secondary path: GET presigned-url → PUT to R2 (does not update gallery). */
  onDirectR2Pick?: (files: FileList | null) => void;
  onRemovePending: (id: string) => void;
  onPreview: (src: string) => void;
}

export function ProductImageUploader({
  editing,
  images,
  pendingImages,
  uploading,
  fileInputRef,
  directInputRef,
  onFilePick,
  onDirectR2Pick,
  onRemovePending,
  onPreview,
}: ProductImageUploaderProps) {
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const showDirectR2 = editing && !!onDirectR2Pick && !!directInputRef;

  return (
    <>
      {!editing && (
        <p className="text-xs text-muted-foreground">
          Images are uploaded automatically after the product is created. Click an image to
          enlarge; use Delete to remove pending files.
        </p>
      )}
      {editing && (
        <p className="text-xs text-muted-foreground">
          Click an image to enlarge. Removing saved images from the server is not available yet.
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        {editing &&
          (images ?? []).map((img) => (
            <button
              key={img.id}
              type="button"
              onClick={() => img.url && onPreview(img.url)}
              className="group relative h-16 w-16 overflow-hidden rounded border border-border focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="View image"
            >
              <img src={img.url} alt="" className="h-full w-full object-cover" />
              <span className="pointer-events-none absolute inset-0 bg-black/0 transition group-hover:bg-black/20" />
            </button>
          ))}
        {pendingImages.map((item) => (
          <div key={item.id} className="relative h-16 w-16">
            <button
              type="button"
              onClick={() => onPreview(item.previewUrl)}
              className="h-16 w-16 overflow-hidden rounded border border-border focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="View image"
            >
              <img src={item.previewUrl} alt="" className="h-full w-full object-cover" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRemovePending(item.id);
              }}
              className="absolute -right-1.5 -top-1.5 z-10 rounded-full bg-destructive p-1 text-destructive-foreground shadow hover:bg-destructive/90"
              aria-label="Delete image"
              title="Delete"
            >
              <Trash2 size={12} />
            </button>
          </div>
        ))}
      </div>
      <div className="space-y-1">
        <p className="text-xs font-medium text-foreground">Upload to gallery</p>
        <Input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={(e) => onFilePick(e.target.files)}
          disabled={uploading}
        />
      </div>
      {showDirectR2 && (
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => setAdvancedOpen((o) => !o)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            aria-expanded={advancedOpen}
          >
            <ChevronDown
              size={14}
              className={`transition-transform ${advancedOpen ? 'rotate-0' : '-rotate-90'}`}
            />
            Advanced: direct R2 upload
          </button>
          {advancedOpen && (
            <div className="space-y-2 pl-1">
              <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-600 dark:text-amber-400">
                Stores the file in object storage only — it will not appear in the product gallery
                until Core API adds image confirm (see <code className="text-[10px]">docs/core-apis-fixes.md</code>{' '}
                P2). Repeated uploads overwrite{' '}
                <code className="text-[10px]">products/&#123;id&#125;/image</code>.
              </div>
              <Input
                ref={directInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif,image/bmp,image/tiff,image/svg+xml"
                onChange={(e) => onDirectR2Pick?.(e.target.files)}
                disabled={uploading}
              />
            </div>
          )}
        </div>
      )}
    </>
  );
}
