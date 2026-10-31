

---

## 5. 2027년 전망: De Minimis 제도의 영구적 폐지

현행 800달러 면세 유예는 행정 명령에 기반하고 있으나, 일각의 "행정 소송 결과나 정권 교체로 부활할 수 있다"는 기대는 법적으로 성립하지 않습니다. 

2025년 7월 4일 제정된 예산조정법인 'One Big Beautiful Bill Act (OBBBA)'는 초당적 차원에서 19 U.S.C. §1321의 상업용 De Minimis 조항을 법전에서 완전히 삭제했습니다 [cite: 1, 10, 11]. 이 입법적 폐지는 행정부의 유예 조치와 무관하게 **2027년 7월 1일자로 확정 발효**됩니다 [cite: 1, 2, 3]. 따라서 2027년 이후 미국을 향하는 상업적 B2C 화물이 800달러 이하라는 기준만으로 무관세, 무서류 혜택을 누릴 확률은 0%입니다. 미래 입법을 통한 부활 가능성 역시 세수 확보와 불법 유입 차단이라는 정책적 공감대가 강해 단기간 내에는 불가능에 가깝습니다.

---

## 6. 결론 및 결제 엔진(Quoting Engine) 설정 권고사항

앞서 살펴본 법적 구속력과 세관의 시스템 강제를 고려할 때, 한 공동창업자의 "800달러 면세 구조를 유지하자"는 의견은 현재 법률 체계에 정면으로 위배되며, 언더컬렉션(Under-collection)으로 인한 회사의 막대한 재무적 손실을 초래합니다. 반면, "EO 14388에 의해 무조건 정식(Formal) 관세가 부과된다"는 의견은 비공식 통관(Informal Type 11 / ET13)의 존재와 특정 품목(K-pop 앨범 등)의 면제 조항을 간과하여 소비자 이탈을 유발할 수 있습니다.

**PayNShip 결제 엔진 고도화를 위한 핵심 권고:**
1.  **전면적인 $800 면세(Threshold) 로직 삭제:** 수취 국가가 미국(US)인 경우 가치와 상관없이 무조건 과세 로직이 작동하도록 업데이트해야 합니다.
2.  **분류(HTSUS) 기반의 개별 세분화 로직 구축:**
    *   **K-Pop 앨범/CD (8523.49 등):** '정보 간행물(Informational Materials)' 예외 코드인 HTS 9903.05.92를 맵핑하여 Section 301 강제노동 관세(12.5%)를 **0%로 면제 처리**합니다. (단, 라이트 스틱 등과 번들 포장 시 분리 신고 가이드를 준수).
    *   **한국산 뷰티/잡화:** 기본적으로 12.5%의 Section 301 관세율(한국 Capped)을 부과합니다.
    *   **고관세 품목 (의류 등):** HTSUS 기본 세율이 12.5% 이상인 경우, KORUS 원산지 증명을 연동하여 관세를 0%로 세팅하고 MPF를 면제하는 로직을 삽입합니다.
    *   **중국 원산지 제품:** 한국 쇼핑몰에서 소싱하더라도 원산지가 중국으로 표시된 제품은 최소 22.5% 이상의 고관세(중국 Section 301 Stacking)를 부과하는 방어적 프라이싱이 필요합니다.
3.  **특송사/우편 고정 수수료(Clearance Fee) API 연동:** 결제 엔진 내 관세(Duty) 항목과 별개로 '통관 대행 수수료(Brokerage/Disbursement Fee)' 항목을 신설해야 합니다. 배송 채널(DHL, EMS 등)에 따라 부과되는 15~25달러의 고정 비용을 결제 전(Checkout)에 소비자에게 명확히 징수해야 DDP 비즈니스 모델을 유지할 수 있습니다. 

PayNShip은 현재 미국의 복잡해진 관세 체계 내에서 **'정확한 HTS 코드 맵핑을 통한 KORUS 및 간행물 면제 조항의 전략적 활용'**과 **'Olive Young 방식의 보세 창고 LCL 사전 반입 모델 벤치마킹'**을 병행해야만 경쟁력 있는 렌디드 코스트(Landed Cost)를 유지할 수 있을 것입니다.

