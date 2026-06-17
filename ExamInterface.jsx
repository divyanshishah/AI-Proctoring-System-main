import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import WebcamFeed from '../components/WebcamFeed'
import AlertPanel from '../components/AlertPanel'
import TrustScoreRing from '../components/TrustScoreRing'
import { startProctoring, stopProctoring, requestFullscreen } from '../services/proctoring'
import { getSocket } from '../services/socket'
import api from '../services/api'
import {
  Clock, Shield, AlertTriangle, CheckCircle,
  Maximize, Send, Loader2, ChevronLeft, ChevronRight
} from 'lucide-react'

let alertIdCounter = 0

function Timer({ totalMinutes, onExpire }) {
  const [secs, setSecs] = useState(totalMinutes * 60)
  useEffect(() => {
    const t = setInterval(() => setSecs(s => {
      if (s <= 1) { clearInterval(t); onExpire?.(); return 0 }
      return s - 1
    }), 1000)
    return () => clearInterval(t)
  }, [])
  const m = Math.floor(secs / 60).toString().padStart(2, '0')
  const s = (secs % 60).toString().padStart(2, '0')
  const cls = secs < 300 ? 'timer-danger' : secs < 600 ? 'timer-warning' : 'text-white'
  return (
    <div className={`flex items-center gap-2 font-mono text-xl font-bold ${cls}`}>
      <Clock className="w-5 h-5" /> {m}:{s}
    </div>
  )
}

