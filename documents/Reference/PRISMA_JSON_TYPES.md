# Prisma Json 타입 처리 가이드

> 🔄 **v6.0 추가 타입** (2026-04-15):
>
> ```ts
> // Product.internalMetadata
> type InternalMetadata = {
>   maxBenefit?: {
>     priceKrw: number;
>     method: 'CARD' | 'COUPON' | 'EVENT' | 'MEMBERSHIP';
>     methodDetail?: string;
>     url?: string;
>     rewardPoints?: { type: string; rate?: number; amount?: number; conditions?: string };
>     observedAt: string;
>   };
>   crossPlatform?: Array<{ platform: string; url: string; priceKrw: number; observedAt: string }>;
>   dg?: { class: string; un: string };
>   inspection?: { authority: string; required: boolean };
> };
>
> // LineItem (invoice 라인 분리)
> type LineItem = {
>   id: string;
>   hsCode: string;
>   origin: ISO2;
>   description: string;
>   unitPriceKrw: number;
>   quantity: number;
>   dgClass?: string;
>   inspectionRequired?: boolean;
> };
> ```
>
> 🔄 **Policy Integration 추가 타입** (2026-04-16):
>
> ```ts
> // Quote.exchangeRateSnapshot / Order.exchangeRateSnapshot
> type ExchangeRateSnapshot = {
>   from: 'KRW';
>   to: string;           // presentment currency code
>   shinhanRate: number;
>   adminAdjustment: number;
>   effectiveRate: number;
>   capturedAt: string;   // ISO
>   expiresAt: string;    // ISO (capturedAt + 24h)
>   source: 'SHINHAN_BANK_10AM' | 'MANUAL' | 'FALLBACK_KEXIM';
> };
>
> // Order.inspectionSelections
> type InspectionSelections = Record<string, 'BASIC' | 'DETAIL'>;  // sellerCode → level
>
> // Order.fees (USD)
> type OrderFees = {
>   paymentAndProxyFeeKrw: number;   // 10% of (A+B+D)
>   inspectionFeesUsd: number;       // $7 × detail seller count
>   cancellationFeeUsd?: number;     // $5 if canceled Stage 2
>   returnFeeUsd?: number;           // $10 if returned
> };
>
> // InspectionResponse.findings
> type InspectionFindings = {
>   photos: string[];
>   notes: string;
>   severity: 'MINOR' | 'MAJOR' | 'BLOCKING';
>   inspectedBy: string;   // operator userId
>   inspectedAt: string;
> };
>
> // AbandonmentLog 비용 구조
> type AbandonmentCosts = {
>   reshipCostUsd: number;
>   reinspectionFeeKrw: number;
>   sellerReturnFeeKrw: number;
>   productValueKrw: number;
>   thresholdCoefficient: number;
> };
> ```

## 문제의 근본 원인

Prisma의 Json 타입과 TypeScript의 일반 객체 타입이 직접 호환되지 않아 발생하는 타입 에러입니다.

### Prisma Json 타입 시스템

Prisma는 JSON 필드를 위해 두 가지 타입을 제공합니다:

1. **`Prisma.JsonValue`** - 읽기 전용 (데이터 조회 시)
2. **`Prisma.InputJsonValue`** - 쓰기용 (create, update 시)
3. **`Prisma.JsonNull`** - null 값 표현

```typescript
type InputJsonValue =
  | string
  | number
  | boolean
  | null
  | InputJsonObject
  | InputJsonArray

type InputJsonObject = { [key: string]: InputJsonValue }
type InputJsonArray = InputJsonValue[]
```

### 왜 에러가 발생하는가?

1. **재귀적 타입 정의**: `InputJsonValue`가 재귀적으로 정의되어 있어 TypeScript가 자동으로 타입 변환을 하지 못함
2. **구조적 타입 호환성 부족**: TypeScript의 `Record<string, string>` 같은 타입이 재귀적 JsonValue 타입과 구조적으로 호환되지 않음
3. **타입 안전성**: Prisma가 런타임에 안전한 JSON 직렬화를 보장하기 위해 엄격한 타입 체크를 요구함

## 해결 방법

### 1. Double Cast 패턴 (권장)

Json 값을 저장할 때는 항상 **double cast** 패턴을 사용하세요:

