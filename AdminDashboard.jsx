import { useState, useEffect } from 'react'
import Navbar from '../components/Navbar'
import { ViolationPieChart } from '../components/Charts'
import TrustScoreRing from '../components/TrustScoreRing'
import api from '../services/api'
import { getSocket } from '../services/socket'
import {
  Users, BookOpen, ShieldAlert, Activity, CheckCircle,
  AlertTriangle, Eye, Phone, Monitor, Volume2, Loader2,
  TrendingUp, Bell
} from 'lucide-react'

const VIOLATION_ICONS = {
  no_face: Eye, multiple_faces: Users, looking_away: Eye,
  phone_detected: Phone, tab_switch: Monitor,
  fullscreen_exit: Monitor, audio_noise: Volume2,
  suspicious_object: AlertTriangle,
}
const SEV_COLORS = {
  low: 'text-green-400 bg-green-500/10 border-green-500/20',
  medium: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
  high: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
  critical: 'text-red-400 bg-red-500/10 border-red-500/20',
}

function StatCard({ icon: Icon, label, value, sub, color, bg }) {
  return (
    <div className="card">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center`}>
          <Icon className={`w-5 h-5 ${color}`} />
        </div>
      </div>
      <p className="text-3xl font-bold text-white">{value}</p>
      <p className="text-slate-400 text-sm mt-0.5">{label}</p>
      {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
    </div>
  )
}

function ViolationRow({ v }) {
  const Icon = VIOLATION_ICONS[v.violation_type] || AlertTriangle
  const cls  = SEV_COLORS[v.severity] || SEV_COLORS.medium
  return (
    <div className={`flex items-center gap-3 p-3 rounded-xl border ${cls} animate-fade-in`}>
      <Icon className="w-4 h-4 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold">{v.violation_type?.replace(/_/g, ' ').toUpperCase()}</p>
        <p className="text-xs opacity-70 mt-0.5">{v.student_name} — {v.exam_title}</p>
      </div>
      <span className="text-xs opacity-60 flex-shrink-0">
        {new Date(v.timestamp).toLocaleTimeString()}
      </span>
    </div>
  )
}

export default function AdminDashboard() {
  const [stats,    setStats]    = useState(null)
  const [recent,   setRecent]   = useState([])
  const [liveAlerts, setLiveAlerts] = useState([])
  const [loading,  setLoading]  = useState(true)

  const fetchDashboard = () =>
    api.get('/admin/dashboard').then(r => {
      setStats(r.data.stats)
      setRecent(r.data.recent_violations || [])
      setLoading(false)
    })

  useEffect(() => {
    fetchDashboard()

    // Admin joins Socket.IO live room
    const socket = getSocket()
    socket.emit('admin_join', {})
    socket.on('live_violation', (data) => {
      setLiveAlerts(prev => [{
        id:       Date.now(),
        student_name: data.student_name,
        violations: data.violations,
        ts:       new Date().toISOString(),
      }, ...prev].slice(0, 20))
      // Refresh stats every 5 live events
      fetchDashboard()
    })

    const interval = setInterval(fetchDashboard, 30000)
    return () => {
      clearInterval(interval)
      socket.off('live_violation')
    }
  }, [])

  if (loading) return (
    <div className="flex min-h-screen bg-slate-950">
      <Navbar />
      <div className="ml-60 flex-1 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
      </div>
    </div>
  )

  const pieData = stats ? (
    Object.fromEntries(
      Object.entries(stats.violation_breakdown || {}).filter(([, v]) => v > 0)
    )
  ) : {}

  return (
    <div className="flex min-h-screen bg-slate-950">
      <Navbar />
      <main className="ml-60 flex-1 p-8 page-enter">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
          <p className="text-slate-400 mt-1">Real-time overview of all proctored exams.</p>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard icon={Users}      label="Total Students"    value={stats?.total_students ?? 0}
            color="text-indigo-400" bg="bg-indigo-500/10" />
          <StatCard icon={BookOpen}   label="Total Exams"       value={stats?.total_exams ?? 0}
            color="text-violet-400" bg="bg-violet-500/10" />
          <StatCard icon={Activity}   label="Active Sessions"   value={stats?.active_sessions ?? 0}
            sub="Currently monitored"
            color="text-green-400"  bg="bg-green-500/10" />
          <StatCard icon={ShieldAlert} label="Total Violations" value={stats?.total_violations ?? 0}
            sub={`${stats?.unacknowledged ?? 0} unreviewed`}
            color="text-red-400"   bg="bg-red-500/10" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Avg trust score */}
          <div className="card flex flex-col items-center justify-center py-8">
            <TrustScoreRing score={stats?.avg_trust_score ?? 100} size={140} strokeWidth={14} />
            <p className="text-slate-400 text-sm mt-4">Average Trust Score</p>
            <p className="text-slate-500 text-xs">{stats?.completed_sessions ?? 0} completed sessions</p>
          </div>

          {/* Violation breakdown pie */}
          <div className="card lg:col-span-2">
            <h2 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-indigo-400" /> Violation Breakdown
            </h2>
            <ViolationPieChart data={pieData} />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Live alerts */}
          <div className="card">
            <h2 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
              <Bell className="w-4 h-4 text-red-400" />
              Live Alerts
              {liveAlerts.length > 0 && (
                <span className="ml-auto bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                  {liveAlerts.length}
                </span>
              )}
            </h2>
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {liveAlerts.length === 0 ? (
                <div className="text-center py-10 text-slate-600">
                  <CheckCircle className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">No live alerts yet</p>
                </div>
              ) : liveAlerts.map(a => (
                <div key={a.id} className="p-3 rounded-xl bg-slate-800 border border-slate-700 text-xs animate-slide-in">
                  <p className="text-white font-medium">{a.student_name}</p>
                  {a.violations?.map((v, i) => (
                    <p key={i} className="text-slate-400 mt-0.5">
                      {v.type?.replace(/_/g, ' ')} — {v.severity}
                    </p>
                  ))}
                  <p className="text-slate-600 mt-1">{new Date(a.ts).toLocaleTimeString()}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Recent violations */}
          <div className="card">
            <h2 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-orange-400" /> Recent Violations
            </h2>
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {recent.length === 0 ? (
                <div className="text-center py-10 text-slate-600 text-sm">No violations recorded</div>
              ) : recent.map((v, i) => <ViolationRow key={i} v={v} />)}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
