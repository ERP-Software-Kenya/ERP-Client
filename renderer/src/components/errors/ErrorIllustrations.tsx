import type { ErrorStateType } from './errorCopy';

const svgClass = 'h-40 w-40';

export function ErrorIllustration({ type }: { type: ErrorStateType }) {
  switch (type) {
    case 'not-found':
      return <NotFoundArt />;
    case 'crash':
      return <CrashArt />;
    case 'load':
      return <LoadArt />;
    case 'offline':
      return <OfflineArt />;
    default:
      return <GenericArt />;
  }
}

/** Lost dog with folded map and question mark */
function NotFoundArt() {
  return (
    <svg
      className={svgClass}
      viewBox="0 0 160 160"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <rect x="20" y="100" width="120" height="8" rx="4" fill="#94a3b8" opacity="0.4" />
      <path
        d="M48 98c8-22 28-38 52-38 18 0 34 10 42 26"
        stroke="#64748b"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />
      <ellipse cx="72" cy="72" rx="28" ry="24" fill="#94a3b8" />
      <ellipse cx="72" cy="78" rx="18" ry="14" fill="#e2e8f0" />
      <circle cx="62" cy="68" r="4" fill="#64748b" />
      <circle cx="82" cy="68" r="4" fill="#64748b" />
      <path d="M68 82c4 3 8 3 12 0" stroke="#64748b" strokeWidth="2" strokeLinecap="round" />
      <ellipse cx="48" cy="62" rx="10" ry="14" fill="#94a3b8" transform="rotate(-20 48 62)" />
      <ellipse cx="96" cy="62" rx="10" ry="14" fill="#94a3b8" transform="rotate(20 96 62)" />
      <rect x="98" y="88" width="36" height="28" rx="3" fill="#e2e8f0" stroke="#64748b" strokeWidth="2" />
      <path d="M104 96h24M104 102h18M104 108h20" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" />
      <circle cx="116" cy="78" r="12" fill="#3b82f6" opacity="0.15" />
      <text x="110" y="83" fill="#3b82f6" fontSize="16" fontWeight="600" fontFamily="system-ui">
        ?
      </text>
    </svg>
  );
}

