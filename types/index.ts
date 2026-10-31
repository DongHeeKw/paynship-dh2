// Product Types
export interface ScrapedProduct {
  name: string;
  imageUrl: string;
  priceKrw: number;
  salePriceKrw?: number;
  category: string;
  options?: ProductOption[];
  weightKg: number;
  dimensions?: { l: number; w: number; h: number };
  domesticShipping: number;
  sourceUrl: string;
  hsCode?: string;
  // Optional metadata from structured data extraction
  description?: string;
  brand?: string;
  rating?: number;
  reviewCount?: number;
  inStock?: boolean;
  // Phase 3: Tavily Enrichment fields
  material?: string;     // 재질 (e.g., "Cotton 95%, Spandex 5%")
  origin?: string;       // 원산지 (e.g., "South Korea", "China")
  enrichmentSource?: 'scraper' | 'tavily' | 'manual';
  // Phase 4: Data Source Tracking
  dataSources?: ProductDataSources;      // 각 필드별 출처 추적
  overallConfidence?: number;            // 전체 신뢰도 (0-1)
}

export interface ProductOption {
  name: string;
  type: 'select' | 'color' | 'size' | string;  // Allow custom option types from LLM parsing
  values: ProductOptionValue[];
  required: boolean;
}

export interface ProductOptionValue {
  label: string;
  value: string;
  priceAdjustment?: number; // KRW price difference from base price
  stock?: number;
  disabled?: boolean;
}

// Quote Types
export interface QuoteBreakdown {
  productPrice: { krw: number; usd: number };
  serviceFee: number;
  domesticShipping: number;
  internationalShipping: number;
  customsDuty: number;
  vat: number;
  total: number;
  exchangeRate: number;
  validUntil: Date;
}

export interface Address {
  line1: string;
  line2?: string;
  city: string;
  state?: string;
  postalCode: string;
  country: string;
}

// Chat Types
export type ChatStep =
  | 'initial'
  | 'browsing'           // 상품 탐색 중
  | 'url_submitted'
  | 'scraping'
  | 'product_viewing'    // 상품 상세 보기
  | 'product_confirmed'
  | 'product_selected'   // 검색 결과에서 상품 선택
  | 'option_selecting'   // 옵션 선택 중
  | 'member_selection'
  | 'cart_managing'      // 장바구니 관리
  | 'address_input'
  | 'calculating'
  | 'quote_review'       // 견적 확인
  | 'quote_generated'    // 견적 생성됨
  | 'quote_shown'
  | 'payment_pending'    // 결제 대기
  | 'checkout'
  | 'checkout_ready'     // 체크아웃 준비됨
  | 'order_confirmed'    // 주문 완료
  | 'error';

export interface ChatMessage {
  id: string;
  sender: 'user' | 'bot';
  content: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export type ProductTaskState =
  | 'preview'
  | 'queued'
  | 'processing'
  | 'evidence_partial'
  | 'quote_ready'
  | 'failed'
  | 'cancelled'
  | 'unknown';

// Product summary for context storage
export interface ProductSummary {
  id?: string;
  name: string;
  imageUrl?: string;
  priceKrw: number;
  priceUsd: number;
  sourceUrl: string;
  category?: string;
}

export interface ChatContext {
  step: ChatStep;

  // 상품 관련
  scrapeRequestId?: string;
  productTaskId?: string;
  productTaskState?: ProductTaskState;
  quoteReady?: boolean;
  productId?: string;
  lastViewedProduct?: ProductSummary;

  // 검색/추천 관련
  lastSearchQuery?: string;
  lastSearchResults?: ProductSummary[];

  // 장바구니 관련
  cartId?: string;
  cartItemCount?: number;

  // 견적/결제 관련
  quoteId?: string;
  selectedAddress?: Address;

