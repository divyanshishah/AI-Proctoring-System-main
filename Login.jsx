import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { ShieldCheck, Eye, EyeOff, Loader2, GraduationCap, Shield } from 'lucide-react'

export default function Login() {
  const { login }      = useAuth()
  const navigate       = useNavigate()
  const [form, setForm]   = useState({ email: '', password: '' })
  const [role, setRole]   = useState('student')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  const DEMO = {
    student: { email: 'alice@test.edu',   password: 'Student@123' },
    admin:   { email: 'admin@proctor.edu', password: 'Admin@123' },
  }

  const fillDemo = () => setForm(DEMO[role])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(''); setLoading(true)
    try {
      const user = await login(form.email, form.password)
      navigate(user.role === 'admin' ? '/admin' : '/dashboard')
    } catch (err) {
      setError(
        err.response?.data?.error ||
        (err.request
          ? 'Cannot reach the backend. Make sure Flask is running on http://localhost:5000.'
          : 'Login failed. Check your credentials.')
      )
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center p-12 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #1e1b4b 0%, #0f172a 50%, #1e293b 100%)' }}>

        {/* Decorative circles */}
        <div className="absolute top-20 left-20 w-64 h-64 rounded-full bg-indigo-600/10 blur-3xl" />
        <div className="absolute bottom-20 right-20 w-48 h-48 rounded-full bg-violet-600/10 blur-3xl" />

        <div className="relative z-10 text-center">
          <div className="w-20 h-20 rounded-2xl bg-indigo-600 flex items-center justify-center mx-auto mb-6 glow-primary">
            <ShieldCheck className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-4xl font-bold gradient-text mb-3">ProctorAI</h2>
          <p className="text-slate-400 text-lg mb-8">Intelligent Exam Monitoring System</p>

          <div className="space-y-4 text-left">
            {[
              '🎯 Real-time AI face detection',
              '📱 Mobile phone detection',
              '👀 Head pose & gaze tracking',
              '🔊 Audio noise monitoring',
              '📊 Detailed violation reports',
            ].map((f, i) => (
              <div key={i} className="flex items-center gap-3 text-slate-300 text-sm">
                <span>{f}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Welcome back</h1>
            <p className="text-slate-400">Sign in to your proctoring account</p>
          </div>

          {/* Role toggle */}
          <div className="flex gap-2 mb-6 p-1 bg-slate-800 rounded-xl">
            {['student', 'admin'].map(r => (
              <button key={r} onClick={() => { setRole(r); setError('') }}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                  role === r ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'
                }`}>
                {r === 'student' ? <GraduationCap className="w-4 h-4" /> : <Shield className="w-4 h-4" />}
                {r === 'student' ? 'Student' : 'Admin'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Email Address</label>
              <input type="email" required value={form.email}
                onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                placeholder="you@university.edu"
                className="input" />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Password</label>
              <div className="relative">
                <input type={showPass ? 'text' : 'password'} required
                  value={form.password}
                  onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                  placeholder="••••••••"
                  className="input pr-12" />
                <button type="button" onClick={() => setShowPass(p => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">
                {error}
              </div>
            )}

            <button type="submit" disabled={loading}
              className="btn btn-primary w-full py-3 text-base mt-2">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          {/* Demo fill button */}
          <button onClick={fillDemo}
            className="mt-3 w-full text-center text-xs text-indigo-400 hover:text-indigo-300 underline underline-offset-2">
            Fill demo {role} credentials
          </button>

          <p className="text-center text-slate-500 text-sm mt-6">
            New student?{' '}
            <Link to="/register" className="text-indigo-400 hover:text-indigo-300 font-medium">
              Register here
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