/** Sad pup beside cracked monitor */
function CrashArt() {
  return (
    <svg
      className={svgClass}
      viewBox="0 0 160 160"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <rect x="88" y="36" width="56" height="44" rx="4" fill="#64748b" />
      <rect x="92" y="40" width="48" height="32" rx="2" fill="#e2e8f0" />
      <path d="M92 56h48M108 40v32M124 40v32" stroke="#94a3b8" strokeWidth="1.5" opacity="0.6" />
      <path d="M100 48l20 24M120 48l-20 24" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M108 84v8M124 84v8" stroke="#64748b" strokeWidth="3" strokeLinecap="round" />
      <rect x="100" y="92" width="32" height="4" rx="2" fill="#94a3b8" />
      <ellipse cx="52" cy="88" rx="26" ry="22" fill="#94a3b8" />
      <ellipse cx="52" cy="94" rx="16" ry="12" fill="#e2e8f0" />
      <path d="M44 86c0-2 2-3 4-2M60 86c0-2 2-3 4-2" stroke="#64748b" strokeWidth="2" strokeLinecap="round" />
      <path d="M48 98c2 2 6 2 8 0" stroke="#64748b" strokeWidth="2" strokeLinecap="round" />
      <ellipse cx="34" cy="78" rx="9" ry="12" fill="#94a3b8" transform="rotate(-25 34 78)" />
      <ellipse cx="70" cy="78" rx="9" ry="12" fill="#94a3b8" transform="rotate(25 70 78)" />
      <path
        d="M28 108c6-4 14-6 22-4"
        stroke="#64748b"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

/** Tired dog with unplugged cable */
function LoadArt() {
  return (
    <svg
      className={svgClass}
      viewBox="0 0 160 160"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <rect x="16" y="108" width="128" height="6" rx="3" fill="#94a3b8" opacity="0.35" />
      <ellipse cx="68" cy="82" rx="30" ry="26" fill="#94a3b8" />
      <ellipse cx="68" cy="88" rx="20" ry="15" fill="#e2e8f0" />
      <path d="M58 80c-1-3 1-5 4-4M78 80c-1-3 1-5 4-4" stroke="#64748b" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M62 94c4 2 8 2 12 0" stroke="#64748b" strokeWidth="2" strokeLinecap="round" />
      <ellipse cx="44" cy="72" rx="11" ry="15" fill="#94a3b8" transform="rotate(-30 44 72)" />
      <ellipse cx="92" cy="72" rx="11" ry="15" fill="#94a3b8" transform="rotate(30 92 72)" />
      <path
        d="M98 52c0-8 6-14 14-14h8"
        stroke="#64748b"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />
      <rect x="118" y="36" width="14" height="10" rx="2" fill="#3b82f6" />
      <path d="M125 46v12" stroke="#64748b" strokeWidth="3" strokeLinecap="round" />
      <circle cx="125" cy="62" r="5" fill="#64748b" />
      <path
        d="M118 58c-8 4-16 8-24 10"
        stroke="#94a3b8"
        strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray="2 6"
      />
      <path d="M88 58l-6-8" stroke="#64748b" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/** Dog with empty wifi / no signal */
function OfflineArt() {
  return (
    <svg
      className={svgClass}
      viewBox="0 0 160 160"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M108 44c12 8 20 20 22 34"
        stroke="#94a3b8"
        strokeWidth="3"
        strokeLinecap="round"
        opacity="0.35"
      />
      <path
        d="M98 54c8 6 14 14 16 24"
        stroke="#94a3b8"
        strokeWidth="3"
        strokeLinecap="round"
        opacity="0.35"
      />
      <path d="M88 64c4 4 6 10 6 16" stroke="#94a3b8" strokeWidth="3" strokeLinecap="round" opacity="0.35" />
      <circle cx="88" cy="88" r="4" fill="#94a3b8" opacity="0.35" />
      <path d="M76 36l24 24M100 36L76 60" stroke="#64748b" strokeWidth="3" strokeLinecap="round" />
      <ellipse cx="52" cy="96" rx="28" ry="24" fill="#94a3b8" />
      <ellipse cx="52" cy="102" rx="18" ry="13" fill="#e2e8f0" />
      <circle cx="42" cy="92" r="3.5" fill="#64748b" />
      <circle cx="62" cy="92" r="3.5" fill="#64748b" />
      <path d="M46 106c4 3 8 3 12 0" stroke="#64748b" strokeWidth="2" strokeLinecap="round" />
      <ellipse cx="28" cy="84" rx="10" ry="13" fill="#94a3b8" transform="rotate(-22 28 84)" />
      <ellipse cx="76" cy="84" rx="10" ry="13" fill="#94a3b8" transform="rotate(22 76 84)" />
      <rect x="24" y="118" width="56" height="6" rx="3" fill="#94a3b8" opacity="0.3" />
    </svg>
  );
}

/** Surprised “oops” pup */
function GenericArt() {
  return (
    <svg
      className={svgClass}
      viewBox="0 0 160 160"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <ellipse cx="80" cy="88" rx="32" ry="28" fill="#94a3b8" />
      <ellipse cx="80" cy="94" rx="22" ry="16" fill="#e2e8f0" />
      <circle cx="68" cy="82" r="5" fill="#64748b" />
      <circle cx="92" cy="82" r="5" fill="#64748b" />
      <circle cx="68" cy="81" r="1.5" fill="#e2e8f0" />
      <circle cx="92" cy="81" r="1.5" fill="#e2e8f0" />
      <ellipse cx="80" cy="98" rx="6" ry="8" fill="#64748b" opacity="0.5" />
      <ellipse cx="52" cy="72" rx="12" ry="16" fill="#94a3b8" transform="rotate(-35 52 72)" />
      <ellipse cx="108" cy="72" rx="12" ry="16" fill="#94a3b8" transform="rotate(35 108 72)" />
      <path
        d="M80 48c-6 0-10 4-10 8"
        stroke="#64748b"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />
      <rect x="58" y="118" width="44" height="14" rx="7" fill="#3b82f6" opacity="0.2" />
      <text x="68" y="129" fill="#3b82f6" fontSize="11" fontWeight="600" fontFamily="system-ui">
        Oops!
      </text>
    </svg>
  );
}
