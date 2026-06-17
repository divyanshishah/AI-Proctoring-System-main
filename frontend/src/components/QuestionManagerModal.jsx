import { useState, useEffect } from 'react'
import api from '../services/api'
import {
  X, Plus, Trash2, Pencil, Check, Loader2,
  ListChecks, GripVertical, AlertTriangle, Save
} from 'lucide-react'

const EMPTY_Q = {
  question: '',
  options: ['', '', '', ''],
  answer: 0,
  marks: 1,
}

function QuestionForm({ initial, onSave, onCancel }) {
  const [q, setQ] = useState(initial || { ...EMPTY_Q, options: ['', '', '', ''] })

  const setOpt = (i, val) => {
    const opts = [...q.options]
    opts[i] = val
    setQ(prev => ({ ...prev, options: opts }))
  }

  const valid = q.question.trim() && q.options.every(o => o.trim()) && q.marks > 0

  return (
    <div className="space-y-4 p-4 rounded-xl bg-slate-800/60 border border-slate-700">
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1.5">Question *</label>
        <textarea
          value={q.question}
          onChange={e => setQ(p => ({ ...p, question: e.target.value }))}
          className="input resize-none"
          rows={2}
          placeholder="Enter the question text..."
        />
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-slate-300">Options * (select correct answer)</label>
        {q.options.map((opt, i) => (
          <div key={i} className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setQ(p => ({ ...p, answer: i }))}
              className={`w-8 h-8 rounded-lg text-xs font-bold flex-shrink-0 transition-all ${
                q.answer === i
                  ? 'bg-green-600 text-white shadow-lg shadow-green-600/20'
                  : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
              }`}
            >
              {String.fromCharCode(65 + i)}
            </button>
            <input
              value={opt}
              onChange={e => setOpt(i, e.target.value)}
              className="input flex-1"
              placeholder={`Option ${String.fromCharCode(65 + i)}`}
            />
          </div>
        ))}
        <p className="text-xs text-slate-500 mt-1">
          Click a letter to mark it as the correct answer. Currently correct:{' '}
          <span className="text-green-400 font-semibold">
            {String.fromCharCode(65 + q.answer)}
          </span>
        </p>
      </div>

      <div className="w-32">
        <label className="block text-sm font-medium text-slate-300 mb-1.5">Marks</label>
        <input
          type="number"
          min="1"
          value={q.marks}
          onChange={e => setQ(p => ({ ...p, marks: parseInt(e.target.value) || 1 }))}
          className="input"
        />
      </div>

      <div className="flex gap-2 pt-2">
        <button onClick={onCancel} className="btn btn-ghost flex-1">Cancel</button>
        <button
          onClick={() => valid && onSave(q)}
          disabled={!valid}
          className="btn btn-primary flex-1"
        >
          <Check className="w-4 h-4" />
          {initial ? 'Update Question' : 'Add Question'}
        </button>
      </div>
    </div>
  )
}

export default function QuestionManagerModal({ exam, onClose }) {
  const [questions, setQuestions] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState(null)   // index or 'new'
  const [dirty, setDirty] = useState(false)

  // Fetch exam with questions
  useEffect(() => {
    api.get(`/exams/${exam.id}`).then(res => {
      setQuestions(res.data.exam.questions || [])
      setLoading(false)
    })
  }, [exam.id])

  const handleAdd = (q) => {
    setQuestions(prev => [...prev, q])
    setEditing(null)
    setDirty(true)
  }

  const handleUpdate = (idx, q) => {
    setQuestions(prev => prev.map((old, i) => (i === idx ? q : old)))
    setEditing(null)
    setDirty(true)
  }

  const handleDelete = (idx) => {
    if (!confirm(`Delete question ${idx + 1}?`)) return
    setQuestions(prev => prev.filter((_, i) => i !== idx))
    if (editing === idx) setEditing(null)
    setDirty(true)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await api.put(`/exams/${exam.id}`, { questions })
      setDirty(false)
      setSaving(false)
    } catch {
      setSaving(false)
    }
  }

  const totalMarks = questions.reduce((s, q) => s + (q.marks || 0), 0)

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="card w-full max-w-2xl max-h-[90vh] flex flex-col animate-bounce-in">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 flex-shrink-0">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <ListChecks className="w-5 h-5 text-indigo-400" />
              Manage Questions
            </h2>
            <p className="text-slate-400 text-sm mt-0.5">{exam.title}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stats bar */}
        <div className="flex items-center gap-4 mb-4 px-3 py-2 rounded-lg bg-slate-800/50 border border-slate-700 text-xs flex-shrink-0">
          <span className="text-slate-300">
            <span className="text-white font-semibold">{questions.length}</span> questions
          </span>
          <span className="text-slate-300">
            <span className="text-white font-semibold">{totalMarks}</span> total marks
          </span>
          {dirty && (
            <span className="ml-auto flex items-center gap-1 text-amber-400">
              <AlertTriangle className="w-3 h-3" /> Unsaved changes
            </span>
          )}
        </div>

        {/* Question list — scrollable */}
        <div className="flex-1 overflow-y-auto space-y-3 mb-4 pr-1">
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
            </div>
          ) : questions.length === 0 && editing !== 'new' ? (
            <div className="text-center py-10 text-slate-500">
              <ListChecks className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p>No questions yet. Add your first MCQ question.</p>
            </div>
          ) : (
            questions.map((q, idx) =>
              editing === idx ? (
                <QuestionForm
                  key={idx}
                  initial={q}
                  onSave={(updated) => handleUpdate(idx, updated)}
                  onCancel={() => setEditing(null)}
                />
              ) : (
                <div
                  key={idx}
                  className="flex items-start gap-3 p-3 rounded-xl bg-slate-800/40 border border-slate-700/50 hover:border-slate-600 transition-all group"
                >
                  <span className="w-7 h-7 rounded-lg bg-indigo-600/20 text-indigo-400 border border-indigo-500/20 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium leading-snug truncate">
                      {q.question}
                    </p>
                    <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1.5">
                      {q.options.map((opt, oi) => (
                        <span
                          key={oi}
                          className={`text-xs ${
                            q.answer === oi
                              ? 'text-green-400 font-semibold'
                              : 'text-slate-500'
                          }`}
                        >
                          {String.fromCharCode(65 + oi)}: {opt}
                          {q.answer === oi && ' ✓'}
                        </span>
                      ))}
                    </div>
                    <span className="text-xs text-slate-500 mt-1 inline-block">
                      {q.marks} mark{q.marks > 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                    <button
                      onClick={() => setEditing(idx)}
                      className="btn btn-ghost p-1.5 text-xs"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(idx)}
                      className="btn btn-ghost p-1.5 text-xs text-red-400 hover:bg-red-500/10"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )
            )
          )}

          {/* Inline new question form */}
          {editing === 'new' && (
            <QuestionForm
              onSave={handleAdd}
              onCancel={() => setEditing(null)}
            />
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 flex-shrink-0 pt-3 border-t border-slate-700">
          {editing !== 'new' && (
            <button
              onClick={() => setEditing('new')}
              className="btn btn-ghost flex-1"
            >
              <Plus className="w-4 h-4" /> Add Question
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={saving || !dirty}
            className="btn btn-primary flex-1"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {saving ? 'Saving…' : 'Save All Questions'}
          </button>
        </div>
      </div>
    </div>
  )
}
