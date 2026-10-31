/**
 * i18n Translations
 *
 * Supported languages:
 * - en: English (default for US, Canada)
 * - ko: Korean
 * - zh: Chinese (Simplified)
 */

export type Language = 'en' | 'ko' | 'zh';

export const LANGUAGE_NAMES: Record<Language, string> = {
  en: 'English',
  ko: '한국어',
  zh: '中文',
};

export const LANGUAGE_FLAGS: Record<Language, string> = {
  en: '🇺🇸',
  ko: '🇰🇷',
  zh: '🇨🇳',
};

// Translation keys organized by component/feature
export interface Translations {
  // Common
  common: {
    loading: string;
    error: string;
    retry: string;
    cancel: string;
    confirm: string;
    save: string;
    delete: string;
    edit: string;
    close: string;
    back: string;
    next: string;
    search: string;
    filter: string;
    reset: string;
    all: string;
    none: string;
    yes: string;
    no: string;
  };

  // Chat Interface
  chat: {
    placeholder: string;
    send: string;
    newChat: string;
    thinking: string;
    processing: string;
    analyzing: string;
    welcome: {
      title: string;
      subtitle: string;
      hint: string;
    };
    quickActions: {
      pasteUrl: string;
      recommend: string;
      calculator: string;
    };
    footer: string;
  };

  // Error Messages
  errors: {
    network: {
      title: string;
      description: string;
      suggestion: string;
    };
    timeout: {
      title: string;
      description: string;
      suggestion: string;
    };
    scrape: {
      title: string;
      description: string;
      suggestion: string;
    };
    parse: {
      title: string;
      description: string;
      suggestion: string;
    };
    server: {
      title: string;
      description: string;
      suggestion: string;
    };
    unknown: {
      title: string;
      description: string;
      suggestion: string;
    };
    showDetails: string;
    hideDetails: string;
  };

  // Product
  product: {
    weight: string;
    category: string;
    price: string;
    originalPrice: string;
    discount: string;
    outOfStock: string;
    selectOption: string;
    quantity: string;
    addToCart: string;
    calculateShipping: string;
    addedToCart: string;
    viewCart: string;
    usePreviousTitle: string;
    usePreviousDesc: string;
    yesContinue: string;
  };

  // Cart
  cart: {
    title: string;
    empty: string;
    subtotal: string;
    shipping: string;
    total: string;
    checkout: string;
    continueShopping: string;
    removeItem: string;
    clearCart: string;
    items: string;
  };

  // Shipping & Quote
  shipping: {
    calculating: string;
    calculated: string;
    productPrice: string;
    internationalShipping: string;
    customsDuty: string;
    vat: string;
    total: string;
    estimatedDelivery: string;
    days: string;
  };

  // Cart Shipping Details
  shippingDetails: {
    toggle: string;        // "Shipping Info" / "배송정보"
    collapse: string;      // "Collapse" / "접기"
    weight: string;        // "Weight" / "무게"
    dimensions: string;    // "Dimensions" / "부피"
    hsCode: string;        // "HS Code"
    origin: string;        // "Origin" / "원산지"
    material: string;      // "Material" / "재질"
    estimatedWarning: string;  // Estimated value warning
    // Source labels
    sourceEstimated: string;
    sourceExtracted: string;
    sourceWebSearch: string;
    sourceVision: string;
    sourceManual: string;
    sourceApi: string;
    sourceUnknown: string;
    // Detail labels
    basis: string;         // "Basis" / "근거"
    accuracy: string;      // "Accuracy" / "정확도"
    source: string;        // "Source" / "출처"
    noInfo: string;        // "No info" / "정보 없음"
    approx: string;        // "Approx" / "약"
  };

  // Order
  order: {
    title: string;
    pending: string;
    paid: string;
    processing: string;
    shipped: string;
    delivered: string;
    cancelled: string;
    payNow: string;
    orderReady: string;
    newOrder: string;
  };

  // Address Form
  address: {
    title: string;
    country: string;
    street: string;
    city: string;
    state: string;
    zipCode: string;
    phone: string;
    submit: string;
    selectCountry: string;
    continueToQuote: string;
    calculating: string;
    required: string;
    streetRequired: string;
    cityRequired: string;
    stateRequired: string;
    postalRequired: string;
    countryRequired: string;
    infoNote: string;
  };

  // Thinking Indicator
  thinking: {
    steps: string;
    toolsUsed: string;
    stepsCompleted: string;
  };

  // Sidebar
  sidebar: {
    conversations: string;
    noConversations: string;
    deleteConfirm: string;
    recentChats: string;
    loginToSeeHistory: string;
    noChatHistory: string;
    myOrders: string;
    quickActions: string;
    buyKPopAlbum: string;
    recommendItems: string;
    findKSnacks: string;
    justNow: string;
    minutesAgo: string;
    hoursAgo: string;
    daysAgo: string;
  };

