/**
 * Admin Settings Cache - Singleton Implementation
 *
 * Centralizes the settings caching logic that was previously duplicated in:
 * - app/api/admin-settings/route.ts
 * - lib/agent/llm-client.ts
 * - lib/scraper/fetcher/index.ts
 *
 * Features:
 * - 5-second TTL for performance (reduces DB calls)
 * - Thread-safe singleton pattern
 * - Manual invalidation support
 * - Default settings fallback
 *
 * @module lib/admin/cache
 */

import { prisma } from '@/lib/db/prisma';
import { Prisma } from '@prisma/client';
import type { AdminSettings, AuthMode, BrowserEngine, ScraperMode, ReasoningDetailLevel, ShopifyConnectionStatus } from './types';
import {
  FALLBACK_SERVICE_FEE_RATE,
  FALLBACK_MIN_ORDER_USD,
  FALLBACK_MAX_ORDER_USD,
  FALLBACK_EXCHANGE_RATE,
  FALLBACK_ENABLED_COUNTRIES,
  FALLBACK_DEFAULT_PRODUCT_WEIGHT_KG,
  FALLBACK_MAX_PRODUCT_WEIGHT_KG,
  FALLBACK_DIM_FACTOR,
  ADMIN_SETTINGS_CACHE_TTL_MS,
} from '@/lib/constants/business';

// ============================================================================
// Default Settings (Single Source of Truth)
// ============================================================================

export const DEFAULT_ADMIN_SETTINGS: Omit<AdminSettings, 'id'> = {
  // LLM Configuration
  llmProvider: 'gemini',
  llmModel: 'local-model', // Inactive legacy database field.
  lmStudioBaseUrl: 'http://127.0.0.1:1234/v1',
  // Mock Modes
  useMockScraper: false,
  useMockCalculator: false,
  useMockCheckout: false,
  useTavily: false,
  useGoogleShopping: false,  // Google Shopping off by default (requires SerpAPI key)
  // Debug & Auth
  debugMode: false,
  authMode: 'LOGIN_REQUIRED' as AuthMode,
  showDemoConversation: false,
  demoConversationData: null,
  // UI Preferences
  previousUiMode: 'disable',
  // Scraper Configuration
  scraperMode: 'local' as ScraperMode,
  scraperSecondary: null,
  scraperTertiary: null,
  scraperMaxRetries: 3,
  scraperAdaptiveLearning: true,
  scraperDomainConfig: null,
  scraperHeadless: true,
  scraperTimeoutMs: 30000,  // 30초
  // Phase 4: Hybrid/Agentic Scraping
  enableHybridScraper: false,         // 기본 비활성화 (gradual rollout)
  enableAdaptiveSelectors: false,     // 기본 비활성화
  agenticMaxSteps: 10,
  // Phase 5: Browser Engine & ariaSnapshot
  browserEngine: 'patchright' as BrowserEngine,  // 기본 엔진 (봇 감지 우회)
  useAriaSnapshot: false,                         // 기본 비활성화 (한국 이커머스 ARIA 지원 부족)
  // Chat Logging & Explainable AI
  enableChatLogging: false,
  showReasoningToUser: false,  // 기본 ON으로 변경 (Explainable AI)
  reasoningDetailLevel: 'minimal' as ReasoningDetailLevel,
  // UI Element Visibility
  showQuickActions: false,    // Quick Action 버튼 표시 (기본 OFF)
  showAdminPanel: false,      // Floating Admin Panel 표시 (기본 OFF)
  showCacheStatusToAdmin: true, // Admin에게 캐시 상태/새로고침 버튼 표시 (기본 ON)
  quickActionSections: ['llm', 'features'], // FloatingAdminPanel에 기본 표시할 섹션
  // Chat System Settings (Sprint 1-4)
  requireGuestToken: false,
  softDeleteRetentionDays: 30,
  enableLlmFollowUps: false,
  sessionRateLimitPerHour: 10,
  messageRateLimitPerMinute: 30,
  enableConversationBranching: false,
  enableContextCompression: false,
  contextCompressionThreshold: 20,
  enableResumableStreams: false,
  enableLongTermMemory: false,
  enableDeepResearch: false,
  showDataSources: false,
  enableInChatCheckout: false,
  // Business Settings (초기값 - DB 레코드 생성 시에만 사용)
  serviceFeeRate: FALLBACK_SERVICE_FEE_RATE,
  minOrderAmountUsd: FALLBACK_MIN_ORDER_USD,
  maxOrderAmountUsd: FALLBACK_MAX_ORDER_USD,
  defaultExchangeRate: FALLBACK_EXCHANGE_RATE,
  enabledCountries: FALLBACK_ENABLED_COUNTRIES,
  defaultProductWeightKg: FALLBACK_DEFAULT_PRODUCT_WEIGHT_KG,
  maxProductWeightKg: FALLBACK_MAX_PRODUCT_WEIGHT_KG,
  dimFactor: FALLBACK_DIM_FACTOR,
  // Router Tuning
  routerConfidenceSearch: 0.75,
  routerConfidenceParseUrl: 0.85,
  routerConfidenceCart: 0.80,
  routerConfidenceCheckout: 0.80,
  routerFallbackThreshold: 0.70,
  // Tavily API Tuning
  tavilyMaxQueries: 3,
  tavilyTimeoutMs: 10000,
  tavilyRetryAttempts: 2,
  tavilyCacheDays: 7,
  // Scraper Backend Scoring
  scraperPreferenceThreshold: 0.7,
  scraperSpeedWeight: 0.2,
  scraperMinAttemptsForScore: 3,
  // Option Price Validation
  optionPriceMinKrw: 100,
  optionPriceMaxKrw: 500000,
  optionPriceMaxPct: 0.5,
  // Shopify Integration
  shopifyEnabled: false,
  shopifyAutoSync: false,
  shopifyConnectionStatus: 'disconnected' as ShopifyConnectionStatus,
  shopifyLastSyncAt: null,
  shopifyLastError: null,
  shopifySyncedProductCount: 0,
  shopifyCanonicalCount: 0,
  // Cache TTL Settings
  cacheExchangeRateTtlMin: 60,     // 1시간
  cacheProductTtlHours: 24,        // 24시간
  cacheRatesTtlMin: 5,             // 5분
  // Dev Mode Settings
  useMockPayment: false,
  useMockWarehouse: false,
  autoAdvanceOrders: false,
  devAutoAdvanceDelayMs: 5000,
  maintenanceMode: false,
};

