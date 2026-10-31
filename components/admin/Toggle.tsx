/**
 * Admin Toggle Component - Shared toggle switch
 *
 * Provides unified toggle styling with variants for different contexts:
 * - default: Full-size toggle for settings pages (light theme)
 * - mini: Compact toggle for floating panels (dark theme)
 *
 * @module components/admin/Toggle
 */

'use client';

import React from 'react';

// ============================================================================
// Types
// ============================================================================

export interface ToggleProps {
  /** Current toggle state */
  enabled: boolean;
  /** Change handler */
  onChange: (value: boolean) => void;
  /** Label text */
  label: string;
  /** Optional description (default variant only) */
  description?: string;
  /** Disabled state */
  disabled?: boolean;
  /** Size variant */
  variant?: 'default' | 'mini';
  /** Color theme */
  theme?: 'light' | 'dark';
  /** Additional class names */
  className?: string;
}

// ============================================================================
// Style Configurations
// ============================================================================

const VARIANT_STYLES = {
  default: {
    container: 'flex items-center justify-between py-3 px-1 group',
    label: 'font-medium text-gray-900 group-hover:text-purple-700 transition-colors',
    description: 'text-sm text-gray-500 mt-0.5',
    track: 'h-6 w-11',
    knob: 'h-4 w-4',
    translateOn: 'translate-x-6',
    translateOff: 'translate-x-1',
  },
  mini: {
    container: 'flex items-center justify-between gap-2',
    label: 'text-xs',
    description: '',
    track: 'h-4 w-8',
    knob: 'h-3 w-3',
    translateOn: 'translate-x-4',
    translateOff: 'translate-x-0.5',
  },
} as const;

const THEME_STYLES = {
  light: {
    label: 'text-gray-900',
    trackOn: 'bg-purple-600',
    trackOff: 'bg-gray-200',
    knob: 'bg-white shadow-sm',
  },
  dark: {
    label: 'text-gray-400',
    trackOn: 'bg-emerald-500',
    trackOff: 'bg-gray-600',
    knob: 'bg-white',
  },
} as const;

// ============================================================================
// Component
// ============================================================================

export function Toggle({
  enabled,
  onChange,
  label,
  description,
  disabled = false,
  variant = 'default',
  theme = 'light',
  className = '',
}: ToggleProps) {
  const variantStyle = VARIANT_STYLES[variant];
  const themeStyle = THEME_STYLES[theme];

  const handleClick = () => {
    if (!disabled) {
      onChange(!enabled);
    }
  };

  // Mini variant: simpler layout
  if (variant === 'mini') {
    return (
      <div className={`${variantStyle.container} ${className}`}>
        <span className={`${variantStyle.label} ${themeStyle.label}`}>
          {label}
        </span>
        <button
          type="button"
          onClick={handleClick}
          disabled={disabled}
          className={`
            ${variantStyle.track}
            rounded-full transition-colors relative
            ${enabled ? themeStyle.trackOn : themeStyle.trackOff}
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          `}
          aria-label={label}
        >
          <div
            className={`
              absolute top-0.5
              ${variantStyle.knob}
              rounded-full ${themeStyle.knob}
              transition-transform
              ${enabled ? variantStyle.translateOn : variantStyle.translateOff}
            `}
          />
        </button>
      </div>
    );
  }

  // Default variant: full layout with description
  return (
    <label
      className={`
        ${variantStyle.container}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        ${className}
      `}
    >
      <div className="flex-1 min-w-0 pr-4">
        <p className={`${variantStyle.label} ${theme === 'dark' ? themeStyle.label : ''}`}>
          {label}
        </p>
        {description && (
          <p className={variantStyle.description}>{description}</p>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        disabled={disabled}
        onClick={handleClick}
        className={`
          relative inline-flex items-center rounded-full
          transition-colors flex-shrink-0
          ${variantStyle.track}
          ${enabled ? themeStyle.trackOn : themeStyle.trackOff}
          ${disabled ? 'cursor-not-allowed' : ''}
        `}
      >
        <span
          className={`
            inline-block transform rounded-full transition-transform
            ${variantStyle.knob}
            ${themeStyle.knob}
            ${enabled ? variantStyle.translateOn : variantStyle.translateOff}
          `}
        />
      </button>
    </label>
  );
}

// ============================================================================
// Convenience Exports
// ============================================================================

/** Mini toggle for floating panels (dark theme by default) */
export function MiniToggle(props: Omit<ToggleProps, 'variant' | 'theme'> & { theme?: 'light' | 'dark' }) {
  return <Toggle {...props} variant="mini" theme={props.theme ?? 'dark'} />;
}

export default Toggle;
