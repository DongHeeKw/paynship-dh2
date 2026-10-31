# -*- coding: utf-8 -*-
"""요구정의 및 기능목록 XLSX — V1.5 기획 시트 양식 클론(레스토지니 출퇴근 타각 생성기에서 가져옴).
본문은 paynship/docs/02_요구정의_기능목록.md 를 파싱해 채운다(단일 출처).
WBS · MVP 우선순위 두 탭은 이 파일이 정본(v0.3, 2026-10-07 — 일정 = v0.3 변경 시트 §1.2 + §1.0 일정 조정(합포장 +1주))."""
import io, re, datetime as dt
from pathlib import Path
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

MD = Path(__file__).resolve().parents[2] / '02_요구정의_기능목록.md'
OUT = Path(__file__).resolve().parents[2] / '02_요구정의_기능목록_v0.3.xlsx'

# ---------- template style constants (측정값) ----------
HDR_NAVY = 'FF1F3864'; HDR_GRAY = 'FFD9D9D9'; HDR_TEAL = 'FFA7B9B7'; HDR_DARK = 'FF434343'
ROW_MINT = 'FFEFFFFD'; BG_MODAL = 'FFFFF2CC'; LT_GRAY = 'FFEFEFEF'; F3 = 'FFF3F3F3'
BLUE = 'FF1155CC'; ORANGE = 'FFE69138'; GREEN = 'FF38761D'; RED_F = 'FF0000FF'
C_GRAY = 'FFB7B7B7'; C_RED = 'FFFF0000'; C_PURPLE = 'FF9900FF'; C_WHITE = 'FFFFFFFF'
THIN = Side(style='thin', color='FFA6A6A6')
BORDER = Border(left=THIN, right=THIN, top=THIN, bottom=THIN)
F9 = Font(size=9); F9B = Font(size=9, bold=True)
WRAP = Alignment(wrap_text=True, vertical='center')
WRAPT = Alignment(wrap_text=True, vertical='top')
CTR = Alignment(horizontal='center', vertical='center', wrap_text=True)


def fill(c): return PatternFill('solid', fgColor=c)


def put(ws, row, col, val, *, font=F9, fillc=None, align=WRAPT, border=True):
    c = ws.cell(row=row, column=col, value=val)
    c.font = font; c.alignment = align
    if fillc: c.fill = fill(fillc)
    if border: c.border = BORDER
    return c


def header(ws, row, col0, labels, fillc=HDR_GRAY, font=F9B, h=None):
    for i, t in enumerate(labels):
        put(ws, row, col0 + i, t, font=font, fillc=fillc, align=CTR)
    if h: ws.row_dimensions[row].height = h


def widths(ws, spec):
    for col, w in spec.items():
        ws.column_dimensions[col].width = w


# ---------- markdown parsing ----------
def md_tables(text):
    """returns list of (heading, rows[list[list[str]]])"""
    out = []; heading = ''; rows = None
    for line in text.split('\n'):
        if line.startswith('#'):
            heading = line.lstrip('#').strip()
            rows = None
            continue
        if line.startswith('|'):
            cells = [c.strip() for c in line.strip().strip('|').split('|')]
            if set(''.join(cells)) <= set('-: '):
                continue
            if rows is None:
                rows = []; out.append((heading, rows))
            rows.append(cells)
        else:
            rows = None
    return out


def clean(s):
    s = re.sub(r'\*\*(.*?)\*\*', r'\1', s)
    s = re.sub(r'~~(.*?)~~', r'\1', s)
    s = re.sub(r'`(.*?)`', r'\1', s)
    s = s.replace('<br>', '\n')
    return s.strip()


TXT = io.open(MD, encoding='utf-8').read()
TBL = md_tables(TXT)
def table(head_starts, idx=0):
    got = [r for h, r in TBL if h.startswith(head_starts)]
    return [[clean(c) for c in row] for row in got[idx]]


REQ = table('1. 요구사항 목록')
# 요구 번호 오름차순 정렬 (md 의 작성 순서는 유지, 시트만 정렬 — 레드팀 QA RT-10)
REQ = [REQ[0]] + sorted(REQ[1:], key=lambda r: float(r[0]) if r[0].replace('.', '', 1).isdigit() else 999)
MENU_S = table('2.1')
MENU_A = table('2.2')
MENU_H = table('2.3')
FR_S = table('3.1')
FR_A = table('3.2')
FR_H = table('3.3')
CHECK = table('4. 확인 필요')

wb = openpyxl.Workbook()