```typescript
// ❌ 잘못된 방법 - 타입 에러 발생
await prisma.cartItem.create({
  data: {
    selectedOptions: options.selectedOptions, // Type error!
  },
});

// ✅ 올바른 방법 - double cast
await prisma.cartItem.create({
  data: {
    selectedOptions: options.selectedOptions as unknown as Prisma.InputJsonValue,
  },
});
```

### 2. Null 값 처리

Json 필드에 null을 저장할 때는 `Prisma.JsonNull`을 사용하세요:

```typescript
// ❌ 잘못된 방법
selectedOptions: null, // DB에 제대로 저장되지 않을 수 있음

// ✅ 올바른 방법
selectedOptions: Prisma.JsonNull,
```

### 3. Filter 조건 (where 절)

Json 필드를 비교할 때는 `equals` 연산자와 함께 사용:

```typescript
// ❌ 잘못된 방법
where: {
  selectedOptions: options.selectedOptions, // Type error!
}

// ✅ 올바른 방법 - null이 아닌 경우
where: {
  selectedOptions: {
    equals: options.selectedOptions as unknown as Prisma.InputJsonValue
  }
}

// ✅ 올바른 방법 - null인 경우
where: {
  selectedOptions: {
    equals: Prisma.JsonNull
  }
}
```

### 4. 조건부 Json 값 처리

옵셔널한 Json 값을 처리할 때:

```typescript
await prisma.cartItem.create({
  data: {
    selectedOptions: options?.selectedOptions
      ? (options.selectedOptions as unknown as Prisma.InputJsonValue)
      : Prisma.JsonNull,
  },
});
```

## 실제 예제

### lib/cart/service.ts:84-86

```typescript
const existingItem = await prisma.cartItem.findFirst({
  where: {
    cartId: cart.id,
    sourceUrl: product.sourceUrl,
    selectedOptions: options?.selectedOptions
      ? { equals: options.selectedOptions as unknown as Prisma.InputJsonValue }
      : { equals: Prisma.JsonNull },
  },
});
```

### lib/cart/service.ts:107

```typescript
await prisma.cartItem.create({
  data: {
    // ... 다른 필드들
    selectedOptions: options?.selectedOptions
      ? (options.selectedOptions as unknown as Prisma.InputJsonValue)
      : Prisma.JsonNull,
  },
});
```

## 스키마에서 Json 사용하는 필드들

현재 프로젝트에서 Json 타입을 사용하는 필드들:

1. `ScrapeRequest.parsedData: Json?` - 스크래핑 결과 원본 데이터
2. `Product.options: Json?` - 상품 옵션 (색상, 사이즈 등)
3. `Product.dimensions: Json?` - 상품 크기 정보
4. `Quote.destinationAddress: Json` - 배송 주소
5. `ChatSession.context: Json?` - 대화 컨텍스트
6. `ChatSession.lastSearchResults: Json?` - 마지막 검색 결과
7. `CartItem.selectedOptions: Json?` - 선택된 옵션

## 예방 가이드라인

### ✅ Do

- Json 필드에 값을 저장할 때는 **항상** `as unknown as Prisma.InputJsonValue` 사용
- null 값은 `Prisma.JsonNull` 사용
- where 절에서 Json 비교 시 `equals` 연산자 사용
- 읽어온 Json 값을 사용할 때는 타입 가드 또는 런타임 검증 추가

### ❌ Don't

- `as Prisma.InputJsonValue` 직접 캐스팅 (에러 발생)
- Json 필드에 `null` 직접 할당
- where 절에서 Json 값을 직접 비교
- Json 값을 읽어서 타입 검증 없이 사용

## 트러블슈팅

### 빌드 에러가 발생하면?

1. `prisma generate` 실행했는지 확인
2. `@prisma/client` import 확인
3. Json 필드 사용하는 곳에서 double cast 패턴 사용했는지 확인
4. null 값 처리에 `Prisma.JsonNull` 사용했는지 확인

### 여전히 타입 에러가 발생하면?

```bash
# Prisma client 재생성
npx prisma generate

# TypeScript 캐시 클리어 (VSCode)
# Cmd+Shift+P -> "TypeScript: Restart TS Server"

# node_modules 재설치 (최후의 수단)
rm -rf node_modules .next
npm install
```

## 참고 자료

- [Prisma Json Fields](https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields)
- [Prisma InputJsonValue Type](https://www.prisma.io/docs/reference/api-reference/prisma-client-reference#inputjsonvalue)