  // Welcome Screen
  welcome: {
    title: string;
    subtitle: string;
    recommendKpop: string;
    findSnacks: string;
    pasteUrl: string;
  };

  // Cart Panel (additional)
  cartPanel: {
    emptyTitle: string;
    emptyDescription: string;
    startShopping: string;
    subtotal: string;
    originalKrw: string;
    subtotalKrw: string;
    estimatedUsd: string;
    shippingNote: string;
    processing: string;
    continue: string;
    quoteCta: string;
    getQuote: string;
  };

  // Auth
  auth: {
    login: string;
    logout: string;
    loginRequired: string;
    guest: string;
  };

  // Orders Page
  ordersPage: {
    title: string;
    orderHistory: string;
    orderCount: string;
    orderCountPlural: string;
    backToChat: string;
    refresh: string;
    loadMore: string;
    loadingMore: string;
    loginRequired: string;
    loginRequiredDesc: string;
    // Order intent panel
    orderReviewQueue: string;
    orderReviewQueueDesc: string;
    loadingIntents: string;
    preparing: string;
    awaitingReview: string;
    actionRequired: string;
    // Payment tracking banners
    paymentStatusFailed: string;
    paymentPending: string;
    paymentPendingHint: string;
    manualRefresh: string;
    retryCheck: string;
    paymentConfirmed: string;
    openOrder: string;
    webhookError: string;
    latestError: string;
    // Error messages
    paymentStatusError: string;
    paymentLinkError: string;
  };

  // Action Buttons (Quick Reply Buttons in Chat)
  actions: {
    searchAgain: string;
    findByUrl: string;
    viewFirst: string;
    viewSecond: string;
    viewThird: string;
    searchMore: string;
    startShopping: string;
    addToCart: string;
    calculateShipping: string;
    findMore: string;
    parseAnotherUrl: string;
    checkout: string;
    continueShopping: string;
    viewCart: string;
    clearCart: string;
    viewOrders: string;
    clearMemory: string;
    viewMemory: string;
    shopMore: string;
    // Cart-specific actions
    recommendKpop: string;
    recommendBeauty: string;
    recommendSnacks: string;
    explainHowItWorks: string;
    explainFees: string;
    explainOrderFlow: string;
    findCheaperOptions: string;
    explainPriceDrivers: string;
    reviewCurrentItem: string;
    browseSuggestedProducts: string;
    reviewChecklist: string;
    browseAlternatives: string;
    compareCriteria: string;
    shareProductName: string;
    reviewByLink: string;
  };
}

