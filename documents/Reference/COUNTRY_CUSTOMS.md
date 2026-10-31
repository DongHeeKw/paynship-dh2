# 국가별 수취인 정보와 통관 검토

최종 자료 확인: 2026-10-12. 코드 정책 버전: `2026-10-12`.

국가 선택, URL 형식, 우편번호 형식과 통관 가능 여부는 별도 판단이다. 현재 등록된 36개 도착국은 요청을 검토할 수 있는 후보 목록이며, 배송 또는 자동 통관을 보장하는 지원 국가 목록이 아니다. 실제 품목·가격·수량·원산지·운송 방법·수취인·신고 경로를 운영자가 확인한다. 이 문서는 수취인 정보 수집 범위를 정하며 관세율을 자동 지정하지 않는다.

## 로그인 전 국가 안내와 개발 미리보기

고객은 로그인 전에 도착국을 선택해 수취인 준비 사항·공식 출처·자료 재검토 필요 여부를 확인할 수 있다. 이 공개 안내는 기존 국가 정책을 보여주며 DB·발급기관·신원 확인 제공자를 호출하지 않는다. 국가를 선택하거나 안내를 읽었다고 배송·통관이 승인되지는 않는다. 주소·통관 식별번호의 실제 저장과 구매 요청은 인증 후 서버에서 검증한다.

