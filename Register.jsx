import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { ShieldCheck, Loader2, Eye, EyeOff } from 'lucide-react'

export default function Register() {
  const { register } = useAuth()
  const navigate     = useNavigate()
  const [form, setForm] = useState({
    full_name: '', username: '', email: '', student_id: '',
    department: '', password: '', confirm_password: '',
  })
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  const set = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (form.password !== form.confirm_password) {
      setError('Passwords do not match'); return
    }
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters'); return
    }
    setLoading(true)
    try {
      await register(form)
      navigate('/dashboard')
    } catch (err) {
      setError(
        err.response?.data?.error ||
        (err.request
          ? 'Cannot reach the backend. Make sure Flask is running on http://localhost:5000.'
          : 'Registration failed.')
      )
    } finally { setLoading(false) }
  }

  const fields = [
    { key: 'full_name',   label: 'Full Name',      type: 'text',  placeholder: 'John Doe',         required: true  },
    { key: 'username',    label: 'Username',        type: 'text',  placeholder: 'johndoe',          required: true  },
    { key: 'email',       label: 'Email Address',   type: 'email', placeholder: 'john@uni.edu',     required: true  },
    { key: 'student_id',  label: 'Student ID',      type: 'text',  placeholder: 'CS2021-001',       required: false },
    { key: 'department',  label: 'Department',      type: 'text',  placeholder: 'Computer Science', required: false },
  ]

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-indigo-600 flex items-center justify-center mx-auto mb-4 glow-primary">
            <ShieldCheck className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">Create Account</h1>
          <p className="text-slate-400 mt-1">Register as a student for online proctored exams</p>
        </div>

        <div className="card">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {fields.map(({ key, label, type, placeholder, required }) => (
                <div key={key} className={key === 'full_name' || key === 'email' ? 'col-span-2' : ''}>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">
                    {label} {required && <span className="text-red-400">*</span>}
                  </label>
                  <input type={type} required={required} value={form[key]}
                    onChange={set(key)} placeholder={placeholder}
                    className="input" />
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  Password <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <input type={showPass ? 'text' : 'password'} required
                    value={form.password} onChange={set('password')}
                    placeholder="Min. 6 characters" className="input pr-10" />
                  <button type="button" onClick={() => setShowPass(p => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  Confirm Password <span className="text-red-400">*</span>
                </label>
                <input type="password" required
                  value={form.confirm_password} onChange={set('confirm_password')}
                  placeholder="Repeat password" className="input" />
              </div>
            </div>

            {error && (
              <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">
                {error}
              </div>
            )}

            <button type="submit" disabled={loading}
              className="btn btn-primary w-full py-3 text-base">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {loading ? 'Creating account…' : 'Create Account'}
            </button>
          </form>

          <p className="text-center text-slate-500 text-sm mt-5">
            Already have an account?{' '}
            <Link to="/login" className="text-indigo-400 hover:text-indigo-300 font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
