/**
 * Admin Module - Unified Type Definitions
 *
 * Single source of truth for all admin-related types.
 * Import from this file instead of defining types locally.
 *
 * @module lib/admin/types
 */

import type { Prisma } from '@prisma/client';

// Prisma JSON 타입 alias (nullable)
type JsonValue = Prisma.JsonValue | null;

// ============================================================================
// Auth & Access Control
// ============================================================================

export type AuthMode = 'LOGIN_REQUIRED' | 'GUEST_UNTIL_CHECKOUT' | 'DEMO_ONLY';
export type AdminRole = 'viewer' | 'operator' | 'super_admin';

// ============================================================================
// LLM Configuration
// ============================================================================

// Re-export from SSoT (lib/constants/llm.ts) for backward compatibility
// Inert legacy database shape retained to read existing settings safely.
export type LLMProvider = 'gemini' | 'lm-studio' | 'claude';

// LLMModel: Union of all model IDs (kept here as derived from LLM_MODELS)
export type LLMModel =
  // Gemini models
  | 'gemini-2.5-flash'
  | 'gemini-2.5-pro'
  | 'gemini-3-pro'
  | 'gemini-3-flash-preview'
  // Claude models
  | 'claude-haiku'
  | 'claude-sonnet-4.5'
  | 'claude-opus-4.5'
  // Local models
  | 'local-model';

// ============================================================================
// Scraper Configuration
// ============================================================================

export type ScraperMode = 'local' | 'browserless' | 'scrapingbee';

export type BrowserEngine = 'patchright' | 'playwright';

// ============================================================================
// UI Configuration
// ============================================================================

export type PreviousUiMode = 'disable' | 'warn';

export type ReasoningDetailLevel = 'minimal' | 'standard' | 'verbose';

// ============================================================================
// Shopify Integration
// ============================================================================

export type ShopifyConnectionStatus = 'connected' | 'disconnected' | 'error';

// ============================================================================
// Admin Settings (matches Prisma schema)
// ============================================================================

export interface AdminSettings {
  id: string;
  // LLM Configuration
  llmProvider: LLMProvider;
  llmModel: LLMModel;
  lmStudioBaseUrl: string;
  // Mock Modes
  useMockScraper: boolean;
  useMockCalculator: boolean;
  useMockCheckout: boolean;
  useTavily: boolean;
  useGoogleShopping: boolean;  // Google Shopping 검색 (SerpAPI)
  // Debug & Auth
  debugMode: boolean;
  authMode: AuthMode;
  showDemoConversation: boolean;
  demoConversationData: JsonValue;
  // UI Preferences
  previousUiMode: PreviousUiMode;
  // Scraper Configuration
  scraperMode: ScraperMode;
  scraperSecondary: ScraperMode | null;
  scraperTertiary: ScraperMode | null;
  scraperMaxRetries: number;
  scraperAdaptiveLearning: boolean;
  scraperDomainConfig: JsonValue;
  scraperHeadless: boolean;
  scraperTimeoutMs: number;            // 요청 타임아웃 (ms)
  // Phase 4: Hybrid/Agentic Scraping
  enableHybridScraper: boolean;        // Static→Agentic fallback 활성화
  enableAdaptiveSelectors: boolean;    // LLM 기반 셀렉터 자동학습
  agenticMaxSteps: number;             // Agentic 모드 최대 스텝 수
  // Phase 5: Browser Engine & ariaSnapshot
  browserEngine: BrowserEngine;        // 브라우저 엔진 선택 (patchright | playwright)
  useAriaSnapshot: boolean;            // ariaSnapshot 사용 여부 (기본 OFF)
  // Chat Logging & Explainable AI
  enableChatLogging: boolean;
  showReasoningToUser: boolean;
  reasoningDetailLevel: ReasoningDetailLevel;
  // UI Element Visibility
  showQuickActions: boolean;          // Quick Action 버튼 표시 (기본 OFF)
  showAdminPanel: boolean;            // Floating Admin Panel 표시 (기본 OFF)
  showCacheStatusToAdmin: boolean;    // Admin에게 캐시 상태/새로고침 버튼 표시
  quickActionSections: string[];      // FloatingAdminPanel에 표시할 섹션 ID 목록

  // ═══════════════════════════════════════════════════════════════
  // Chat System Settings (Sprint 1-4)
  // ═══════════════════════════════════════════════════════════════
  requireGuestToken: boolean;              // Sprint 1.1: 게스트 토큰 필수 검증
  softDeleteRetentionDays: number;         // Sprint 1.4: Soft delete 보존 기간
  enableLlmFollowUps: boolean;             // Sprint 2.1: LLM 후속 질문 생성
  sessionRateLimitPerHour: number;         // Sprint 2.3: 세션 생성 제한
  messageRateLimitPerMinute: number;       // Sprint 2.3: 메시지 전송 제한
  enableConversationBranching: boolean;    // Sprint 3.1: 대화 분기
  enableContextCompression: boolean;       // Sprint 3.2: 컨텍스트 압축
  contextCompressionThreshold: number;     // Sprint 3.2: 압축 임계값
  enableResumableStreams: boolean;          // Sprint 4.1: SSE 스트림 재개
  enableLongTermMemory: boolean;           // Sprint 4.2: 장기 메모리
  enableDeepResearch: boolean;             // Experimental deep research fallback lane
  showDataSources: boolean;                // Sprint 4.3: 데이터 출처 표시
  enableInChatCheckout: boolean;           // Sprint 4.4: 인라인 결제

