/** TrustScoreRing — Circular SVG trust score indicator */
export default function TrustScoreRing({ score = 100, size = 120, strokeWidth = 10 }) {
  const radius      = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset      = circumference - (score / 100) * circumference

  const color = score >= 80 ? '#22c55e'
              : score >= 60 ? '#f59e0b'
              : score >= 40 ? '#f97316'
              : '#ef4444'

  const label = score >= 80 ? 'Excellent'
              : score >= 60 ? 'Fair'
              : score >= 40 ? 'At Risk'
              : 'Critical'

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={size} height={size} className="rotate-[-90deg]">
        {/* Background ring */}
        <circle cx={size/2} cy={size/2} r={radius}
          fill="none" stroke="#1e293b" strokeWidth={strokeWidth} />
        {/* Score ring */}
        <circle cx={size/2} cy={size/2} r={radius}
          fill="none" stroke={color} strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.8s ease, stroke 0.5s ease',
                   filter: `drop-shadow(0 0 6px ${color}88)` }}
        />
        {/* Score text (counter-rotate) */}
        <text x={size/2} y={size/2 + 6}
          textAnchor="middle" fontSize={size * 0.2}
          fontWeight="700" fill={color}
          style={{ transform: `rotate(90deg)`, transformOrigin: `${size/2}px ${size/2}px`,
                   fontFamily: 'Inter, sans-serif' }}>
          {Math.round(score)}
        </text>
      </svg>
      <span className="text-xs font-semibold" style={{ color }}>{label}</span>
    </div>
  )
}
