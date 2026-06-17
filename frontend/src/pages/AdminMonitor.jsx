import { useState, useEffect } from 'react'
import Navbar from '../components/Navbar'
import TrustScoreRing from '../components/TrustScoreRing'
import api from '../services/api'
import { getSocket } from '../services/socket'
import { Monitor, Users, AlertTriangle, Activity, Loader2, RefreshCw, Wifi } from 'lucide-react'

function SessionCard({ session, liveViolation }) {
  const elapsed = Math.floor((Date.now() - new Date(session.started_at).getTime()) / 60000)
  const hasAlert = liveViolation?.session_id === session.id

  return (
    <div className={`card transition-all ${hasAlert ? 'violation-flash border-red-500/50' : 'hover:border-slate-600'}`}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-white font-semibold">{session.student_name}</h3>
          <p className="text-slate-400 text-xs">{session.exam_title}</p>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="status-dot online" />
          <span className="text-xs text-green-400 font-medium">Live</span>
        </div>
      </div>

      <div className="flex items-center justify-between mb-4">
        <TrustScoreRing score={session.trust_score} size={72} strokeWidth={8} />
        <div className="text-right space-y-2">
          <div>
            <p className="text-2xl font-bold text-white">{session.total_violations}</p>
            <p className="text-slate-500 text-xs">Violations</p>
          </div>
          <div>
            <p className="text-lg font-semibold text-slate-300">{elapsed}m</p>
            <p className="text-slate-500 text-xs">Elapsed</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="bg-slate-800 rounded-lg px-3 py-2">
          <p className="text-slate-500">Tab switches</p>
          <p className={`font-bold mt-0.5 ${session.tab_switches > 0 ? 'text-orange-400' : 'text-slate-300'}`}>
            {session.tab_switches}
          </p>
        </div>
        <div className="bg-slate-800 rounded-lg px-3 py-2">
          <p className="text-slate-500">Fullscreen exits</p>
          <p className={`font-bold mt-0.5 ${session.fullscreen_exits > 0 ? 'text-orange-400' : 'text-slate-300'}`}>
            {session.fullscreen_exits}
          </p>
        </div>
      </div>

      {hasAlert && (
        <div className="mt-3 p-2 rounded-lg bg-red-500/10 border border-red-500/30">
          <p className="text-red-400 text-xs font-semibold flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            New: {liveViolation?.violations?.[0]?.type?.replace(/_/g, ' ')}
          </p>
        </div>
      )}
    </div>
  )
}

export default function AdminMonitor() {
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [liveViolation, setLiveViolation] = useState(null)
  const [lastRefresh, setLastRefresh] = useState(new Date())

  const fetchSessions = () =>
    api.get('/admin/live-sessions').then(r => {
      setSessions(r.data.sessions)
      setLastRefresh(new Date())
      setLoading(false)
    })

  useEffect(() => {
    fetchSessions()
    const socket = getSocket()
    socket.emit('admin_join', {})
    socket.on('live_violation', (data) => {
      setLiveViolation(data)
      setTimeout(() => setLiveViolation(null), 5000)
      fetchSessions()
    })
    socket.on('student_joined', fetchSessions)
    socket.on('student_left', fetchSessions)
    socket.on('student_disconnected', fetchSessions)
    const interval = setInterval(fetchSessions, 15000)
    return () => {
      clearInterval(interval)
      socket.off('live_violation')
      socket.off('student_joined')
      socket.off('student_left')
      socket.off('student_disconnected')
    }
  }, [])

  return (
    <div className="flex min-h-screen bg-slate-950">
      <Navbar />
      <main className="ml-60 flex-1 p-8 page-enter">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">Live Monitor</h1>
            <p className="text-slate-400 mt-1">Real-time view of all active exam sessions.</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-2 text-xs text-slate-400">
              <Wifi className="w-3.5 h-3.5 text-green-400" /> Live
            </span>
            <button onClick={fetchSessions} className="btn btn-ghost py-2 px-3 text-xs">
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { icon: Activity, label: 'Active Sessions', value: sessions.length, color: 'text-green-400', bg: 'bg-green-500/10' },
            { icon: Users, label: 'Students Online', value: sessions.length, color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
            { icon: AlertTriangle, label: 'Total Violations',
              value: sessions.reduce((a, s) => a + s.total_violations, 0),
              color: 'text-red-400', bg: 'bg-red-500/10' },
          ].map(({ icon: Icon, label, value, color, bg }) => (
            <div key={label} className="card flex items-center gap-4">
              <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center`}>
                <Icon className={`w-5 h-5 ${color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{value}</p>
                <p className="text-slate-400 text-sm">{label}</p>
              </div>
            </div>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
          </div>
        ) : sessions.length === 0 ? (
          <div className="card text-center py-20 text-slate-500">
            <Monitor className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-lg font-medium text-slate-400 mb-1">No active sessions</p>
            <p className="text-sm">Students will appear here when they start an exam.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {sessions.map(s => (
              <SessionCard key={s.id} session={s} liveViolation={liveViolation} />
            ))}
          </div>
        )}

        <p className="text-slate-600 text-xs text-right mt-4">
          Last refreshed: {lastRefresh.toLocaleTimeString()}
        </p>
      </main>
    </div>
  )
}
