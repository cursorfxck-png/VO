export default function MusicIcon({ size = 32, className = "" }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 140 140" 
      width={size} 
      height={size}
      className={className}
      style={{ display: 'block' }}
    >
      <defs>
        <style>
          {`
            .music-icon-wrap {
              cursor: pointer;
              transition: transform .25s cubic-bezier(.2,1,.2,1), filter .25s;
              transform-origin: 50% 50%;
            }
            .music-icon-wrap:hover {
              transform: scale(1.1);
              filter: drop-shadow(0 0 10px currentColor);
            }
            .music-icon-note {
              stroke: currentColor;
              fill: none;
              stroke-width: 4;
              stroke-linecap: round;
              stroke-linejoin: round;
              transition: transform .25s cubic-bezier(.2,1,.2,1);
              transform-origin: 70px 60px;
            }
            .music-icon-wrap:hover .music-icon-note {
              transform: translateY(-3px);
            }
            .music-icon-waves path {
              stroke: currentColor;
              stroke-width: 3;
              fill: none;
              opacity: .65;
              transition: opacity .25s ease, transform .25s ease;
              transform-origin: 70px 70px;
            }
            .music-icon-wrap:hover .music-icon-waves path {
              opacity: 1;
              transform: scale(1.05);
            }
            @keyframes flow {
              0%   { stroke-dashoffset: 0; }
              100% { stroke-dashoffset: -40; }
            }
            .music-icon-flow {
              stroke-dasharray: 40;
              animation: flow 2s linear infinite;
            }
          `}
        </style>
      </defs>
      <g className="music-icon-wrap">
        <circle cx="70" cy="70" r="58" stroke="currentColor" strokeWidth="2" opacity=".12" fill="none"/>
        <g className="music-icon-waves">
          <path className="music-icon-flow" d="M20 70 Q40 60 60 70 T100 70 T120 70"/>
        </g>
        <path 
          className="music-icon-note"
          d="M58 35v45c-4-2-8-3-12-3-10 0-16 6-16 13s6 13 16 13 16-6 16-13V52l30-7V29z"
        />
      </g>
    </svg>
  )
}