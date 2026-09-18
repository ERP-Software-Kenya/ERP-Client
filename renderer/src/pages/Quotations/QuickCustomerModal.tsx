import { useState } from 'react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Customers } from '../../api';
import { toast } from 'sonner';
import { X, UserPlus, Loader2 } from 'lucide-react';
import type { Customer } from '../../types';

interface QuickCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (customer: Customer) => void;
}

export default function QuickCustomerModal({ isOpen, onClose, onSuccess }: QuickCustomerModalProps) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const createCustomer = Customers.useCreate();

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Customer name is required');
      return;
    }
    if (!phone.trim()) {
      toast.error('Phone number is required');
      return;
    }

    try {
      const created = await createCustomer.mutateAsync({
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim() || undefined,
      } as Partial<Customer>);

      toast.success('Customer registered successfully');
      onSuccess(created as Customer);
      setName('');
      setPhone('');
      setEmail('');
      onClose();
    } catch (err: unknown) {
      toast.error((err as Error)?.message || 'Failed to create customer');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in-50">
      <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-md overflow-hidden p-6">
        <div className="flex items-center justify-between border-b border-border pb-3 mb-4">
          <div className="flex items-center gap-2 text-foreground font-semibold text-base">
            <UserPlus size={18} className="text-primary" />
            <span>Quick Register Customer</span>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground p-1 rounded-md transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              Customer / Company Name <span className="text-destructive">*</span>
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Ramesh Patel / ABC Enterprises"
              autoFocus
              className="w-full"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              Mobile Phone <span className="text-destructive">*</span>
            </label>
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. 9876543210"
              className="w-full"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              Email Address (Optional)
            </label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. customer@example.com"
              className="w-full"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={createCustomer.isPending}>
              {createCustomer.isPending ? (
                <>
                  <Loader2 size={16} className="animate-spin mr-2" />
                  Saving...
                </>
              ) : (
                'Create & Select'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