  // ═══════════════════════════════════════════════════════════════
  // Business Settings
  // SSoT: Access via lib/business/settings.ts Resolver functions
  // ═══════════════════════════════════════════════════════════════

  // 가격 설정
  serviceFeeRate: number;           // 서비스 수수료율 (0.10 = 10%)
  minOrderAmountUsd: number;        // 최소 주문 금액 (USD)
  maxOrderAmountUsd: number;        // 최대 주문 금액 (USD)

  // 환율 설정
  defaultExchangeRate: number;      // 기본 환율 (Fallback)

  // 배송 설정
  enabledCountries: string[];       // 활성화된 국가 코드 배열
  defaultProductWeightKg: number;   // 기본 상품 무게 (kg)
  maxProductWeightKg: number;       // 최대 배송 가능 무게 (kg)
  dimFactor: number;                // 부피 무게 계수 (K-Packet: 6000)

  // ═══════════════════════════════════════════════════════════════
  // Semantic Router Tuning (LLM 비용 최적화)
  // ═══════════════════════════════════════════════════════════════
  routerConfidenceSearch: number;      // 검색 의도 신뢰도
  routerConfidenceParseUrl: number;    // URL 파싱 신뢰도
  routerConfidenceCart: number;        // 장바구니 의도 신뢰도
  routerConfidenceCheckout: number;    // 체크아웃 신뢰도
  routerFallbackThreshold: number;     // 이 이하면 LLM fallback

  // ═══════════════════════════════════════════════════════════════
  // Tavily API Tuning
  // ═══════════════════════════════════════════════════════════════
  tavilyMaxQueries: number;         // 상품당 최대 쿼리 수
  tavilyTimeoutMs: number;          // 타임아웃 (ms)
  tavilyRetryAttempts: number;      // 재시도 횟수
  tavilyCacheDays: number;          // 캐시 유효기간 (일)

  // ═══════════════════════════════════════════════════════════════
  // Scraper Backend Scoring (Fallback Coordinator)
  // ═══════════════════════════════════════════════════════════════
  scraperPreferenceThreshold: number;   // 백엔드 선호도 임계값
  scraperSpeedWeight: number;           // 속도 가중치 (0-1)
  scraperMinAttemptsForScore: number;   // 스코어링 최소 시도 횟수

  // ═══════════════════════════════════════════════════════════════
  // Option Price Validation
  // ═══════════════════════════════════════════════════════════════
  optionPriceMinKrw: number;        // 옵션 가격 최소값 (원)
  optionPriceMaxKrw: number;        // 옵션 가격 최대값 (원)
  optionPriceMaxPct: number;        // 기본가 대비 최대 비율

  // ═══════════════════════════════════════════════════════════════
  // Shopify Integration (Option D - Hybrid Architecture)
  // ═══════════════════════════════════════════════════════════════
  shopifyEnabled: boolean;                // Shopify 연동 전체 on/off
  shopifyAutoSync: boolean;               // 스크래핑 시 자동 동기화
  shopifyConnectionStatus: ShopifyConnectionStatus;  // 연결 상태
  shopifyLastSyncAt: string | null;       // 마지막 동기화 시간 (ISO string)
  shopifyLastError: string | null;        // 마지막 에러 메시지
  shopifySyncedProductCount: number;      // 동기화된 상품 수
  shopifyCanonicalCount: number;          // Canonical 상품 그룹 수

  // ═══════════════════════════════════════════════════════════════
  // Cache TTL Settings
  // ═══════════════════════════════════════════════════════════════
  cacheExchangeRateTtlMin: number;        // 환율 캐시 TTL (분)
  cacheProductTtlHours: number;           // 상품 캐시 TTL (시간)
  cacheRatesTtlMin: number;               // 요율표 캐시 TTL (분)

  // ═══════════════════════════════════════════════════════════════
  // Dev Mode Settings (2-Phase Payment Flow Testing)
  // ═══════════════════════════════════════════════════════════════
  useMockPayment: boolean;           // Skip real PG, instant payment completion
  useMockWarehouse: boolean;         // Auto-generate warehouse measurement data
  autoAdvanceOrders: boolean;        // Auto-advance order through all states
  devAutoAdvanceDelayMs: number;     // Delay between auto-advances (default 5000)
  maintenanceMode: boolean;          // 서비스 점검 모드 (결제 차단)
}

/**
 * Partial settings returned to non-admin users
 * Only includes public information needed for auth flow and UI visibility
 */
