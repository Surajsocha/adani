import React, { useState, useEffect, useRef } from 'react'
import { FiBell, FiCheck, FiCheckCircle, FiExternalLink, FiX } from 'react-icons/fi'
import { useNavigate } from 'react-router-dom'
import { formatDistanceToNow } from 'date-fns'
import api from '../../api/axios'

const TYPE_ICONS = {
  logbook_submitted: '📋',
  logbook_approved: '✅',
  logbook_rejected: '❌',
  escalation: '🚨',
  event_reported: '⚠️',
  shift_handover: '🔄',
  system: '🔔',
}

const PRIORITY_COLORS = {
  low: 'var(--color-text-muted)',
  medium: 'var(--color-warning)',
  high: '#E8A317',
  critical: 'var(--color-danger)',
}

export default function NotificationPanel() {
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const panelRef = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    fetchUnreadCount()
    const interval = setInterval(fetchUnreadCount, 30000) // Poll every 30s
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setIsOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const fetchUnreadCount = async () => {
    try {
      const res = await api.get('/notifications/unread_count/')
      setUnreadCount(res.data.unread_count)
    } catch {}
  }

  const fetchNotifications = async () => {
    setLoading(true)
    try {
      const res = await api.get('/notifications/?page_size=20')
      setNotifications(res.data.results || res.data || [])
    } catch {}
    setLoading(false)
  }

  const togglePanel = () => {
    if (!isOpen) fetchNotifications()
    setIsOpen(v => !v)
  }

  const markRead = async (id) => {
    try {
      await api.post(`/notifications/${id}/mark_read/`)
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
      setUnreadCount(c => Math.max(0, c - 1))
    } catch {}
  }

  const markAllRead = async () => {
    try {
      await api.post('/notifications/mark_all_read/')
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
      setUnreadCount(0)
    } catch {}
  }

  const handleClick = (notif) => {
    if (!notif.is_read) markRead(notif.id)
    if (notif.link) {
      navigate(notif.link)
      setIsOpen(false)
    }
  }

  return (
    <div ref={panelRef} style={{ position: 'relative' }}>
      <button className="btn btn-ghost btn-icon" onClick={togglePanel} style={{ position: 'relative' }} id="notification-bell">
        <FiBell size={18} />
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute', top: 4, right: 4,
            minWidth: 16, height: 16, padding: '0 4px',
            background: 'var(--color-danger)',
            borderRadius: '50%', border: '1.5px solid white',
            color: 'white', fontSize: '0.6rem', fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div style={panelStyle}>
          {/* Header */}
          <div style={headerStyle}>
            <span style={{ fontWeight: 700, fontSize: '0.9375rem' }}>Notifications</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {unreadCount > 0 && (
                <button onClick={markAllRead} style={markAllBtnStyle} title="Mark all as read">
                  <FiCheckCircle size={14} /> All Read
                </button>
              )}
              <button onClick={() => setIsOpen(false)} style={{ ...markAllBtnStyle, padding: '4px' }}>
                <FiX size={14} />
              </button>
            </div>
          </div>

          {/* Notification List */}
          <div style={listStyle}>
            {loading && (
              <div style={{ textAlign: 'center', padding: '20px' }}>
                <span className="spinner spinner-dark" />
              </div>
            )}

            {!loading && notifications.length === 0 && (
              <div style={{ textAlign: 'center', padding: '30px 20px', color: 'var(--color-text-muted)' }}>
                <div style={{ fontSize: '2rem', marginBottom: '8px' }}>🔔</div>
                <p style={{ fontSize: '0.875rem' }}>No notifications yet</p>
              </div>
            )}

            {!loading && notifications.map(notif => (
              <div
                key={notif.id}
                onClick={() => handleClick(notif)}
                style={{
                  ...notifItemStyle,
                  background: notif.is_read ? 'transparent' : 'rgba(13, 59, 110, 0.03)',
                  borderLeft: notif.is_read ? '3px solid transparent' : `3px solid ${PRIORITY_COLORS[notif.priority] || 'var(--color-primary)'}`,
                  cursor: notif.link ? 'pointer' : 'default',
                }}
              >
                <div style={{ fontSize: '1.25rem', flexShrink: 0 }}>
                  {TYPE_ICONS[notif.notification_type] || '🔔'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontWeight: notif.is_read ? 400 : 600,
                    fontSize: '0.8125rem',
                    marginBottom: '2px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {notif.title}
                  </div>
                  <div style={{
                    fontSize: '0.75rem',
                    color: 'var(--color-text-muted)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {notif.message}
                  </div>
                  <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)', marginTop: '3px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {notif.sender_name && <span>{notif.sender_name}</span>}
                    <span>·</span>
                    <span>{formatDistanceToNow(new Date(notif.created_at), { addSuffix: true })}</span>
                    {notif.link && <FiExternalLink size={10} />}
                  </div>
                </div>
                {!notif.is_read && (
                  <button
                    onClick={(e) => { e.stopPropagation(); markRead(notif.id) }}
                    style={{ ...markAllBtnStyle, padding: '4px', flexShrink: 0 }}
                    title="Mark as read"
                  >
                    <FiCheck size={12} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

const panelStyle = {
  position: 'absolute', right: 0, top: 'calc(100% + 8px)',
  width: '380px', maxHeight: '480px',
  background: 'white', borderRadius: '12px',
  border: '1px solid var(--color-border-light)',
  boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
  zIndex: 200, overflow: 'hidden',
  animation: 'slideUp 0.2s ease',
}
const headerStyle = {
  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  padding: '14px 16px', borderBottom: '1px solid var(--color-border-light)',
}
const listStyle = {
  maxHeight: '400px', overflowY: 'auto',
}
const notifItemStyle = {
  display: 'flex', alignItems: 'flex-start', gap: '10px',
  padding: '12px 16px',
  borderBottom: '1px solid var(--color-border-light)',
  transition: 'background 0.15s',
}
const markAllBtnStyle = {
  display: 'flex', alignItems: 'center', gap: '4px',
  background: 'none', border: 'none', cursor: 'pointer',
  fontSize: '0.75rem', color: 'var(--color-primary)',
  fontWeight: 600, padding: '4px 8px', borderRadius: '6px',
}
