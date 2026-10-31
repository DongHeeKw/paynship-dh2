"""PayNShip Gemini model benchmark — extraction / agent tool-calling / HS classification."""
import json, re, html, time, sys, os, urllib.request, concurrent.futures as cf

KEY = [l.split('=', 1)[1].strip() for l in open('/Users/yohanpark/repo/paynship/kbuyer-latest/rebuild/.env') if l.startswith('GEMINI_API_KEY=')][0]
BASE = os.path.dirname(__file__)
MODELS = sys.argv[1].split(',') if len(sys.argv) > 1 else [
    'gemini-2.5-flash-lite', 'gemini-2.5-flash', 'gemini-3-flash-preview', 'gemini-3.1-flash-lite',
    'gemini-3.5-flash-lite', 'gemini-3.5-flash', 'gemini-3.6-flash', 'gemini-3.7-flash', 'gemini-3.8-flash',
    'gemini-3.1-pro-preview']
PRICE = {  # USD per 1M tokens (input, output) — ai.google.dev/gemini-api/docs/pricing, 2026-10-06
    'gemini-2.5-flash-lite': (0.10, 0.40), 'gemini-2.5-flash': (0.30, 2.50), 'gemini-3-flash-preview': (0.50, 3.00),
    'gemini-3.1-flash-lite': (0.25, 1.50), 'gemini-3.5-flash-lite': (0.30, 2.50), 'gemini-3.5-flash': (1.50, 9.00),
    'gemini-3.6-flash': (0.75, 3.75), 'gemini-3.7-flash': (0.75, 3.75), 'gemini-3.8-flash': (0.75, 3.75),
    'gemini-3.1-pro-preview': (2.00, 12.00)}


def call(model, body, retries=3):
    if os.environ.get('THINK'):
        body.setdefault('generationConfig', {})['thinkingConfig'] = {'thinkingLevel': os.environ['THINK']}
    url = f'https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={KEY}'
    for a in range(retries):
        t0 = time.time()
        try:
            req = urllib.request.Request(url, json.dumps(body).encode(), {'Content-Type': 'application/json'})
            d = json.load(urllib.request.urlopen(req, timeout=180))
            return d, time.time() - t0
        except urllib.error.HTTPError as e:
            msg = e.read().decode()[:200]
            if e.code in (429, 500, 503) and a < retries - 1:
                time.sleep(5 * (a + 1)); continue
            return {'error': f'{e.code} {msg}'}, time.time() - t0
        except Exception as e:
            if a < retries - 1: time.sleep(3); continue
            return {'error': str(e)[:200]}, time.time() - t0


def usage(d):
    u = d.get('usageMetadata', {})
    return u.get('promptTokenCount', 0), u.get('candidatesTokenCount', 0) + u.get('thoughtsTokenCount', 0)


def text_of(d):
    try: return ''.join(p.get('text', '') for p in d['candidates'][0]['content']['parts'])
    except Exception: return ''


# ---------- Task 1: product extraction ----------
def page_text(f):
    s = open(os.path.join(BASE, 'html', f), encoding='utf-8', errors='ignore').read()
    s = re.sub(r'<script.*?</script>|<style.*?</style>', '', s, flags=re.S)
    return re.sub(r'\s+', ' ', html.unescape(re.sub(r'<[^>]+>', ' ', s)))[:6000]

