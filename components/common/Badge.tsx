/**
 * Badge - 재사용 가능한 배지 컴포넌트
 *
 * Admin 페이지에서 중복되는 배지 컴포넌트들을 통합:
 * - StatusBadge, RouterBadge, ScraperStatusBadge 등
 *
 * @module components/common/Badge
 */

'use client';

import { type ReactNode } from 'react';

// ============================================================================
// Types
// ============================================================================

export type BadgeVariant =
  | 'default'
  | 'primary'
  | 'secondary'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'purple'
  | 'cyan'
  | 'orange'
  | 'indigo';

export type BadgeSize = 'sm' | 'md' | 'lg';

export interface BadgeProps {
  /** 배지 내용 */
  children: ReactNode;
  /** 배지 색상 변형 */
  variant?: BadgeVariant;
  /** 배지 크기 */
  size?: BadgeSize;
  /** 아이콘 (FontAwesome 클래스) */
  icon?: string;
  /** 점(dot) 표시 */
  dot?: boolean;
  /** 클릭 가능 여부 */
  clickable?: boolean;
  /** 클릭 핸들러 */
  onClick?: () => void;
  /** 추가 클래스 */
  className?: string;
}

// ============================================================================
// Style Maps
// ============================================================================

const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  default: 'border border-[var(--pn-border)] bg-[var(--pn-surface-soft)] text-[var(--pn-ink-soft)]',
  primary: 'border border-[var(--pn-brand-soft)] bg-[var(--pn-brand-soft)] text-[var(--pn-brand)]',
  secondary: 'border border-[var(--pn-border)] bg-white text-[var(--pn-ink-soft)]',
  success: 'border border-[var(--pn-success-soft)] bg-[var(--pn-success-soft)] text-[var(--pn-success)]',
  warning: 'border border-[var(--pn-warning-soft)] bg-[var(--pn-warning-soft)] text-[var(--pn-warning)]',
  danger: 'border border-[var(--pn-danger-soft)] bg-[var(--pn-danger-soft)] text-[var(--pn-danger)]',
  info: 'border border-[var(--pn-brand-soft)] bg-[var(--pn-brand-soft)] text-[var(--pn-brand)]',
  purple: 'border border-[var(--pn-brand-soft)] bg-[var(--pn-brand-soft)] text-[var(--pn-brand)]',
  cyan: 'border border-[var(--pn-brand-soft)] bg-[var(--pn-surface-soft)] text-[var(--pn-brand)]',
  orange: 'border border-[var(--pn-warning-soft)] bg-[var(--pn-warning-soft)] text-[var(--pn-warning)]',
  indigo: 'border border-[var(--pn-success-soft)] bg-[var(--pn-success-soft)] text-[var(--pn-success)]',
};

const SIZE_CLASSES: Record<BadgeSize, string> = {
  sm: 'px-1.5 py-0.5 text-xs',
  md: 'px-2 py-0.5 text-xs',
  lg: 'px-2.5 py-1 text-sm',
};

const DOT_CLASSES: Record<BadgeVariant, string> = {
  default: 'bg-[var(--pn-ink-muted)]',
  primary: 'bg-[var(--pn-brand)]',
  secondary: 'bg-[var(--pn-ink-soft)]',
  success: 'bg-[var(--pn-success)]',
  warning: 'bg-[var(--pn-warning)]',
  danger: 'bg-[var(--pn-danger)]',
  info: 'bg-[var(--pn-brand)]',
  purple: 'bg-[var(--pn-brand)]',
  cyan: 'bg-[var(--pn-brand)]',
  orange: 'bg-[var(--pn-warning)]',
  indigo: 'bg-[var(--pn-success)]',
};

// ============================================================================
// Base Badge Component
// ============================================================================

export function Badge({
  children,
  variant = 'default',
  size = 'md',
  icon,
  dot,
  clickable,
  onClick,
  className = '',
}: BadgeProps) {
  const Component = clickable || onClick ? 'button' : 'span';

  return (
    <Component
      onClick={onClick}
      className={`
        inline-flex items-center gap-1 rounded-full font-medium
        ${VARIANT_CLASSES[variant]}
        ${SIZE_CLASSES[size]}
        ${clickable || onClick ? 'cursor-pointer hover:opacity-80 transition' : ''}
        ${className}
      `}
    >
      {dot && (
        <span className={`w-1.5 h-1.5 rounded-full ${DOT_CLASSES[variant]}`} />
      )}
      {icon && <i className={`fas ${icon} text-[0.65em]`} />}
      {children}
    </Component>
  );
}

// ============================================================================
// Specialized Badge Components
// ============================================================================

/**
 * 상태 배지 (성공/실패)
 */
export function StatusBadge({
  success,
  successText = '성공',
  failText = '실패',
}: {
  success: boolean;
  successText?: string;
  failText?: string;
}) {
  return (
    <Badge variant={success ? 'success' : 'danger'}>
      {success ? successText : failText}
    </Badge>
  );
}