# =====================================================================
# 1. WBS
# =====================================================================
ws = wb.active; ws.title = 'WBS'
put(ws, 1, 4, '진행 방식', font=Font(bold=True), border=False)
put(ws, 1, 5, '확정 결정(G0, 2026-10-07 완료) → rebuild 기반 통합·이식(M0~M3) → 미국 소프트런칭(M4, 첫 매출)', font=Font(bold=True), border=False)
put(ws, 2, 4, '목표 일정', font=Font(bold=True), border=False)
put(ws, 2, 5, '2026.10 ~ 2027.01 — 이 WBS 날짜가 일정 기준(v0.3, 2026-10-07). 첫 실매출 2027-01 말(G0 후 약 16주), 외부 계약 · 법무가 실제 출시일을 좌우', font=Font(bold=True), border=False)
WBS_COLS = ['NO', '구분', '세부항목', '', '업무유형', '설명', '이슈 및 비고', '담당자', '시작일', '종료일', '상태']
# B..M  (D:E merged as 세부항목)
hdr = ['NO', '구분', '세부항목', None, '업무유형', '설명', '이슈 및 비고', '담당자', '시작일', '종료일', '상태']
for i, t in enumerate(hdr):
    if t is None: continue
    put(ws, 3, 2 + i, t, font=Font(size=9, bold=True, color=C_WHITE),
        fillc=HDR_DARK if i < 8 else 'FFCCCCCC', align=CTR)
    if i >= 8: ws.cell(row=3, column=2 + i).font = Font(size=9, bold=True)
ws.merge_cells(start_row=3, start_column=4, end_row=3, end_column=5)

D0 = dt.date(2026, 10, 5); D1 = dt.date(2027, 1, 29)
DAYS = (D1 - D0).days + 1
GANTT0 = 13  # column M
for k in range(DAYS):
    d = D0 + dt.timedelta(days=k)
    c = put(ws, 3, GANTT0 + k, d, font=Font(size=8, bold=True), fillc='FFCFE2F3', align=CTR)
    c.number_format = 'mm/dd'
    ws.column_dimensions[get_column_letter(GANTT0 + k)].width = 2.6

