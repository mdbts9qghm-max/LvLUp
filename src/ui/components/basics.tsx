import { useEffect, type ReactNode } from 'react';
import { Icon } from '../art/icons';
import { PixelSprite } from '../art/Pixel';
import { avatarLayers, AVATAR_H, AVATAR_W, type AvatarLook } from '../art/avatar';

export function Modal({ title, onClose, children, center = false, closeLabel = 'Schließen' }: { title?: string; onClose?: () => void; children: ReactNode; center?: boolean; closeLabel?: string }) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose?.();
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);
  return (
    <div className={`overlay ${center ? 'center' : ''}`} role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.target === e.currentTarget && onClose?.()}>
      <div className="sheet rise">
        {(title || onClose) && (
          <div className="row between" style={{ marginBottom: 12 }}>
            <h2 className="screen-title" style={{ fontSize: 11 }}>
              {title}
            </h2>
            {onClose && (
              <button className="btn ghost icon-btn" onClick={onClose} aria-label={closeLabel}>
                <Icon name="close" size={14} />
              </button>
            )}
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

export function Bar({ value, max, color = 'var(--gold)', label }: { value: number; max: number; color?: string; label?: string }) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  return (
    <div className="bar" role="progressbar" aria-valuenow={Math.round(value)} aria-valuemin={0} aria-valuemax={max} aria-label={label}>
      <i style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

export function SegBar({ filled, color, label }: { filled: number; color: string; label?: string }) {
  return (
    <div className="segbar" role="meter" aria-valuenow={filled} aria-valuemin={0} aria-valuemax={10} aria-label={label}>
      {Array.from({ length: 10 }, (_, i) => (
        <i key={i} style={{ background: i < filled ? color : undefined }} />
      ))}
    </div>
  );
}

export function Avatar({ look, scale = 4, floating = false }: { look: AvatarLook; scale?: number; floating?: boolean }) {
  return (
    <div className={floating ? 'floaty' : undefined} style={{ display: 'inline-block', lineHeight: 0 }}>
      <PixelSprite layers={avatarLayers(look)} width={AVATAR_W} height={AVATAR_H} scale={scale} title="Dein Held" />
    </div>
  );
}

export function Field({ label, children, group = false }: { label: string; children: ReactNode; group?: boolean }) {
  if (group)
    return (
      <div className="field" role="group" aria-label={label}>
        <span>{label}</span>
        {children}
      </div>
    );
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}

/** Zahlenfeld, das leer sein darf. */
export function NumInput({ value, onChange, step = 'any', min, max, placeholder, inputMode = 'decimal' }: { value: number | undefined; onChange: (v: number | undefined) => void; step?: string; min?: number; max?: number; placeholder?: string; inputMode?: 'decimal' | 'numeric' }) {
  return (
    <input
      className="inp"
      type="number"
      inputMode={inputMode}
      step={step}
      min={min}
      max={max}
      placeholder={placeholder}
      value={value ?? ''}
      onChange={(e) => {
        const t = e.target.value.replace(',', '.');
        onChange(t === '' ? undefined : Number(t));
      }}
    />
  );
}

export function ChipGroup<T extends string>({ options, value, onChange }: { options: Record<T, string>; value: T; onChange: (v: T) => void }) {
  return (
    <div className="row wrap" style={{ gap: 6 }}>
      {(Object.keys(options) as T[]).map((k) => (
        <button key={k} type="button" className={`chip ${value === k ? 'on' : ''}`} onClick={() => onChange(k)} aria-pressed={value === k}>
          {options[k]}
        </button>
      ))}
    </div>
  );
}