EXTRACT = [
    ('R1 무신사 반팔티(실페이지)', page_text('musinsa.html'),
     dict(price_krw=29900, in_stock=True, dangerous_goods='none', brand='이스케이프프롬', preorder=False)),
    ('R2 쿠팡 스니커즈(실페이지)', page_text('coupang.html'),
     dict(price_krw=11900, in_stock=True, dangerous_goods='none', net_weight_kg=0.48, food_or_quarantine=True)),
    ('S1 K-pop 앨범 예약', '[알라딘 음반] 스트레이 키즈 (Stray Kids) - 정규 5집 [KARMA] (3종 중 랜덤) 정가 25,000원 판매가 19,800원 (20% 할인) 예약판매 · 발매일 2026-10-20 출고 예정 | 구성: 포토북 72p, CD, 포토카드 2종 랜덤 | 버전 선택: Photobook Ver. A / Photobook Ver. B / Digipack Ver. | 상품 무게 450g | 배송비 무료',
     dict(price_krw=19800, in_stock=True, preorder=True, net_weight_kg=0.45, option_count=3, domestic_shipping_fee_krw=0, dangerous_goods='none')),
    ('S2 선크림 1+1 기획', '[올리브영] 라운드랩 자작나무 수분 선크림 50ml 1+1 기획 (50ml+50ml) 정상가 25,000원 → 22,000원 | 올영회원 카드 결제시 19,800원 | 옵션: 단품 기획 (일시품절) / 1+1 기획 | 배송비 2,500원 (20,000원 이상 무료배송) | 원산지: 대한민국',
     dict(price_krw=22000, in_stock=True, pack_quantity=2, dangerous_goods='none', domestic_shipping_fee_krw=0)),
    ('S3 스프레이 선크림(에어로졸)', '[11번가] 바이오더마 포토덤 선스프레이 SPF50+ 150ml 에어로졸 고압가스 사용 제품 | 판매가 18,500원 | 주의: 불꽃을 향해 분사하지 마시오, 40℃ 이상 장소에 보관하지 마시오 | 배송비 3,000원',
     dict(price_krw=18500, in_stock=True, dangerous_goods='aerosol', domestic_shipping_fee_krw=3000)),
    ('S4 응원봉(리튬 내장)', '[위버스샵] SEVENTEEN OFFICIAL LIGHT STICK VER.3 · 89,000원 | 내장 리튬이온 배터리 1,000mAh (USB-C 충전) | 블루투스 연동 | 무게 약 280g | 해외배송 불가 상품',
     dict(price_krw=89000, in_stock=True, dangerous_goods='lithium_battery', net_weight_kg=0.28)),
    ('S5 일시품절', '[무신사] 디스이즈네버댓 T-Logo 후드 스웨트셔츠 그레이 정가 89,000원 · 판매가 71,200원 | 사이즈: S(품절) M(품절) L(품절) XL(품절) | 재입고 알림 신청 | 일시품절',
     dict(price_krw=71200, in_stock=False, dangerous_goods='none')),
    ('S6 라면 멀티팩', '[G마켓] 농심 신라면 120g x 5개입 4,480원 | 배송비 3,000원 (30,000원 이상 구매 시 무료) | 판매자: 농심 공식스토어 | 유통기한 2027-03-01 까지',
     dict(price_krw=4480, in_stock=True, pack_quantity=5, net_weight_kg=0.6, food_or_quarantine=True, domestic_shipping_fee_krw=3000)),
    ('S7 혜택가 함정', '[29CM] 마르디 메크르디 플라워 맨투맨 네이비 | 정가 79,000원 | 판매가 63,200원 | 최대혜택가 51,900원 (첫구매 쿠폰 + 카드사 즉시할인 적용 시) | 적립금 최대 3,160원 | 무료배송',
     dict(price_krw=63200, in_stock=True, dangerous_goods='none', domestic_shipping_fee_krw=0)),
]
EXTRACT_SCHEMA = {'type': 'OBJECT', 'properties': {
    'product_name': {'type': 'STRING'}, 'brand': {'type': 'STRING', 'nullable': True},
    'price_krw': {'type': 'INTEGER', 'description': 'Price anyone can pay right now for ONE purchasable unit/listing, excluding member-only, first-purchase coupons, and card-issuer discounts.'},
    'list_price_krw': {'type': 'INTEGER', 'nullable': True},
    'in_stock': {'type': 'BOOLEAN', 'description': 'false only if the product (all options) cannot be ordered now'},
    'preorder': {'type': 'BOOLEAN'}, 'option_count': {'type': 'INTEGER'},
    'pack_quantity': {'type': 'INTEGER', 'description': 'number of identical units in the listing'},
    'net_weight_kg': {'type': 'NUMBER', 'nullable': True, 'description': 'total net weight of the listing if stated, else null'},
    'domestic_shipping_fee_krw': {'type': 'INTEGER', 'nullable': True, 'description': 'Korean domestic shipping fee for buying this single listing'},
    'dangerous_goods': {'type': 'STRING', 'enum': ['none', 'lithium_battery', 'aerosol', 'flammable_liquid', 'other']},
    'food_or_quarantine': {'type': 'BOOLEAN'}, 'category': {'type': 'STRING'}},
    'required': ['product_name', 'price_krw', 'in_stock', 'preorder', 'pack_quantity', 'dangerous_goods', 'food_or_quarantine', 'option_count']}
EXTRACT_SYS = 'You extract product facts from Korean shopping pages for a cross-border purchasing agent. Use only facts on the page. Return JSON.'


def score_extract(out, exp):
    ok = 0
    for k, v in exp.items():
        g = out.get(k)
        if k == 'net_weight_kg': hit = isinstance(g, (int, float)) and abs(g - v) <= 0.1 * v
        elif k == 'brand': hit = isinstance(g, str) and (v in g or 'ESCAPEFROM' in g.upper())
        else: hit = g == v
        ok += hit
    return ok, len(exp)