DEV = '인수 개발자'  # D10: 개발 = 인수 개발자(GitHub DongHeeKw) + AI, 최종 결정 = 박요한
WBS = [
    ('1.0', '기획 · 결정', '', '', '', '', '', '', '', 'group'),
    ('1.1', '', '코드베이스 분석 · 비교 · 스토리보드', '기획', 'A(kbuyer-v2) · A\'(레거시) · B(rebuild) 비교, 고객 · 운영자 스토리보드', '근거 문서 docs/261006_*', '박요한', '2026-10-06', '2026-10-06', '완료'),
    ('1.2', '', '정책서 · 요구정의 · 통합 PRD · 레드팀 사전 QA(v0.2)', '기획', '계획안 3종 + 레드팀 사전 QA 16건 반영', '', '박요한', '2026-10-06', '2026-10-06', '완료'),
    ('1.3', '', 'G0 확정 결정', '기획', 'S0~S9 · D1~D10 · P-1~P-9 · 검수 · 관세 초과 · 수익원 · S4 하이브리드 원장 확정 + 오후 추가 확정(약관 운영값 11건 D-a~D-k · 합포장)', '최종 결정 = 박요한(261007)', '박요한', '2026-10-07', '2026-10-07', '완료'),
    ('1.4', '', '계획 문서 v0.3 개정 · 약관 개정안 목록 · ADR', '기획', '01 · 02 · 03 · 89 v0.3, ADR shopify-hybrid-ledger(Accepted) · Gemini ADR Accepted', '단일 기준 = v0.3 변경 시트', '박요한', '2026-10-07', '2026-10-09', '진행'),
    ('2.0', '외부 트랙', '', '', '', '', '', '', '', 'group'),
    ('2.1', '', '결제 수단 가입 · 사업자 인증', '사업', 'PortOne · PayPal 병행 준비 (S9)', '먼저 끝난 하나로 출시', '박요한', '2026-10-08', '2026-11-27', '대기'),
    ('2.2', '', '특송 계약 · 통관 수수료', '사업', 'AcrossB 또는 DHL DDP 계약, 관세 초과 청구 증빙', '견적 단가 확정 조건', '박요한', '2026-10-08', '2026-11-20', '대기'),
    ('2.3', '', '관세사 확인', '법무', 'KORUS 신고 · 원산지 보관 · 앨범 분할 신고 · 301 12.5% · 미국 식품 · 합포장 신고 단위', '', '박요한', '2026-10-08', '2026-10-30', '대기'),
    ('2.4', '', '약관 개정안 · 처리방침 변호사 검토', '법무', '약관 개정안 목록 · 개인정보 국외 이전 · 수익원 고지 문구', '검토 전 외부 게시 금지', '박요한', '2026-10-12', '2026-12-04', '대기'),
    ('2.5', '', '세무사 확인', '법무', '부가세 영세율 환급 증빙 요건(수출신고 · 매입 증빙)', '수익원 ③', '박요한', '2026-10-12', '2026-11-13', '대기'),
    ('2.6', '', '창고 · Shopify 플랜 결정', '사업', '창고 주소 · 운영자 · 촬영 장비 · 포장재, Shopify 현행 요금표', '', '박요한', '2026-10-08', '2026-11-20', '대기'),
    ('3.0', 'M0 기반', '', '', '', '', '', '', '', 'group'),
    ('3.1', '', 'B 교착 수정 4건', '개발', '정산 시 발주 작업(E8 스키마) · 의향 승인/거절 API · 구매 실패 전이(RT-02) · purchasedAt(RT-11)', '', DEV, '2026-10-08', '2026-10-14', '대기'),
    ('3.2', '', '릴리스 블로커 4건 · CI Postgres', '개발', 'STATUS 릴리스 블로커 + DB 포함 CI', '', DEV, '2026-10-12', '2026-10-16', '대기'),
    ('3.3', '', 'D2 main 교체(M0 직후)', '개발', 'paynship-v2 레포 재사용 — 백업 태그 a-final + Vercel 자동 배포 해제 후 force push', '최종 결정 = 박요한', '박요한 · ' + DEV, '2026-10-16', '2026-10-16', '대기'),
    ('4.0', 'M1 업그레이드', '', '', '', '', '', '', '', 'group'),
    ('4.1', '', '메이저 업그레이드(1주)', '개발', 'next 16 · prisma 7 · genai 2 · zod 4 · vitest 5', '넘치면 출시 후로', DEV, '2026-10-19', '2026-10-23', '대기'),
    ('5.0', 'M2 MVP 코어', '', '', '', '', '', '', '', 'group'),
    ('5.1', '', 'S4 Shopify 하이브리드 원장', '개발', '웹훅 7토픽 · 태그 미러 · fulfillment 정본 · 환불 확정(refunds/create) · 일일 대사 · 차지백 웹훅', '첫 주에 fulfillment 가능 여부 조사 · 약 1.5~2.5주', DEV, '2026-10-26', '2026-11-11', '대기'),
    ('5.2', '', '정책 반영 · 관세 규칙 · 환율 · 수수료', '개발', '상품가×10% 최소 $5 · 301 하한(canon ADR) · 앨범 예외 · 표시 통화 8 · 자동 승인 규칙(P-6)', '요구 61~63 · 6.0 · 33.1', DEV, '2026-10-26', '2026-11-06', '대기'),
    ('5.3', '', '무게 버퍼 · 수익원 설정', '개발', '청구 무게 ×1.2(P-2) · 배송 마크업 · 환율 마진(RateContext)', '요구 40.0 · 75.0', DEV, '2026-11-02', '2026-11-06', '대기'),
    ('5.4', '', '예외 결제 단계', '개발', 'PRICE_ADJUSTMENT(P-1) · TAX_OVERAGE(관세 초과) · 정산 분기 · 다주문 환불', '요구 37.0 · 42.0 · 58.0', DEV, '2026-11-09', '2026-11-13', '대기'),
    ('5.5', '', 'Shopify 할인(P-8)', '개발', 'appliedDiscount · 할인 후 금액 정산 기준(AMOUNT_MISMATCH 수정)', '', DEV, '2026-11-16', '2026-11-18', '대기'),
    ('5.6', '', '에이전트 v0 · 장바구니 · 로그인', '개발', '도구 호출 에이전트 · 2-pane 채팅 · 결제 전 로그인 · 게스트 HMAC 이전', '요구 2.0 · 7.0 · 8.0', DEV, '2026-10-26', '2026-11-20', '대기'),
    ('5.7', '', '결제 완료 · 배송 안내 페이지', '개발', '주문번호 · 다음 단계 · 리드타임 · 관세 고지', '요구 26.0', DEV, '2026-11-18', '2026-11-20', '대기'),
    ('5.8', '', '라벨 코퍼스 · 커버리지', '개발', 'K-pop · 뷰티 실페이지 50~100개', '요구 71.0', '박요한', '2026-10-26', '2026-11-13', '대기'),
    ('6.0', 'M3 운영 최소셋', '', '', '', '', '', '', '', 'group'),
    ('6.1', '', '오늘 할 일 · 의향 검토 · 주문 상세 · 회사 취소', '개발', 'A\' 화면 이식 → B 서비스 연결', '요구 30~32', DEV, '2026-11-23', '2026-12-02', '대기'),
    ('6.2', '', '발주 · 구매 기록 · 최저가 추천 · 카탈로그', '개발', '요구 34~38 (S7 — 스캔 결과 운영자 전용)', '', DEV, '2026-11-23', '2026-12-04', '대기'),
    ('6.3', '', '셀프 취소(P-9)', '개발', '구매 전 즉시 취소 · 행 잠금 · orderCancel · 이후 요청 접수(P-4 비용)', '요구 16.0', DEV, '2026-11-30', '2026-12-02', '대기'),
    ('6.4', '', '입고 · 검수 · 실측 · 환불', '개발', '미개봉 기본 검수 · 실측 버퍼 판정 · 환불 확정', '요구 39~43', DEV, '2026-12-01', '2026-12-08', '대기'),
    ('6.5', '', '디테일 검수 $7 · 판매처 교환', '개발', '체크아웃 선택 · 체크리스트 · 결과 항상 고객 확정(D-a) · 이상 시 3선택 · 교환 대행', '요구 14.0 · 24.0', DEV, '2026-12-07', '2026-12-11', '대기'),
    ('6.6', '', '반품 기한 · 환불 계산기(P-3)', '개발', '5영업일 · 7역일 · 14역일 sweeper · 결제액 − DDP − $10', '요구 22.0', DEV, '2026-12-03', '2026-12-08', '대기'),
    ('6.7', '', '분실·파손 클레임 · 관세 초과 청구', '개발', '고객 접수 · 운영 처리 · 7일 기한 · 미납 차단', '요구 25.0 · 58.0', DEV, '2026-12-09', '2026-12-11', '대기'),
    ('6.8', '', '재무 대사 · 차단 사용자 · Shopify 연동 화면', '개발', '일별 결제액 vs 실구매가 · 차단 · 해제 · 웹훅 실패 재처리', '요구 55~57', DEV, '2026-12-14', '2026-12-16', '대기'),
    ('6.9', '', '분석 이벤트 · CS 1차 응답 · 장기 보류 보관 기한', '개발', '퍼널 이벤트 · 24h sweeper · 45일 → $1/일 → 75일 폐기(FR-B-063)', '요구 77.0 · 78.0 · 65.0', DEV, '2026-12-14', '2026-12-16', '대기'),
    ('6.10', '', '운영자 개인 인증(E11)', '개발', '공용 토큰 · 자기 신고 행위자 제거', 'M3 수용 테스트 전 필수 · FR-B-072', DEV, '2026-12-07', '2026-12-11', '대기'),
    ('6.11', '', '합포장(약 1주)', '개발', '고객 합포장 요청 · 배송비 미리보기 · 창고 실측 · 승인 · 배송비 재계산 · 출고 시 부분 환불', '요구 27.0 · FR-C-048 · FR-O-049 · FR-B-019 · 관세 신고 단위 관세사 확인(D-g)', DEV, '2026-12-14', '2026-12-18', '대기'),
    ('6.12', '', 'M3 수용 테스트', '개발', 'e2e: 셀프 취소 경합 · 예외 결제 3종 · 할인 정산 · 반품 기한 · 디테일 검수 확정 · 클레임 · 대사 · 합포장 부분 환불', '', '박요한 · ' + DEV, '2026-12-21', '2026-12-24', '대기'),
    ('7.0', 'M4 출시', '', '', '', '', '', '', '', 'group'),
    ('7.1', '', '보안 · 인프라 · KPI 대시보드', '개발', '요구 51 · 54 · 69 · 70', '월 $100 이하(Shopify 구독료 · 결제 수수료 제외)', DEV, '2026-12-28', '2027-01-15', '대기'),
    ('7.2', '', '부가세 영세율 환급 증빙 관리', '개발', '주문별 매입 증빙 · 수출 신고 목록 내보내기', '요구 76.0 · 세무사 확인 후', DEV, '2027-01-11', '2027-01-15', '대기'),
    ('7.3', '', '약관 개정 반영 · 게시', '법무', '변호사 검토 결과 반영 후 게시', '검토 전 외부 게시 금지', '박요한', '2027-01-11', '2027-01-22', '대기'),
    ('7.4', '', '스테이징 동등성 · 실결제 E2E · 소프트런칭', '운영', '실결제 1건 E2E → 미국 소규모 모집', '첫 실매출 2027-01 말(G0 후 약 16주)', '박요한 · ' + DEV, '2027-01-18', '2027-01-29', '대기'),
    ('8.0', 'M5 확장', '', '', '', '', '', '', '', 'group'),
    ('8.1', '', '다국어 · 검색 · 박스 분리 · 마진 리포트', '개발', 'P2 항목', '데이터 보고 우선순위 조정', DEV, '', '', '대기'),
]
BAR = {'기획 · 결정': 'FF9FC5E8', '외부 트랙': 'FFFFE599', 'M0 기반': 'FFB6D7A8', 'M1 업그레이드': 'FFB6D7A8',
       'M2 MVP 코어': 'FFB6D7A8', 'M3 운영 최소셋': 'FFB6D7A8', 'M4 출시': 'FFEA9999', 'M5 확장': 'FFD9D2E9'}
