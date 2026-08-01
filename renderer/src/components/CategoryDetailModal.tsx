import { Tag } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import type { Category } from '../types';

interface Props {
  category: Category | null;
  categoryName: Map<string, string>;
  orgName: Map<string, string>;
  onClose: () => void;
  onEdit: (category: Category) => void;
}

function formatDate(iso?: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-US', { dateStyle: 'long', timeStyle: 'medium' });
}

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="mb-4">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{title}</p>
      <hr className="mt-2 border-border" />
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{label}</p>
      {children}
    </div>
  );
}

export function CategoryDetailModal({ category, categoryName, orgName, onClose, onEdit }: Props) {
  if (!category) return null;

  const isActive = category.isActive !== false;
  const parentName = category.parentId ? (categoryName.get(category.parentId) ?? category.parentId) : null;
  const orgDisplay = category.organizationId ? (orgName.get(category.organizationId) ?? category.organizationId) : '—';

  return (
    <Dialog open={!!category} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl">
        <div className="mb-5 flex items-center gap-2">
          <Tag size={17} className="text-primary" />
          <DialogTitle>Category Details</DialogTitle>
        </div>

        {/* General Information */}
        <div className="mb-6">
          <SectionHeader title="General Information" />
          <div className="grid grid-cols-2 gap-x-8 gap-y-5">
            <Field label="Category Name">
              <p className="font-semibold">{category.name ?? '—'}</p>
            </Field>
            <Field label="Status">
              <div className="flex items-center gap-1.5">
                <span className={`h-2 w-2 rounded-full ${isActive ? 'bg-green-500' : 'bg-red-500'}`} />
                <span className="font-medium">{isActive ? 'Active' : 'Inactive'}</span>
              </div>
            </Field>
            <Field label="Parent Category">
              <p className="font-medium text-sm">{parentName ?? '— (None)'}</p>
            </Field>
            <Field label="Organization">
              <p className="font-medium text-sm">{orgDisplay}</p>
            </Field>
          </div>
          <div className="mt-5">
            <Field label="Description">
              <p className="text-sm text-muted-foreground italic">
                {category.description ?? '— (No description provided for this category)'}
              </p>
            </Field>
          </div>
        </div>

        {/* System Metadata */}
        <div>
          <SectionHeader title="System Metadata" />
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground shrink-0">Unique ID</p>
              <code className="rounded border border-border bg-muted px-3 py-1 text-xs font-mono truncate">{category.id}</code>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Created At</p>
              <p className="text-sm">{formatDate(category.createdAt)}</p>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Last Updated</p>
              <p className="text-sm">{formatDate(category.updatedAt)}</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 flex justify-end">
          <Button onClick={() => { onClose(); onEdit(category); }}>
            Edit Category
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