// English translations (default)
export const en: Translations = {
  common: {
    loading: 'Loading...',
    error: 'Error',
    retry: 'Retry',
    cancel: 'Cancel',
    confirm: 'Confirm',
    save: 'Save',
    delete: 'Delete',
    edit: 'Edit',
    close: 'Close',
    back: 'Back',
    next: 'Next',
    search: 'Search',
    filter: 'Filter',
    reset: 'Reset',
    all: 'All',
    none: 'None',
    yes: 'Yes',
    no: 'No',
  },

  chat: {
    placeholder: 'Paste a URL or ask a question...',
    send: 'Send',
    newChat: 'New Chat',
    thinking: 'Thinking',
    processing: 'Processing',
    analyzing: 'Analyzing product...',
    welcome: {
      title: 'Start with the link you saved',
      subtitle: 'See the estimate first, then decide',
      hint: 'Drop in a Korean product link, or start with K-pop and beauty picks you\'ve been eyeing.',
    },
    quickActions: {
      pasteUrl: 'Paste Example URL',
      recommend: 'Recommend',
      calculator: 'Calculator',
    },
    footer: 'Check the estimate before you pay, then come back later to track your order.',
  },

  errors: {
    network: {
      title: 'Connection Error',
      description: 'There was a problem with your network connection.',
      suggestion: 'Please check your internet connection and try again.',
    },
    timeout: {
      title: 'Request Timeout',
      description: 'The request took too long to process.',
      suggestion: 'Please try again in a moment.',
    },
    scrape: {
      title: 'Product Extraction Failed',
      description: 'Could not retrieve product information from this page.',
      suggestion: 'Please verify the URL is correct or try a different product page.',
    },
    parse: {
      title: 'Processing Error',
      description: 'There was a problem processing your request.',
      suggestion: 'Please try rephrasing your question or try again.',
    },
    server: {
      title: 'Server Error',
      description: 'The server could not process your request.',
      suggestion: 'Please try again in a moment.',
    },
    unknown: {
      title: 'Error Occurred',
      description: 'An unexpected problem occurred.',
      suggestion: 'Please try again.',
    },
    showDetails: 'Show details',
    hideDetails: 'Hide details',
  },

  product: {
    weight: 'Weight',
    category: 'Category',
    price: 'Price',
    originalPrice: 'Original Price',
    discount: 'Discount',
    outOfStock: 'Out of Stock',
    selectOption: 'Select',
    quantity: 'Quantity',
    addToCart: 'Add to Cart',
    calculateShipping: 'Calculate',
    addedToCart: 'Added to cart!',
    viewCart: 'View Cart',
    usePreviousTitle: 'Use Previous Product?',
    usePreviousDesc: 'This product is from a previous message. Are you sure you want to proceed?',
    yesContinue: 'Yes, Continue',
  },

  cart: {
    title: 'Shopping Cart',
    empty: 'Your cart is empty',
    subtotal: 'Subtotal',
    shipping: 'Shipping',
    total: 'Total',
    checkout: 'Checkout',
    continueShopping: 'Continue Shopping',
    removeItem: 'Remove',
    clearCart: 'Clear Cart',
    items: 'items',
  },

  shipping: {
    calculating: 'Calculating shipping...',
    calculated: 'Shipping calculated!',
    productPrice: 'Product Price',
    internationalShipping: 'International Shipping',
    customsDuty: 'Customs Duty',
    vat: 'VAT/Tax',
    total: 'Total',
    estimatedDelivery: 'Estimated Delivery',
    days: 'days',
  },

  shippingDetails: {
    toggle: 'Shipping Info',
    collapse: 'Collapse',
    weight: 'Weight',
    dimensions: 'Dimensions',
    hsCode: 'HS Code',
    origin: 'Origin',
    material: 'Material',
    estimatedWarning: 'Includes estimated values - actual values will be used at checkout',
    sourceEstimated: 'Estimated',
    sourceExtracted: 'Extracted',
    sourceWebSearch: 'Web Search',
    sourceVision: 'OCR',
    sourceManual: 'Manual',
    sourceApi: 'API',
    sourceUnknown: 'Unknown',
    basis: 'Basis',
    accuracy: 'Accuracy',
    source: 'Source',
    noInfo: 'No info',
    approx: 'Approx.',
  },

  order: {
    title: 'Order',
    pending: 'Pending',
    paid: 'Paid',
    processing: 'Processing',
    shipped: 'Shipped',
    delivered: 'Delivered',
    cancelled: 'Cancelled',
    payNow: 'Pay Now',
    orderReady: 'Order ready! Click "Pay Now" to complete your purchase.',
    newOrder: 'New Order',
  },

  address: {
    title: 'Shipping Address',
    country: 'Country',
    street: 'Street Address',
    city: 'City',
    state: 'State/Province',
    zipCode: 'Postal Code',
    phone: 'Phone Number',
    submit: 'Calculate Shipping',
    selectCountry: 'Select your country',
    continueToQuote: 'Continue to Quote',
    calculating: 'Calculating...',
    required: 'Required',
    streetRequired: 'Street address is required',
    cityRequired: 'City is required',
    stateRequired: 'State/Province is required',
    postalRequired: 'Postal code is required',
    countryRequired: 'Country is required',
    infoNote: 'We need your shipping address to calculate accurate customs, duties, and taxes for your country.',
  },

  thinking: {
    steps: 'steps',
    toolsUsed: 'Tools used',
    stepsCompleted: 'steps completed',
  },

  sidebar: {
    conversations: 'Conversations',
    noConversations: 'No conversations yet',
    deleteConfirm: 'Delete this conversation?',
    recentChats: 'Recent Chats',
    loginToSeeHistory: 'Login to see chat history',
    noChatHistory: 'No chat history',
    myOrders: 'My Orders',
    quickActions: 'Quick Actions',
    buyKPopAlbum: 'Buy K-Pop Album',
    recommendItems: 'Recommend Items',
    findKSnacks: 'Find K-Snacks',
    justNow: 'Just now',
    minutesAgo: 'm ago',
    hoursAgo: 'h ago',
    daysAgo: 'd ago',
  },

  welcome: {
    title: 'That Korean item on your wishlist?',
    subtitle: 'Start with the link and see if it\'s worth the cart space',
    recommendKpop: 'Recommend K-Pop Items',
    findSnacks: 'Find Korean Snacks',
    pasteUrl: 'Paste Product URL',
  },

  cartPanel: {
    emptyTitle: 'Cart is Empty',
    emptyDescription: 'Find something you love and add it here!',
    startShopping: 'Start Shopping',
    subtotal: 'Subtotal',
    originalKrw: 'Original (KRW)',
    subtotalKrw: 'Subtotal (KRW)',
    estimatedUsd: 'Estimated (USD)',
    shippingNote: 'Shipping, customs duty, and service fee will be calculated at checkout.',
    processing: 'Processing...',
    continue: 'Continue',
    quoteCta: 'Want an exact total including shipping, customs, and fees?',
    getQuote: 'Get Quote',
  },

  auth: {
    login: 'Login',
    logout: 'Logout',
    loginRequired: 'Login required to continue',
    guest: 'Guest',
  },

  ordersPage: {
    title: 'My Orders',
    orderHistory: 'Order History',
    orderCount: '1 order',
    orderCountPlural: 'orders',
    backToChat: 'Back to Chat',
    refresh: 'Refresh',
    loadMore: 'Load More Orders',
    loadingMore: 'Loading...',
    loginRequired: 'Login Required',
    loginRequiredDesc: 'Please login to view your order history',
    orderReviewQueue: 'Order Review Queue',
    orderReviewQueueDesc: 'Check submitted order requests and payment request status.',
    loadingIntents: 'Loading order requests...',
    preparing: 'Preparing...',
    awaitingReview: 'Awaiting Review',
    actionRequired: 'Action Required Before Payment',
    paymentStatusFailed: 'Failed to check payment status: ',
    paymentPending: 'Waiting for payment to be reflected. Webhook sync may take 30–120 seconds.',
    paymentPendingHint: '',
    manualRefresh: 'Refresh',
    retryCheck: 'Retry',
    paymentConfirmed: 'Payment confirmed and order has been created.',
    openOrder: 'Open Order',
    webhookError: 'An error occurred during webhook processing. Please contact support.',
    latestError: 'Latest error: ',
    paymentStatusError: 'Failed to check payment status.',
    paymentLinkError: 'Failed to generate payment link.',
  },

  actions: {
    searchAgain: 'Search again',
    findByUrl: 'Find by URL',
    viewFirst: 'View 1st item',
    viewSecond: 'View 2nd item',
    viewThird: 'View 3rd item',
    searchMore: 'Search more',
    startShopping: 'Start shopping',
    addToCart: 'Add to cart',
    calculateShipping: 'Calculate shipping',
    findMore: 'Find more',
    parseAnotherUrl: 'Try another URL',
    checkout: 'Checkout',
    continueShopping: 'Continue shopping',
    viewCart: 'View cart',
    clearCart: 'Clear cart',
    viewOrders: 'View orders',
    clearMemory: 'Clear memory',
    viewMemory: 'View memory',
    shopMore: 'Shop more',
    recommendKpop: 'K-pop Albums',
    recommendBeauty: 'Korean Cosmetics',
    recommendSnacks: 'Korean Snacks',
    explainHowItWorks: 'How it works',
    explainFees: 'Fees',
    explainOrderFlow: 'Order flow',
    findCheaperOptions: 'Cheaper options',
    explainPriceDrivers: 'Why the price is high',
    reviewCurrentItem: 'Review this item again',
    browseSuggestedProducts: 'Suggested products',
    reviewChecklist: 'Checklist',
    browseAlternatives: 'Alternatives',
    compareCriteria: 'Compare criteria',
    shareProductName: 'Share product name',
    reviewByLink: 'Review by link',
  },
};