r = 4; group_color = 'FF1C4587'; cur = ''
for row in WBS:
    no, gubun, item, wtype, desc, note, owner, s0, s1, state = row
    if state == 'group':
        cur = gubun
        for col in range(2, 13):
            put(ws, r, col, None, fillc=group_color)
        put(ws, r, 2, no, font=Font(size=9, bold=True, color=C_WHITE), fillc=group_color, align=CTR)
        put(ws, r, 3, gubun, font=Font(size=9, bold=True, color=C_WHITE), fillc=group_color)
    else:
        put(ws, r, 2, no, font=F9, align=CTR)
        put(ws, r, 3, '', font=F9)
        put(ws, r, 4, item, font=F9); put(ws, r, 5, '', font=F9)
        ws.merge_cells(start_row=r, start_column=4, end_row=r, end_column=5)
        put(ws, r, 6, wtype, font=F9, align=CTR)
        put(ws, r, 7, desc, font=F9)
        put(ws, r, 8, note, font=F9)
        put(ws, r, 9, owner, font=F9, align=CTR)
        for k, v in ((10, s0), (11, s1)):
            c = put(ws, r, k, dt.date.fromisoformat(v) if v else '', font=F9, align=CTR)
            if v: c.number_format = 'yyyy-mm-dd'
        put(ws, r, 12, state, font=F9 if state != '완료' else Font(size=9, color='FF38761D'), align=CTR)
        if s0 and s1:
            a, b = dt.date.fromisoformat(s0), dt.date.fromisoformat(s1)
            for k in range(DAYS):
                d = D0 + dt.timedelta(days=k)
                if a <= d <= b:
                    put(ws, r, GANTT0 + k, None, fillc=BAR.get(cur, 'FFCCCCCC'))
        ws.row_dimensions[r].height = 30
    r += 1
