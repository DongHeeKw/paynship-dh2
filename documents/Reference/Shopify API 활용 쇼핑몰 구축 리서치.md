# **크로스보더 프록시(Proxy) 커머스 플랫폼 구축을 위한 Shopify Admin GraphQL API 심층 기술 분석 및 구현 전략 보고서**

## **1\. 서론: 헤드리스(Headless) 아키텍처 기반의 프록시 쇼핑 모델**

글로벌 이커머스 시장에서 국가 간 장벽을 허무는 크로스보더 거래(Cross-Border Trade, CBT)는 단순히 상품을 판매하는 것을 넘어, 현지의 복잡한 구매 절차를 대행하고 물류와 통관을 원스톱으로 해결하는 '프록시 쇼핑(Proxy Shopping)' 모델로 진화하고 있습니다. 귀사께서 추진 중인 프로젝트는 외국인 사용자가 한국 쇼핑몰의 URL만을 입력하면, 시스템이 자동으로 정보를 추출(Scraping)하고, 관세 및 배송비를 동적으로 계산하여 결제를 유도한 후, 실제 구매 대행 및 배송까지 책임지는 고도화된 서비스입니다. 이러한 비즈니스 로직은 전통적인 재고 기반의 쇼핑몰과는 근본적으로 다른 시스템 아키텍처를 요구합니다.

일반적인 쇼핑몰이 사전에 정의된 상품(Catalog)을 정해진 가격에 판매하는 정적 모델이라면, 본 프로젝트는 사용자의 요청 시점에 상품이 생성되고, 무게와 환율, 관세율에 따라 가격이 유동적으로 변하며, 실제 재고가 내부 창고가 아닌 외부 벤더에게 존재하는 동적 모델입니다. 이러한 요구사항을 충족하기 위해 Shopify를 단순한 쇼핑몰 호스팅 솔루션이 아닌, 강력한 백엔드 엔진으로 활용하는 '헤드리스 커머스(Headless Commerce)' 전략이 필수적입니다.

특히, Shopify의 Admin API, 그중에서도 GraphQL API는 이러한 복잡한 데이터 관계와 트랜잭션을 처리하는 데 있어 핵심적인 역할을 수행합니다. REST API가 가진 과도한 네트워크 요청(Over-fetching)과 복잡한 관계형 데이터 처리의 한계를 극복하고, 단일 요청으로 상품 생성, 메타필드 설정, 변형(Variant) 관리를 동시에 수행할 수 있는 GraphQL은 본 프로젝트의 성패를 가를 기술적 기반입니다.

본 보고서는 귀사의 내부 어드민 시스템과 Shopify 백엔드 간의 연동을 위한 API 활용 방안을 상품 등록, 주문 및 가격 책정, 결제 처리, 배송 및 물류 관리의 네 가지 핵심 도메인으로 나누어 심층 분석합니다. 각 단계별로 참고해야 할 공식 문서와 구체적인 구현 전략, 그리고 발생 가능한 기술적 이슈와 해결 방안을 망라하여, 개발팀이 즉각적으로 활용할 수 있는 수준의 기술 가이드를 제공하는 것을 목표로 합니다.

## ---

**2\. 동적 상품 등록 및 카탈로그 관리 아키텍처**

프록시 쇼핑의 첫 단계는 사용자가 입력한 외부 쇼핑몰의 URL을 Shopify 내부의 '구매 가능한 상품'으로 변환하는 과정입니다. 이 과정에서 가장 중요한 기술적 과제는 실시간성을 보장하면서도 중복 생성을 방지하고, 외부 데이터(URL, 원화 가격 등)를 Shopify의 데이터 스키마에 효율적으로 매핑하는 것입니다.

### **2.1 GraphQL 기반의 상품 생성 (productCreate)**

Shopify에서 상품을 생성하는 가장 기본적인 행위는 productCreate 뮤테이션(Mutation)을 통해 이루어집니다. REST API 시절에는 상품을 생성하고, 이미지를 업로드하고, 변형(Variant)을 추가하기 위해 여러 번의 API 호출이 필요했으나, GraphQL을 사용하면 이 모든 과정을 하나의 요청으로 처리할 수 있습니다. 이는 사용자가 URL을 입력하고 채팅창에서 결과를 기다리는 짧은 시간(Latency)을 최소화하는 데 결정적인 이점을 제공합니다.