  // 주문 관련
  orderId?: string;
  orderNumber?: string;
}

// UI Component Types (for LLM responses)
export interface UIComponent {
  type: 'product_grid' | 'product_card' | 'cart_panel' | 'action_buttons' | string;
  data?: {
    products?: GridProduct[];
    cart?: Cart;
    buttons?: ActionButton[];
    query?: string;
    [key: string]: unknown;
  };
}

export interface GridProduct {
  id: string;
  name: string;
  imageUrl: string;
  priceKrw: number;
  priceUsd?: number;
  category: string;
  weightKg?: number;
  platform?: string;
  sourceUrl?: string;
}

export interface ActionButton {
  label: string;
  action?: string;
  query?: string;
  /** Translation key for i18n (e.g., 'addToCart') */
  translationKey?: keyof import('@/lib/i18n/translations').Translations['actions'];
}

// Current Product (used in chat interface)
export interface CurrentProduct {
  id: string;
  name: string;
  imageUrl: string;
  priceKrw: number;
  salePriceKrw?: number;
  category: string;
  weightKg?: number;  // Use weightKg consistently (not weight)
  sourceUrl?: string;
  options?: ProductOption[];
  domesticShipping?: number;
  dimensions?: { l: number; w: number; h: number };
  hsCode?: string;
  origin?: string;
  material?: string;
  dataSources?: ProductDataSources;
  overallConfidence?: number;
  _isPreview?: boolean;
  _scrapeStatus?: 'pending' | 'processing' | 'ready' | 'failed' | 'cancelled';
  _scrapeMessage?: string;
  _taskState?: 'preview' | 'queued' | 'processing' | 'evidence_partial' | 'quote_ready' | 'failed' | 'cancelled' | 'unknown';
  _quoteReady?: boolean;
  _taskMissingFields?: string[];
}

// Agent Response Types
export interface AgentResponse {
  content: string;
  nextAction?: 'poll_scrape_result' | 'show_address_form' | 'show_cart' | string;
  uiComponents?: UIComponent[];
  context?: {
    lastSearchResults?: ProductSummary[];
    lastSearchQuery?: string;
    [key: string]: unknown;
  };
}

// Thinking Indicator Types (for agent status display)
export type ThinkingStatus = 'idle' | 'thinking' | 'processing' | 'complete' | 'error';

export interface ProcessingStep {
  id: string;
  label: string;         // Korean label (e.g., "상품 검색 중...")
  status: 'pending' | 'in_progress' | 'completed' | 'error';
  startTime?: number;    // Timestamp when step started
}

export type IntentType = 'general' | 'search' | 'scrape' | 'cart' | 'checkout' | 'qna';

// Data Source Types - 각 필드가 어디서 왔는지 추적
export type DataSourceType =
  | 'estimated'    // 카테고리 기반 추정
  | 'extracted'    // HTML에서 직접 추출
  | 'enriched'     // Tavily 웹검색으로 보강
  | 'classified'   // LLM 분류 (HS Code 등)
  | 'vision'       // Vision OCR (이미지에서 추출)
  | 'manual'       // 관리자 수동 입력
  | 'api';         // 쇼핑몰 API에서 추출

export interface DataSource {
  type: DataSourceType;
  confidence: number;        // 신뢰도 (0-1), required
  detail?: string;           // 상세 설명 (예: "패션 카테고리 평균")
  url?: string;              // 출처 URL (Tavily 검색 결과 등)
  extractedAt?: string;      // ISO timestamp
}

// Product Data Sources - 상품 각 필드별 출처 추적
export interface ProductDataSources {
  weight: DataSource;
  hsCode: DataSource;
  dimensions?: DataSource;
  material?: DataSource;
  origin?: DataSource;
  domesticShipping?: DataSource;
  options?: DataSource;
}

// Default confidence values by source type
export const SOURCE_CONFIDENCE: Record<DataSourceType, number> = {
  extracted: 0.90,
  api: 0.95,
  enriched: 0.75,
  classified: 0.70,
  vision: 0.65,
  manual: 1.0,
  estimated: 0.30,
};

// Cart Types
export interface CartItem {
  id: string;
  productId?: string;
  name: string;
  imageUrl?: string;
  priceKrw: number;
  priceUsd: number;
  sourceUrl: string;
  category: string;
  weightKg: number;
  selectedOptions?: Record<string, string>;
  optionPriceAdjustment: number;
  quantity: number;
  // Shipping-related fields (expandable detail)
  dimensions?: { l: number; w: number; h: number };
  hsCode?: string;
  origin?: string;
  material?: string;
  // Source tracking for each field
  dataSources?: {
    weight?: DataSource;
    dimensions?: DataSource;
    hsCode?: DataSource;
    origin?: DataSource;
    material?: DataSource;
    domesticShipping?: DataSource;
  };
}

export interface Cart {
  id: string;
  userId?: string;
  guestToken?: string;
  items: CartItem[];
  subtotalKrw: number;
  subtotalUsd: number;
  itemCount: number;
}

/** Identifies who owns the cart: logged-in user or guest */
export type CartOwner = { userId: string } | { guestToken: string };
