import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  LayoutDashboard, BookOpen, Monitor, FileText,
  LogOut, ShieldCheck, User, ChevronRight
} from 'lucide-react'

const studentLinks = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
]

const adminLinks = [
  { to: '/admin',          icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/admin/exams',    icon: BookOpen,         label: 'Exams' },
  { to: '/admin/monitor',  icon: Monitor,          label: 'Live Monitor' },
  { to: '/admin/reports',  icon: FileText,         label: 'Reports' },
]

export default function Navbar() {
  const { user, logout } = useAuth()
  const navigate         = useNavigate()
  const links            = user?.role === 'admin' ? adminLinks : studentLinks

  const handleLogout = () => { logout(); navigate('/login') }

  return (
    <aside className="fixed left-0 top-0 h-full w-60 bg-slate-900 border-r border-slate-800 flex flex-col z-50">
      {/* Logo */}
      <div className="p-6 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-white font-bold text-base leading-none">ProctorAI</h1>
            <p className="text-slate-500 text-xs mt-0.5">Exam Monitor</p>
          </div>
        </div>
      </div>

      {/* Nav Links */}
      <nav className="flex-1 p-4 space-y-1">
        {links.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to} to={to} end={to === '/admin'}
            className={({ isActive }) =>
              `nav-item ${isActive ? 'active' : ''} relative`
            }
          >
            <Icon className="w-4 h-4 flex-shrink-0" />
            <span>{label}</span>
            <ChevronRight className="w-3 h-3 ml-auto opacity-40" />
          </NavLink>
        ))}
      </nav>

      {/* User Profile */}
      <div className="p-4 border-t border-slate-800">
        <div className="flex items-center gap-3 mb-3 px-2">
          <div className="w-8 h-8 rounded-full bg-indigo-600/30 border border-indigo-500/30 flex items-center justify-center">
            <User className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-medium truncate">{user?.full_name}</p>
            <p className="text-slate-500 text-xs capitalize">{user?.role}</p>
          </div>
        </div>
        <button onClick={handleLogout}
          className="nav-item w-full text-red-400 hover:text-red-300 hover:bg-red-500/10">
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  )
}
