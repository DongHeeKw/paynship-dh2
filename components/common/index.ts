/**
 * Common Components - Public API
 *
 * 재사용 가능한 공통 UI 컴포넌트들
 *
 * @module components/common
 */

// Modal Components
export {
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ConfirmModal,
  AlertModal,
  type ModalProps,
} from './Modal';

// Badge Components
export {
  Badge,
  StatusBadge,
  RouterBadge,
  OrderStatusBadge,
  ScraperStatusBadge,
  ActivityBadge,
  MockRealBadge,
  ErrorLevelBadge,
  CountBadge,
  UserStatusBadge,
  type BadgeProps,
  type BadgeVariant,
  type BadgeSize,
} from './Badge';
