# Hybrid Logic Strategy for Korean E-commerce AI Shopping Agent

The optimal architecture for an AI shopping agent serving foreigners on Korean e-commerce sites requires a **tiered hybrid approach**: deterministic rules handle all price-critical operations (~80% of processing) while LLMs manage ambiguous content and user interactions (~20%), achieving **sub-$0.02 per interaction** with **<2 second latency**. This strategy eliminates hallucination risk for financial data while preserving natural language understanding where it matters most.

---

## Feature-by-feature decision matrix

### 1. HTML product data extraction

**Verdict: Hybrid (3-Tier Cascade) — 80% Rules, 20% LLM Fallback**

Korean e-commerce sites present unique extraction challenges: aggressive anti-bot systems (especially Naver, Coupang), legacy EUC-KR encoding on ~4% of sites, and heavily dynamic React/Vue SPAs. The optimal approach cascades through progressively more expensive methods.

| Tier | Method | When to Use | Speed | Cost |
|------|--------|-------------|-------|------|
| **1** | JSON-LD/Schema.org | First attempt for all pages | ~50ms | Free |
| **2** | Site-specific CSS selectors | When JSON-LD missing/incomplete | ~200ms | Free |
| **3** | LLM extraction (Claude Haiku) | Failed extraction or unknown sites | ~800ms | $0.005/page |

The extraction pipeline should check for Schema.org Product markup first—many Korean sites include this structured data. When that fails, site-specific selector configs for major platforms (Naver SmartStore, Coupang, Musinsa, Yes24) provide deterministic extraction. LLM fallback handles layout changes and new sites.

**Implementation architecture:**

```typescript
// 3-tier extraction with confidence scoring
async function extractProduct(url: string): Promise<ProductData> {
  // Tier 1: JSON-LD extraction (fastest, most reliable)
  const jsonLd = await extractJsonLd(url);
  if (jsonLd && validateSchema(jsonLd)) {
    return { ...jsonLd, source: 'json-ld', confidence: 0.95 };
  }
  
  // Tier 2: Site-specific selectors
  const site = detectSite(url); // naver | coupang | musinsa
  const selectorData = await extractWithSelectors(url, getSiteConfig(site));
  if (selectorData && validateSchema(selectorData)) {
    return { ...selectorData, source: 'selectors', confidence: 0.85 };
  }
  
  // Tier 3: LLM fallback (expensive but flexible)
  const cleanHtml = await sanitizeForLLM(url); // Reduces tokens by 70-90%
  return await extractWithLLM(cleanHtml);
}
```

**Tool recommendations for Node.js/TypeScript:**
- **Playwright** (primary): Superior TypeScript support, auto-waiting for SPAs, built-in Korean locale handling
- **iconv-lite + jschardet**: Essential for EUC-KR → UTF-8 conversion
- **Firecrawl** or **Claude 3.5 Haiku**: LLM extraction fallback
- **Korean residential proxies** (Bright Data, Oxylabs): Mandatory for Naver stores

---

### 2. Complex option mapping (including out-of-stock handling)

**Verdict: Hybrid — Rule-based Structure Detection + LLM Value Extraction**

Korean sites use complex nested option systems with specific terminology: **색상** (color), **사이즈** (size), **품절** (sold out), **추가금액** (additional price). Option structures follow predictable patterns, but value extraction from unstructured dropdowns benefits from LLM understanding.

**When rules suffice (80% of cases):**
- Standard select dropdowns with `data-*` attributes
- Button/chip-style options (Musinsa pattern)
- Clear stock indicators in class names (`.soldout`, `.disabled`)

**When LLM is necessary (20% of cases):**
- Options embedded in images without alt text
- Free-form text options (custom engraving, personalization)
- Complex conditional logic (size affects color availability)
- Price modifiers hidden in JavaScript calculations

**Recommended extraction pattern:**

```typescript
interface KoreanProductOption {
  optionType: '색상' | '사이즈' | 'custom';
  values: Array<{
    value: string;
    additionalPrice: number;
    stockStatus: 'IN_STOCK' | 'OUT_OF_STOCK' | 'LIMITED';
  }>;
}

async function extractOptions(page: Page): Promise<KoreanProductOption[]> {
  // Pattern 1: Select dropdowns (most common)
  const selectOptions = await page.$$eval('select[name*="option"]', selects => 
    selects.map(select => ({
      optionType: select.getAttribute('data-type') || 'custom',
      values: Array.from(select.options)
        .filter(opt => !opt.textContent?.includes('선택하세요'))
        .map(opt => ({
          value: opt.textContent?.trim(),
          additionalPrice: parseInt(opt.getAttribute('data-add-price') || '0'),
          stockStatus: opt.disabled || opt.textContent?.includes('품절') 
            ? 'OUT_OF_STOCK' : 'IN_STOCK'
        }))
    }))
  );
  
  // Pattern 2: Button chips (Musinsa style)  
  const chipOptions = await extractChipOptions(page);
  
  // Fallback: LLM extraction for complex cases
  if (selectOptions.length === 0 && chipOptions.length === 0) {
    return await extractOptionsWithLLM(await page.content());
  }
  
  return [...selectOptions, ...chipOptions];
}
```

