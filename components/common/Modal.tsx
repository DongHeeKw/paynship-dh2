/**
 * Modal - 재사용 가능한 모달 컴포넌트
 *
 * AdminSettingsModal 등에서 중복되는 모달 로직을 통합:
 * - ESC 키로 닫기
 * - 배경 클릭으로 닫기
 * - 애니메이션 효과
 * - 접근성 지원 (focus trap, aria)
 *
 * @module components/common/Modal
 */

'use client';

import { useEffect, useCallback, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { getBannerTone } from '@/lib/ui/theme';

// ============================================================================
// Types
// ============================================================================

export interface ModalProps {
  /** 모달 표시 여부 */
  isOpen: boolean;
  /** 닫기 콜백 */
  onClose: () => void;
  /** 모달 내용 */
  children: ReactNode;
  /** 모달 제목 (접근성용) */
  title?: string;
  /** 최대 너비 (default: 'md') */
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
  /** 배경 클릭으로 닫기 허용 (default: true) */
  closeOnBackdrop?: boolean;
  /** ESC 키로 닫기 허용 (default: true) */
  closeOnEsc?: boolean;
  /** 닫기 버튼 표시 (default: false) */
  showCloseButton?: boolean;
  /** 추가 클래스 */
  className?: string;
}

// ============================================================================
// Size Classes
// ============================================================================

const SIZE_CLASSES: Record<NonNullable<ModalProps['size']>, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  full: 'max-w-[95vw]',
};

// ============================================================================
// Component
// ============================================================================

export function Modal({
  isOpen,
  onClose,
  children,
  title,
  size = 'md',
  closeOnBackdrop = true,
  closeOnEsc = true,
  showCloseButton = false,
  className = '',
}: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<Element | null>(null);

  // ESC 키 핸들러 - stopPropagation으로 다른 ESC 핸들러(사이드바 등) 방지
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (closeOnEsc && e.key === 'Escape') {
        e.stopPropagation();
        e.preventDefault();
        onClose();
      }
    },
    [closeOnEsc, onClose]
  );

  // 배경 클릭 핸들러
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (closeOnBackdrop && e.target === e.currentTarget) {
        onClose();
      }
    },
    [closeOnBackdrop, onClose]
  );

  // 모달 열릴 때 포커스 관리
  useEffect(() => {
    if (isOpen) {
      previousActiveElement.current = document.activeElement;
      modalRef.current?.focus();
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = '';
      if (previousActiveElement.current instanceof HTMLElement) {
        previousActiveElement.current.focus();
      }
    }

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  // Portal로 body에 렌더링
  return createPortal(
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 animate-fadeIn bg-[var(--chat-overlay)]"
        onClick={handleBackdropClick}
        aria-hidden="true"
      />

      {/* Modal Container */}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-2 md:p-4 pointer-events-none"
        onClick={handleBackdropClick}
      >
        <div
          ref={modalRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={title ? 'modal-title' : undefined}
          tabIndex={-1}
          className={`
            rounded-xl border border-[var(--pn-border)] bg-white/95 shadow-[0_32px_72px_rgba(18,24,32,0.12)] backdrop-blur-xl md:rounded-[28px] w-full pointer-events-auto
            animate-slideUp flex flex-col max-h-[85vh] md:max-h-[90vh]
            ${SIZE_CLASSES[size]}
            ${className}
          `}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close Button (optional) */}
          {showCloseButton && (
            <button
              onClick={onClose}
              className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-full border border-[var(--pn-border)] bg-white/90"
              aria-label="닫기"
            >
              <i className="fas fa-times text-[var(--pn-ink-muted)]"></i>
            </button>
          )}

          {/* Hidden title for accessibility */}
          {title && (
            <h2 id="modal-title" className="sr-only">
              {title}
            </h2>
          )}

          {children}
        </div>
      </div>
    </>,
    document.body
  );
}

// ============================================================================
// Sub-components
// ============================================================================

interface ModalHeaderProps {
  children: ReactNode;
  onClose?: () => void;
  className?: string;
  gradient?: string;
}

export function ModalHeader({
  children,
  onClose,
  className = '',
  gradient = 'from-[var(--pn-brand)] to-[var(--pn-accent-red)]',
}: ModalHeaderProps) {
  return (
    <div
      className={`
        flex-shrink-0 bg-gradient-to-r ${gradient} p-4 text-white md:p-6 rounded-t-[28px]
        ${className}
      `}
    >
      <div className="flex items-center justify-between">
        <div>{children}</div>
        {onClose && (
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20 transition hover:bg-white/30 md:h-8 md:w-8"
            aria-label="닫기"
          >
            <i className="fas fa-times text-sm"></i>
          </button>
        )}
      </div>
    </div>
  );
}

interface ModalBodyProps {
  children: ReactNode;
  className?: string;
}

export function ModalBody({ children, className = '' }: ModalBodyProps) {
  return (
    <div className={`p-4 md:p-6 space-y-4 md:space-y-6 flex-1 overflow-y-auto min-h-0 ${className}`}>
      {children}
    </div>
  );
}

interface ModalFooterProps {
  children: ReactNode;
  className?: string;
}

export function ModalFooter({ children, className = '' }: ModalFooterProps) {
  return (
    <div
      className={`
        flex-shrink-0 rounded-b-[28px] border-t border-[var(--pn-border)] bg-[var(--pn-canvas-soft)] p-3
        flex gap-2 md:gap-3
        md:p-6
        ${className}
      `}
    >
      {children}
    </div>
  );
}

// ============================================================================
// Confirmation Modal
// ============================================================================

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmVariant?: 'primary' | 'danger';
  loading?: boolean;
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = '확인',
  cancelText = '취소',
  confirmVariant = 'primary',
  loading = false,
}: ConfirmModalProps) {
  const variantClasses = {
    primary:
      'border border-transparent bg-[linear-gradient(135deg,var(--pn-brand)_0%,var(--pn-brand-strong)_100%)] text-white shadow-[0_16px_28px_rgba(0,55,100,0.18)] hover:brightness-105',
    danger:
      'border border-[var(--pn-danger-soft)] bg-[var(--pn-danger-soft)] text-[var(--pn-danger)] hover:brightness-[0.98]',
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm" title={title}>
      <div className="p-6">
        <h3 className="mb-2 text-lg font-bold text-[var(--pn-ink)]">{title}</h3>
        <p className="text-[var(--pn-ink-soft)]">{message}</p>
      </div>
      <ModalFooter>
        <button
          onClick={onClose}
          disabled={loading}
          className="flex-1 rounded-lg border border-[var(--pn-border)] bg-white px-4 py-2 font-medium text-[var(--pn-ink)] transition hover:border-[var(--pn-border-strong)] hover:bg-[var(--pn-surface-soft)] disabled:opacity-50"
        >
          {cancelText}
        </button>
        <button
          onClick={onConfirm}
          disabled={loading}
          className={`flex-1 py-2 px-4 rounded-lg font-medium transition disabled:opacity-50 ${variantClasses[confirmVariant]}`}
        >
          {loading ? '처리 중...' : confirmText}
        </button>
      </ModalFooter>
    </Modal>
  );
}