# ---------- Task 2: agent tool selection ----------
TOOLS = [{'functionDeclarations': [
    {'name': 'quote_from_url', 'description': 'Get a landed-cost quote for a Korean product URL.', 'parameters': {'type': 'OBJECT', 'properties': {'url': {'type': 'STRING'}, 'destination_country': {'type': 'STRING', 'description': 'ISO 3166-1 alpha-2'}}, 'required': ['url']}},
    {'name': 'search_products', 'description': 'Search Korean shops for products by keyword.', 'parameters': {'type': 'OBJECT', 'properties': {'query': {'type': 'STRING'}}, 'required': ['query']}},
    {'name': 'add_to_cart', 'description': 'Add a quoted item to cart.', 'parameters': {'type': 'OBJECT', 'properties': {'quote_ref': {'type': 'STRING'}, 'quantity': {'type': 'INTEGER'}}, 'required': ['quote_ref']}},
    {'name': 'get_order_status', 'description': 'Look up an order.', 'parameters': {'type': 'OBJECT', 'properties': {'order_ref': {'type': 'STRING'}}, 'required': ['order_ref']}},
    {'name': 'request_cancellation', 'description': 'Request cancellation of an order.', 'parameters': {'type': 'OBJECT', 'properties': {'order_ref': {'type': 'STRING'}, 'reason': {'type': 'STRING'}}, 'required': ['order_ref']}},
    {'name': 'respond_inspection', 'description': 'Answer a warehouse inspection request for an order.', 'parameters': {'type': 'OBJECT', 'properties': {'order_ref': {'type': 'STRING'}, 'decision': {'type': 'STRING', 'enum': ['ship_as_is', 'refund', 'return_to_seller']}}, 'required': ['order_ref', 'decision']}},
    {'name': 'talk_to_human', 'description': 'Escalate to a human operator.', 'parameters': {'type': 'OBJECT', 'properties': {'reason': {'type': 'STRING'}}, 'required': ['reason']}},
]}]
AGENT_SYS = 'You are PayNShip, a shopping agent that buys Korean products for overseas customers and ships them. Call exactly one tool when a tool fits; never call tools for items prohibited for international shipping (vapes/e-liquids, weapons, drugs) — explain instead.'
AGENT = [
    ('A1 URL+텍사스', [('user', 'https://www.musinsa.com/products/3955419 how much to get this shipped to Texas?')], ('quote_from_url', {'url': 'musinsa.com/products/3955419', 'destination_country': 'US'})),
    ('A2 한국어 일본', [('user', '이 립스틱 일본으로 보내면 얼마야? https://www.oliveyoung.co.kr/store/goods/getGoodsDetail.do?goodsNo=A000000184228')], ('quote_from_url', {'destination_country': 'JP'})),
    ('A3 검색', [('user', 'Can you find the newest Stray Kids album for me?')], ('search_products', {'query': 'stray kids'})),
    ('A4 주문조회', [('user', "where's my order PNS-20481??")], ('get_order_status', {'order_ref': 'PNS-20481'})),
    ('A5 취소', [('user', 'I want to cancel PNS-20481, found it cheaper elsewhere')], ('request_cancellation', {'order_ref': 'PNS-20481'})),
    ('A6 검수응답', [('user', 'The inspection photo of my hoodie (order PNS-1102) shows a stain. Just refund me please.')], ('respond_inspection', {'order_ref': 'PNS-1102', 'decision': 'refund'})),
    ('A7 상담원', [('user', "This is ridiculous, I've been charged twice. I need a real person.")], ('talk_to_human', {})),
    ('A8 문맥 장바구니', [('user', 'how much is https://www.musinsa.com/products/3955419 to Canada?'), ('model', 'Quote Q-77: $41.20 delivered to Canada (item $21.36, fee $2.80, shipping $14.10, duty/tax $2.94).'), ('user', 'great, add 2 of those to my cart')], ('add_to_cart', {'quote_ref': 'Q-77', 'quantity': 2})),
    ('A9 금지품목', [('user', 'Can you buy me Korean vape liquid (니코틴 액상) and ship it to LA?')], (None, {})),
    ('A10 중국어 싱가포르', [('user', '我想买这个面膜寄到新加坡 https://global.oliveyoung.com/product/detail?prdtNo=GA210001520')], ('quote_from_url', {'destination_country': 'SG'})),
]


def score_agent(d, exp):
    name, args = exp
    try: parts = d['candidates'][0]['content']['parts']
    except Exception: return 0
    fc = next((p['functionCall'] for p in parts if 'functionCall' in p), None)
    if name is None: return int(fc is None)
    if not fc or fc['name'] != name: return 0
    a = fc.get('args', {})
    for k, v in args.items():
        g = a.get(k)
        if isinstance(v, str) and k in ('url', 'query'):
            if not (isinstance(g, str) and v.lower() in g.lower()): return 0
        elif str(g).upper() != str(v).upper(): return 0
    return 1


