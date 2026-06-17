import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Legend,
  BarChart, Bar
} from 'recharts'

const VIOLATION_COLORS = {
  no_face:          '#ef4444',
  multiple_faces:   '#dc2626',
  looking_away:     '#f59e0b',
  phone_detected:   '#f97316',
  tab_switch:       '#8b5cf6',
  fullscreen_exit:  '#6366f1',
  audio_noise:      '#06b6d4',
  suspicious_object:'#84cc16',
}

const PIE_COLORS = Object.values(VIOLATION_COLORS)

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs">
      {label && <p className="text-slate-400 mb-1">{label}</p>}
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }} className="font-medium">
          {p.name}: {p.value}
        </p>
      ))}
    </div>
  )
}

/** Pie chart of violation type breakdown */
export function ViolationPieChart({ data = {} }) {
  const chartData = Object.entries(data)
    .filter(([, v]) => v > 0)
    .map(([name, value]) => ({
      name: name.replace(/_/g, ' '),
      value,
      color: VIOLATION_COLORS[name] || '#6366f1',
    }))

  if (!chartData.length) return (
    <div className="flex items-center justify-center h-40 text-slate-600 text-sm">
      No violations recorded
    </div>
  )

  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie data={chartData} cx="50%" cy="50%"
          innerRadius={55} outerRadius={85}
          paddingAngle={3} dataKey="value">
          {chartData.map((entry, i) => (
            <Cell key={i} fill={entry.color}
              style={{ filter: `drop-shadow(0 0 4px ${entry.color}66)` }} />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        <Legend formatter={(v) => (
          <span className="text-xs text-slate-400">{v}</span>
        )} />
      </PieChart>
    </ResponsiveContainer>
  )
}

/** Area chart for trust score over time */
export function TrustScoreChart({ data = [] }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="trustGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
        <XAxis dataKey="time" tick={{ fill: '#64748b', fontSize: 11 }} />
        <YAxis domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 11 }} />
        <Tooltip content={<CustomTooltip />} />
        <Area type="monotone" dataKey="trust_score" name="Trust Score"
          stroke="#6366f1" strokeWidth={2}
          fill="url(#trustGrad)" dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  )
}

/** Bar chart for violation counts per type */
export function ViolationBarChart({ data = {} }) {
  const chartData = Object.entries(data)
    .filter(([, v]) => v > 0)
    .map(([name, value]) => ({
      name: name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      count: value,
      fill:  VIOLATION_COLORS[name] || '#6366f1',
    }))

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 40 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
        <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 10 }}
          angle={-30} textAnchor="end" interval={0} />
        <YAxis allowDecimals={false} tick={{ fill: '#64748b', fontSize: 11 }} />
        <Tooltip content={<CustomTooltip />} />
        <Bar dataKey="count" name="Count" radius={[4, 4, 0, 0]}>
          {chartData.map((entry, i) => (
            <Cell key={i} fill={entry.fill} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
