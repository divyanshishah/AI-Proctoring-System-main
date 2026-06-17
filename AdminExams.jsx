import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import Navbar from '../components/Navbar'
import QuestionManagerModal from '../components/QuestionManagerModal'
import api from '../services/api'
import {
  Plus, Pencil, Trash2, BookOpen, Clock, Trophy,
  ToggleLeft, ToggleRight, Loader2, X, Check, ListChecks
} from 'lucide-react'

function ExamModal({ exam, onClose, onSave }) {
  const { user } = useAuth()
  const [form, setForm] = useState(exam || {
    title: '', subject: '', description: '',
    duration_minutes: 60, total_marks: 100, is_active: true,
  })
  const [saving, setSaving] = useState(false)
  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }))

  const handleSave = async () => {
    if (!form.title) return
    setSaving(true)
    try {
      if (exam?.id) {
        await api.put(`/exams/${exam.id}`, form)
      } else {
        await api.post('/exams', form)
      }
      onSave()
    } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="card w-full max-w-lg animate-bounce-in">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-white">{exam ? 'Edit Exam' : 'Create New Exam'}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Exam Title *</label>
            <input value={form.title} onChange={set('title')} className="input" placeholder="e.g. Data Structures Final Exam" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Subject Code</label>
              <input value={form.subject} onChange={set('subject')} className="input" placeholder="CS101" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Duration (minutes)</label>
              <input type="number" min="5" value={form.duration_minutes}
                onChange={set('duration_minutes')} className="input" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Total Marks</label>
            <input type="number" min="1" value={form.total_marks}
              onChange={set('total_marks')} className="input" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Description</label>
            <textarea value={form.description} onChange={set('description')}
              className="input resize-none" rows={3}
              placeholder="Exam description and instructions..." />
          </div>
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800 border border-slate-700">
            <span className="text-sm text-slate-300">Active (visible to students)</span>
            <button onClick={() => setForm(p => ({ ...p, is_active: !p.is_active }))}
              className={`transition-colors ${form.is_active ? 'text-green-400' : 'text-slate-500'}`}>
              {form.is_active ? <ToggleRight className="w-7 h-7" /> : <ToggleLeft className="w-7 h-7" />}
            </button>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="btn btn-ghost flex-1">Cancel</button>
          <button onClick={handleSave} disabled={saving || !form.title}
            className="btn btn-primary flex-1">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            {saving ? 'Saving…' : exam ? 'Update Exam' : 'Create Exam'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function AdminExams() {
  const [exams,   setExams]   = useState([])
  const [loading, setLoading] = useState(true)
  const [modal,   setModal]   = useState(null)  // null | 'create' | exam object
  const [qModal,  setQModal]  = useState(null)  // exam object for question manager

  const fetchExams = () =>
    api.get('/exams').then(r => { setExams(r.data.exams); setLoading(false) })

  useEffect(() => { fetchExams() }, [])

  const handleDelete = async (id) => {
    if (!confirm('Delete this exam? This cannot be undone.')) return
    await api.delete(`/exams/${id}`)
    fetchExams()
  }

  const handleToggle = async (exam) => {
    await api.put(`/exams/${exam.id}`, { is_active: !exam.is_active })
    fetchExams()
  }

  return (
    <div className="flex min-h-screen bg-slate-950">
      <Navbar />
      <main className="ml-60 flex-1 p-8 page-enter">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">Exam Management</h1>
            <p className="text-slate-400 mt-1">Create and manage proctored exams.</p>
          </div>
          <button onClick={() => setModal('create')} className="btn btn-primary">
            <Plus className="w-4 h-4" /> Create Exam
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
          </div>
        ) : exams.length === 0 ? (
          <div className="card text-center py-20 text-slate-500">
            <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No exams yet. Create your first exam.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {exams.map(exam => (
              <div key={exam.id} className="card hover:border-slate-600 transition-all">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 pr-2">
                    <h3 className="text-white font-semibold leading-tight">{exam.title}</h3>
                    <p className="text-slate-400 text-xs mt-0.5">{exam.subject}</p>
                  </div>
                  <span className={`flex-shrink-0 text-xs px-2 py-0.5 rounded-full border font-medium ${
                    exam.is_active
                      ? 'text-green-400 bg-green-500/10 border-green-500/20'
                      : 'text-slate-400 bg-slate-700 border-slate-600'
                  }`}>
                    {exam.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>

                <p className="text-slate-500 text-sm mb-4 line-clamp-2">{exam.description || 'No description.'}</p>

                <div className="flex items-center gap-4 text-slate-400 text-xs mb-4">
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{exam.duration_minutes} min</span>
                  <span className="flex items-center gap-1"><Trophy className="w-3 h-3" />{exam.total_marks} marks</span>
                  <span className="flex items-center gap-1"><BookOpen className="w-3 h-3" />{exam.session_count} sessions</span>
                </div>

                <div className="flex items-center gap-2 pt-3 border-t border-slate-700">
                  <button onClick={() => setQModal(exam)}
                    className="btn btn-ghost py-1.5 px-3 text-xs flex-1 text-indigo-400">
                    <ListChecks className="w-4 h-4" /> Questions
                  </button>
                  <button onClick={() => handleToggle(exam)}
                    className={`btn btn-ghost py-1.5 px-3 text-xs ${exam.is_active ? 'text-orange-400' : 'text-green-400'}`}>
                    {exam.is_active ? <ToggleLeft className="w-4 h-4" /> : <ToggleRight className="w-4 h-4" />}
                  </button>
                  <button onClick={() => setModal(exam)}
                    className="btn btn-ghost py-1.5 px-3 text-xs">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => handleDelete(exam.id)}
                    className="btn btn-ghost py-1.5 px-3 text-xs text-red-400 hover:bg-red-500/10">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {modal && (
          <ExamModal
            exam={modal === 'create' ? null : modal}
            onClose={() => setModal(null)}
            onSave={() => { setModal(null); fetchExams() }}
          />
        )}

        {qModal && (
          <QuestionManagerModal
            exam={qModal}
            onClose={() => setQModal(null)}
          />
        )}
      </main>
    </div>
  )
}