// ============================================================================
// Cache Implementation
// ============================================================================

interface CacheEntry {
  data: AdminSettings;
  timestamp: number;
}

// SSoT: ADMIN_SETTINGS_CACHE_TTL_MS from lib/constants/business.ts
const CACHE_TTL = ADMIN_SETTINGS_CACHE_TTL_MS;

/** Singleton cache instance */
let cache: CacheEntry | null = null;

function isAdminSettingsSchemaMismatch(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return error.code === 'P2022' || error.code === 'P2010';
  }
  return false;
}

/**
 * Get admin settings with caching
 *
 * - Returns cached value if within TTL
 * - Fetches from DB and updates cache if expired
 * - Creates default settings if none exist
 *
 * @returns AdminSettings object
 */
export async function getAdminSettings(): Promise<AdminSettings> {
  const now = Date.now();

  // Return cached value if fresh
  if (cache && now - cache.timestamp < CACHE_TTL) {
    return cache.data;
  }

  // Fetch from database
  let settings = null;
  try {
    settings = await prisma.adminSettings.findFirst();
  } catch (error) {
    if (!isAdminSettingsSchemaMismatch(error)) {
      throw error;
    }

    const rows = await prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
      'SELECT * FROM "admin_settings" LIMIT 1'
    );
    const legacyRow = rows[0];
    if (legacyRow) {
      settings = {
        ...DEFAULT_ADMIN_SETTINGS,
        ...legacyRow,
        enableDeepResearch: false,
      } as unknown as AdminSettings;
    }
  }

  // Create default settings if none exist
  if (!settings) {
    settings = await prisma.adminSettings.create({
      data: {
        ...DEFAULT_ADMIN_SETTINGS,
        // Cast JSON fields for Prisma compatibility
        demoConversationData: DEFAULT_ADMIN_SETTINGS.demoConversationData as never,
        scraperDomainConfig: DEFAULT_ADMIN_SETTINGS.scraperDomainConfig as never,
      },
    });
  }

  // Update cache
  cache = {
    data: settings as AdminSettings,
    timestamp: now,
  };

  return settings as AdminSettings;
}

/**
 * Invalidate the settings cache
 *
 * Call this after updating settings to ensure next read gets fresh data.
 * Automatically called by updateAdminSettings().
 */
export function invalidateAdminSettingsCache(): void {
  cache = null;
}

/**
 * Update admin settings and invalidate cache
 *
 * @param id - Settings record ID
 * @param updates - Partial settings to update
 * @returns Updated settings
 */
export async function updateAdminSettings(
  id: string,
  updates: Partial<Omit<AdminSettings, 'id'>>
): Promise<AdminSettings> {
  const settings = await prisma.adminSettings.update({
    where: { id },
    // eslint-disable-next-line
    data: updates as unknown as Parameters<typeof prisma.adminSettings.update>[0]['data'],
  });

  // Invalidate cache to ensure fresh data on next read
  invalidateAdminSettingsCache();

  return settings as unknown as AdminSettings;
}