export interface PublicSettings {
  authMode: AuthMode;
  showDemoConversation: boolean;
  showQuickActions: boolean;
  showAdminPanel: boolean;
}

/**
 * Settings with LLM fallback status (returned to admins)
 */
export interface AdminSettingsWithFallback extends AdminSettings {
  llmFallback?: {
    isActive: boolean;
    reason?: string;
    since?: string;
  };
  adminRole?: AdminRole;
}

// ============================================================================
// Pagination (shared across admin pages)
// ============================================================================

export interface PaginationData {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationData;
}

// ============================================================================
// Conversation Management
// ============================================================================

export interface Conversation {
  id: string;
  userId: string | null;
  title: string;
  messageCount: number;
  errorCount: number;
  llmCost: number;
  createdAt: string;
  updatedAt: string;
  hasErrors: boolean;
}

export interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
  metadata?: MessageMetadata;
}

export interface MessageMetadata {
  routerUsed?: string;
  routerConfidence?: number;
  actionType?: string;
  actionParams?: Record<string, unknown>;
  toolsUsed?: ToolUsage[];
  processingTimeMs?: number;
  success?: boolean;
  errorCode?: string;
  errorMessage?: string;
  guardrailWarnings?: string[];
  reasoning?: string;
}

export interface ToolUsage {
  tool?: string;
  action?: string;
  duration?: number;
}

export interface ConversationDetail {
  conversation: {
    id: string;
    userId: string | null;
    title: string;
    createdAt: string;
    updatedAt: string;
    metadata: unknown;
  };
  messages: ConversationMessage[];
  stats: {
    messageCount: number;
    totalCost: number;
    totalTokens: number;
    errorCount: number;
    avgProcessingTime: number;
  };
  llmUsage: {
    model: string;
    inputTokens: number;
    outputTokens: number;
    cost: number;
    createdAt: string;
  }[];
}

// ============================================================================
// Order Management
// ============================================================================

export interface Order {
  id: string;
  userId: string | null;
  status: OrderStatus;
  totalUsd: number;
  productName: string | null;
  productImage: string | null;
  createdAt: string;
  updatedAt: string;
}

export type OrderStatus =
  | 'PENDING'
  | 'PAID'
  | 'PROCESSING'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELLED';

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING: '대기',
  PAID: '결제완료',
  PROCESSING: '처리중',
  SHIPPED: '배송중',
  DELIVERED: '배송완료',
  CANCELLED: '취소됨',
};

export interface OrderDetail {
  id: string;
  quoteId: string;
  userId: string | null;
  status: OrderStatus;
  totalUsd: number;
  shippingCountry: string | null;
  shippingAddress: Record<string, string> | null;
  trackingNumber: string | null;
  shopifyOrderId: string | null;
  createdAt: string;
  updatedAt: string;
  priceBreakdown: PriceBreakdown;
  items: OrderItem[];
}

export interface OrderItem {
  id: string;
  name: string;
  imageUrl: string | null;
  priceKrw: number;
  quantity: number;
  options: Record<string, string> | null;
  sourceUrl: string | null;
}

/**
 * Order price breakdown for admin views
 * Different from lib/calculator/price.ts:PriceBreakdown which is for calculations
 */
export interface OrderPriceBreakdown {
  productPriceUsd: number;
  serviceFee: number;
  domesticShippingUsd: number;
  internationalShipping: number;
  customsDuty: number;
  vat: number;
  exchangeRate: number;
}

// @deprecated Use OrderPriceBreakdown instead (avoid conflict with calculator/price.ts)
export type PriceBreakdown = OrderPriceBreakdown;

// ============================================================================
// Chat Logs & Analytics
// ============================================================================

export interface ChatLog {
  id: string;
  sessionId: string;
  routerUsed: string | null;
  routerConfidence: number | null;
  actionType: string | null;
  actionParams: unknown;
  toolsUsed: unknown[];
  reasoning: string | null;
  processingTimeMs: number | null;
  success: boolean;
  errorCode: string | null;
  inputTokens: number | null;
  outputTokens: number | null;
  createdAt: string;
}

export interface ChatLogAggregates {
  totalLogs: number;
  actionDistribution: Record<string, number>;
  errorRate: number;
  avgProcessingTimeMs: number;
  routerUsageRate: Record<string, number>;
  topProductUrls: string[];
  successCount: number;
  failureCount: number;
}

// ============================================================================
// Dashboard Statistics
// ============================================================================

export interface DashboardStats {
  conversationCount: number;
  orderCount: number;
  totalRevenue: number;
  avgProcessingTime: number;
  recentActivity: ActivityItem[];
}

export interface ActivityItem {
  id: string;
  type: 'conversation' | 'order' | 'error';
  title: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// API Response Standardization
// ============================================================================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  pagination?: PaginationData;
}

// SSoT: ApiErrorResponse from lib/api/error-handler.ts
// Re-export for backward compatibility
export type { ApiErrorResponse } from '@/lib/api/error-handler';