귀사의 어드민 시스템은 스크래핑 엔진이 추출한 데이터를 바탕으로 ProductCreateInput 객체를 구성해야 합니다. 이때 주목해야 할 필드는 다음과 같습니다.

* **title (상품명)**: 외부 쇼핑몰에서 추출한 상품명을 그대로 사용하되, 필요에 따라 번역 API를 거친 영문명을 함께 병기하거나 대체할 수 있습니다.  
* **descriptionHtml (상세 설명)**: 원본 사이트의 HTML을 그대로 가져올 경우 깨진 스타일이나 외부 링크가 포함될 수 있으므로, 내부 시스템에서 텍스트와 주요 이미지만을 추출하여 재가공한 HTML을 주입하는 것이 바람직합니다. 1  
* **images (이미지)**: productCreate 뮤테이션은 이미지 파일을 직접 업로드하는 대신, 외부 이미지 URL 리스트를 src 필드에 담아 전달하는 방식을 지원합니다. Shopify는 백그라운드 비동기 작업을 통해 해당 URL의 이미지를 다운로드하여 자체 CDN에 호스팅합니다. 이는 개발 리소스를 크게 절감시켜 주는 기능입니다.  
* **variants (옵션 및 변형)**: 의류나 신발의 경우 색상, 사이즈 등의 옵션이 필수적입니다. 스크래핑된 옵션 정보를 variants 배열에 매핑해야 하며, 각 변형별로 price (판매가)를 설정할 수 있습니다. 프록시 모델에서는 재고를 직접 보유하지 않으므로 inventoryPolicy를 CONTINUE(재고가 0이어도 판매 가능)로 설정하거나, 아예 재고 추적을 하지 않도록 설정하는 것이 운영상 유리합니다. 1

### **2.2 메타필드(Metafields)를 활용한 외부 데이터 연결 및 중복 방지**

단순한 상품 정보 외에 '원본 URL', '원화 구매 원가', '브랜드명' 등 Shopify의 기본 필드에 없는 데이터를 저장하기 위해 **메타필드(Metafields)** 의 활용은 필수적입니다. 특히 '기존에 등록된 상품을 재활용'하라는 요구사항을 충족하기 위해서는 원본 URL을 고유 식별자(Unique Key)로 활용하는 전략이 필요합니다.

과거에는 메타필드 값을 기준으로 상품을 검색하는 것이 불가능하여 별도의 데이터베이스를 구축해야 했으나, 최신 Admin GraphQL API는 메타필드 기반의 쿼리를 지원합니다.

**구현 전략:**

1. **메타필드 정의 생성**: 먼저 Shopify 어드민이나 API를 통해 proxy라는 네임스페이스(Namespace)와 source\_url이라는 키(Key)를 가진 메타필드 정의(Definition)를 생성합니다. 이때 타입은 url 또는 single\_line\_text로 지정합니다. 3  
2. **상품 검색 로직**: 사용자가 URL을 입력하면, 시스템은 먼저 products 쿼리를 실행하여 해당 URL을 가진 상품이 이미 존재하는지 확인합니다.  
   * 쿼리 예시: products(first: 1, query: "metafields.proxy.source\_url:'입력된URL'") 4  
3. **분기 처리**:  
   * **검색 결과가 있는 경우**: 기존 상품의 ID와 Variant ID를 반환하여 재사용합니다. 필요하다면 가격 정보만 최신화(productUpdate)합니다.  
   * **검색 결과가 없는 경우**: productCreate를 실행하며, 동시에 metafields 입력값으로 source\_url을 저장합니다.

이러한 메타필드 중심의 아키텍처는 Shopify를 단순한 상품 마스터 DB로 활용할 수 있게 하며, 외부 시스템과의 데이터 정합성을 유지하는 핵심 고리가 됩니다. 6

### **2.3 프록시 상품의 수명 주기 및 재고 관리**

