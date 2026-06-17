import { useState, useEffect } from 'react'
import Navbar from '../components/Navbar'
import TrustScoreRing from '../components/TrustScoreRing'
import { ViolationPieChart, ViolationBarChart } from '../components/Charts'
import api from '../services/api'
import {
  FileText, ChevronDown, ChevronUp, Loader2,
  AlertTriangle, ShieldCheck, User, Clock,
  Download, RefreshCw, Eye
} from 'lucide-react'

const RISK_STYLES = {
  low:      'text-green-400  bg-green-500/10  border-green-500/20',
  medium:   'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
  high:     'text-orange-400 bg-orange-500/10 border-orange-500/20',
  critical: 'text-red-400   bg-red-500/10    border-red-500/20',
}

function ReportCard({ report, onExpand, isExpanded }) {
  const riskCls = RISK_STYLES[report.risk_level] || RISK_STYLES.medium

  return (
    <div className="card">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-white font-semibold">{report.exam_title}</h3>
          <p className="text-slate-400 text-sm flex items-center gap-1 mt-0.5">
            <User className="w-3 h-3" /> {report.student_name}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className={`text-xs px-2 py-0.5 rounded-full border font-semibold capitalize ${riskCls}`}>
            {report.risk_level}
          </span>
          <TrustScoreRing score={report.trust_score} size={52} strokeWidth={6} />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4 text-xs text-center">
        <div className="bg-slate-800 rounded-lg py-2">
          <p className="text-2xl font-bold text-white">{report.total_violations}</p>
          <p className="text-slate-500 mt-0.5">Violations</p>
        </div>
        <div className="bg-slate-800 rounded-lg py-2">
          <p className={`text-2xl font-bold ${
            report.trust_score >= 80 ? 'text-green-400'
            : report.trust_score >= 60 ? 'text-yellow-400'
            : 'text-red-400'}`}>{report.trust_score}</p>
          <p className="text-slate-500 mt-0.5">Trust Score</p>
        </div>
        <div className="bg-slate-800 rounded-lg py-2">
          <p className="text-sm font-bold text-white capitalize">{report.risk_level}</p>
          <p className="text-slate-500 mt-0.5">Risk Level</p>
        </div>
      </div>

      <p className="text-slate-400 text-xs leading-relaxed mb-3 line-clamp-2">{report.summary}</p>

      <button onClick={() => onExpand(report.session_id)}
        className="flex items-center gap-1 text-indigo-400 hover:text-indigo-300 text-xs font-medium w-full justify-center py-2 border border-indigo-500/20 rounded-lg hover:bg-indigo-500/5 transition-all">
        <Eye className="w-3.5 h-3.5" />
        {isExpanded ? 'Hide Details' : 'View Full Report'}
        {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>
    </div>
  )
}

function ReportDetail({ sessionId, report }) {
  const [detail, setDetail] = useState(null)
  const [loading, setLoading] = useState(true)
  const [screenshots, setScreenshots] = useState([])

  useEffect(() => {
    Promise.all([
      api.get(`/reports/${sessionId}`),
      api.get(`/admin/screenshots/${sessionId}`),
    ]).then(([rRes, sRes]) => {
      setDetail(rRes.data)
      setScreenshots(sRes.data.screenshots || [])
    }).finally(() => setLoading(false))
  }, [sessionId])

  if (loading) return (
    <div className="flex justify-center py-6">
      <Loader2 className="w-5 h-5 text-indigo-500 animate-spin" />
    </div>
  )

  const breakdown = detail?.report?.violation_breakdown || {}

  return (
    <div className="mt-4 border-t border-slate-700 pt-4 space-y-6 animate-fade-in">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h4 className="text-sm font-semibold text-slate-300 mb-3">Violation Breakdown</h4>
          <ViolationBarChart data={breakdown} />
        </div>
        <div>
          <h4 className="text-sm font-semibold text-slate-300 mb-3">Distribution</h4>
          <ViolationPieChart data={breakdown} />
        </div>
      </div>

      {detail?.report?.recommendations && (
        <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20">
          <h4 className="text-sm font-semibold text-amber-400 mb-2 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" /> Recommendations
          </h4>
          <p className="text-slate-300 text-sm leading-relaxed">{detail.report.recommendations}</p>
        </div>
      )}

      {/* Violation timeline */}
      {detail?.violations?.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-slate-300 mb-3">Violation Timeline</h4>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {detail.violations.map((v, i) => (
              <div key={i} className={`flex items-center gap-3 p-2.5 rounded-lg border text-xs severity-${v.severity}`}>
                <span className="font-mono opacity-60 flex-shrink-0">
                  {new Date(v.timestamp).toLocaleTimeString()}
                </span>
                <span className="font-semibold capitalize">{v.violation_type?.replace(/_/g, ' ')}</span>
                <span className="ml-auto opacity-60 capitalize">{v.severity}</span>
                <span className="opacity-60">-{v.score_deduction}pts</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Screenshots */}
      {screenshots.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-slate-300 mb-3">Evidence Screenshots ({screenshots.length})</h4>
          <div className="grid grid-cols-4 gap-2">
            {screenshots.slice(0, 8).map((url, i) => (
              <a key={i} href={`http://localhost:5000${url}`} target="_blank" rel="noreferrer"
                className="aspect-video bg-slate-800 rounded-lg overflow-hidden border border-slate-700 hover:border-indigo-500/40 transition-all">
                <img src={`http://localhost:5000${url}`} alt={`Screenshot ${i+1}`}
                  className="w-full h-full object-cover" />
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default function AdminReports() {
  const [reports,  setReports]  = useState([])
  const [loading,  setLoading]  = useState(true)
  const [expanded, setExpanded] = useState(null)

  useEffect(() => {
    api.get('/reports').then(r => {
      setReports(r.data.reports)
      setLoading(false)
    })
  }, [])

  const toggleExpand = (sid) => setExpanded(e => e === sid ? null : sid)

  return (
    <div className="flex min-h-screen bg-slate-950">
      <Navbar />
      <main className="ml-60 flex-1 p-8 page-enter">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">Exam Reports</h1>
            <p className="text-slate-400 mt-1">Post-exam proctoring analysis and violation summaries.</p>
          </div>
          <button onClick={() => api.get('/reports').then(r => setReports(r.data.reports))}
            className="btn btn-ghost py-2 px-3 text-xs">
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
          </div>
        ) : reports.length === 0 ? (
          <div className="card text-center py-20 text-slate-500">
            <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-lg font-medium text-slate-400 mb-1">No reports yet</p>
            <p className="text-sm">Reports are generated when students complete exams.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {reports.map(report => (
              <div key={report.id} className="card">
                <ReportCard report={report}
                  onExpand={toggleExpand}
                  isExpanded={expanded === report.session_id} />
                {expanded === report.session_id && (
                  <ReportDetail sessionId={report.session_id} report={report} />
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