**Sources:**
1. [avalara.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQGLAUrMIIggYVrwT__wLiDdUqjkvnz4EB33Nxdb3yE4TICAl4HWPK79cKemgpOYhtTQb82PYxz7QefpdC4qdlhSnU-dglEju5OxKocb4moGydD8GrrZJeBwjZvv-3aClwVHjmJDGCzp66zXsY42Nm21cb6rajhpUITWg7rkXSp3-oXMwW7E8BDY13qjrB_O6_3LFxLE)
2. [gingercontrol.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQEYoSD3W-c6SggkgBWL-xUtVfZS7pWvH5R1MXlWHRWgfeMhzx39Paj4MJywj71JMXDRwVpKOJNi6csiPWG38RphNnqOIUHCEokJ2gHqPgRatQCxwWIjikEEweGU62xwTZMkccyJRm6N7MOUgTsDjeOPG2WjrnNjIoWiT7Rk)
3. [kpmg.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQFc-h8dTHJP3dcM6ci_Yv7b_7SNqfKmsFNHLQP_Fw9PpfqopOyTDSun9Sh22pLtf1JNPUbuwB6g60QYygHDZfrBXoZCrnE5fzSfk15TpDTyKScHArBXP1281ZhtWMiwnJri_J8gbPF_x2RE67IhNcqrSxFgR3l-FiuyzZjN6RtCfMeR_ElwOaKtj6mB3aA=)
4. [cornell.edu](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQGoHsb6MbeDEr16tAlOpYGiqkTY-SnP-Cw83-k-GKefPqc6InfaOOGcD_Uqe5GBNiushmRXvPGbEhxo74uxls8a8iUMJO01mTEfU-CHOaXcokgszLT7kNPHbRq3RBEJxggdfkSzgoDJ3bDRfWnLMSkIi1LG3P8=)
5. [wikipedia.org](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQGLLbm4lqAtJ0dx1L6iDDHE8pFy6M9QRFofDcoLcj6zp7nv8c8GikDi8beT0XpOEn4JkJx_KxCriiUxs4oNvrHOE-ieQWcVZF7uKUd9tdg9e7_yBeR_B4NHXO8B2zkMc2O-n4aFzhqcaVjCsLszwXY-8euD29k=)
6. [ballotpedia.org](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQHw9ooFANzoM0xonM-WQgfPAePn_wy-_PK7uer5pWNHjrAh6Oohxqq024DBaxbKCMuzzbGyvJSW3V40lBWpN3CrbxoGSp9UdTRgEWusjB7MTQzBViIep0s_jfEnaAR7bs6jnrqKsnWR17rpZdbs9UA=)
7. [aals.org](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQFoMclTBY67aZKPQxi9EuB0-GDL6hD0EB37SW6D2nZOk8PL9gFvLLensheZTo4bP51wHSCeWjWCxCZ3v8mXRi0HDgwo-DHHuWZxBFZYJfBROxSXNL-_SDUpn2AvINuiXHPxoUv3EdLNLHZQQ9coHgCxB-9Zdtur8C5wk_LaAkkbPOaASFlWQmcZvd-aWCJRWEOJpi2SwEYAT8H0lLTYbJA=)
8. [alvarezandmarsal.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQF58xvzn4jo6QGdzX2FGOoKRbYGdzwMywE_YMCfigtpQpCbCF6QTtrP7UaU3_xwv-5KxQbwVOKBsi92ODR8JCZDQdGr17MredZRW-ocfwfz2bBXSj19Zz3zpuv6ZyvqNIlQm41bP6ZIO4ImQu4yvesHihGROPkfimL_ss3cl5ZannflYQly9eLrKAgAnJqXMalKCmmuai9jTSxKqKJfDy92UWQKY4FNoYxFp2xLzMEvA00pE8U=)
9. [supplychaindive.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQGpb4QUryoAqhQ9JavEHC0puN8rJcqtAyiakpy7SvnuWNYlAQ90-bz-VRclfaiH-Hg5-Nk59H5wwd6K-XLz52Qo8MZsnu-Dik6y0PSmvjX2oLjxjgOUKINO7GR1cS5th4dXhNb_4d4I3hYSx47G85rxF2j1ovsbLZ_HvSdcV-ITf5mLTkJg0aD3jVkJHCS9Prs0kVfLLJ6Jqw==)
10. [wikipedia.org](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQE6Y41pMxdISgqn-X6BqtIAZCM8r6FjA4cKKeb_u_inzB5cag-gotS0C2n6U46LCtOh16LK9R1BZrfpMz6OtK8kITreQWWOisruuq5twWGUwcJWANULrrn4LWR8PenH5iu2FjsFepnNlmE76NAwrA==)
11. [ballotpedia.org](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQHrqGwX3kA3nnPZrBwdJsOMhC1L2i9QRXm59Mmfle5Veyp2YB4wA1tSlK5UjtRF1D5T0FLz2LZCSlW2C1cTKsOEmUK6NL40is3D-tsaJTvNtaauQY6JPbFIRprWRnb9q_OvCs5UBGZmSg==)
12. [useripple.io](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQFLKwFkfarpmcxyRwqF2EMr_4dMGRQTP81gZq2pCG2eKrYdPejN9rpiVcE5016oMO4tZs24qNT9yUatWGyIRXMwwixyQeM1MS-XWQwr6acP3cZJYUFyhiVnL3-4h6LlmM5adNxsq3eOLDHkqSdcUucnGjSG1Wlu6YZbOlt3e-Uu26XNZ9irSTXvaDBrzA==)
13. [thompsonhinesmartrade.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQGs8xdAH8x84PwfeLpthc5vpVT5sODXCS1jE1WKvTa7RRgvSluJVBLJqjSXEwo1SQmKXlkzs7I5kmC3Oi7jwUHkC8j4J0LFrgXinB9gliu6poIGJysSuaodaRvwiUvZBor-EYWeYyIVYn7cB8hB4PoEXXTnQN1u4lk41CRrQkj8w1Vv5fnUWBoMmRX4hO0dpnOkIZ-T2zy5DagDBk_RQrJQJnTPnVDUANmADOaGicB00dj6aQ9I-mXFb-oZ4Z4wYBl2)
14. [statt.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQEMuOi00znOkIJg3d8osbWavCZqbfJHERHq1Avrk07AsZ8yK7gjfL_0oC3VgZzx4lpOhZr_KzMnKlERGeWFvFy9C-igPVbBm5Od2Ey9kSCbKtUtdGz0nOGB0DT-EHZJxEfKTGfAdWysV4ELdNyUq9tD2YwoEvhe-YBpVYTkffajc1-gKD3wKd7s)
15. [cov.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQGRBxvbTP5YvyhfX6_xymMv5hgBEnrQI9pYtMLl22FlHKiw5e5y4gMDUu-vf01BfI9DMFJXIZACPAVxltF-AJONsLyLVFfav2J1E0suuPJq-W6ZClQzSIerr-DvDcMpCBXwQ9xMrF4vZI0SNDwm019tVQfoL6a5A-cg2HE17G4U945eXdB_r-lC459l8gaT9o6V7RDpXFo0Xe4pBs3FkEsu6CA4_kf31zKZodnuQSO3S0wePPc=)
16. [spiritchbinc.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQHGCihEnxf5N0yqwA8z6fTAERqk8ICQDkmX5-lAOXce_KVQJwXF9ckbJaisQy_Vj2J2RTjq4RhfeOq2Ad-tAtFSiPhxTjL1Znl9cBnlgPuuoXJZdyGGnZvUPnphCSo1vmm-rOgG0LydWA4pwHk-K0MvBcPuvLv16sN3AsEKLvLnx4IM0etlzxLiPIkEQ8AVgEDWCtQr-FA3NCctecJ9L_L2kDA=)
17. [ey.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQGMmC4uRjp3FgeGabOgLdvnTwNohbNFF7dATp2lHUls-nzAPVRABG59cBaSgdp0AHQ-x1uuH4RD--odhefudcyM9CU4oMVYf7zpc7yBMNvUtwHSHs37iqKwYUnmztfIT2YIVbWUekO3R81JRwg7aFm_1mUG2lY3F94n2ZFL62JXbbHWZePZ9XfaWznyMdWAvlD8KxkGEGTwHtVS-gKk8XbvPZ6DtWqDlpr2a7zxz95HRISoiS207ixFI1c=)
18. [fedex.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQFkFwF8FEOb14aAzreykndZCWkK_W6j9uN-AreMsfuKxjiJ_j9wgtAA6u1MZCuzPARZW5plpywX5pCkz9jjF5THR-zcXQBHS1AP-dRwowIg2B6N4a_U_bQClIYRO4iSRtj0lKvbDh0R322wdMaAkY5YU2iV9ox27P3010muWsUoXOrjdSH72cZK8Zg5ihJ7ArAZ2gCTnTGRuoLLFAoGkcLAj9uqzD51cOw9FL7oTx-QdyPR68ko4VzFVbOJrGM=)
19. [troutman.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQGa2mIQ-oPY2NDz6OZ_HjsWM_7N3HkPcNJGJbN_adoKQ1p4nhe_E6BWafzHSOu0PpvOQDWl07TPiDpT7Z8cYhkYKtfTNiXsVVglbR_-PFEXyFji1P056TlrSLHkEzjHTkC6mCguEvZfXIoOEH4Y60rSTmsMAammQDsDlkPzPTlid3NYs3-IXle1P6NucVh5W--gY7UPE753YiOtlluHx3wznd2XOHIsAW2P44w3xoF_O9Y=)
20. [clarkhill.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQGeKrwVCH9rwVXXCvS6BrwTnF1U83nHge8SEVjavjkstBVPXgKOjNqCegMqhh-nioAjRPJ-mRzFc7muNL_6dclGsSGmICiIAT2jCKkYMHUe8XNBqQAEhQisR-C04WkHePjXbz8nauIBEGCSgyXM3E6ZkBkwgOpNUZCPAFoMdKOFuzA28lxCKy6lZWzGFVjprQ==)
21. [zonos.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQGioj_0QePz3G1k6tuiggg3S-v6n1d1f1XpOGUQIHl4H7WpW0TUEj0QDDsllA_nbVY_bQYgtgdq_vtoXt06VLxZd1wlzXrmT3LHuYnY3fAhKasCqXhJOyq9aId9lNpECOcSzdAqT271EyAiNgrQ6Z18JMch20ViVWDQqLdjW9DT7mXHQDYbtdbYHQ==)
22. [fedex.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQFbVLJmShCQsORbBF2SgqRxKtrZLFITvbeozG_OJpqWyJBf1yINDU-twn_CwxtzW49-1GkglpoCkYq0MTF9Ea1t0w9sJlFZIEZ_7GH7gfwKEfpED0iX1n7RdMoRK0mWiaYloNA=)
23. [customsgenius.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQE7_jCMtSGIi9LCp0ntpJIqKLtCTloOTgqdWktLHwQVoLQBlGLwYgpnjeWW-4iUt6yFW7XmVc6x8l_5uqKz19phQPQysn0K1jf7gyYVz6B_gI7CxaMORP92ea8miQ==)
24. [vintageandrare.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQGTbb5CR1T4eGMNdEGgBvx9IAX1ZdVSBiDN2MzatceDue3Yi5C4CW3DgLc4qjNkUqeAKyN1GVIhqszg0oNkntgdA9y7a8hbcrltxmqtfI-YrIMhWuyI1Ss8WI3BOmm589clznlT49Lp6exSTfndSH0ZAVNP49BQ-rX7I3xgjfOLrMEeHisIHNbQ)
25. [strixsmart.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQHjZs6Q-NUkbZ58qKpRukgvSToftOW65Dz-VksNFp8QFlPXUZp9Da-wyJ0RDB_qG1DzGCQEKSEnyX1BEXHqWSvIW4-6jTbK9TgQW1RQ1irq6ileT0vhxhEW7IasNcYhrUYnCOo6gC0uGly9jU71qJsQ9Xe2gmZjupZds8Dqww==)
26. [importify.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQHYrHxxI6m69vDvLCUI7V4Cpxho1Nr9oOsfiW2H-68c832Idj3b-VjYaUwnM7zbTwgIajz83b_q1FF68O72FXkJpXgvrQUfP-pYqSzGGIWh4DKa8csmFpW9vaafOZnLqePP0NTE-EmKYnCZzMb1zmKkw94fZFA=)
27. [cxtms.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQEQH6la5n7JSCUMN8zNEdDiHKvMNC2TJmb7bmh4g1fXZMuVqXD9F4hmziJ-vg05bgegx2WbEsREuYHg8i6V_MsHy6ECXteoIpJjn0g3iSLRLxd_gWgXQ90O0qtwm5rBUHbMrZ-9Vyzn)
28. [theguardian.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQFLhQIVP1RD74wd9FkVLw_CVCuXFkDQZ38tdtS5Di2MTSjlP0wAILAg3KRJ9eDGd1dkjA-3om2135UiaT55LHIqMBBDZlp-0g49-99uDE3cI7NtJx_VBlTan8ePohpN6pszoon-DWP_q8y8I3KuNLRbwFIFb_lpm0yIovKl4YZjv2zGWTABYSgs4NR6rw==)
29. [stocktwits.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQEHZ1RKG6tJXG_6CvJE-WXRPslpPFqEpYgvw5AAvNdbcANhLkWRmNztEtNX-UlSS_MMaWRLIya2-Q9tv3T2TJqyEbGNRROkms-Cqv8koYL1KJFKdSzFLfW5eV3-pQ5Q-LEW8R8gpxKbd3uwjlMbXHme6gNke939KikbshCHRxuVVmO_HiiEKvsTSNx0S02XNlJWNc2wY4Jv4THGQJPcf2W3wCJO_8O-HHIJYlii7IusuAtwPoVxac56_CCcb8r8xRxEkjF8)
30. [shopback.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQHLeBeqWd4AOKAQf9vx-1g5mdwA9N-QuoZPhvT91q197ulyCIEA_tJDzL78ktcbdm3cHyh4Rc0VZMgUoHO7gB2bqChMyciPNLloCFi4bUcihb40O5IaQZjtbeY7e7DC0fYurZUkK3ruMY_HRdAFXXjx0qrQVHAFo_4oaQ_lpJNO764YqMhfnQJ__JLCx-UfWj8=)
31. [weverse.io](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQE0DzZVA4RXeuuupfOHm10VpntitdyLNqUr1E1DuzyUR45yOhXrMNYAddo9-hBjYwAmm9PcKDSODpAWnY7q8TjWGsMcZidQLUe8QZ8ghCNCVy1LZgSerTFE4DgxFu40)
32. [weverse.io](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQFmm-lPVljPxsM9LjauUBFzUgfXXsW2x9LYE9M55Vl2oLs6HrmyjSzzXSDzO1jaO_Dj-znNXE1nNBiV6cngvtnR73JAfXMqs1Jw5VeWXSDUFM8Ya3WFZWicev28)
33. [paysable.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQEFVucBZcDdbdVESmI6ZzH6vQkFUB753WdFvpGoz-ke6DOOgIGVlHe8oMJY8bJ0Zx6eSLLd0_8w4kub6-1N52AWS6xUilZI3KRq6jPAkcyO7bcEx2GJWgun9okuJOwVPyLVlv4YTD7HI-ld8xdMwJCJHkg=)
34. [minsheng-logistics.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQFJcFNLk4tKZy_bglUq7TnrQtxxU5u_4gTCyWwBnsrKipWNKIxrJNIE6ntj3aYgOUyfUQJuByODybIkIGC9IEsYnOXtj8eUUQvMP7OzJaNHc4YTDTe6RFaWKVcBBREYOa5cRTqwsX_UYfo8mGNPGeOIordeV69OyvaM22bSszhtOo7yBfGEtDJrv1_V2Id1IhMC)