# ---------- Task 3: HS code ----------
HS = [
    ('K-pop album: CD + 72-page photobook + photocards, boxed', ['8523']),
    ('100% cotton knitted short-sleeve printed T-shirt, men', ['6109']),
    ('Sunscreen cream SPF50 50ml (cosmetic)', ['3304']),
    ('Instant ramen noodles with soup sachet, 120g x 5', ['1902']),
    ('Chocolate-coated peanut caramel bar, 40g x 12', ['1806']),
    ('Porcelain coffee mug with printed character', ['6912', '6911']),
    ('Silicone smartphone case', ['3926', '4202']),
    ('K-pop LED light stick, built-in rechargeable lithium battery, bluetooth', ['8513', '9405']),
    ("Women's genuine leather handbag", ['4202']),
    ('Korean red ginseng extract concentrate, 240g jar', ['2106', '1302']),
]
HS_SCHEMA = {'type': 'OBJECT', 'properties': {'hs6': {'type': 'STRING', 'description': '6-digit HS code, digits only'}}, 'required': ['hs6']}


def run_model(m):
    res = {'model': m, 'ext': [0, 0], 'agent': 0, 'hs': 0, 'lat': [], 'tin': 0, 'tout': 0, 'errors': [], 'detail': []}
    def acc(d, dt):
        res['lat'].append(dt); i, o = usage(d); res['tin'] += i; res['tout'] += o
        if 'error' in d: res['errors'].append(d['error'][:120])
    for name, page, exp in EXTRACT:
        body = {'systemInstruction': {'parts': [{'text': EXTRACT_SYS}]}, 'contents': [{'role': 'user', 'parts': [{'text': page}]}],
                'generationConfig': {'responseMimeType': 'application/json', 'responseSchema': EXTRACT_SCHEMA, 'temperature': 0}}
        d, dt = call(m, body); acc(d, dt)
        try: out = json.loads(text_of(d))
        except Exception: out = {}
        ok, n = score_extract(out, exp); res['ext'][0] += ok; res['ext'][1] += n
        res['detail'].append((name, f'{ok}/{n}', {k: out.get(k) for k in exp}))
    for name, conv, exp in AGENT:
        body = {'systemInstruction': {'parts': [{'text': AGENT_SYS}]}, 'tools': TOOLS,
                'contents': [{'role': r, 'parts': [{'text': t}]} for r, t in conv], 'generationConfig': {'temperature': 0}}
        d, dt = call(m, body); acc(d, dt); s = score_agent(d, exp); res['agent'] += s
        if not s:
            try: fc = next((p.get('functionCall') for p in d['candidates'][0]['content']['parts'] if 'functionCall' in p), None)
            except Exception: fc = d.get('error')
            res['detail'].append((name, 'FAIL', fc))
    for desc, ok4 in HS:
        body = {'contents': [{'role': 'user', 'parts': [{'text': f'Classify for export from Korea. Product: {desc}'}]}],
                'generationConfig': {'responseMimeType': 'application/json', 'responseSchema': HS_SCHEMA, 'temperature': 0}}
        d, dt = call(m, body); acc(d, dt)
        try: code = re.sub(r'\D', '', json.loads(text_of(d))['hs6'])
        except Exception: code = ''
        hit = code[:4] in ok4; res['hs'] += hit
        if not hit: res['detail'].append(('HS ' + desc[:30], 'FAIL', code))
    return res


if __name__ == '__main__':
    with cf.ThreadPoolExecutor(len(MODELS)) as ex:
        results = list(ex.map(run_model, MODELS))
    json.dump(results, open(os.path.join(BASE, f"results_{os.environ.get('THINK','default')}.json"), 'w'), ensure_ascii=False, indent=1)
    n_calls = len(EXTRACT) + len(AGENT) + len(HS)
    print(f"{'model':26s} {'추출':>7s} {'도구':>5s} {'HS':>5s} {'p50s':>5s} {'p90s':>5s} {'$/1k콜':>7s} err")
    for r in results:
        lat = sorted(r['lat']); p50 = lat[len(lat)//2]; p90 = lat[int(len(lat)*0.9)-1]
        pi, po = PRICE.get(r['model'], (0, 0)); cost = (r['tin']*pi + r['tout']*po) / 1e6 / n_calls * 1000
        print(f"{r['model']:26s} {r['ext'][0]:>3d}/{r['ext'][1]:<3d} {r['agent']:>2d}/{len(AGENT):<2d} {r['hs']:>2d}/{len(HS):<2d} {p50:5.1f} {p90:5.1f} {cost:7.3f} {len(r['errors'])}")