**Critical validation layer:** Always fetch actual price after option selection (JavaScript price calculators are common) and compare against extracted values. Flag discrepancies for manual review rather than trusting LLM-extracted prices.

---

### 3. Shipping cost and customs duty calculation

**Verdict: 100% Rule-Based — Zero LLM Involvement**

This is the most critical system for accuracy. Shipping rates and customs duties involve deterministic calculations that LLMs will hallucinate. The **US eliminated its $800 de minimis exemption** on August 29, 2025—all shipments now require duty calculation, dramatically increasing this module's importance.

**Shipping calculation architecture:**

```
Product Weight/Dimensions → Carrier API Query → Rate Comparison → User Display
                                    ↓
                    [Korea Post | DHL | FedEx | UPS APIs]
```

**Recommended shipping APIs:**
- **AfterShip** or **Shippo**: Unified multi-carrier API, pre-negotiated rates (up to 80% discounts)
- **Korea Post EMS**: Direct integration for budget K-Packet option
- **EasyShip**: Address validation + HS code lookup included

**Customs duty calculation components:**

| Component | Approach | Data Source |
|-----------|----------|-------------|
| HS code classification | AI-assisted initial + rule validation | **Zonos Classify** (<100ms, 180+ countries) |
| Duty rate lookup | Pure rule-based | Country tariff schedules |
| De minimis check | Rule-based with country database | Maintained threshold table |
| Total landed cost | Deterministic calculation | Product price + shipping + duties + fees |

**Critical de minimis thresholds (2025):**

| Country | Threshold | Status |
|---------|-----------|--------|
| **USA** | **$0** | Eliminated Aug 2025 — all imports dutiable |
| EU | €150 (duty), €0 (VAT) | VAT always applies |
| UK | £135 | VAT collected at point of sale |
| Canada | C$20 (general) | USMCA exceptions exist |
| Australia | AUD $1,000 | GST collected at checkout |

**Implementation pattern for Supabase:**

```sql
-- Duty calculation lookup table
CREATE TABLE customs_rates (
  id UUID PRIMARY KEY,
  hs_code VARCHAR(10),
  destination_country CHAR(2),
  duty_rate DECIMAL(5,2),
  vat_rate DECIMAL(5,2),
  de_minimis_threshold DECIMAL(10,2),
  effective_date DATE,
  UNIQUE(hs_code, destination_country)
);

-- Calculate landed cost (pure SQL, no LLM)
CREATE FUNCTION calculate_landed_cost(
  product_price DECIMAL,
  shipping_cost DECIMAL,
  hs_code VARCHAR(10),
  destination CHAR(2)
) RETURNS TABLE (duty DECIMAL, vat DECIMAL, total DECIMAL);
```

**LLM involvement: None for calculations.** However, LLM can assist with:
- Explaining duty charges to users in natural language
- Classifying ambiguous products into HS code categories (with human validation)
- Parsing user questions about customs ("Will I pay tax on this?")

---

### 4. User intent classification

**Verdict: Hybrid Cascade — Fast Semantic Router (95%) + LLM Refinement (5%)**

Intent classification must be fast (<100ms) for good UX but accurate enough to route correctly. A two-stage cascade achieves both: semantic embedding similarity handles known intents instantly, while LLM processes ambiguous queries.

**Recommended intent taxonomy for shopping agent:**

| Intent | Example | Handler |
|--------|---------|---------|
| **direct_purchase** | "Buy this iPhone case" | Cart/checkout flow |
| **discovery** | "What's popular in K-beauty?" | Recommendation engine |
| **slot_filling** | "Under $50", "In blue" | Filter refinement |
| **product_info** | "Is this in stock?", "What sizes?" | Product detail lookup |
| **order_management** | "Track my order", "Return this" | Order system |
| **customs_inquiry** | "Will I pay tax?", "How much duty?" | Duty calculator |
| **fallback** | Unclear queries | LLM classification |

**Performance comparison:**

| Approach | Latency | Accuracy | Cost/1K queries |
|----------|---------|----------|-----------------|
| Keyword matching | ~1ms | 60-70% | Free |
| **Semantic Router** | ~20ms | 92-96% | ~$0.001 |
| LLM classification | ~800ms | 98%+ | ~$0.50 |
| **Hybrid cascade** | ~50ms avg | 95%+ | ~$0.03 |

