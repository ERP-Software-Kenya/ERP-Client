import { useEffect, useState } from 'react';
import { FormDrawer, Field } from './FormDrawer';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Customers } from '../api';
import type { Customer, CustomerType } from '../types';

const CUSTOMER_TYPE_OPTIONS: Array<{ value: CustomerType; label: string }> = [
  { value: 'regular', label: 'Regular' },
  { value: 'new', label: 'New' },
  { value: 'shop', label: 'Shop' },
  { value: 'big_customer', label: 'Big Customer' },
];

interface FormState {
  name: string;
  email: string;
  phone: string;
  gstin: string;
  creditLimit: string;
  customerType: CustomerType;
}

function emptyForm(initialName?: string): FormState {
  return { name: initialName ?? '', email: '', phone: '', gstin: '', creditLimit: '', customerType: 'new' };
}

function formFromCustomer(customer: Customer): FormState {
  return {
    name: customer.name ?? '',
    email: customer.email ?? '',
    phone: customer.phone ?? '',
    gstin: customer.gstin ?? '',
    creditLimit: customer.creditLimit != null ? String(customer.creditLimit) : '',
    customerType: (customer.customerType as CustomerType) || 'regular',
  };
}

export interface CustomerFormDrawerProps {
  open: boolean;
  onClose: () => void;
  editing?: Customer | null;
  initialName?: string;
  onSaved: (customer: Customer) => void;
}

export function CustomerFormDrawer({ open, onClose, editing, initialName, onSaved }: CustomerFormDrawerProps) {
  const [form, setForm] = useState<FormState>(() => (editing ? formFromCustomer(editing) : emptyForm(initialName)));
  const createMutation = Customers.useCreate();
  const updateMutation = Customers.useUpdate();
  const isSaving = createMutation.isPending || updateMutation.isPending;

  useEffect(() => {
    if (!open) return;
    setForm(editing ? formFromCustomer(editing) : emptyForm(initialName));
  }, [open, editing, initialName]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;

    const trimmedCreditLimit = form.creditLimit.trim();
    const body = {
      name: form.name.trim(),
      email: form.email.trim() || undefined,
      phone: form.phone.trim() || undefined,
      gstin: form.gstin.trim() || undefined,
      creditLimit: trimmedCreditLimit ? Number(trimmedCreditLimit) : undefined,
      customerType: form.customerType,
    };

    if (editing) {
      updateMutation.mutate({ id: editing.id, body }, { onSuccess: (customer) => onSaved(customer) });
      return;
    }
    createMutation.mutate(body, { onSuccess: (customer) => onSaved(customer) });
  };

  return (
    <FormDrawer
      open={open}
      onClose={onClose}
      title={editing ? 'Edit Customer' : 'Add Customer'}
      footer={
        <>
          <Button type="submit" form="customer-form-drawer" disabled={isSaving || !form.name.trim()}>
            {isSaving ? 'Saving…' : editing ? 'Save' : 'Create'}
          </Button>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
        </>
      }
    >
      <form id="customer-form-drawer" onSubmit={handleSubmit} className="space-y-5">
        <Field label="Name">
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        </Field>
        <Field label="Phone">
          <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </Field>
        <Field label="Email">
          <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </Field>
        <Field label="GSTIN">
          <Input value={form.gstin} onChange={(e) => setForm({ ...form, gstin: e.target.value })} />
        </Field>
        <Field label="Credit Limit">
          <Input
            type="number"
            min="0"
            step="0.01"
            value={form.creditLimit}
            onChange={(e) => setForm({ ...form, creditLimit: e.target.value })}
          />
        </Field>
        <Field label="Customer Type">
          <select
            value={form.customerType}
            onChange={(e) => setForm({ ...form, customerType: e.target.value as CustomerType })}
            className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-card outline-none focus:border-primary"
          >
            {CUSTOMER_TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </Field>
      </form>
    </FormDrawer>
  );
}
