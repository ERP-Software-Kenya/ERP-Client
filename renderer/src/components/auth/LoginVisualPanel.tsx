export default function LoginVisualPanel() {
  return (
    <aside className="login-visual hidden lg:flex" aria-label="Core ERP branding">
      <div className="login-aurora" aria-hidden="true">
        <span className="login-blob login-blob-a" />
        <span className="login-blob login-blob-b" />
      </div>
      <div className="login-copy">
        <p className="login-brand">Core ERP</p>
        <p className="login-tagline">Operations, unified.</p>
      </div>
    </aside>
  );
}