widths(ws, {'A': 1.6, 'B': 6.9, 'C': 9.5, 'D': 12.6, 'E': 25.6, 'F': 10.6, 'G': 34, 'H': 30, 'I': 9, 'J': 11, 'K': 11, 'L': 8})
ws.freeze_panes = 'M4'

# =====================================================================
# 2. 우선순위
# =====================================================================
ws = wb.create_sheet('MVP 우선순위')
put(ws, 1, 1, '진행 방식', font=Font(size=11, bold=True), border=False)
put(ws, 1, 2, 'G0 확정(2026-10-07 완료) → M0~M3 → M4 미국 소프트런칭 → M5 확장 · v0.3', border=False)
put(ws, 2, 1, '목표 일정', font=Font(bold=True), border=False)
put(ws, 2, 2, '2026.10 ~ 2027.01 (첫 실매출 2027-01 말, G0 후 약 16주)', border=False)
put(ws, 4, 2, 'PayNShip MVP 항목별 우선순위', font=Font(bold=True, color=RED_F), border=False)
put(ws, 4, 5, '도입 항목', font=Font(bold=True, color=C_WHITE), fillc=RED_F, align=CTR)
ws.merge_cells('E4:G4')
put(ws, 4, 8, '적용 방향', font=Font(bold=True, color=C_WHITE), fillc=ORANGE, align=CTR)
ws.merge_cells('H4:J4')
put(ws, 4, 11, '비고', font=Font(bold=True, color=C_WHITE), fillc=GREEN, align=CTR)
ws.merge_cells('K4:K5')
for i, t in enumerate(['우선순위', '구분', '1depth 메뉴', '2depth 메뉴']):
    put(ws, 5, 1 + i, t, font=F9B, fillc=LT_GRAY, align=CTR)
for i, t in enumerate(['공통', '고객', '운영']):
    put(ws, 5, 5 + i, t, font=Font(size=11, bold=True), fillc='FF9FC5E8', align=CTR)
for i, t in enumerate(['공통', '고객', '운영']):
    put(ws, 5, 8 + i, t, font=F9B, fillc='FFFCE5CD', align=CTR)