// ============================================================================
// Alert Modal
// ============================================================================

interface AlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  type?: 'info' | 'success' | 'warning' | 'error';
}

export function AlertModal({
  isOpen,
  onClose,
  title,
  message,
type = 'info',
}: AlertModalProps) {
  const typeConfig = {
    info: { icon: 'fa-info-circle', tone: getBannerTone('info') },
    success: { icon: 'fa-check-circle', tone: getBannerTone('success') },
    warning: { icon: 'fa-exclamation-triangle', tone: getBannerTone('warning') },
    error: { icon: 'fa-times-circle', tone: getBannerTone('danger') },
  };

  const config = typeConfig[type];

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm" title={title}>
      <div className="p-6 text-center">
        <div className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full ${config.tone.icon}`}>
          <i className={`fas ${config.icon} ${config.tone.emphasis} text-2xl`}></i>
        </div>
        <h3 className="mb-2 text-lg font-bold text-[var(--pn-ink)]">{title}</h3>
        <p className="text-[var(--pn-ink-soft)]">{message}</p>
      </div>
      <ModalFooter className="justify-center">
        <button
          onClick={onClose}
          className="rounded-lg border border-transparent bg-[linear-gradient(135deg,var(--pn-brand)_0%,var(--pn-brand-strong)_100%)] px-6 py-2 font-medium text-white shadow-[0_16px_28px_rgba(0,55,100,0.18)] transition hover:brightness-105"
        >
          확인
        </button>
      </ModalFooter>
    </Modal>
  );
}

export default Modal;