**Implementation with Semantic Router pattern:**

```typescript
import { SemanticRouter } from 'semantic-router';

const router = new SemanticRouter({
  routes: [
    {
      name: 'direct_purchase',
      utterances: ['buy this', 'add to cart', 'purchase', '이거 살게요'],
      threshold: 0.85
    },
    {
      name: 'discovery', 
      utterances: ['recommend', 'popular', 'trending', 'best sellers'],
      threshold: 0.80
    },
    // ... other intents
  ]
});

async function classifyIntent(query: string): Promise<Intent> {
  const match = await router.match(query);
  
  if (match.confidence > 0.85) {
    return match.intent; // Fast path: ~20ms
  }
  
  // LLM fallback for ambiguous queries
  return await llmClassify(query); // Slow path: ~800ms
}
```

**Cost optimization:** Pre-encode all example utterances and store embeddings in Supabase pgvector. Runtime classification becomes a single vector similarity query—no LLM call needed for 95%+ of requests.

---

### 5. Trend-based product recommendation

**Verdict: RAG with Trend Injection — Not Fine-tuning**

Korean shopping trends change daily. Fine-tuning cannot keep pace and creates stale recommendations. RAG retrieves current trend data and injects it into the generation context, ensuring up-to-date recommendations without model retraining.

**Trend data sources for Korea:**

| Source | Data Type | Update Frequency | Access Method |
|--------|-----------|------------------|---------------|
| **Naver DataLab** | Search trends, shopping insights | Real-time | Official API |
| **Musinsa Rankings** | K-fashion bestsellers | Hourly | Scraping |
| **Olive Young** | K-beauty trends | Daily | Scraping |
| **Naver Shopping** | Category rankings | Real-time | API |

**RAG architecture for trend-aware recommendations:**

```
User Query → Embed → Retrieve Products → Enrich with Trends → LLM Generate → Response
                         ↓                      ↓
              [Product Vector DB]     [Trend Score Database]
```

**Trend-weighted retrieval scoring:**

```typescript
async function getRecommendations(query: string, userId?: string) {
  // 1. Semantic retrieval from product embeddings
  const semanticResults = await supabase.rpc('match_products', {
    query_embedding: await embed(query),
    match_count: 20
  });
  
  // 2. Fetch current trend scores
  const trendScores = await fetchTrendScores(semanticResults.map(r => r.category));
  
  // 3. Hybrid ranking with trend boost
  const ranked = semanticResults.map(product => ({
    ...product,
    finalScore: (product.similarity * 0.6) + 
                (trendScores[product.category] * 0.25) +
                (userId ? personalScore(userId, product) : 0) * 0.15
  })).sort((a, b) => b.finalScore - a.finalScore);
  
  // 4. Generate recommendation explanation with LLM
  return generateRecommendation(ranked.slice(0, 5), trendContext);
}
```

**Cold-start handling:**
- **New users**: Weight trends at 70%, category popularity at 30%
- **Returning users**: Personalization 60%, trends 40%
- **New products**: Use content-based features (brand, category, price range) for initial placement

**Embedding model recommendation:** **BAAI/bge-m3** achieves excellent Korean-English cross-lingual similarity (0.78-0.94 cosine) and supports 76 languages, ideal for multilingual expansion.

---

## Code architecture for hybrid rule+LLM systems

**Overall system architecture:**

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Next.js Frontend                              │
│              (React + Vercel AI SDK useChat hook)                   │
└────────────────────────────┬────────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────────┐
│                    Vercel Edge Functions                             │
│  ┌───────────────┐  ┌──────────────────┐  ┌─────────────────────┐  │
│  │ Intent Router │  │ Semantic Cache   │  │ Response Streaming  │  │
│  │ (Semantic)    │  │ Check (pgvector) │  │ (AI SDK)            │  │
│  └───────┬───────┘  └────────┬─────────┘  └─────────────────────┘  │
└──────────┼───────────────────┼──────────────────────────────────────┘
           │                   │
┌──────────▼───────────────────▼──────────────────────────────────────┐
│                         Supabase                                     │
│  ┌────────────────┐  ┌──────────────┐  ┌─────────────────────────┐  │
│  │ Products       │  │ LLM Cache    │  │ Customs Rates           │  │
│  │ (pgvector)     │  │ (semantic)   │  │ (deterministic)         │  │
│  └────────────────┘  └──────────────┘  └─────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────┘
           │
