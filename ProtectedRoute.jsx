import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Loader2 } from 'lucide-react'

export default function ProtectedRoute({ children, role }) {
  const { user, loading } = useAuth()

  if (loading) return (
    <div className="flex items-center justify-center h-screen bg-slate-900">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
        <p className="text-slate-400 text-sm">Authenticating…</p>
      </div>
    </div>
  )

  if (!user) return <Navigate to="/login" replace />

  if (role && user.role !== role) {
    return <Navigate to={user.role === 'admin' ? '/admin' : '/dashboard'} replace />
  }

  return children
}
