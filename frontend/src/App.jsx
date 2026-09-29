import React, { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Provider, useDispatch, useSelector } from 'react-redux'
import { Toaster } from 'react-hot-toast'
import store from './store'
import { fetchCurrentUser } from './store/slices/authSlice'

// Layouts
import AppLayout from './components/Layout/AppLayout'

// Pages
import LoginPage            from './pages/Auth/LoginPage'
import DashboardPage        from './pages/Dashboard/DashboardPage'
import DryLogList           from './pages/AHP/DryLogList'
import DryLogForm           from './pages/AHP/DryLogForm'
import WetLogList           from './pages/AHP/WetLogList'
import WetLogForm           from './pages/AHP/WetLogForm'
import EventListPage        from './pages/Events/EventListPage'
import EventFormPage        from './pages/Events/EventFormPage'
import ReportsPage          from './pages/Reports/ReportsPage'
import SearchPage           from './pages/Search/SearchPage'
import UserManagementPage   from './pages/Users/UserManagementPage'
import ShiftHandoverPage    from './pages/Handover/ShiftHandoverPage'
import AuditLogPage         from './pages/AuditLog/AuditLogPage'

// Redirect authenticated users away from public pages (login)
function PublicRoute({ children }) {
  const { isAuthenticated } = useSelector(s => s.auth)
  if (isAuthenticated) return <Navigate to="/dashboard" replace />
  return children
}

function AppRoutes() {
  const dispatch = useDispatch()
  const { isAuthenticated } = useSelector(s => s.auth)

  useEffect(() => {
    if (isAuthenticated) dispatch(fetchCurrentUser())
  }, [])

  return (
    <Routes>
      {/* Public route – redirect to dashboard if already logged in */}
      <Route
        path="/login"
        element={
          <PublicRoute>
            <LoginPage />
          </PublicRoute>
        }
      />

      {/* Protected routes */}
      <Route element={<AppLayout />}>
        <Route path="/dashboard" element={<DashboardPage />} />

        {/* AHP Dry System */}
        <Route path="/logbook/ahp/dry"          element={<DryLogList />} />
        <Route path="/logbook/ahp/dry/new"      element={<DryLogForm />} />
        <Route path="/logbook/ahp/dry/:id"      element={<DryLogForm />} />
        <Route path="/logbook/ahp/dry/:id/edit" element={<DryLogForm />} />

        {/* AHP Wet System */}
        <Route path="/logbook/ahp/wet"          element={<WetLogList />} />
        <Route path="/logbook/ahp/wet/new"      element={<WetLogForm />} />
        <Route path="/logbook/ahp/wet/:id"      element={<WetLogForm />} />
        <Route path="/logbook/ahp/wet/:id/edit" element={<WetLogForm />} />

        {/* Event Recording */}
        <Route path="/events"          element={<EventListPage />} />
        <Route path="/events/new"      element={<EventFormPage />} />
        <Route path="/events/:id"      element={<EventFormPage />} />
        <Route path="/events/:id/edit" element={<EventFormPage />} />

        {/* Reports */}
        <Route path="/reports" element={<ReportsPage />} />

        {/* Advanced Search */}
        <Route path="/search" element={<SearchPage />} />

        {/* Shift Handover */}
        <Route path="/handover" element={<ShiftHandoverPage />} />

        {/* Administration */}
        <Route path="/users" element={<UserManagementPage />} />
        <Route path="/audit" element={<AuditLogPage />} />

        {/* Fallbacks */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Routes>
  )
}

export default function App() {
  return (
    <Provider store={store}>
      <BrowserRouter>
        <AppRoutes />
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              fontFamily: 'Inter, sans-serif',
              fontSize: '0.875rem',
              borderRadius: '10px',
              boxShadow: '0 10px 25px rgba(0,0,0,0.12)',
            },
            success: { iconTheme: { primary: '#1A7F4B', secondary: '#fff' } },
            error:   { iconTheme: { primary: '#B91C1C', secondary: '#fff' } },
          }}
        />
      </BrowserRouter>
    </Provider>
  )
}
