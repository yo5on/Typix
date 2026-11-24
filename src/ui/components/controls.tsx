import type { ComponentChildren, ComponentProps } from 'preact';
import { useEffect, useRef } from 'preact/hooks';
import { Icon, type IconName } from './Icon';
import s from './controls.module.css';

type ButtonProps = ComponentProps<'button'> & {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  icon?: IconName;
};

export function Button({ variant = 'secondary', icon, children, class: cls, ...rest }: ButtonProps) {
  return (
    <button type="button" class={`${s.button} ${s[variant]} ${cls ?? ''}`} {...rest}>
      {icon && <Icon name={icon} size={18} />}
      {children}
    </button>
  );
}

/** A labelled setting row: label and description on the left, control on the right. */
export function Field({
  label,
  hint,
  id,
  children,
}: {
  label: string;
  hint?: string;
  id: string;
  children: ComponentChildren;
}) {
  return (
    <div class={s.field}>
      <div class={s.fieldText}>
        <label class={s.fieldLabel} id={`${id}-label`} for={id}>
          {label}
        </label>
        {hint && (
          <p class={s.fieldHint} id={`${id}-hint`}>
            {hint}
          </p>
        )}
      </div>
      <div class={s.fieldControl}>{children}</div>
    </div>
  );
}

export function Toggle({
  id,
  checked,
  onChange,
}: {
  id: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      id={id}
      aria-checked={checked}
      aria-labelledby={`${id}-label`}
      class={s.toggle}
      onClick={() => onChange(!checked)}
    >
      <span class={s.toggleThumb} />
    </button>
  );
}

export function Slider({
  id,
  value,
  onChange,
}: {
  id: string;
  value: number;
  onChange: (v: number) => void;
}) {
  const pct = Math.round(value * 100);
  return (
    <div class={s.slider}>
      <input
        id={id}
        type="range"
        min={0}
        max={100}
        step={5}
        value={pct}
        aria-valuetext={pct === 0 ? 'Off' : `${pct}%`}
        style={{ '--fill': `${pct}%` }}
        onInput={(e) => onChange(Number(e.currentTarget.value) / 100)}
      />
      <span class={`${s.sliderValue} num`} aria-hidden="true">
        {pct === 0 ? 'Off' : `${pct}%`}
      </span>
    </div>
  );
}

/** Radio group drawn as a segmented control. Arrow keys move the selection (native radio behaviour). */
export function Segmented<T extends string | number>({
  id,
  value,
  options,
  onChange,
}: {
  id: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div class={s.segmented} role="radiogroup" aria-labelledby={`${id}-label`} id={id}>
      {options.map((o) => (
        <label class={s.segment} key={String(o.value)}>
          <input
            type="radio"
            name={id}
            checked={o.value === value}
            onChange={() => onChange(o.value)}
            class="visually-hidden"
          />
          <span>{o.label}</span>
        </label>
      ))}
    </div>
  );
}

/** Modal confirmation built on <dialog>: native focus trapping and Esc-to-cancel. */
export function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel,
  danger,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  children: ComponentChildren;
  confirmLabel: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      class={s.dialog}
      aria-labelledby="confirm-title"
      onCancel={(e) => {
        e.preventDefault();
        onCancel();
      }}
    >
      <h2 id="confirm-title" class={s.dialogTitle}>
        {title}
      </h2>
      <div class={s.dialogBody}>{children}</div>
      <div class={s.dialogActions}>
        <Button variant="ghost" onClick={onCancel} autoFocus>
          Cancel
        </Button>
        <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </div>
    </dialog>
  );
}