export default function ExamInterface() {
  const { id }     = useParams()
  const { user }   = useAuth()
  const navigate   = useNavigate()

  const [exam,       setExam]       = useState(null)
  const [session,    setSession]    = useState(null)
  const [questions,  setQuestions]  = useState([])
  const [answers,    setAnswers]    = useState({})
  const [current,    setCurrent]    = useState(0)
  const [alerts,     setAlerts]     = useState([])
  const [trustScore, setTrustScore] = useState(100)
  const [detection,  setDetection]  = useState(null)
  const [loading,    setLoading]    = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [started,    setStarted]    = useState(false)
  const [ready,      setReady]      = useState(false)
  const videoRef     = useRef(null)

  // Start exam session
  useEffect(() => {
    api.post(`/exams/${id}/start`).then(res => {
      setExam(res.data.exam)
      setSession(res.data.session)
      setTrustScore(res.data.session.trust_score)
      setQuestions(res.data.exam.questions || [])
      setLoading(false)
    }).catch(() => navigate('/dashboard'))
  }, [id])

  // Wire Socket.IO events
  useEffect(() => {
    const socket = getSocket()

    socket.on('detection_result', (data) => setDetection(data))

    socket.on('violation_alert', (v) => {
      const newAlert = {
        id:       ++alertIdCounter,
        type:     v.type,
        severity: v.severity,
        message:  v.message,
        ts:       new Date().toISOString(),
      }
      setAlerts(prev => [newAlert, ...prev].slice(0, 50))
      if (v.trust_score !== undefined) setTrustScore(v.trust_score)
    })

    return () => {
      socket.off('detection_result')
      socket.off('violation_alert')
    }
  }, [])

  // Start proctoring when session ready
  const handleStartProctoring = useCallback(async () => {
    if (!session) return
    requestFullscreen()
    const videoEl = document.querySelector('video[data-proctor]')
    if (videoEl) {
      await startProctoring(session.id, user.full_name, videoEl)
      setStarted(true)
    }
  }, [session, user])

  // Start proctoring only once when ready
  useEffect(() => {
    if (session && ready && !started) {
      handleStartProctoring()
    }
  }, [ready, session]) // Only depend on the triggers

  // Cleanup proctoring only on actual unmount
  useEffect(() => {
    return () => {
      stopProctoring()
    }
  }, [])

  const handleSubmit = async () => {
    if (!confirm('Are you sure you want to submit the exam?')) return
    setSubmitting(true)
    stopProctoring()
    try {
      await api.post(`/exams/${id}/submit`)
      navigate('/dashboard')
    } catch {
      setSubmitting(false)
    }
  }

  const q = questions[current]

  if (loading) return (
    <div className="flex items-center justify-center h-screen bg-slate-950">
      <div className="text-center">
        <Loader2 className="w-10 h-10 text-indigo-500 animate-spin mx-auto mb-4" />
        <p className="text-slate-400">Loading exam data...</p>
      </div>
    </div>
  )

  if (!ready) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
      <div className="max-w-2xl w-full">
        <div className="text-center mb-10">
          <div className="w-16 h-16 rounded-2xl bg-indigo-600 flex items-center justify-center mx-auto mb-4 glow-primary">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">{exam?.title}</h1>
          <p className="text-slate-400">Ready to begin your proctored examination?</p>
        </div>

        <div className="card p-8 bg-slate-900/50 border-slate-800">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            Important Instructions
          </h3>
          <ul className="space-y-3 text-slate-300 mb-8">
            <li className="flex items-start gap-3">
              <span className="w-5 h-5 rounded-full bg-slate-800 text-xs flex items-center justify-center flex-shrink-0 mt-0.5">1</span>
              Ensure you are in a well-lit room and your face is clearly visible.
            </li>
            <li className="flex items-start gap-3">
              <span className="w-5 h-5 rounded-full bg-slate-800 text-xs flex items-center justify-center flex-shrink-0 mt-0.5">2</span>
              Do not switch tabs or exit fullscreen mode during the exam.
            </li>
            <li className="flex items-start gap-3">
              <span className="w-5 h-5 rounded-full bg-slate-800 text-xs flex items-center justify-center flex-shrink-0 mt-0.5">3</span>
              The exam will be recorded and monitored for suspicious activity.
            </li>
            <li className="flex items-start gap-3">
              <span className="w-5 h-5 rounded-full bg-slate-800 text-xs flex items-center justify-center flex-shrink-0 mt-0.5">4</span>
              Clicking "Start Exam" will activate your camera and enter fullscreen.
            </li>
          </ul>

          <div className="flex flex-col gap-3">
            <button onClick={() => setReady(true)}
              className="btn btn-primary w-full py-4 text-lg shadow-lg shadow-indigo-600/20">
              Start Exam
            </button>
            <button onClick={() => navigate('/dashboard')}
              className="btn btn-ghost w-full">
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div className="h-screen bg-slate-950 flex flex-col overflow-hidden">
      {/* Top bar */}
      <header className="flex items-center justify-between px-6 py-3 bg-slate-900 border-b border-slate-800 flex-shrink-0">
        <div className="flex items-center gap-3">
          <Shield className="w-5 h-5 text-indigo-400" />
          <h1 className="text-white font-semibold text-sm">{exam?.title}</h1>
          <span className="text-slate-500 text-xs">|</span>
          <span className="text-slate-400 text-xs">{questions.length} Questions</span>
        </div>

        <div className="flex items-center gap-6">
          {exam && <Timer totalMinutes={exam.duration_minutes} onExpire={handleSubmit} />}

          <div className="flex items-center gap-2">
            <span className="status-dot online" />
            <span className="text-xs text-slate-400">Proctored</span>
          </div>

          <button onClick={() => requestFullscreen()}
            className="btn btn-ghost py-1.5 px-3 text-xs gap-1">
            <Maximize className="w-3.5 h-3.5" /> Fullscreen
          </button>

          <button onClick={handleSubmit} disabled={submitting}
            className="btn btn-primary py-1.5 px-4 text-sm">
            {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            Submit
          </button>
        </div>
      </header>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Questions */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Question navigator */}
          <div className="px-6 py-3 border-b border-slate-800 flex items-center gap-2 flex-wrap flex-shrink-0">
            {questions.map((_, i) => (
              <button key={i} onClick={() => setCurrent(i)}
                className={`w-8 h-8 rounded-lg text-xs font-semibold transition-all ${
                  i === current     ? 'bg-indigo-600 text-white'
                  : answers[i] !== undefined ? 'bg-green-600/20 text-green-400 border border-green-600/30'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                }`}>{i + 1}</button>
            ))}
            <span className="ml-auto text-xs text-slate-500">
              {Object.keys(answers).length}/{questions.length} answered
            </span>
          </div>

          {/* Question */}
          <div className="flex-1 overflow-y-auto p-8">
            {q ? (
              <div className="max-w-2xl mx-auto animate-fade-in">
                <div className="flex items-center gap-2 text-slate-400 text-sm mb-6">
                  <span className="bg-indigo-600/20 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded-lg text-xs font-semibold">
                    Q{current + 1}
                  </span>
                  <span>{q.marks} mark{q.marks > 1 ? 's' : ''}</span>
                </div>

                <h2 className="text-xl text-white font-medium mb-8 leading-relaxed">
                  {q.question}
                </h2>

                <div className="space-y-3">
                  {q.options?.map((opt, i) => (
                    <button key={i}
                      onClick={() => setAnswers(prev => ({ ...prev, [current]: i }))}
                      className={`w-full text-left p-4 rounded-xl border transition-all ${
                        answers[current] === i
                          ? 'bg-indigo-600/20 border-indigo-500/60 text-indigo-300'
                          : 'bg-slate-800/50 border-slate-700 text-slate-300 hover:border-indigo-500/30 hover:bg-slate-800'
                      }`}>
                      <span className={`inline-flex items-center justify-center w-7 h-7 rounded-lg mr-3 text-sm font-bold ${
                        answers[current] === i ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-slate-400'
                      }`}>{String.fromCharCode(65 + i)}</span>
                      {opt}
                    </button>
                  ))}
                </div>

                {/* Navigation */}
                <div className="flex justify-between mt-8">
                  <button onClick={() => setCurrent(c => Math.max(0, c - 1))}
                    disabled={current === 0}
                    className="btn btn-ghost gap-2">
                    <ChevronLeft className="w-4 h-4" /> Previous
                  </button>
                  <button onClick={() => setCurrent(c => Math.min(questions.length - 1, c + 1))}
                    disabled={current === questions.length - 1}
                    className="btn btn-ghost gap-2">
                    Next <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-500">
                No questions found.
              </div>
            )}
          </div>
        </div>

        {/* Right: Proctoring panel */}
        <aside className="w-72 flex-shrink-0 border-l border-slate-800 flex flex-col bg-slate-900/50">
          {/* Webcam */}
          <div className="p-4 border-b border-slate-800">
            <WebcamFeed detectionResult={detection} isActive={started} />
          </div>

          {/* Trust score */}
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 mb-0.5">Trust Score</p>
              <p className="text-slate-500 text-xs">Violations: {alerts.length}</p>
            </div>
            <TrustScoreRing score={trustScore} size={72} strokeWidth={8} />
          </div>

          {/* Alerts */}
          <div className="flex-1 p-4 overflow-hidden flex flex-col">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <AlertTriangle className="w-3.5 h-3.5" />
              Alerts
              {alerts.length > 0 && (
                <span className="ml-auto bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center badge-pulse">
                  {alerts.length > 9 ? '9+' : alerts.length}
                </span>
              )}
            </h3>
            <AlertPanel alerts={alerts} maxHeight="100%" />
          </div>
        </aside>
      </div>
    </div>
  )
}