/**
 * 라우터 배지 (semantic/llm)
 */
export function RouterBadge({ router }: { router: string }) {
  const isLLM = router === 'llm';
  return (
    <Badge variant={isLLM ? 'purple' : 'primary'}>
      {router}
    </Badge>
  );
}

/**
 * 주문 상태 배지
 */
const ORDER_STATUS_CONFIG: Record<string, { variant: BadgeVariant; label: string }> = {
  PENDING: { variant: 'warning', label: '대기' },
  PAID: { variant: 'primary', label: '결제완료' },
  PROCESSING: { variant: 'warning', label: '처리중' },
  SHIPPED: { variant: 'indigo', label: '배송중' },
  DELIVERED: { variant: 'success', label: '배송완료' },
  CANCELLED: { variant: 'danger', label: '취소됨' },
};

export function OrderStatusBadge({ status }: { status: string }) {
  const config = ORDER_STATUS_CONFIG[status] || { variant: 'default' as BadgeVariant, label: status };
  return <Badge variant={config.variant}>{config.label}</Badge>;
}

/**
 * 스크래퍼 상태 배지
 */
const SCRAPER_STATUS_CONFIG: Record<string, { variant: BadgeVariant; label: string }> = {
  COMPLETED: { variant: 'success', label: 'COMPLETED' },
  FAILED: { variant: 'danger', label: 'FAILED' },
  PROCESSING: { variant: 'warning', label: 'PROCESSING' },
  PENDING: { variant: 'default', label: 'PENDING' },
};

export function ScraperStatusBadge({ status }: { status: string }) {
  const config = SCRAPER_STATUS_CONFIG[status] || { variant: 'default' as BadgeVariant, label: status };
  return <Badge variant={config.variant}>{config.label}</Badge>;
}

/**
 * 활동 상태 배지 (최근 활동 기준)
 */
export function ActivityBadge({
  lastActiveAt,
  activeThresholdHours = 24,
}: {
  lastActiveAt: string | null;
  activeThresholdHours?: number;
}) {
  if (!lastActiveAt) {
    return <Badge variant="default" dot>비활성</Badge>;
  }

  const hoursSinceActive =
    (Date.now() - new Date(lastActiveAt).getTime()) / (1000 * 60 * 60);

  if (hoursSinceActive < activeThresholdHours) {
    return <Badge variant="success" dot>활성</Badge>;
  } else if (hoursSinceActive < activeThresholdHours * 7) {
    return <Badge variant="warning" dot>최근 활동</Badge>;
  } else {
    return <Badge variant="default" dot>비활성</Badge>;
  }
}

/**
 * Mock/Real 상태 배지
 */
export function MockRealBadge({ isMock }: { isMock: boolean }) {
  return (
    <Badge variant={isMock ? 'warning' : 'success'}>
      {isMock ? 'MOCK' : 'REAL'}
    </Badge>
  );
}

/**
 * 에러 레벨 배지
 */
const ERROR_LEVEL_CONFIG: Record<string, { variant: BadgeVariant; icon: string }> = {
  critical: { variant: 'danger', icon: 'fa-exclamation-circle' },
  error: { variant: 'danger', icon: 'fa-times-circle' },
  warning: { variant: 'warning', icon: 'fa-exclamation-triangle' },
  info: { variant: 'info', icon: 'fa-info-circle' },
};

export function ErrorLevelBadge({ level }: { level: string }) {
  const config = ERROR_LEVEL_CONFIG[level.toLowerCase()] || {
    variant: 'default' as BadgeVariant,
    icon: 'fa-question-circle',
  };
  return (
    <Badge variant={config.variant} icon={config.icon}>
      {level.toUpperCase()}
    </Badge>
  );
}

/**
 * 카운트 배지 (숫자 표시)
 */
export function CountBadge({
  count,
  max = 99,
  variant = 'primary',
}: {
  count: number;
  max?: number;
  variant?: BadgeVariant;
}) {
  const displayCount = count > max ? `${max}+` : String(count);
  return (
    <Badge variant={variant} size="sm" className="min-w-[1.25rem] justify-center">
      {displayCount}
    </Badge>
  );
}

/**
 * 사용자 활동 상태 배지 (users 페이지용)
 * - 신규: lastActiveAt이 없음
 * - 활성: 7일 이내
 * - 비활성: 7-30일
 * - 휴면: 30일 이상
 */
export function UserStatusBadge({ lastActiveAt }: { lastActiveAt: string | null }) {
  if (!lastActiveAt) {
    return <Badge variant="default">신규</Badge>;
  }

  const lastActive = new Date(lastActiveAt);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - lastActive.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays <= 7) {
    return <Badge variant="success">활성</Badge>;
  } else if (diffDays <= 30) {
    return <Badge variant="warning">비활성</Badge>;
  } else {
    return <Badge variant="danger">휴면</Badge>;
  }
}

export default Badge;