PRI = [
    ('완료', '선행', '결정', 'G0', '', '', 'B(rebuild) 단일 기반 · S0~S9 · D1~D10 · P-1~P-9 · 검수 · 관세 초과 · 수익원 · 약관 운영값 D-a~D-k · 합포장', '최종 결정 = 박요한', '', '', '2026-10-07 확정'),
    ('ASAP', '선행', '외부', '결제 · 배송 · 법무 · 세무', '', '', 'PortOne · PayPal 가입 · 특송 계약 · 관세사 · 변호사(약관 개정안) · 세무사(영세율) · 창고', '출시일을 결정하는 트랙', '', '', '결제 수단은 먼저 끝난 하나로 출시(S9)'),
    ('ASAP', '선행', '기반', 'M0 교착 · D2', '', '', '교착 4건 · 릴리스 블로커 4건 · CI Postgres → main 교체', '', '', 'M0 완료 후 force push', 'D2'),
    ('1.0', '신규', '견적', 'URL 견적', 'DDP 총액 · 검증 게이트 · 무게 버퍼 ×1.2 · 수익원(배송 마크업 · 환율 마진)', '', '', '관세 문구: DDP 선납, 재분류 시에만 차액 청구', '', '', 'P-2 · 수익원'),
    ('1.0', '신규', '채팅', '에이전트 v0', '', 'URL · 옵션 확인 → 견적 → 장바구니 → 결제 안내 · 구매 전 취소', '', '', 'AI 는 가격을 만들지 않는다 · 스캔 결과 비노출', '', 'S2 · S7'),
    ('1.0', '신규', '결제', '1회 결제 + 예외 3종', '', '로그인 → 배송지 → Shopify 결제(USD) · 할인 · 결제 완료 페이지', '', '', '예외 = 실측 초과 · 가격 상승 초과 · 관세 초과', '', 'S1 · S9 · D7 · P-8'),
    ('1.0', '신규', '결제', 'S4 하이브리드 원장', 'Shopify = 주문 · 결제 · 환불 · 출고 정본 / DB = 운영 정본 · 웹훅 7토픽 · 태그 미러 · 일일 대사', '', '', 'Shopify 확인 후 환불 완료', '', '', 'S4 · M2'),
    ('1.0', '신규', '견적', '관세 · 수수료', '미국 301 하한 12.5% · 앨범 예외 · 결제 및 대행 수수료 상품가×10% 최소 $5', '', '', '', '', '', 'S3 · S5'),
    ('2.0', '신규', '발주', '구매 기록 · 최저가', '', '', '발주 작업 자동 생성 · 구매 기록(쿠폰 · 포인트 · 매입 증빙) · 판매처 추천 Top3 · 가격 변동 처리', '', '', '허용 max(5%, $3) 흡수, 초과분만 추가 결제(48h)', 'S7 · P-1'),
    ('2.0', '신규', '창고', '입고 · 검수 · 출고', '', '디테일 검수 선택($7/판매처) · 검수 응답 3선택', '미개봉 기본 검수 · 디테일 검수 · 판매처 교환 · 실측 버퍼 판정 · fulfillment 출고', '', '결과 항상 고객 확정 · 72시간 무응답 = 확정(그대로 발송)', '', 'D6 · 검수 · D-a'),
    ('2.0', '신규', '창고', '합포장', '', '합포장 요청(출고 전 결제 완료 2건 이상 · 배송비 미리보기)', '합포장 처리(묶은 상자 실측 · 승인) · 배송비 재계산', '', '줄어든 배송비 차액은 출고 때 부분 환불', '늘면 묶기 불가 · 관세 신고 단위 변경 시 재계산(관세사 확인)', 'D-g · M3 · 약 1주'),
    ('2.0', '신규', '예외', '취소 · 반품 · 클레임', '', '구매 전 즉시 셀프 취소 · 반품(5영업일 · 영상) · 분실 · 파손 클레임', '환불(Shopify 확인 후 완료) · 차지백 · 관세 초과 청구 · 차단 사용자', '', '', '반송비 고객 선불 · 환불 − DDP − $10', 'P-3 · P-4 · P-9'),
    ('2.0', '신규', '운영', '대사 · 연동 · 분석', '', '', '재무 대사 · Shopify 연동 상태 · 분석 이벤트 · CS 1차 응답 24h', '', '', '', 'M3'),
    ('3.0', '신규', '운영', 'KPI · 보안 · 인프라 · 영세율', '출시 KPI 8종 · 보안 최소셋(운영자 개인 인증) · 월 $100 이하 인프라 · 영세율 환급 증빙', '', '', '', '', '', 'M4'),
    ('4.0', '확장', '고객', '다국어 · 검색 · 재주문', '', 'KO · ZH · JA · 검색 · 추천', '', '', '', '', 'P2'),
    ('4.0', '확장', '운영', '마진 · 엑셀 · 박스 분리 · 장기 미수령', '', '', '주문별 마진(수익원 4종) · 내보내기 · 위험물 박스 · 통관 거부', '', '', '', 'P2'),
]
r = 6
for row in PRI:
    for i, v in enumerate(row):
        f = LT_GRAY if i < 4 else (F3 if 7 <= i <= 9 else (BG_MODAL if i == 10 else None))
        put(ws, r, 1 + i, v, font=F9, fillc=f)
    ws.row_dimensions[r].height = 34
    r += 1
