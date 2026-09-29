import React, { useState, useRef, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { logout } from '../../store/slices/authSlice'
import { FiMenu, FiUser, FiLogOut, FiSettings, FiChevronDown, FiSearch } from 'react-icons/fi'
import { format } from 'date-fns'
import { useNavigate } from 'react-router-dom'
import NotificationPanel from '../NotificationPanel/NotificationPanel'

export default function Header({ collapsed, setCollapsed }) {
  const dispatch   = useDispatch()
  const navigate   = useNavigate()
  const { user }   = useSelector(s => s.auth)
  const [dropdown, setDropdown] = useState(false)
  const dropRef    = useRef(null)

  // Session timeout: auto-logout after 60min of idle
  useEffect(() => {
    let timeout
    const resetTimer = () => {
      clearTimeout(timeout)
      timeout = setTimeout(() => {
        dispatch(logout())
        navigate('/login')
      }, 60 * 60 * 1000) // 1 hour
    }
    const events = ['mousedown', 'keydown', 'scroll', 'mousemove', 'touchstart']
    events.forEach(e => window.addEventListener(e, resetTimer))
    resetTimer()
    return () => {
      clearTimeout(timeout)
      events.forEach(e => window.removeEventListener(e, resetTimer))
    }
  }, [])

  useEffect(() => {
    const handler = (e) => { if (dropRef.current && !dropRef.current.contains(e.target)) setDropdown(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleLogout = async () => {
    await dispatch(logout())
    navigate('/login')
  }

  const initials = user
    ? `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`.toUpperCase()
    : 'U'

  return (
    <header className={`app-header${collapsed ? ' sidebar-collapsed' : ''}`}>
      <button
        className="header-toggle"
        onClick={() => setCollapsed(v => !v)}
        title="Toggle sidebar"
      >
        <FiMenu size={18} />
      </button>

      {/* Breadcrumb area */}
      <div style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span style={{ fontWeight: 600, color: 'var(--color-primary)' }}>ADTPS</span>
        <span>›</span>
        <span>E-Logbook</span>
      </div>

      {/* Quick search */}
      <button className="btn btn-ghost btn-sm" onClick={() => navigate('/search')} style={{ marginLeft: '8px', color: 'var(--color-text-muted)' }}>
        <FiSearch size={16} />
        <span style={{ fontSize: '0.8rem', marginLeft: '4px' }}>Search</span>
      </button>

      <div className="header-spacer" />

      {/* Current date/time */}
      <div className="header-date">
        {format(new Date(), "EEE, dd MMM yyyy  HH:mm")}
      </div>

      {/* Notifications */}
      <NotificationPanel />

      {/* User dropdown */}
      <div ref={dropRef} style={{ position: 'relative' }}>
        <div className="header-user" onClick={() => setDropdown(v => !v)}>
          <div className="user-avatar">{initials}</div>
          <div className="user-info">
            <div className="name">{user?.full_name || user?.first_name}</div>
            <div className="role">{user?.role?.replace('_', ' ').toUpperCase()}</div>
          </div>
          <FiChevronDown size={14} style={{ color: 'var(--color-text-muted)', marginLeft: '4px', transform: dropdown ? 'rotate(180deg)' : 'none', transition: '0.2s' }} />
        </div>

        {dropdown && (
          <div style={dropdownStyle}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--color-border-light)' }}>
              <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{user?.full_name}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{user?.email}</div>
              <div style={{ fontSize: '0.7rem', marginTop: 4, color: 'var(--color-primary)', fontWeight: 600 }}>
                EMP: {user?.employee_id}
              </div>
            </div>
            <div style={{ padding: '6px 0' }}>
              <button onClick={() => { navigate('/settings'); setDropdown(false) }} style={dropItemStyle}>
                <FiSettings size={14} /> Profile & Settings
              </button>
              <button onClick={handleLogout} style={{ ...dropItemStyle, color: 'var(--color-danger)' }}>
                <FiLogOut size={14} /> Sign Out
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  )
}

const dropdownStyle = {
  position: 'absolute', right: 0, top: 'calc(100% + 8px)',
  background: 'white', borderRadius: '10px', border: '1px solid var(--color-border-light)',
  boxShadow: '0 10px 25px rgba(0,0,0,0.12)', minWidth: '220px', zIndex: 100,
  animation: 'slideUp 0.15s ease',
}
const dropItemStyle = {
  display: 'flex', alignItems: 'center', gap: '10px',
  width: '100%', padding: '9px 16px', background: 'none', border: 'none',
  cursor: 'pointer', fontSize: '0.875rem', color: 'var(--color-text-secondary)',
  transition: 'background 0.15s',
}