프록시 상품은 '구매 대행'이라는 특성상, 외부 쇼핑몰의 재고 상황에 전적으로 의존합니다. 만약 외부 몰에서 품절(OOS)된 상품을 사용자가 결제하게 된다면, 이는 환불 처리와 고객 불만으로 이어집니다. 따라서 어드민 시스템은 주기적으로, 혹은 사용자가 결제를 시도하는 시점(Draft Order 생성 시점)에 실시간으로 외부 몰의 재고 상태를 재확인하는 로직을 포함해야 합니다.

Shopify 상에서는 해당 상품의 상태(status)를 ARCHIVED 또는 DRAFT로 변경하여 구매를 차단하거나, inventoryItem의 수량을 0으로 조정하고 품절 표시를 띄우는 방식을 사용할 수 있습니다. 8

## ---

**3\. 관세/배송비 계산 및 결제 프로세스 (Draft Order API)**

사용자가 채팅창을 통해 구매 의사를 밝히면, 시스템은 상품 가격뿐만 아니라 무게에 따른 국제 배송비, 그리고 상품 카테고리와 가격에 따른 관세(Duty)를 합산하여 최종 결제 금액을 제시해야 합니다. 이 과정은 Shopify의 표준 장바구니/체크아웃 로직으로는 구현이 불가능하며, **Draft Order (임시 주문)** API가 유일하고도 가장 강력한 해결책입니다.

### **3.1 Draft Order API의 전략적 활용**

Draft Order는 판매자(귀사의 시스템)가 주도적으로 주문서를 작성하여 고객에게 청구서(Invoice)를 보내는 방식입니다. 이는 가격 결정권이 시스템에 있다는 점에서 프록시 모델에 최적화되어 있습니다. 10

**Draft Order 생성 (draftOrderCreate) 시 포함되어야 할 데이터:**

1. **Line Items (상품)**: 앞서 생성하거나 조회한 variantId와 quantity를 포함합니다.  
2. **Custom Line Items (관세 및 수수료)**: 관세와 대행 수수료는 별도의 상품으로 등록하기보다는, Draft Order 생성 시에만 존재하는 '커스텀 라인 아이템'으로 추가하는 것이 효율적입니다.  
   * 예: { title: "관세 및 통관 수수료", price: "25000", quantity: 1, custom: true, taxable: false }  
   * 이렇게 처리하면 고객은 영수증에서 상품 가격과 관세가 명확히 분리된 항목을 확인할 수 있으며, 회계 처리 시에도 매출 항목을 구분하기 용이합니다. 12  
3. **Shipping Line (배송비)**: 시스템이 자체 로직으로 계산한 배송비를 shippingLine 필드에 직접 주입합니다.  
   * 예: { title: "EMS 국제 배송", price: "15000" }  
   * 이는 Shopify에 설정된 배송 정책을 무시하고(Override), 시스템이 계산한 값을 우선 적용합니다. 13

### **3.2 결제 연동 및 Checkout URL 활용**

draftOrderCreate 뮤테이션이 성공하면 Shopify는 invoiceUrl을 반환합니다. 이 URL은 미리 채워진 체크아웃 페이지로 연결되는 링크입니다. 채팅형 웹에서 이 링크를 사용자에게 제공하면, 사용자는 Shopify가 제공하는 안전한 결제 환경(PG사 연동)에서 결제를 진행할 수 있습니다.

**결제 방식에 따른 시나리오:**

* **시나리오 A: Shopify 결제 사용**: 사용자가 invoiceUrl을 통해 결제하면, Draft Order는 자동으로 정식 Order로 변환되며, 결제 상태는 PAID가 됩니다. 별도의 처리 없이 웹훅(orders/paid)을 통해 결제 완료 사실을 수신하면 됩니다. 14  
* **시나리오 B: 채팅 내 자체 결제 또는 무통장 입금**: 만약 채팅 앱 내에서 별도의 결제 수단을 사용하거나 무통장 입금을 받는 경우, 시스템은 결제 확인 후 draftOrderComplete 뮤테이션을 호출하여 Draft Order를 정식 주문으로 변환해야 합니다. 이때 paymentPending: true 옵션을 사용하여 '결제 대기' 상태로 만들거나, 외부 결제 내역을 기록할 수 있습니다. 15

### **3.3 관세 계산 로직의 어드민 통합**

