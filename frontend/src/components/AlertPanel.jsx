import { useEffect, useRef } from 'react'
import { AlertTriangle, X, ShieldAlert, Eye, Phone, Volume2, Monitor } from 'lucide-react'

const ICONS = {
  no_face:          Eye,
  multiple_faces:   ShieldAlert,
  looking_away:     Eye,
  phone_detected:   Phone,
  tab_switch:       Monitor,
  fullscreen_exit:  Monitor,
  audio_noise:      Volume2,
  suspicious_object: AlertTriangle,
}

const COLORS = {
  low:      'border-green-500/30 bg-green-500/10 text-green-400',
  medium:   'border-yellow-500/30 bg-yellow-500/10 text-yellow-400',
  high:     'border-orange-500/30 bg-orange-500/10 text-orange-400',
  critical: 'border-red-500/30 bg-red-500/10 text-red-400',
}

function AlertItem({ alert, onDismiss }) {
  const Icon = ICONS[alert.type] || AlertTriangle
  const colorCls = COLORS[alert.severity] || COLORS.medium

  return (
    <div className={`flex items-start gap-3 p-3 rounded-xl border animate-slide-in ${colorCls}`}>
      <Icon className="w-4 h-4 mt-0.5 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wide opacity-80">
          {alert.type?.replace(/_/g, ' ')}
        </p>
        <p className="text-xs mt-0.5 opacity-90 leading-snug">{alert.message}</p>
        <p className="text-xs opacity-50 mt-1">{new Date(alert.ts).toLocaleTimeString()}</p>
      </div>
      {onDismiss && (
        <button onClick={() => onDismiss(alert.id)}
          className="opacity-50 hover:opacity-100 flex-shrink-0">
          <X className="w-3 h-3" />
        </button>
      )}
    </div>
  )
}

export default function AlertPanel({ alerts = [], onDismiss, maxHeight = '360px' }) {
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [alerts.length])

  return (
    <div className="flex flex-col gap-2 overflow-y-auto pr-1" style={{ maxHeight }}>
      {alerts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-slate-600">
          <ShieldAlert className="w-8 h-8 mb-2 opacity-40" />
          <p className="text-sm">No violations detected</p>
        </div>
      ) : (
        alerts.map(a => (
          <AlertItem key={a.id} alert={a} onDismiss={onDismiss} />
        ))
      )}
      <div ref={bottomRef} />
    </div>
  )
}