┌──────────▼───────────────────────────────────────────────────────────┐
│                    Processing Layer                                   │
│  ┌─────────────────┐  ┌──────────────────┐  ┌─────────────────────┐  │
│  │ Product         │  │ Shipping/Customs │  │ Recommendations     │  │
│  │ Extraction      │  │ Calculator       │  │ (RAG + Trends)      │  │
│  │ (Hybrid)        │  │ (100% Rules)     │  │                     │  │
│  └─────────────────┘  └──────────────────┘  └─────────────────────┘  │
└──────────────────────────────────────────────────────────────────────┘
           │
┌──────────▼────────────────────────────────────────────────────────────┐
│                       LLM Providers (Tiered)                          │
│   Simple tasks → GPT-4o Mini ($0.15/M) ←→ Complex → Claude Sonnet    │
└───────────────────────────────────────────────────────────────────────┘
```

**Key design patterns:**

1. **Never let LLMs generate prices/inventory** — These come from database queries only; LLMs format the response
2. **Semantic caching** — Store query embeddings + responses in pgvector; expect 60-80% cache hit rate
3. **Structured outputs everywhere** — Use Zod schemas with Vercel AI SDK for reliable JSON
4. **Edge-first routing** — Deploy intent classification on Vercel Edge for <50ms latency

---

## Cost-benefit tradeoff analysis

**Monthly cost projection (10,000 daily users, 5 interactions each):**

| Component | Approach | Monthly Cost |
|-----------|----------|--------------|
| Intent classification | Semantic router + 5% LLM | ~$45 |
| Product extraction | 80% rules, 20% LLM | ~$150 |
| Recommendations | RAG + trend injection | ~$200 |
| Shipping/customs | 100% rule-based | ~$20 (API fees) |
| LLM response generation | Tiered (80% Haiku, 20% Sonnet) | ~$350 |
| Semantic caching | pgvector in Supabase | Included |
| **Total** | | **~$765/month** |

**Comparison with LLM-only approach:** A pure LLM system handling all tasks would cost approximately **$2,500-4,000/month** for equivalent traffic—3-5x more expensive with higher latency and hallucination risk.

**Latency budget breakdown:**

| Stage | Target | Strategy |
|-------|--------|----------|
| Intent classification | <100ms | Semantic router on edge |
| Cache check | <50ms | pgvector similarity search |
| Data retrieval | <200ms | Supabase queries |
| LLM generation | <1,200ms | Streaming with fast models |
| **Total** | **<1,550ms** | Well under 2s target |

---

## Library and tool recommendations

**Core stack:**

| Category | Tool | Purpose |
|----------|------|---------|
| **Framework** | Next.js 14+ (App Router) | Full-stack React |
| **AI SDK** | Vercel AI SDK | Streaming, structured outputs, multi-provider |
| **Vector DB** | Supabase pgvector | Embeddings, semantic cache |
| **Browser automation** | Playwright | Korean site scraping |
| **Encoding** | iconv-lite + jschardet | EUC-KR handling |
| **Validation** | Zod | Schema validation for LLM outputs |
| **Shipping API** | Shippo or AfterShip | Multi-carrier rates |
| **HS Classification** | Zonos Classify | AI-assisted customs codes |
| **Embeddings** | BAAI/bge-m3 | Multilingual Korean support |
| **Trends** | Naver DataLab API | Korean shopping trends |

**LLM provider selection:**

| Task Type | Model | Reasoning |
|-----------|-------|-----------|
| High-volume, simple | GPT-4o Mini | $0.15/M, fast, adequate quality |
| Product extraction | Claude 3.5 Haiku | Better at structured extraction |
| Complex reasoning | Claude 3.5 Sonnet | Highest accuracy when needed |
| Translation | GPT-4o or bge-m3 | Excellent multilingual |

---

## Implementation roadmap

**Phase 1 (Weeks 1-4): Core extraction and rules**
- Implement 3-tier product extraction pipeline
- Build site-specific selector configs for top 5 Korean sites
- Deploy shipping/customs calculation module (100% rule-based)
- Set up Supabase pgvector for product embeddings

**Phase 2 (Weeks 5-8): Intelligence layer**
- Implement semantic router for intent classification
- Build RAG recommendation system with trend injection
- Add semantic caching for LLM responses
- Integrate Naver DataLab API for trends

**Phase 3 (Weeks 9-12): Optimization and expansion**
- Fine-tune similarity thresholds for caching
- Implement tiered model routing
- Add Chinese/Japanese language support
- Build monitoring dashboard for cost/latency tracking

The hybrid approach delivers the reliability required for e-commerce (zero price hallucination, accurate customs) while leveraging LLM capabilities for natural language understanding and complex content extraction—achieving production-grade performance at sustainable cost.