어드민 시스템은 관세 계산을 위한 핵심 로직을 내장해야 합니다. Shopify API 자체는 관세율 계산 기능을 제공하지 않으므로(Shopify Plus의 Duties 기능을 사용하지 않는 한), 이는 귀사의 어드민 백엔드에서 처리해야 할 영역입니다.

1. **HS Code 관리**: 상품 등록 시 메타필드에 HS Code를 저장해두면, Draft Order 생성 시 이 코드를 기반으로 관세율을 조회하여 계산할 수 있습니다.  
2. **무게 기반 배송비**: 상품 스크래핑 시 무게 정보가 없다면, 어드민에서 카테고리별 예상 무게를 적용하거나 운영자가 수동으로 입력할 수 있는 UI를 제공해야 합니다. 이 데이터는 Draft Order의 shippingLine 가격 산정에 즉시 반영됩니다.

## ---

**4\. 물류 및 배송 관리 시스템 (Fulfillment & Logistics)**

결제가 완료된 주문은 '구매 대행(Sourcing)'과 '국제 배송(Shipping)'이라는 두 단계의 물류 프로세스를 거칩니다. Shopify의 물류 API는 최근 대대적인 변화를 겪었으며, 기존의 Fulfillment API 대신 **FulfillmentOrder** 객체를 중심으로 한 새로운 워크플로우를 이해하는 것이 필수적입니다. 17

### **4.1 FulfillmentOrder 기반의 물류 처리**

과거에는 주문(Order)에 직접 운송장을 등록하는 방식이었으나, 현재는 주문이 생성되면 Shopify가 자동으로 하나 이상의 FulfillmentOrder(이행 주문)를 생성합니다. 이는 "어떤 위치(Location)에서 어떤 상품을 보내야 하는가"를 정의한 작업 지시서와 같습니다.

**올바른 배송 처리 프로세스:**

1. **FulfillmentOrder ID 조회**: 배송할 주문의 ID를 알고 있더라도, 배송 처리를 위해서는 먼저 해당 주문에 연결된 FulfillmentOrder의 ID를 조회해야 합니다. 이는 order 쿼리 하위의 fulfillmentOrders 필드를 통해 가능합니다. 19  
2. **배송 생성 (fulfillmentCreate)**: 조회한 fulfillmentOrderId를 사용하여 fulfillmentCreate 뮤테이션을 실행합니다. 이 시점에 운송장 번호(trackingNumber)와 배송사 정보(trackingCompany)를 입력합니다.  
   * **주의사항**: 21 등의 자료에서 언급된 fulfillmentCreateV2는 fulfillmentCreate로 대체되었습니다. 최신 버전의 API를 사용하는 것이 장기적인 유지보수 측면에서 유리합니다.

### **4.2 배송 상태 업데이트 및 추적 정보 관리**

프록시 배송은 '현지 배송'과 '국제 배송'으로 나뉘거나, 통합 배송되는 경우가 많아 운송장 번호가 변경될 수 있습니다.

* **운송장 번호 수정**: 배송 생성 후 운송장 번호가 나오거나 변경되는 경우 fulfillmentTrackingInfoUpdateV2 뮤테이션을 사용합니다. 이때 입력값으로 fulfillmentId(주문 ID가 아님)가 필요하므로, 시스템은 항상 생성된 Fulfillment ID를 저장해 두어야 합니다. 22  
* **부분 배송(Partial Fulfillment)**: 사용자가 여러 상품을 주문했으나 일부만 먼저 입고된 경우, fulfillmentCreate 시 fulfillmentOrderLineItems 배열에 특정 아이템만 지정하여 부분 배송을 처리할 수 있습니다. 이 경우 주문 상태는 PARTIALLY\_FULFILLED가 되며, 이는 고객에게 투명한 정보를 제공하는 데 도움이 됩니다.

### **4.3 배송 상태 동기화 (Webhooks)**

배송 상황 업데이트에 대한 요구사항을 충족하기 위해 폴링(Polling) 방식보다는 웹훅(Webhook)을 적극 활용해야 합니다.

