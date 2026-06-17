import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Navbar from '../components/Navbar'
import TrustScoreRing from '../components/TrustScoreRing'
import api from '../services/api'
import {
  BookOpen, Clock, CheckCircle, Play, Trophy,
  AlertTriangle, Calendar, ChevronRight, Loader2
} from 'lucide-react'

function StatCard({ icon: Icon, label, value, color = 'text-indigo-400', bg = 'bg-indigo-500/10' }) {
  return (
    <div className="card flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl ${bg} flex items-center justify-center flex-shrink-0`}>
        <Icon className={`w-6 h-6 ${color}`} />
      </div>
      <div>
        <p className="text-2xl font-bold text-white">{value}</p>
        <p className="text-slate-400 text-sm">{label}</p>
      </div>
    </div>
  )
}

function ExamCard({ exam, session, onStart }) {
  const isCompleted = session?.status === 'completed'
  const isActive    = session?.status === 'active'

  return (
    <div className="card hover:border-indigo-500/40 transition-all group cursor-pointer"
      onClick={() => !isCompleted && onStart(exam.id)}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="text-white font-semibold group-hover:text-indigo-300 transition-colors">
            {exam.title}
          </h3>
          <p className="text-slate-400 text-sm mt-0.5">{exam.subject}</p>
        </div>
        {isCompleted ? (
          <span className="text-xs px-2 py-1 rounded-full bg-green-500/10 text-green-400 border border-green-500/20 font-medium">
            Completed
          </span>
        ) : isActive ? (
          <span className="text-xs px-2 py-1 rounded-full bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 font-medium animate-pulse">
            In Progress
          </span>
        ) : (
          <span className="text-xs px-2 py-1 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-medium">
            Available
          </span>
        )}
      </div>

      <p className="text-slate-500 text-sm mb-4 line-clamp-2">{exam.description}</p>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 text-slate-400 text-xs">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" /> {exam.duration_minutes} min
          </span>
          <span className="flex items-center gap-1">
            <Trophy className="w-3 h-3" /> {exam.total_marks} marks
          </span>
        </div>
        {!isCompleted && (
          <span className="flex items-center gap-1 text-indigo-400 text-xs font-medium group-hover:gap-2 transition-all">
            {isActive ? 'Resume' : 'Start Exam'}
            <ChevronRight className="w-3 h-3" />
          </span>
        )}
        {isCompleted && session && (
          <div className="flex items-center gap-2">
            <TrustScoreRing score={session.trust_score} size={40} strokeWidth={5} />
          </div>
        )}
      </div>
    </div>
  )
}

export default function StudentDashboard() {
  const { user }   = useAuth()
  const navigate   = useNavigate()
  const [exams,    setExams]    = useState([])
  const [sessions, setSessions] = useState([])
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    Promise.all([
      api.get('/exams'),
      api.get('/exams/my-sessions'),
    ]).then(([exRes, sRes]) => {
      setExams(exRes.data.exams)
      setSessions(sRes.data.sessions)
    }).finally(() => setLoading(false))
  }, [])

  const getSession = (examId) =>
    sessions.find(s => s.exam_id === examId)

  const completedSessions = sessions.filter(s => s.status === 'completed')
  const avgTrust = completedSessions.length
    ? (completedSessions.reduce((a, s) => a + s.trust_score, 0) / completedSessions.length).toFixed(1)
    : '—'

  return (
    <div className="flex min-h-screen bg-slate-950">
      <Navbar />
      <main className="ml-60 flex-1 p-8 page-enter">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">
            Good {new Date().getHours() < 12 ? 'morning' : 'afternoon'},{' '}
            <span className="gradient-text">{user?.full_name?.split(' ')[0]}</span> 👋
          </h1>
          <p className="text-slate-400 mt-1">Here are your upcoming exams and results.</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <StatCard icon={BookOpen} label="Available Exams" value={exams.length}
            color="text-indigo-400" bg="bg-indigo-500/10" />
          <StatCard icon={CheckCircle} label="Completed" value={completedSessions.length}
            color="text-green-400" bg="bg-green-500/10" />
          <StatCard icon={Trophy} label="Avg Trust Score" value={avgTrust}
            color="text-amber-400" bg="bg-amber-500/10" />
        </div>

        {/* Exams grid */}
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-indigo-400" /> Exams
        </h2>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
          </div>
        ) : exams.length === 0 ? (
          <div className="card text-center py-16 text-slate-500">
            <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No exams available yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {exams.map(exam => (
              <ExamCard key={exam.id} exam={exam}
                session={getSession(exam.id)}
                onStart={(id) => navigate(`/exam/${id}`)} />
            ))}
          </div>
        )}

        {/* Recent sessions */}
        {completedSessions.length > 0 && (
          <div className="mt-8">
            <h2 className="text-lg font-semibold text-white mb-4">Recent Results</h2>
            <div className="card overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-slate-400 text-xs border-b border-slate-700">
                    <th className="text-left pb-3">Exam</th>
                    <th className="text-center pb-3">Status</th>
                    <th className="text-center pb-3">Trust Score</th>
                    <th className="text-center pb-3">Violations</th>
                    <th className="text-right pb-3">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {completedSessions.slice(0, 5).map(s => (
                    <tr key={s.id} className="text-slate-300">
                      <td className="py-3 font-medium">{s.exam_title}</td>
                      <td className="text-center">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/10 text-green-400">
                          {s.status}
                        </span>
                      </td>
                      <td className="text-center">
                        <span className={`font-bold ${
                          s.trust_score >= 80 ? 'text-green-400'
                          : s.trust_score >= 60 ? 'text-yellow-400'
                          : 'text-red-400'
                        }`}>{s.trust_score}%</span>
                      </td>
                      <td className="text-center text-slate-400">{s.total_violations}</td>
                      <td className="text-right text-slate-500 text-xs">
                        {new Date(s.started_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