widths(ws, {'A': 8.9, 'B': 8, 'C': 14, 'D': 16, 'E': 10, 'F': 10, 'G': 48, 'H': 14, 'I': 12, 'J': 42, 'K': 34})
ws.freeze_panes = 'E6'

# =====================================================================
# 3. 요구사항 목록
# =====================================================================
ws = wb.create_sheet('요구사항 목록')
cols = ['번호', '구분', '구분', '시스템', '메뉴', '요청자', '요구사항', '상세 내용', '범용도', '중요도', '우선순위', '타임라인', '비고']
for i, t in enumerate(cols):
    put(ws, 2, 2 + i, t, font=Font(size=11, bold=True, color=C_WHITE), fillc=HDR_NAVY, align=CTR)
put(ws, 2, 15, '참고자료', font=Font(size=11, bold=True), fillc=HDR_GRAY, align=CTR)
r = 3
for row in REQ[1:]:
    for i, v in enumerate(row):
        bold = (i == 6)
        put(ws, r, 2 + i, v, font=Font(size=10, bold=bold))
    put(ws, r, 15, '', fillc=F3)
    ws.row_dimensions[r].height = 46
    r += 1
widths(ws, {'A': 3, 'B': 7, 'C': 9, 'D': 9, 'E': 15, 'F': 14, 'G': 13, 'H': 30, 'I': 62, 'J': 8, 'K': 8, 'L': 9, 'M': 16, 'N': 46, 'O': 20})
ws.freeze_panes = 'C3'

# =====================================================================
# 4. 메뉴구조(Menu Tree)
# =====================================================================
ws = wb.create_sheet('메뉴구조(Menu Tree)')
put(ws, 1, 2, '작성일자: 2026.10.07 (v0.3)', font=F9, border=False)
put(ws, 2, 2, '운영 어드민 (Admin)', font=Font(size=12, bold=True, color=C_WHITE), fillc=BLUE, align=CTR)
ws.merge_cells('B2:H2')
put(ws, 2, 10, '고객 웹 (Customer)', font=Font(size=12, bold=True, color=C_WHITE), fillc=BLUE, align=CTR)
ws.merge_cells('J2:O2')
header(ws, 3, 2, ['순서', '구분', '1depth', '2depth', '3depth', '4depth', '신규/개선'])
header(ws, 3, 10, ['순서', '구분', '1depth', '2depth', '3depth', '비고'])
for i, row in enumerate(MENU_S[1:]):
    for j, v in enumerate(row):
        put(ws, 4 + i, 2 + j, v, font=F9,
            fillc=(BG_MODAL if '신규' in row[-1] and j == 6 else None))
for i, row in enumerate(MENU_A[1:]):
    for j, v in enumerate(row):
        put(ws, 4 + i, 10 + j, v, font=F9)
base = 4 + max(len(MENU_S), len(MENU_A)) + 1
put(ws, base, 2, '시스템 (배치 · 연동)', font=Font(size=12, bold=True, color=C_WHITE), fillc=BLUE, align=CTR)
ws.merge_cells(start_row=base, start_column=2, end_row=base, end_column=7)
header(ws, base + 1, 2, ['순서', '구분', '1depth', '2depth', '3depth', '신규/개선'])
for i, row in enumerate(MENU_H[1:]):
    for j, v in enumerate(row):
        put(ws, base + 2 + i, 2 + j, v, font=F9)
widths(ws, {'A': 3.2, 'B': 8, 'C': 7, 'D': 17, 'E': 15, 'F': 22, 'G': 22, 'H': 12, 'I': 3,
            'J': 8, 'K': 7, 'L': 12, 'M': 20, 'N': 26, 'O': 12})
ws.freeze_panes = 'A4'

# =====================================================================
# 5~7. 기능목록
# =====================================================================
def convention(ws, title, extra_row=True):
    put(ws, 1, 1, title, font=Font(size=12, bold=True), border=False)
    put(ws, 2, 2, 'Color Convention :     ', font=Font(size=11, bold=True), border=False)
    put(ws, 2, 3, 'Gray - 작동 안 함', font=Font(size=11, bold=True, color=C_GRAY), border=False)
    put(ws, 2, 4, 'Red - 누락됨', font=Font(size=11, bold=True, color=C_RED), border=False)
    put(ws, 2, 5, 'Purple - 확인 필요', font=Font(size=11, bold=True, color=C_PURPLE), border=False)
    put(ws, 2, 6, 'BG컬러 - 별도 페이지(모달)', font=Font(size=11), fillc=BG_MODAL, border=False)