* **fulfillments/update**: 배송 상태가 변경되거나 운송장 정보가 수정될 때 트리거됩니다.  
* fulfillments/create: 배송이 시작되었음을 알리는 이벤트입니다.  
  이러한 웹훅을 어드민 시스템이 수신하여, 채팅방에 "상품이 한국으로 발송되었습니다"와 같은 알림 메시지를 자동으로 푸시할 수 있습니다. 24

## ---

**5\. 시스템 통합 및 어드민 구현 전략**

앞서 논의한 API 요소들을 종합하여, 귀사의 내부 어드민 시스템이 갖추어야 할 기능과 Shopify와의 통합 구조를 제안합니다.

### **5.1 어드민 대시보드 기능 명세**

1. **인바운드(Inbound) 상품 관리자**:  
   * **기능**: URL 입력 \-\> 스크래핑 데이터 확인 \-\> 카테고리/무게 보정 \-\> Shopify 등록.  
   * **API**: productCreate, metafields 설정.  
   * **재활용 로직**: URL 입력 시 products 쿼리로 메타필드 검색 후, 존재 시 기존 데이터 로드.  
2. **주문 생성기 (Quotation Builder)**:  
   * **기능**: 사용자 요청 상품 선택 \-\> 관세/배송비 자동 계산(수동 보정 가능) \-\> 결제 링크 생성.  
   * **API**: draftOrderCreate \-\> invoiceUrl 획득.  
3. **구매 및 배송 관제탑**:  
   * **기능**: '결제 완료' 주문 목록 확인 \-\> 현지 구매 수행 \-\> 입고 확인 및 배송 처리.  
   * **API**: orders 쿼리(결제 상태 필터링), fulfillmentCreate(운송장 등록).

### **5.2 기술적 고려사항 및 모범 사례**

* **API 속도 제한(Rate Limiting) 관리**: GraphQL API는 쿼리의 복잡도(Cost)에 따라 크레딧을 차감하는 방식입니다. 다수의 상품을 동시에 등록하거나 조회할 때 THROTTLED 에러가 발생할 수 있습니다. 어드민 서버는 'Leaky Bucket' 알고리즘 등을 사용하여 API 호출 속도를 조절하고, extensions.cost 응답 헤더를 모니터링해야 합니다. 26  
* **인증 및 보안**: 어드민 시스템은 Shopify의 **Custom App**으로 등록되어야 하며, 발급받은 Access Token은 서버 사이드에 안전하게 보관되어야 합니다. 클라이언트(브라우저)에서 직접 Shopify API를 호출하는 것은 보안상 금물입니다. 27  
* **API 버전 관리**: Shopify는 분기별로 새로운 API 버전을 릴리즈합니다. 항상 최신 안정(Stable) 버전을 사용하되, Release Candidate 버전을 통해 향후 변경될 기능을 미리 파악하는 것이 중요합니다. 현재 시점에서는 2025-10 또는 최신 안정 버전을 타겟팅하는 것이 좋습니다. 27

### **5.3 데이터 정합성 유지**

Shopify는 강력한 시스템이지만, 프록시 모델의 특성상 '외부 데이터'가 진실(Source of Truth)이 되는 경우가 많습니다. 따라서 어드민 시스템은 Shopify 데이터를 맹신하기보다, 메타필드에 저장된 원본 URL을 통해 주기적으로 데이터를 검증하고 동기화하는 백그라운드 프로세스(Cron Job)를 운영해야 합니다. 특히 환율 변동에 따른 가격 재계산이나 품절 처리는 자동화되어야 할 핵심 영역입니다.

## ---

**6\. 결론 및 제언**

귀사의 프로젝트는 Shopify의 유연한 API 생태계를 극한으로 활용하는 고도화된 사례입니다. **GraphQL Admin API**를 통한 동적 상품 관리, **Draft Order**를 이용한 유동적 가격 정책 수립, 그리고 **FulfillmentOrder** 기반의 정교한 물류 추적은 이 비즈니스 모델을 성공시키기 위한 기술적 삼각편대입니다.