// Korean translations
export const ko: Translations = {
  common: {
    loading: '로딩 중...',
    error: '오류',
    retry: '다시 시도',
    cancel: '취소',
    confirm: '확인',
    save: '저장',
    delete: '삭제',
    edit: '편집',
    close: '닫기',
    back: '뒤로',
    next: '다음',
    search: '검색',
    filter: '필터',
    reset: '초기화',
    all: '전체',
    none: '없음',
    yes: '예',
    no: '아니오',
  },

  chat: {
    placeholder: 'URL을 붙여넣거나 질문하세요...',
    send: '전송',
    newChat: '새 대화',
    thinking: '생각 중',
    processing: '처리 중',
    analyzing: '상품 분석 중...',
    welcome: {
      title: '저장해둔 링크부터 시작하세요',
      subtitle: '비용부터 보고, 그다음 결정해도 늦지 않아요',
      hint: '보고 있던 한국 상품 링크를 넣거나, 눈여겨본 K-pop과 뷰티 상품부터 가볍게 시작해보세요.',
    },
    quickActions: {
      pasteUrl: '예시 URL 붙여넣기',
      recommend: '추천받기',
      calculator: '계산기',
    },
    footer: '결제 전에 대략적인 비용을 먼저 보고, 주문 후에는 다시 돌아와 진행 상태를 확인할 수 있어요.',
  },

  errors: {
    network: {
      title: '연결 오류',
      description: '네트워크 연결에 문제가 있습니다.',
      suggestion: '인터넷 연결을 확인하고 다시 시도해 주세요.',
    },
    timeout: {
      title: '응답 시간 초과',
      description: '요청 처리에 시간이 너무 오래 걸렸습니다.',
      suggestion: '잠시 후 다시 시도해 주세요.',
    },
    scrape: {
      title: '상품 정보 추출 실패',
      description: '해당 페이지에서 상품 정보를 가져오지 못했습니다.',
      suggestion: 'URL이 올바른지 확인하거나 다른 상품 페이지를 시도해 주세요.',
    },
    parse: {
      title: '처리 오류',
      description: '요청을 처리하는 중 문제가 발생했습니다.',
      suggestion: '다른 방식으로 질문해 보시거나 다시 시도해 주세요.',
    },
    server: {
      title: '서버 오류',
      description: '서버에서 요청을 처리하지 못했습니다.',
      suggestion: '잠시 후 다시 시도해 주세요.',
    },
    unknown: {
      title: '오류 발생',
      description: '예상치 못한 문제가 발생했습니다.',
      suggestion: '다시 시도해 주세요.',
    },
    showDetails: '상세 보기',
    hideDetails: '상세 숨기기',
  },

  product: {
    weight: '무게',
    category: '카테고리',
    price: '가격',
    originalPrice: '정가',
    discount: '할인',
    outOfStock: '품절',
    selectOption: '선택',
    quantity: '수량',
    addToCart: '장바구니 담기',
    calculateShipping: '계산하기',
    addedToCart: '장바구니에 담겼습니다!',
    viewCart: '장바구니 보기',
    usePreviousTitle: '이전 상품으로 진행할까요?',
    usePreviousDesc: '이전에 확인한 상품입니다. 이 상품으로 진행할까요?',
    yesContinue: '예, 계속',
  },

  cart: {
    title: '장바구니',
    empty: '장바구니가 비어있습니다',
    subtotal: '소계',
    shipping: '배송비',
    total: '합계',
    checkout: '결제하기',
    continueShopping: '쇼핑 계속하기',
    removeItem: '삭제',
    clearCart: '장바구니 비우기',
    items: '개',
  },

  shipping: {
    calculating: '배송비 계산 중...',
    calculated: '배송비 계산 완료!',
    productPrice: '상품 가격',
    internationalShipping: '국제 배송비',
    customsDuty: '관세',
    vat: '부가세',
    total: '총액',
    estimatedDelivery: '예상 배송일',
    days: '일',
  },

  shippingDetails: {
    toggle: '배송정보',
    collapse: '접기',
    weight: '무게',
    dimensions: '부피',
    hsCode: 'HS Code',
    origin: '원산지',
    material: '재질',
    estimatedWarning: '추정값 포함 - 결제 시 실제 값으로 정산됩니다',
    sourceEstimated: '추정',
    sourceExtracted: '추출',
    sourceWebSearch: '웹검색',
    sourceVision: 'OCR',
    sourceManual: '수동입력',
    sourceApi: 'API',
    sourceUnknown: '알 수 없음',
    basis: '근거',
    accuracy: '정확도',
    source: '출처',
    noInfo: '정보 없음',
    approx: '약',
  },

  order: {
    title: '주문',
    pending: '대기',
    paid: '결제완료',
    processing: '처리중',
    shipped: '배송중',
    delivered: '배송완료',
    cancelled: '취소됨',
    payNow: '지금 결제',
    orderReady: '주문 준비 완료! "지금 결제"를 클릭하여 구매를 완료하세요.',
    newOrder: '새 주문',
  },

  address: {
    title: '배송 주소',
    country: '국가',
    street: '상세 주소',
    city: '도시',
    state: '주/도',
    zipCode: '우편번호',
    phone: '전화번호',
    submit: '배송비 계산',
    selectCountry: '국가를 선택하세요',
    continueToQuote: '견적 확인하기',
    calculating: '계산 중...',
    required: '필수',
    streetRequired: '상세 주소를 입력해 주세요',
    cityRequired: '도시를 입력해 주세요',
    stateRequired: '주/도를 입력해 주세요',
    postalRequired: '우편번호를 입력해 주세요',
    countryRequired: '국가를 선택해 주세요',
    infoNote: '정확한 관세, 세금 계산을 위해 배송 주소가 필요합니다.',
  },

  thinking: {
    steps: '단계',
    toolsUsed: '사용한 도구',
    stepsCompleted: '단계 완료',
  },

  sidebar: {
    conversations: '대화 목록',
    noConversations: '대화가 없습니다',
    deleteConfirm: '이 대화를 삭제하시겠습니까?',
    recentChats: '최근 대화',
    loginToSeeHistory: '대화 이력을 보려면 로그인하세요',
    noChatHistory: '대화 이력이 없습니다',
    myOrders: '내 주문',
    quickActions: '빠른 실행',
    buyKPopAlbum: 'K-Pop 앨범 구매',
    recommendItems: '아이템 추천',
    findKSnacks: '한국 과자 찾기',
    justNow: '방금 전',
    minutesAgo: '분 전',
    hoursAgo: '시간 전',
    daysAgo: '일 전',
  },

  welcome: {
    title: '위시리스트에 담아둔 그 한국 상품',
    subtitle: '링크부터 넣고, 장바구니에 담을 가치가 있는지 먼저 보세요',
    recommendKpop: 'K-Pop 아이템 추천',
    findSnacks: '한국 과자 찾기',
    pasteUrl: '상품 URL 붙여넣기',
  },

  cartPanel: {
    emptyTitle: '장바구니가 비어있습니다',
    emptyDescription: '마음에 드는 상품을 찾아 담아보세요!',
    startShopping: '쇼핑 시작하기',
    subtotal: '소계',
    originalKrw: '원화 기준',
    subtotalKrw: '소계 (원화)',
    estimatedUsd: '예상 금액 (달러)',
    shippingNote: '배송비, 관세, 서비스 수수료는 결제 시 계산됩니다.',
    processing: '처리 중...',
    continue: '계속하기',
    quoteCta: '배송비 · 관세 · 수수료 포함 정확한 금액이 궁금하시다면',
    getQuote: '견적 받기',
  },

  auth: {
    login: '로그인',
    logout: '로그아웃',
    loginRequired: '계속하려면 로그인이 필요합니다',
    guest: '게스트',
  },

  ordersPage: {
    title: '내 주문',
    orderHistory: '주문 내역',
    orderCount: '1건',
    orderCountPlural: '건',
    backToChat: '채팅으로 돌아가기',
    refresh: '새로고침',
    loadMore: '주문 더 불러오기',
    loadingMore: '불러오는 중...',
    loginRequired: '로그인 필요',
    loginRequiredDesc: '주문 내역을 보려면 로그인하세요',
    orderReviewQueue: '주문 검토 대기열',
    orderReviewQueueDesc: 'review 제출한 주문 요청과 결제 가능한 payment request 상태를 확인합니다.',
    loadingIntents: '주문 요청을 불러오는 중...',
    preparing: '준비 중...',
    awaitingReview: '운영 검토 대기',
    actionRequired: '결제 전 조치 필요',
    paymentStatusFailed: '결제 반영 상태 확인에 실패했습니다: ',
    paymentPending: '결제 완료 반영을 기다리는 중입니다. 웹훅 반영까지 30~120초 정도 소요될 수 있습니다.',
    paymentPendingHint: '',
    manualRefresh: '수동 새로고침',
    retryCheck: '다시 확인',
    paymentConfirmed: '결제가 확인되어 주문이 생성되었습니다.',
    openOrder: '주문 열기',
    webhookError: '결제 웹훅 처리 중 오류가 발생했습니다. 운영팀 확인이 필요합니다.',
    latestError: '최근 오류: ',
    paymentStatusError: '결제 반영 상태를 확인하지 못했습니다.',
    paymentLinkError: '결제 링크 생성에 실패했습니다.',
  },

  actions: {
    searchAgain: '다시 검색하기',
    findByUrl: 'URL로 상품 찾기',
    viewFirst: '첫 번째 보기',
    viewSecond: '두 번째 보기',
    viewThird: '세 번째 보기',
    searchMore: '더 검색하기',
    startShopping: '쇼핑 시작하기',
    addToCart: '장바구니 담기',
    calculateShipping: '배송비 계산',
    findMore: '더 찾기',
    parseAnotherUrl: '다른 URL 확인하기',
    checkout: '결제하기',
    continueShopping: '쇼핑 계속하기',
    viewCart: '장바구니 보기',
    clearCart: '장바구니 비우기',
    viewOrders: '주문 확인',
    clearMemory: '기억 지우기',
    viewMemory: '기억 보기',
    shopMore: '더 쇼핑하기',
    recommendKpop: 'K-pop 앨범 추천',
    recommendBeauty: '한국 화장품 추천',
    recommendSnacks: '한국 과자 추천',
    explainHowItWorks: '이용 방식 보기',
    explainFees: '수수료 설명',
    explainOrderFlow: '주문 흐름 보기',
    findCheaperOptions: '더 저렴한 대안',
    explainPriceDrivers: '비용 구조 설명',
    reviewCurrentItem: '이 상품 다시 보기',
    browseSuggestedProducts: '추천 상품 보기',
    reviewChecklist: '체크리스트 보기',
    browseAlternatives: '비슷한 대안 보기',
    compareCriteria: '비교 기준 정리',
    shareProductName: '상품명으로 찾기',
    reviewByLink: '링크로 확인하기',
  },
};