def feature_sheet(name, title, depth_label, rows, depth_n, colmap):
    ws = wb.create_sheet(name)
    convention(ws, title)
    labels = [depth_label] + [f'{i}depth' for i in range(2, 9)] + \
             ['설명', '설정항목/메뉴', '설정항목/메뉴_스팩', '요구사항', '중요도', '스팩 속성', '연계메뉴', '비고', 'ID']
    for i, t in enumerate(labels):
        c = HDR_TEAL if t in ('요구사항', '중요도') else HDR_GRAY
        put(ws, 4, 1 + i, t, font=F9B, fillc=c, align=CTR)
    r = 5
    for row in rows[1:]:
        d = dict(zip(rows[0], row))
        vals = colmap(d)
        modal = any('Modal' in (v or '') for v in vals[:16]) or '(Modal)' in (vals[depth_n - 1] or '')
        for i, v in enumerate(vals):
            f = None
            if i < 11: f = BG_MODAL if modal else None
            if labels[i] in ('요구사항', '중요도'): f = ROW_MINT
            font = F9
            if labels[i] == 'ID': font = Font(size=9, color='FF757575')
            put(ws, r, 1 + i, v, font=font, fillc=f,
                align=CTR if labels[i] in ('요구사항', '중요도') else WRAPT)
        ws.row_dimensions[r].height = 26
        r += 1
    widths(ws, {'A': 16, 'B': 14, 'C': 15, 'D': 16, 'E': 16, 'F': 12, 'G': 10, 'H': 10,
                'I': 38, 'J': 22, 'K': 30, 'L': 8, 'M': 13, 'N': 16, 'O': 16, 'P': 30, 'Q': 11})
    ws.freeze_panes = 'A5'
    return ws


def map_store(d):
    return [d.get('1depth (LNB)', ''), d.get('2depth', ''), d.get('3depth', ''), d.get('4depth', ''), '', '', '', '',
            d.get('설명', ''), d.get('설정항목/메뉴', ''), d.get('설정항목/메뉴_스팩', ''), d.get('요구사항', ''),
            d.get('중요도', ''), d.get('스팩 속성', ''), d.get('연계메뉴', ''), d.get('비고', ''), d.get('ID', '')]


def map_app(d):
    return [d.get('1depth', ''), d.get('2depth', ''), d.get('3depth', ''), '', '', '', '', '',
            d.get('설명', ''), '', d.get('설정항목/메뉴_스팩', ''), d.get('요구사항', ''), d.get('중요도', ''),
            d.get('스팩 속성', ''), '', d.get('비고', ''), d.get('ID', '')]


def map_hq(d):
    return [d.get('1depth', ''), d.get('2depth', ''), d.get('3depth', ''), '', '', '', '', '',
            d.get('설명', ''), '', '', d.get('요구사항', ''), d.get('중요도', ''),
            d.get('스팩 속성', ''), '', d.get('비고', ''), d.get('ID', '')]


FR_S[0][1] = '1depth (LNB)'
feature_sheet('운영 어드민 기능목록(Feature List)', '운영 어드민 Feature List (기능 목록) — PayNShip MVP v0.3', '1depth (LNB)', FR_S, 4, map_store)
feature_sheet('고객 웹 기능목록(Feature List)', '고객 웹 Feature List (기능 목록) — PayNShip MVP v0.3', '1depth (GNB)', FR_A, 3, map_app)
feature_sheet('시스템 기능목록(Feature List)', '시스템(배치 · 연동) Feature List (기능 목록) — PayNShip MVP v0.3', '1depth', FR_H, 3, map_hq)

# =====================================================================
# 8. 확인 필요
# =====================================================================
ws = wb.create_sheet('확인 필요(Purple)')
put(ws, 1, 1, '확인 필요 항목 (Purple) — v0.3, 2026-10-07', font=Font(size=12, bold=True), border=False)
header(ws, 3, 1, ['#', '항목', '확인 주체', '상태'])
for i, row in enumerate(CHECK[1:]):
    for j, v in enumerate(row):
        put(ws, 4 + i, 1 + j, v, font=Font(size=9, color=C_PURPLE) if j == 1 else F9)
    put(ws, 4 + i, 4, '확인 전' if '확정' not in row[1] else '해소', font=F9, align=CTR)
    ws.row_dimensions[4 + i].height = 26
widths(ws, {'A': 4, 'B': 90, 'C': 22, 'D': 10})

wb.save(OUT)
print('saved', OUT)
