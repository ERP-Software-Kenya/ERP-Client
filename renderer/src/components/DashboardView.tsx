import { useState, useEffect } from 'react';
import { Building2, Store, Package, Boxes, Truck, ShoppingCart, Receipt, Bell, TrendingUp, Activity, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Organizations, Stores, Products, Inventory, Suppliers, PurchaseOrders, Bills, Notifications } from '../api';
import type { Tab } from '../types';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  onClick?: () => void;
}

function StatCard({ label, value, icon, color, onClick }: StatCardProps) {
  return (
    <button
      onClick={onClick}
      className="stat-card"
      style={{
        cursor: onClick ? 'pointer' : 'default',
        textAlign: 'left',
        width: '100%',
        border: 'none',
        background: 'var(--surface-1)',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 500, margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {label}
        </p>
        <div
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            background: color,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {icon}
        </div>
      </div>
      <p className="mono" style={{ fontSize: '1.75rem', fontWeight: 700, margin: 0 }}>{value}</p>
    </button>
  );
}

interface Props {
  onNavigate(tab: Tab): void;
}

interface Stats {
  organizations: number;
  stores: number;
  products: number;
  inventory: number;
  suppliers: number;
  purchaseOrders: number;
  bills: number;
  notifications: number;
}

export function DashboardView({ onNavigate }: Props) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setApiError(null);
      try {
        const results = await Promise.allSettled([
          Organizations.list(),
          Stores.list(),
          Products.list(),
          Inventory.list(),
          Suppliers.list(),
          PurchaseOrders.list(),
          Bills.list(),
          Notifications.list(),
        ]);

        const count = (r: PromiseSettledResult<unknown>) =>
          r.status === 'fulfilled'
            ? Array.isArray(r.value)
              ? r.value.length
              : Array.isArray((r.value as { data?: unknown[] })?.data)
              ? ((r.value as { data: unknown[] }).data).length
              : 0
            : 0;

        setStats({
          organizations: count(results[0]),
          stores: count(results[1]),
          products: count(results[2]),
          inventory: count(results[3]),
          suppliers: count(results[4]),
          purchaseOrders: count(results[5]),
          bills: count(results[6]),
          notifications: count(results[7]),
        });
      } catch (e) {
        setApiError(String(e));
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const cards = [
    { label: 'Organizations',    value: stats?.organizations  ?? '—', icon: <Building2 size={18} color="#93c5fd" />, color: 'rgba(59,130,246,0.15)', tab: 'organizations'   as Tab },
    { label: 'Stores',           value: stats?.stores         ?? '—', icon: <Store size={18}     color="#a5f3fc" />, color: 'rgba(6,182,212,0.15)',   tab: 'stores'          as Tab },
    { label: 'Products',         value: stats?.products       ?? '—', icon: <Package size={18}   color="#86efac" />, color: 'rgba(34,197,94,0.15)',   tab: 'products'        as Tab },
    { label: 'Inventory',        value: stats?.inventory      ?? '—', icon: <Boxes size={18}     color="#fda4af" />, color: 'rgba(244,63,94,0.15)',   tab: 'inventory'       as Tab },
    { label: 'Suppliers',        value: stats?.suppliers      ?? '—', icon: <Truck size={18}     color="#fdba74" />, color: 'rgba(249,115,22,0.15)',  tab: 'suppliers'       as Tab },
    { label: 'Purchase Orders',  value: stats?.purchaseOrders ?? '—', icon: <ShoppingCart size={18} color="#c4b5fd" />, color: 'rgba(139,92,246,0.15)', tab: 'purchase-orders' as Tab },
    { label: 'Bills',            value: stats?.bills          ?? '—', icon: <Receipt size={18}   color="#fcd34d" />, color: 'rgba(234,179,8,0.15)',   tab: 'bills'           as Tab },
    { label: 'Notifications',    value: stats?.notifications  ?? '—', icon: <Bell size={18}      color="#6ee7b7" />, color: 'rgba(16,185,129,0.15)',  tab: 'notifications'   as Tab },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Page title */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0 }}>
            <span className="gradient-text">Dashboard</span>
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.2rem' }}>
            Overview of your Core ERP data
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          {loading && <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Activity size={14} /> Loading…</span>}
        </div>
      </div>

      {/* API error banner */}
      {apiError && (
        <div style={{ padding: '0.875rem 1rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '0.5rem', color: '#f87171', fontSize: '0.85rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <AlertCircle size={16} />
          API Error: {apiError}. Verify your token in Settings.
        </div>
      )}

      {/* Stats grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
          gap: '1rem',
        }}
      >
        {cards.map((card) => (
          <StatCard
            key={card.label}
            label={card.label}
            value={loading ? '…' : card.value}
            icon={card.icon}
            color={card.color}
            onClick={() => onNavigate(card.tab)}
          />
        ))}
      </div>

      {/* Status grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: '1rem',
        }}
      >
        <div className="glass-card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <TrendingUp size={16} style={{ color: 'var(--brand-400)' }} />
            <h3 style={{ fontSize: '0.9rem', fontWeight: 600, margin: 0 }}>Quick Actions</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {(['organizations', 'products', 'inventory', 'purchase-orders'] as Tab[]).map((tab) => (
              <button
                key={tab}
                className="btn btn-ghost"
                style={{ justifyContent: 'flex-start', fontSize: '0.85rem', textTransform: 'capitalize' }}
                onClick={() => onNavigate(tab)}
              >
                View {tab.replace('-', ' ')}
              </button>
            ))}
          </div>
        </div>

        <div className="glass-card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <CheckCircle2 size={16} style={{ color: '#34d399' }} />
            <h3 style={{ fontSize: '0.9rem', fontWeight: 600, margin: 0 }}>System Status</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>API Connection</span>
              <span className={`badge ${apiError ? 'badge-danger' : 'badge-success'}`}>
                {apiError ? 'Error' : 'Connected'}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Local Database</span>
              <span className="badge badge-success">Online</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Session</span>
              <span className="badge badge-info">Active</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
