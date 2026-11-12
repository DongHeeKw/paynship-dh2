type Step = 'link' | 'quote' | 'delivery';

export default function JourneyIllustration({ step }: { step: Step }) {
  return <svg viewBox="0 0 180 136" fill="none" aria-hidden="true" focusable="false" className="journey-illustration">
    <ellipse cx="90" cy="119" rx="62" ry="8" fill="#192c43" fillOpacity=".06" />
    {step === 'link' && <g stroke="#192c43" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="29" y="24" width="115" height="81" rx="10" fill="#fff" transform="rotate(-6 86 65)" />
      <path d="m28 45 114-12" />
      <circle cx="39" cy="35" r="2" fill="#fa765f" stroke="none" /><circle cx="47" cy="34" r="2" fill="#f6d3a2" stroke="none" /><circle cx="55" cy="33" r="2" fill="#2467ed" stroke="none" />
      <rect x="72" y="55" width="65" height="45" rx="8" fill="#99d9ff" transform="rotate(9 104 77)" />
      <path d="m92 72 7-6a7 7 0 0 1 10 10l-3 3m-7 4-7 6a7 7 0 0 1-10-10l3-3m6 6 10-10" stroke="#2467ed" strokeWidth="4" />
      <path d="m146 45 10-8m-9 20 12 1M60 109l-6 7" stroke="#fa765f" />
    </g>}
    {step === 'quote' && <g stroke="#192c43" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M57 17h65v97l-8-5-8 5-8-5-8 5-8-5-8 5-8-5-9 5Z" fill="#fff" transform="rotate(6 89 66)" />
      <path d="m73 40 31 3m-33 12 38 4m-39 9 24 2m-25 11 36 4" />
      <circle cx="126" cy="92" r="23" fill="#fa765f" /><path d="m116 92 7 7 13-15" stroke="#fff" strokeWidth="4" />
      <path d="m36 44 5-8m-7 20-9-2m113-31 7 5" stroke="#2467ed" />
    </g>}
    {step === 'delivery' && <g stroke="#192c43" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M62 112V29q0-9 9-9h55q9 0 9 9v83" fill="#99d9ff" /><path d="M72 112V37q0-6 6-6h42q5 0 5 6v75" fill="#2467ed" />
      <circle cx="113" cy="76" r="3" fill="#f6d3a2" stroke="none" /><path d="M53 113h93" />
      <path d="m34 80 29-8 29 12-29 9-29-13Z" fill="#ffe3b5" /><path d="m34 80 29 13v26l-29-13Z" fill="#f6d3a2" /><path d="m63 93 29-9v26l-29 9Z" fill="#f4b980" /><path d="m48 76 29 13v10l-9 3V92" fill="#fa765f" />
      <path d="m145 66 8-7m-7 20 11 1" stroke="#fa765f" /><path d="M49 101h1m8 4h1" strokeWidth="3" /><path d="M50 110q4 4 8 1" strokeWidth="2" />
    </g>}
  </svg>;
}