본 보고서에서 제시한 기술적 가이드는 단순한 API 명세를 넘어, 프록시 쇼핑이라는 특수한 비즈니스 로직을 Shopify 플랫폼 위에 가장 효율적으로 구현하기 위한 아키텍처를 담고 있습니다. 특히 메타필드를 활용한 데이터 연결성과 Draft Order를 통한 결제 유연성 확보는 시스템의 확장성과 유지보수성을 보장하는 핵심 열쇠가 될 것입니다. 제안된 아키텍처를 바탕으로 프로토타입을 신속히 구축하고, 실제 트랜잭션을 통해 엣지 케이스(Edge Cases)를 검증하며 시스템을 고도화해 나가는 단계적 접근을 권장합니다.

#### **참고 자료**

1. productCreate \- GraphQL Admin \- Shopify Dev Docs, 12월 28, 2025에 액세스, [https://shopify.dev/docs/api/admin-graphql/latest/mutations/productCreate](https://shopify.dev/docs/api/admin-graphql/latest/mutations/productCreate)  
2. Inventory Not Tracked on Shopify? Here's How to Fix It \[2025\], 12월 28, 2025에 액세스, [https://www.prediko.io/blog/inventory-not-tracked-shopify](https://www.prediko.io/blog/inventory-not-tracked-shopify)  
3. Metafield \- GraphQL Admin \- Shopify Dev Docs, 12월 28, 2025에 액세스, [https://shopify.dev/docs/api/admin-graphql/latest/objects/metafield](https://shopify.dev/docs/api/admin-graphql/latest/objects/metafield)  
4. products \- GraphQL Admin \- Shopify Dev Docs, 12월 28, 2025에 액세스, [https://shopify.dev/docs/api/admin-graphql/latest/queries/products](https://shopify.dev/docs/api/admin-graphql/latest/queries/products)  
5. Query all products with a given metafield value \- Shopify Community, 12월 28, 2025에 액세스, [https://community.shopify.com/t/query-all-products-with-a-given-metafield-value/8910](https://community.shopify.com/t/query-all-products-with-a-given-metafield-value/8910)  
6. Metafields \- Shopify Help Center, 12월 28, 2025에 액세스, [https://help.shopify.com/en/manual/custom-data/metafields](https://help.shopify.com/en/manual/custom-data/metafields)  
7. About metafields \- Shopify Dev Docs, 12월 28, 2025에 액세스, [https://shopify.dev/docs/apps/build/metafields](https://shopify.dev/docs/apps/build/metafields)  
8. Setting up inventory tracking \- Shopify Help Center, 12월 28, 2025에 액세스, [https://help.shopify.com/en/manual/products/inventory/setup/set-up-inventory-tracking](https://help.shopify.com/en/manual/products/inventory/setup/set-up-inventory-tracking)  
9. Adjusting inventory quantities \- Shopify Help Center, 12월 28, 2025에 액세스, [https://help.shopify.com/en/manual/products/inventory/adjusting-inventory/adjusting-inventory-quantities](https://help.shopify.com/en/manual/products/inventory/adjusting-inventory/adjusting-inventory-quantities)  
10. Creating draft orders \- Shopify Help Center, 12월 28, 2025에 액세스, [https://help.shopify.com/en/manual/fulfillment/managing-orders/create-orders/create-draft](https://help.shopify.com/en/manual/fulfillment/managing-orders/create-orders/create-draft)  
11. DraftOrder \- Shopify Dev Docs, 12월 28, 2025에 액세스, [https://shopify.dev/docs/api/admin-rest/latest/resources/draftorder](https://shopify.dev/docs/api/admin-rest/latest/resources/draftorder)  
12. DraftOrderLineItem \- GraphQL Admin \- Shopify Dev Docs, 12월 28, 2025에 액세스, [https://shopify.dev/docs/api/admin-graphql/latest/objects/draftorderlineitem](https://shopify.dev/docs/api/admin-graphql/latest/objects/draftorderlineitem)  
13. Create a new DraftOrder | Shopify Admin \- REST | Postman API Network, 12월 28, 2025에 액세스, [https://www.postman.com/muchisx/public/request/nbph7dx/create-a-new-draftorder](https://www.postman.com/muchisx/public/request/nbph7dx/create-a-new-draftorder)  
14. Getting paid for draft orders \- Shopify Help Center, 12월 28, 2025에 액세스, [https://help.shopify.com/en/manual/fulfillment/managing-orders/create-orders/get-paid](https://help.shopify.com/en/manual/fulfillment/managing-orders/create-orders/get-paid)  
15. draftOrderComplete \- GraphQL Admin \- Shopify Dev Docs, 12월 28, 2025에 액세스, [https://shopify.dev/docs/api/admin-graphql/latest/mutations/draftOrderComplete](https://shopify.dev/docs/api/admin-graphql/latest/mutations/draftOrderComplete)  
16. DraftOrderCompletePayload \- GraphQL Admin \- Shopify Dev Docs, 12월 28, 2025에 액세스, [https://shopify.dev/docs/api/admin-graphql/2024-10/payloads/DraftOrderCompletePayload](https://shopify.dev/docs/api/admin-graphql/2024-10/payloads/DraftOrderCompletePayload)  
17. FulfillmentOrder \- Shopify Dev Docs, 12월 28, 2025에 액세스, [https://shopify.dev/docs/api/admin-rest/latest/resources/fulfillmentorder](https://shopify.dev/docs/api/admin-rest/latest/resources/fulfillmentorder)  
18. Migrate to fulfillment orders \- Shopify Dev Docs, 12월 28, 2025에 액세스, [https://shopify.dev/docs/apps/build/orders-fulfillment/migrate-to-fulfillment-orders](https://shopify.dev/docs/apps/build/orders-fulfillment/migrate-to-fulfillment-orders)  
19. FulfillmentOrder \- GraphQL Admin \- Shopify Dev Docs, 12월 28, 2025에 액세스, [https://shopify.dev/docs/api/admin-graphql/latest/objects/FulfillmentOrder](https://shopify.dev/docs/api/admin-graphql/latest/objects/FulfillmentOrder)  
20. fulfillmentOrder \- GraphQL Admin \- Shopify Dev Docs, 12월 28, 2025에 액세스, [https://shopify.dev/docs/api/admin-graphql/latest/queries/fulfillmentorder](https://shopify.dev/docs/api/admin-graphql/latest/queries/fulfillmentorder)  
21. fulfillmentCreateV2 \- GraphQL Admin \- Shopify Dev Docs, 12월 28, 2025에 액세스, [https://shopify.dev/docs/api/admin-graphql/latest/mutations/fulfillmentCreateV2](https://shopify.dev/docs/api/admin-graphql/latest/mutations/fulfillmentCreateV2)  
22. fulfillmentTrackingInfoUpdateV2 \- GraphQL Admin \- Shopify Dev Docs, 12월 28, 2025에 액세스, [https://shopify.dev/docs/api/admin-graphql/latest/mutations/fulfillmenttrackinginfoupdatev2](https://shopify.dev/docs/api/admin-graphql/latest/mutations/fulfillmenttrackinginfoupdatev2)  
23. How to update or change tracking info once order is fulfilled? \- Shopify Community, 12월 28, 2025에 액세스, [https://community.shopify.com/t/how-to-update-or-change-tracking-info-once-order-is-fulfilled/381097](https://community.shopify.com/t/how-to-update-or-change-tracking-info-once-order-is-fulfilled/381097)  
24. List of Possible Webhooks for Shopify \- Accentuate Custom Fields, 12월 28, 2025에 액세스, [https://www.accentuate.io/blogs/wiki/list-of-possible-webhooks-for-shopify](https://www.accentuate.io/blogs/wiki/list-of-possible-webhooks-for-shopify)  
25. Shopify Fulfillments Webhooks for draft order, 12월 28, 2025에 액세스, [https://community.shopify.com/t/shopify-fulfillments-webhooks-for-draft-order/393419](https://community.shopify.com/t/shopify-fulfillments-webhooks-for-draft-order/393419)  
26. DraftOrder \- GraphQL Admin \- Shopify Dev Docs, 12월 28, 2025에 액세스, [https://shopify.dev/docs/api/admin-graphql/latest/objects/DraftOrder](https://shopify.dev/docs/api/admin-graphql/latest/objects/DraftOrder)  
27. GraphQL Admin API reference \- Shopify Dev Docs, 12월 28, 2025에 액세스, [https://shopify.dev/docs/api/admin-graphql/latest](https://shopify.dev/docs/api/admin-graphql/latest)