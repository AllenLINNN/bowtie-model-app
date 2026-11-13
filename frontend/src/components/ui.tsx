import React, { useId, useRef } from 'react';

/**
 * 中文輸入法選字時按 Enter 也會觸發 keydown。
 * 組字中（isComposing，或 Safari 舊版回報的 keyCode 229）不能當成「送出」。
 */
export const isImeComposing = (e: React.KeyboardEvent) =>
  e.nativeEvent.isComposing || e.keyCode === 229;

/* ---------- 分段切換（tabs 語意，支援左右方向鍵） ---------- */

interface SegmentOption<T extends string> {
  value: T;
  label: React.ReactNode;
}

interface SegmentedTabsProps<T extends string> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
  size?: 'sm' | 'md';
  className?: string;
}

export function SegmentedTabs<T extends string>({ options, value, onChange, ariaLabel, size = 'md', className = '' }: SegmentedTabsProps<T>) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    let next = -1;
    if (e.key === 'ArrowRight') next = (index + 1) % options.length;
    else if (e.key === 'ArrowLeft') next = (index - 1 + options.length) % options.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = options.length - 1;
    if (next < 0) return;
    e.preventDefault();
    onChange(options[next].value);
    refs.current[next]?.focus();
  };

  const pad = size === 'sm' ? 'px-3 py-1 text-xs' : 'px-3 py-1.5 text-sm';

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={`inline-flex items-center bg-gray-100 dark:bg-slate-800 p-0.5 rounded-lg border border-gray-200 dark:border-slate-700 shrink-0 ${className}`}
    >
      {options.map((opt, i) => {
        const selected = opt.value === value;
        return (
          <button
            key={opt.value}
            ref={(el) => (refs.current[i] = el)}
            type="button"
            role="tab"
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(opt.value)}
            onKeyDown={(e) => handleKeyDown(e, i)}
            className={`${pad} rounded-md font-semibold whitespace-nowrap transition-colors duration-150 ${
              selected
                ? 'bg-white dark:bg-slate-700 text-blue-700 dark:text-blue-300 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

/* ---------- 開關（role="switch"） ---------- */

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  /** false 時標籤只給輔助技術讀，畫面不顯示 */
  showLabel?: boolean;
  labelClassName?: string;
}

export const Switch = ({ checked, onChange, label, showLabel = true, labelClassName = '' }: SwitchProps) => {
  const id = useId();
  return (
    <div className="flex items-center gap-2 select-none shrink-0">
      <label htmlFor={id} className={showLabel ? `text-xs font-semibold text-gray-600 dark:text-gray-400 cursor-pointer ${labelClassName}` : 'sr-only'}>
        {label}
      </label>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`w-9 h-5 flex items-center rounded-full p-0.5 transition-colors duration-200 shrink-0 ${
          checked ? 'bg-blue-600 dark:bg-blue-500' : 'bg-gray-300 dark:bg-slate-600'
        }`}
      >
        <span
          aria-hidden="true"
          className={`bg-white w-4 h-4 rounded-full shadow transition-transform duration-200 ${checked ? 'translate-x-4' : 'translate-x-0'}`}
        />
      </button>
    </div>
  );
};

/* ---------- 表單欄位：label 與控制項以 id 綁定 ---------- */

export const inputClass =
  'w-full border border-gray-300 dark:border-slate-600 rounded-md px-2 py-1.5 text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 disabled:bg-gray-100 disabled:text-gray-500 dark:disabled:bg-slate-800/50 dark:disabled:text-slate-400 disabled:cursor-not-allowed transition-colors';

interface FieldProps {
  label: string;
  hint?: React.ReactNode;
  children: (id: string, hintId: string | undefined) => React.ReactNode;
}

export const Field = ({ label, hint, children }: FieldProps) => {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-xs font-semibold text-gray-700 dark:text-gray-300">
        {label}
      </label>
      {children(id, hintId)}
      {hint && (
        <p id={hintId} className="text-xs text-gray-500 dark:text-gray-400">
          {hint}
        </p>
      )}
    </div>
  );
};
