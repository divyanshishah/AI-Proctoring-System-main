import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'

import Login           from './pages/Login'
import Register        from './pages/Register'
import StudentDashboard from './pages/StudentDashboard'
import ExamInterface   from './pages/ExamInterface'
import AdminDashboard  from './pages/AdminDashboard'
import AdminExams      from './pages/AdminExams'
import AdminMonitor    from './pages/AdminMonitor'
import AdminReports    from './pages/AdminReports'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/login"    element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Student */}
          <Route path="/dashboard" element={
            <ProtectedRoute role="student"><StudentDashboard /></ProtectedRoute>
          }/>
          <Route path="/exam/:id" element={
            <ProtectedRoute role="student"><ExamInterface /></ProtectedRoute>
          }/>

          {/* Admin */}
          <Route path="/admin" element={
            <ProtectedRoute role="admin"><AdminDashboard /></ProtectedRoute>
          }/>
          <Route path="/admin/exams" element={
            <ProtectedRoute role="admin"><AdminExams /></ProtectedRoute>
          }/>
          <Route path="/admin/monitor" element={
            <ProtectedRoute role="admin"><AdminMonitor /></ProtectedRoute>
          }/>
          <Route path="/admin/reports" element={
            <ProtectedRoute role="admin"><AdminReports /></ProtectedRoute>
          }/>

          {/* Default */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