// Chinese (Simplified) translations
export const zh: Translations = {
  common: {
    loading: '加载中...',
    error: '错误',
    retry: '重试',
    cancel: '取消',
    confirm: '确认',
    save: '保存',
    delete: '删除',
    edit: '编辑',
    close: '关闭',
    back: '返回',
    next: '下一步',
    search: '搜索',
    filter: '筛选',
    reset: '重置',
    all: '全部',
    none: '无',
    yes: '是',
    no: '否',
  },

  chat: {
    placeholder: '粘贴网址或提问...',
    send: '发送',
    newChat: '新对话',
    thinking: '思考中',
    processing: '处理中',
    analyzing: '正在分析商品...',
    welcome: {
      title: '先从你保存的链接开始',
      subtitle: '先看预估，再决定要不要买',
      hint: '把你正在看的韩国商品链接贴进来，或者先从 K-pop 和韩妆商品开始试试。',
    },
    quickActions: {
      pasteUrl: '粘贴示例链接',
      recommend: '推荐',
      calculator: '计算器',
    },
    footer: '付款前先看预估费用，结账后还可以回来继续追踪订单。',
  },

  errors: {
    network: {
      title: '连接错误',
      description: '网络连接出现问题。',
      suggestion: '请检查网络连接后重试。',
    },
    timeout: {
      title: '请求超时',
      description: '请求处理时间过长。',
      suggestion: '请稍后重试。',
    },
    scrape: {
      title: '商品信息提取失败',
      description: '无法从该页面获取商品信息。',
      suggestion: '请确认网址正确或尝试其他商品页面。',
    },
    parse: {
      title: '处理错误',
      description: '处理请求时出现问题。',
      suggestion: '请尝试重新表述问题或重试。',
    },
    server: {
      title: '服务器错误',
      description: '服务器无法处理您的请求。',
      suggestion: '请稍后重试。',
    },
    unknown: {
      title: '发生错误',
      description: '出现意外问题。',
      suggestion: '请重试。',
    },
    showDetails: '查看详情',
    hideDetails: '隐藏详情',
  },

  product: {
    weight: '重量',
    category: '类别',
    price: '价格',
    originalPrice: '原价',
    discount: '折扣',
    outOfStock: '缺货',
    selectOption: '选择',
    quantity: '数量',
    addToCart: '加入购物车',
    calculateShipping: '计算',
    addedToCart: '已加入购物车！',
    viewCart: '查看购物车',
    usePreviousTitle: '使用之前的商品信息？',
    usePreviousDesc: '这是之前查看过的商品。确定要继续吗？',
    yesContinue: '是，继续',
  },

  cart: {
    title: '购物车',
    empty: '购物车为空',
    subtotal: '小计',
    shipping: '运费',
    total: '合计',
    checkout: '结算',
    continueShopping: '继续购物',
    removeItem: '删除',
    clearCart: '清空购物车',
    items: '件',
  },

  shipping: {
    calculating: '正在计算运费...',
    calculated: '运费计算完成！',
    productPrice: '商品价格',
    internationalShipping: '国际运费',
    customsDuty: '关税',
    vat: '增值税',
    total: '总计',
    estimatedDelivery: '预计送达',
    days: '天',
  },

  shippingDetails: {
    toggle: '配送信息',
    collapse: '收起',
    weight: '重量',
    dimensions: '尺寸',
    hsCode: 'HS编码',
    origin: '原产地',
    material: '材质',
    estimatedWarning: '含预估值 - 结算时将使用实际值',
    sourceEstimated: '预估',
    sourceExtracted: '提取',
    sourceWebSearch: '网络搜索',
    sourceVision: 'OCR',
    sourceManual: '手动输入',
    sourceApi: 'API',
    sourceUnknown: '未知',
    basis: '依据',
    accuracy: '准确度',
    source: '来源',
    noInfo: '无信息',
    approx: '约',
  },

  order: {
    title: '订单',
    pending: '待处理',
    paid: '已付款',
    processing: '处理中',
    shipped: '已发货',
    delivered: '已送达',
    cancelled: '已取消',
    payNow: '立即支付',
    orderReady: '订单准备就绪！点击"立即支付"完成购买。',
    newOrder: '新订单',
  },

  address: {
    title: '收货地址',
    country: '国家',
    street: '详细地址',
    city: '城市',
    state: '省/州',
    zipCode: '邮编',
    phone: '电话号码',
    submit: '计算运费',
    selectCountry: '选择您的国家',
    continueToQuote: '继续获取报价',
    calculating: '计算中...',
    required: '必填',
    streetRequired: '请输入详细地址',
    cityRequired: '请输入城市',
    stateRequired: '请输入省/州',
    postalRequired: '请输入邮编',
    countryRequired: '请选择国家',
    infoNote: '我们需要您的收货地址来准确计算关税和税费。',
  },

  thinking: {
    steps: '步骤',
    toolsUsed: '使用的工具',
    stepsCompleted: '步骤已完成',
  },

  sidebar: {
    conversations: '对话列表',
    noConversations: '暂无对话',
    deleteConfirm: '确定删除此对话？',
    recentChats: '最近对话',
    loginToSeeHistory: '登录查看对话记录',
    noChatHistory: '暂无对话记录',
    myOrders: '我的订单',
    quickActions: '快捷操作',
    buyKPopAlbum: '购买K-Pop专辑',
    recommendItems: '推荐商品',
    findKSnacks: '找韩国零食',
    justNow: '刚刚',
    minutesAgo: '分钟前',
    hoursAgo: '小时前',
    daysAgo: '天前',
  },

  welcome: {
    title: '你收藏的那件韩国商品',
    subtitle: '先贴链接，再看看它值不值得进购物车',
    recommendKpop: '推荐K-Pop商品',
    findSnacks: '找韩国零食',
    pasteUrl: '粘贴商品链接',
  },

  cartPanel: {
    emptyTitle: '购物车为空',
    emptyDescription: '找到心仪的商品，加入购物车吧！',
    startShopping: '开始购物',
    subtotal: '小计',
    originalKrw: '韩元原价',
    subtotalKrw: '小计（韩元）',
    estimatedUsd: '预估（美元）',
    shippingNote: '运费、关税和服务费将在结算时计算。',
    processing: '处理中...',
    continue: '继续',
    quoteCta: '想了解含运费、关税和手续费的精确总价吗？',
    getQuote: '获取报价',
  },

  auth: {
    login: '登录',
    logout: '退出',
    loginRequired: '请登录以继续',
    guest: '访客',
  },

  ordersPage: {
    title: '我的订单',
    orderHistory: '订单记录',
    orderCount: '1笔订单',
    orderCountPlural: '笔订单',
    backToChat: '返回对话',
    refresh: '刷新',
    loadMore: '加载更多订单',
    loadingMore: '加载中...',
    loginRequired: '需要登录',
    loginRequiredDesc: '请登录以查看您的订单记录',
    orderReviewQueue: '订单审核队列',
    orderReviewQueueDesc: '查看已提交的订单请求和可支付的付款请求状态。',
    loadingIntents: '正在加载订单请求...',
    preparing: '准备中...',
    awaitingReview: '等待审核',
    actionRequired: '支付前需要操作',
    paymentStatusFailed: '检查支付状态失败：',
    paymentPending: '正在等待支付反映。Webhook同步可能需要30~120秒。',
    paymentPendingHint: '',
    manualRefresh: '手动刷新',
    retryCheck: '重新检查',
    paymentConfirmed: '付款已确认，订单已生成。',
    openOrder: '查看订单',
    webhookError: 'Webhook处理过程中发生错误，需要运营团队确认。',
    latestError: '最新错误：',
    paymentStatusError: '无法确认支付状态。',
    paymentLinkError: '生成支付链接失败。',
  },

  actions: {
    searchAgain: '重新搜索',
    findByUrl: '通过URL查找',
    viewFirst: '查看第一个',
    viewSecond: '查看第二个',
    viewThird: '查看第三个',
    searchMore: '搜索更多',
    startShopping: '开始购物',
    addToCart: '加入购物车',
    calculateShipping: '计算运费',
    findMore: '查找更多',
    parseAnotherUrl: '试试其他链接',
    checkout: '结账',
    continueShopping: '继续购物',
    viewCart: '查看购物车',
    clearCart: '清空购物车',
    viewOrders: '查看订单',
    clearMemory: '清除记录',
    viewMemory: '查看记录',
    shopMore: '继续逛逛',
    recommendKpop: 'K-pop专辑推荐',
    recommendBeauty: '韩国化妆品推荐',
    recommendSnacks: '韩国零食推荐',
    explainHowItWorks: '了解服务方式',
    explainFees: '费用说明',
    explainOrderFlow: '下单流程',
    findCheaperOptions: '更便宜的选择',
    explainPriceDrivers: '价格构成说明',
    reviewCurrentItem: '重新查看该商品',
    browseSuggestedProducts: '看看推荐商品',
    reviewChecklist: '查看检查清单',
    browseAlternatives: '看看类似商品',
    compareCriteria: '整理比较标准',
    shareProductName: '输入商品名称',
    reviewByLink: '通过链接查看',
  },
};

// All translations
export const translations: Record<Language, Translations> = {
  en,
  ko,
  zh,
};

// Get translation for a specific language
export function getTranslation(lang: Language): Translations {
  return translations[lang] || translations.en;
}

// Default language based on common browser locale patterns
export function detectBrowserLanguage(): Language {
  if (typeof navigator === 'undefined') return 'en';

  const browserLang = navigator.language.toLowerCase();

  if (browserLang.startsWith('ko')) return 'ko';
  if (browserLang.startsWith('zh')) return 'zh';

  return 'en';
}