로컬 개발 전용 `/dev/preview`는 같은 배송 입력 컴포넌트와 형식 검증 규칙을 가상 데이터에 적용한다. 이름·연락처·우편번호·NIK/NPWP 등의 입력 형태를 확인해도 발급·명의·소유자·개별 화물 위임을 검증한 것은 아니다. 미리보기의 `identityVerified`는 false이며 외부 발급기관·배송사·DB를 호출하지 않는다. 데이터는 브라우저 메모리에만 두고 새로고침하면 초기화하므로 실제 주소·식별번호를 넣지 않는다. [개발 실행 조건](Deployment/DEPLOYMENT.md#로그인-설정-없이-고객-화면-확인)을 따른다.

## 수취인 정보 수집 정책

| 국가 | 공식 안내의 핵심 | 현재 서비스 입력·검토 |
| --- | --- | --- |
| 대만 `TW` | 2026-03-01부터 특송의 사전 실명 위임이 시행된다. 수취인은 EZ WAY에서 운송장·품명·신고가격 등을 확인한 뒤 위임한다. 앱 등록은 개별 화물 위임과 다르다. | 이름·전화는 실제 수취인 기준. EZ WAY/브로커/추후 검토 경로를 선택하며 대만 신분증 번호나 앱 비밀번호는 받지 않는다. 구매 전에는 브로커의 위임 계획을 검토할 수 있고, 발송 단계에는 해당 운송장 승인 증빙이 필요하다. [대만 세관 시행 안내](https://web.customs.gov.tw/etaipei/singlehtml/1373?cntId=54256f557f204c46a2d25a77f34eac7a), [EZ WAY 개인정보 안내](https://web.customs.gov.tw/singlehtml/3150?cntId=cus1_3150_3150_1471). |
| 인도네시아 `ID` | 수입 consignment note에는 수취인 NPWP가 포함되며, 없는 경우 인도네시아인의 NIK 또는 외국인의 여권 등 대체 식별정보를 사용한다. | NIK·NPWP·여권 중 적합한 종류를 고르거나 배송사·브로커에 직접 제공하도록 보류한다. NIK는 16자리, NPWP는 15/16자리 숫자 형태만 확인한다. 여권은 발급국별 형식이 달라 보편적인 검증 정규식을 적용하지 않는다. [세관 CN 안내](https://www.beacukai.go.id/faq-impor-barang-kiriman), [NIK 법령 제31조](https://disdukcapil.bandung.go.id/api/public/uploads/produk-hukum/PERATURAN_PEMERINTAH_REPUBLIK_INDONESIA_NOMOR_40_TAHUN_2019.pdf), [NPWP 전환 안내](https://www.pajak.go.id/index.php/en/node/108724). |
| 일본 `JP` | 우편·특송·일반 화물에 따라 신고 방법과 필요한 인보이스 등이 다르다. | 초기 주소 저장에는 국가 신분번호를 수집하지 않는다. 품목과 신고 경로에 필요한 추가 서류는 별도 검토한다. [일본 세관 개인 수입 절차](https://www.customs.go.jp/english/c-answer_e/kojin/3002_e.htm). |
| 싱가포르 `SG` | 우편·특송의 품목과 가격에 따라 인보이스·허가·GST 처리 등이 달라진다. PDPC는 법적 필요 또는 정당한 고정밀 신원 확인 사유 없이 국가 식별정보를 수집하는 것을 제한한다. | NRIC·FIN·여권을 기본 입력으로 받지 않는다. 실제 배송사 서류 요구를 확인한다. 국가 식별번호를 로그인 비밀번호로 사용하지 않는다. [세관 우편·특송 절차](https://www.customs.gov.sg/personal-shipment/buying-from-overseas/courier-postal-procedures/), [PDPC NRIC FAQ](https://www.pdpc.gov.sg/guidelines-and-consultation/2020/02/advisory-guidelines-on-the-personal-data-protection-act-for-nric-and-other-national-identification-numbers/nric-faqs). |
| 홍콩 `HK` | 수입 신고의 적용·면제 여부와 품목별 허가를 확인해야 한다. | 기본 주소 입력에 HKID를 요구하지 않는다. 수입 신고와 제한 품목 확인을 생략하지 않는다. [홍콩 세관 신고 안내](https://www.customs.gov.hk/en/service-enforcement-information/cargo-clearance/import-export-declaration/). |
| 미국 `US` | formal entry 등에는 수입자 식별번호가 필요할 수 있다. EIN·SSN 외에 CBP 부여 번호를 사용하는 경로도 있다. | SSN을 일괄 수집하지 않는다. 필요성이 확인되면 브로커의 보안 채널을 사용한다. 프로필이나 CS에 SSN을 입력하지 않는다. [CBP formal entry 안내](https://www.help.cbp.gov/s/article/Article-1118?language=en_US), [CBP 수입자 번호](https://www.help.cbp.gov/s/article/Article-1066?language=en_US). |
| 그 외 도착국 | 국가·품목·운송 경로에 필요한 공식 근거가 코드 정책에 아직 정리되지 않았다. | 개인 식별번호를 임의로 받지 않고 브로커 검토로 진행한다. 확인하지 않은 통관 규칙이나 세율을 사용하지 않는다. |

일본·싱가포르·홍콩의 초기 신분번호 미수집은 개인정보 최소 수집을 위한 서비스 정책이다. 모든 화물이 신분서류 없이 통관된다는 법적 판단을 의미하지 않는다. 대만에서도 앱 이용 자격이 없는 수취인 등은 브로커가 적법한 위임 경로를 확인해야 한다.

## 연락처와 우편번호

이름·주소는 앞뒤 공백을 정리하고 길이를 제한하며 중간의 제어문자는 거절한다. 한글·중국어·일본어 등 유니코드 이름과 주소를 보존한다. 전화는 `+`와 국제 번호 7–15자리 형태를 받는다. ITU의 국제 번호 최대 길이는 15자리이며, 이 앱의 최소 7자리 조건은 연락처 입력 정책이다. 국가번호 할당 여부, 개통 여부, 수신 가능성 또는 소유자를 확인하는 OTP는 구현하지 않았다. [ITU-T E.164 (2026)](https://www.itu.int/rec/dologin_pub.asp?id=T-REC-E.164-202602-I%21%21PDF-E&lang=e&type=items).

| 도착국 | 입력 형태 | 확인 범위·근거 |
| --- | --- | --- |
| 일본 | 7자리 또는 `NNN-NNNN`, 저장 시 하이픈 형태로 정리 | 형식만 확인. [일본우편 매뉴얼](https://www.post.japanpost.jp/service/search/zipcode/zipmanual/p04.html). |
| 싱가포르 | 6자리 | 형식만 확인. [SingPost 우편 구분 자료](https://www.singpost.com/dam/files/documents/2026-03/RAO_Template_(Effective_1_June_2012).pdf). |
| 미국 | 5자리 또는 `NNNNN-NNNN` | 실제 USPS 주소 대조는 별도 연동이다. [USPS ZIP+4 안내](https://pe.usps.com/text/DMM300/207.htm). |
| 대만 | 6자리 권장, 3자리·기존 5자리도 검토용으로 허용 | 과거 입력을 접수할 수 있도록 허용하며 운송사는 현재 주소에 대응하는 번호를 확인해야 한다. [현재 3+3 조회](https://www.post.gov.tw/post/internet/Postal/index.jsp?ID=208), [기존 3자리와 현재 데이터](https://www.post.gov.tw/post/internet/Download/all_list.jsp). |
| 홍콩 | 비워 둘 수 있음 | 임의 우편번호를 강제하지 않는다. 홍콩 무우편번호 안내의 확인 가능한 근거는 역사적 [UPU 주소 매뉴얼(2011)](https://www.upu.int/UPU/media/upu/publications/manualAddressingAddressingAndPostcodeManualEn.pdf)이다. [Hongkong Post 현재 안내](https://www.hongkongpost.hk/en/about_us/tips/postcode/index.html)는 이번 조회에서 HTTP 403으로 내용을 다시 확인하지 못했다. |
| 그 외 | 20자 이내, 해당 주소가 번호를 사용하면 입력 | 국가마다 숫자 길이를 임의 지정하지 않고 주소·배송사 검토를 요구한다. |

위 조건에 맞아도 해당 우편번호나 주소가 존재한다거나 배송 가능한 것은 아니다.

## 입력과 서버 검증 상태

배송정보 입력에는 `customsId`, `customsIdType: NONE | NIK | NPWP | PASSPORT`, `customsAuthorization: NONE | EZWAY | BROKER | DEFERRED`가 포함된다. `customsId`는 인도네시아의 명시적 종류를 선택한 경우에만 받는다. 국가 또는 식별번호 종류 변경 시 화면의 기존 번호를 비운다.

서버는 입력을 검증하고 암호화된 프로필과 요청별 배송 스냅샷 안에 다음 메타데이터를 함께 저장한다. 평문 ID 컬럼이나 검색 인덱스를 추가하지 않는다.

```ts
customsVerification: {
  country, policyId, policyRevision, requirement,
  state, identityVerified: false, assessedAt
}
```

| 상태 | 의미 |
| --- | --- |
| `NOT_REQUIRED` | 초기 프로필 단계에서 추가 개인 식별번호를 요구하지 않는 정책. 통관 완료가 아님. |
| `FORMAT_ONLY` | NIK/NPWP의 숫자 형태만 맞음. 발급·명의 확인은 안 됨. |
| `REVIEW_REQUIRED` | 실제 서류 또는 위임 경로 검토가 필요함. |
| `PROVIDER_VERIFIED` | 실제 외부 제공자의 검증 결과를 기록하기 위한 예약 상태. 현재 고객 입력이나 운영자 체크박스로 부여하지 않으며 연동도 없음. |

고객이 `identityVerified`, `customsVerification` 같은 서버 필드를 직접 제출하면 거절한다. 과거 범용 통관번호 입력은 번호 종류나 검증 여부를 추정하지 않는다. 기존 암호문은 자동 삭제하지 않으며 읽을 때 불필요한 번호와 이전 검증 주장을 재사용하지 않는다. 프로필 수정은 기존 주문 배송지를 변경하지 않는다.

## 운영자 증빙과 실행 단계

견적 검토에는 `recipientEvidence`가 필수다. 방법은 `NOT_REQUIRED | BROKER_REVIEW | EZWAY_AUTHORIZATION | CARRIER_ID_VERIFICATION`이며 HTTPS 참조, 확인시각, 재검토 만료시각, 설명, 필요시 `shipmentReference`를 받는다. 고객이 운영자 검토를 호출할 수 없고, 운영자의 수동 검토는 정부 API의 신원 확인 결과로 승격되지 않는다. 서류의 번호·이미지를 설명이나 공개 URL에 복사하지 않는다. 검토 본문과 참조는 암호화하여 저장하고 운영자만 권한 확인 후 열람한다.

견적·구매 진행은 도착국과 수취인 정보가 일치하고, 적합한 검토 방법과 현재 유효한 증빙이 있을 때 허용한다. 대만은 구매 전 브로커의 위임 계획을 검토할 수 있지만, 발송할 때는 선택한 EZ WAY/브로커 경로에 맞는 실제 화물 위임과 운송장 참조 일치를 요구한다. `DEFERRED` 경로는 운영자 증빙을 통해 해소해야 한다. `recipient_review`는 이미 승인한 금액과 주문 단계를 바꾸지 않고 이후 위임 증빙을 갱신한다. 배송 완료는 실제 배송사의 서명 이벤트를 통해 반영하며 운영자가 임의로 완료시키지 않는다.

증빙 확인은 최근 30일 이내, 재검토 만료는 향후 30일 이내로 제한한다. 내장 국가 안내의 다음 점검시각은 `2026-11-11T00:00:00Z`이다. 이는 서비스의 자료 재검토 마감이며 법령 만료일이 아니다. 이 시각이 지나면 해당 내장 국가 정책은 자료 갱신 전 승인을 차단한다.

HS 검토에서 서비스 범위 밖인 장 `01–24`, `30`, 예약 `77`, 국가별 특별 분류 `98–99`, 무효 `00`은 견적 승인을 거절한다. 이는 초기 사업 범위에 대한 정적 제한이며 해당 품목이 모든 국가에서 불법이라는 뜻은 아니다. 장 번호만으로 세부 HS 분류의 적정성이나 통관 가능성이 확인되지 않는다. [WCO HS 2022 분류표](https://www.wcoomd.org/en/topics/nomenclature/instrument-and-tools/hs-nomenclature-2022-edition/hs-nomenclature-2022-edition.aspx).

구현은 `lib/customs/`의 국가 정책·연락처·우편번호·식별번호·배송 스냅샷·운영자 증빙 모듈로 나뉜다. 관세 계산과 구매 상태는 [구매·결제 기준](../Features/Order-Checkout/Spec.md), 개인정보 권한과 암호화는 [보안 기준](SECURITY.md), 국가별 세금과 한국 수출 부가세는 [세금·통관 자료](TAX_AND_CUSTOMS.md)를 따른다.
