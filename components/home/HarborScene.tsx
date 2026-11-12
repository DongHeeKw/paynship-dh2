type HarborSceneProps = {
  focused: boolean
  packed: boolean
  label: string
}

export default function HarborScene({ focused, packed, label }: HarborSceneProps) {
  const lidOpen = focused && !packed
  const parcelLabel = label || 'YOUR NEXT FIND'

  return (
    <svg
      className="harbor-scene"
      viewBox="0 0 640 540"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
    >
      <g stroke="#192c43" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        {/* A little destination, built from postcard-like shapes. */}
        <path
          d="M64 314C32 242 61 146 147 108C240 67 291 113 352 109C420 105 497 83 552 143C612 208 597 306 546 358L125 378Z"
          fill="#e7effe"
          stroke="none"
        />
        <g className="harbor-sun">
          <circle cx="504" cy="104" r="30" fill="#fa765f" stroke="none" />
          <path d="M504 57V49M543 66L549 60M551 104H560M537 141L543 147M472 65L466 59" />
        </g>
        <g className="harbor-cloud">
          <path
            d="M305 91C300 91 296 86 296 81C296 74 302 70 308 71C310 61 318 55 328 55C338 55 346 61 348 70C355 67 364 73 364 81C364 87 359 91 353 91H305Z"
            fill="#fffdf8"
            stroke="none"
          />
          <path d="M92 102H114M103 91V113" strokeWidth="2.5" />
        </g>
        <path
          d="M196 146C243 111 287 129 290 154C294 185 254 193 251 168C247 137 311 131 367 153"
          stroke="#2467ed"
          strokeWidth="2"
          strokeDasharray="5 8"
        />
        <path d="M358 143L371 154L354 158" stroke="#2467ed" strokeWidth="2" />

        {/* The harbor island and its small shop. */}
        <path
          d="M61 285C63 265 114 252 167 251C229 250 264 266 267 284C270 307 219 325 165 324C110 323 58 307 61 285Z"
          fill="#f6d3a2"
        />
        <path d="M84 294C113 306 159 309 189 303" stroke="#e8b67c" strokeWidth="3" />
        <path d="M103 205H216V278H103Z" fill="#fffdf8" />
        <path d="M92 204L116 165H205L227 204Z" fill="#fa765f" />
        <path d="M92 204H227V215H92Z" fill="#fa765f" />
        <path d="M119 166L111 203M143 166L140 203M168 166L170 203M191 166L202 203" stroke="#fff3e5" />
        <path d="M92 215V222C92 228 100 230 105 225C111 231 118 231 124 225C130 231 137 231 143 225C149 231 156 231 162 225C168 231 175 231 181 225C187 231 194 231 200 225C206 231 213 231 219 225C224 230 227 226 227 222V215" fill="#fffdf8" />
        <path d="M119 244H145V278H119Z" fill="#99d9ff" />
        <path d="M165 241H199V262H165Z" fill="#99d9ff" />
        <path d="M182 242V260M166 252H198" strokeWidth="2" />
        <circle cx="137" cy="262" r="2" fill="#192c43" stroke="none" />
        <path d="M148 155H181" strokeWidth="7" />
        <path d="M235 278V239M235 241L248 226M235 251L226 240" />
        <path d="M232 243C214 244 213 225 216 218C228 220 235 229 232 243Z" fill="#2467ed" />
        <path d="M236 242C234 225 249 216 259 220C258 233 251 241 236 242Z" fill="#99d9ff" />

        {/* Broad, graphic water keeps the small details grounded. */}
        <path
          d="M49 365C74 332 158 327 221 336C286 345 320 326 386 330C469 335 560 346 590 384C624 427 568 464 500 478C423 494 351 474 292 481C212 491 131 478 81 454C38 433 21 400 49 365Z"
          fill="#2467ed"
          stroke="none"
        />
        <path d="M76 359C114 347 148 350 174 358M492 358C522 359 552 369 566 383" stroke="#99d9ff" strokeWidth="4" />
        <g className="harbor-wave" stroke="#99d9ff" strokeWidth="4">
          <path d="M67 404C78 412 89 412 100 404C111 412 122 412 133 404" />
          <path d="M91 443C102 451 113 451 124 443C135 451 146 451 157 443" />
          <path d="M446 464C457 472 468 472 479 464C490 472 501 472 512 464" />
          <path d="M538 426C549 434 560 434 571 426" />
        </g>
        <path d="M179 468H215M224 468H232M382 495H424" stroke="#2467ed" strokeWidth="3" />

        <g className="harbor-boat">
          <ellipse cx="366" cy="445" rx="151" ry="15" fill="#174db5" stroke="none" />
          <path d="M207 380C231 369 281 368 340 371L544 380L523 408H236Z" fill="#fffdf8" />

          <g className={`harbor-parcel${packed ? ' is-packed' : ''}${lidOpen ? ' is-open' : ''}`}>
            {/* The flap is responsive to the URL field, never a shipping status. */}
            {lidOpen ? (
              <g className="harbor-flap harbor-flap-open">
                <path d="M234 211L416 181L424 119L251 149Z" fill="#f6d3a2" />
                <path d="M234 211L293 243L473 214L416 181Z" fill="#b37d46" />
                <path d="M234 211L197 175L255 207L293 243Z" fill="#e9b979" />
                <path d="M416 181L473 214L518 181L461 147Z" fill="#e9b979" />
                <path d="M294 243L473 214L491 249L311 280Z" fill="#f6d3a2" />
                <path d="M319 139L319 197" stroke="#fff3d8" strokeWidth="18" />
              </g>
            ) : (
              <g className="harbor-flap harbor-flap-closed">
                <path d="M234 211L416 181L473 214L293 244Z" fill="#f6d3a2" />
                <path d="M320 197L378 230L402 226L344 193Z" fill="#fff3d8" stroke="none" />
                <path d="M234 211L293 244L473 214" />
                <path d="M329 197L387 229" strokeWidth="2" strokeDasharray="4 5" />
              </g>
            )}
            <path d="M234 211L293 244V386L234 352Z" fill="#e8ad6b" />
            <path d="M293 244L473 214V356L293 386Z" fill="#f6d3a2" />
            {!lidOpen && <path d="M378 230L402 226V259L390 254L378 263Z" fill="#fff3d8" stroke="none" />}

            <g transform="rotate(-9 385 287)">
              {packed ? (
                <path d="M350 280L356 275L362 280M401 280L407 275L413 280" strokeWidth="3.5" />
              ) : (
                <g fill="#192c43" stroke="none">
                  <ellipse cx="356" cy="278" rx="4" ry={focused ? '6' : '5'} />
                  <ellipse cx="407" cy="278" rx="4" ry={focused ? '6' : '5'} />
                </g>
              )}
              <path d="M373 287C376 293 385 293 389 287" strokeWidth="3" />
              <path d="M340 290H347M416 290H423" stroke="#fa765f" strokeWidth="5" />
            </g>
            <g transform="rotate(-9 383 332)">
              <rect x="317" y="312" width="132" height="45" rx="5" fill="#fffdf8" strokeWidth="2" />
              <path d="M327 322H343M327 327H336" stroke="#2467ed" strokeWidth="2" />
              <text
                x="327"
                y="344"
                fill="#192c43"
                stroke="none"
                fontSize="10"
                fontFamily="Arial, sans-serif"
                fontWeight="700"
                letterSpacing="0.4"
                textLength={parcelLabel.length > 18 ? 111 : undefined}
                lengthAdjust="spacingAndGlyphs"
              >
                {parcelLabel}
              </text>
              <path d="M424 320V328M428 320V328M432 320V328M436 320V328M440 320V328" strokeWidth="1.5" />
            </g>
            <path d="M247 328L260 335M247 336L260 343" stroke="#a76d38" strokeWidth="2.5" />
          </g>

          {/* A small red boat, complete with round portholes. */}
          <path d="M205 380L549 380L522 416C505 439 459 450 370 450C287 450 246 437 231 416Z" fill="#fa765f" />
          <path d="M214 393H537" stroke="#fff3e5" strokeWidth="7" />
          <circle cx="288" cy="416" r="9" fill="#fffdf8" />
          <circle cx="335" cy="421" r="9" fill="#fffdf8" />
          <circle cx="382" cy="422" r="9" fill="#fffdf8" />
          <path d="M470 413H494" strokeWidth="3" />
          <path d="M525 361V383M525 363H546L538 354L546 345H525" fill="#2467ed" />
          <path d="M219 382C205 384 194 394 194 405C194 415 200 422 207 421" stroke="#fffdf8" strokeWidth="5" />
        </g>

        {/* The buoy gives the sea its own small character. */}
        <g className="harbor-buoy">
          <path d="M141 385L147 351H161L167 385Z" fill="#fffdf8" />
          <path d="M143 372H165L167 385H141Z" fill="#fa765f" stroke="none" />
          <path d="M147 351H161M154 351V338" />
          <circle cx="154" cy="335" r="4" fill="#fa765f" />
          <path d="M132 388C139 394 147 394 154 388C161 394 169 394 176 388" stroke="#99d9ff" strokeWidth="3" />
        </g>
        <path d="M568 251L576 264L568 277L560 264Z" fill="#fa765f" stroke="none" />
        <path d="M77 337L83 329M537 305L543 297" stroke="#2467ed" strokeWidth="2.5" />
        <path d="M404 78L410 74L416 78M424 89L430 85L436 89" strokeWidth="2" />
      </g>
    </svg>
  )
}
