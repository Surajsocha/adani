import React, { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { FiAlertTriangle, FiPlus, FiFilter, FiSearch, FiEye, FiEdit2, FiCheckCircle } from 'react-icons/fi'
import { format } from 'date-fns'
import api from '../../api/axios'
import toast from 'react-hot-toast'

const CATEGORIES = [
  { v: '', l: 'All Categories' },
  { v: 'abnormality', l: 'Plant Abnormality' },
  { v: 'unit_trip', l: 'Unit Trip' },
  { v: 'breakdown', l: 'Equipment Breakdown' },
  { v: 'safety', l: 'Safety Incident' },
  { v: 'near_miss', l: 'Near Miss' },
  { v: 'environmental', l: 'Environmental' },
  { v: 'instruction', l: 'Operational Instruction' },
  { v: 'maintenance', l: 'Maintenance Activity' },
]

const SEVERITIES = [
  { v: '', l: 'All Severities' },
  { v: 'low', l: 'Low' },
  { v: 'medium', l: 'Medium' },
  { v: 'high', l: 'High' },
  { v: 'critical', l: 'Critical' },
]

const STATUSES = [
  { v: '', l: 'All Status' },
  { v: 'open', l: 'Open' },
  { v: 'in_progress', l: 'In Progress' },
  { v: 'resolved', l: 'Resolved' },
  { v: 'closed', l: 'Closed' },
]

const SEVERITY_COLORS = {
  low: '#22C55E',
  medium: '#E8A317',
  high: '#F97316',
  critical: '#EF4444',
}

const STATUS_BADGE = {
  open: 'badge-submitted',
  in_progress: 'badge-draft',
  resolved: 'badge-approved',
  closed: 'badge-draft',
}

export default function EventListPage() {
  const navigate = useNavigate()
  const [events, setEvents] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({ category: '', severity: '', event_status: '', search: '' })

  useEffect(() => { fetchEvents(); fetchStats() }, [filters.category, filters.severity, filters.event_status])

  const fetchEvents = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filters.category) params.append('category', filters.category)
      if (filters.severity) params.append('severity', filters.severity)
      if (filters.event_status) params.append('event_status', filters.event_status)
      if (filters.search) params.append('search', filters.search)
      const res = await api.get(`/logbook/ahp/events/?${params.toString()}`)
      setEvents(res.data.results || res.data || [])
    } catch { toast.error('Failed to load events') }
    setLoading(false)
  }

  const fetchStats = async () => {
    try {
      const res = await api.get('/logbook/ahp/events/statistics/')
      setStats(res.data)
    } catch {}
  }

  const handleSearch = (e) => {
    e.preventDefault()
    fetchEvents()
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <div className="page-breadcrumb">Home › Events</div>
          <h1 className="page-title"><FiAlertTriangle /> Event Recording</h1>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary" onClick={() => navigate('/events/new')}>
            <FiPlus /> New Event
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="stats-grid" style={{ marginBottom: '16px' }}>
          <div className="stat-card primary">
            <div className="stat-icon"><FiAlertTriangle /></div>
            <div className="stat-body">
              <div className="stat-value">{stats.total}</div>
              <div className="stat-label">Total Events</div>
            </div>
          </div>
          <div className="stat-card warning">
            <div className="stat-icon" style={{ background: 'rgba(232,163,23,0.12)' }}>⚠️</div>
            <div className="stat-body">
              <div className="stat-value" style={{ color: 'var(--color-warning)' }}>{stats.open_count}</div>
              <div className="stat-label">Open / In Progress</div>
            </div>
          </div>
          <div className="stat-card success">
            <div className="stat-icon"><FiCheckCircle /></div>
            <div className="stat-body">
              <div className="stat-value" style={{ color: 'var(--color-success)' }}>{stats.resolved_count}</div>
              <div className="stat-label">Resolved</div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="card" style={{ marginBottom: '16px' }}>
        <div className="card-body" style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'flex-end' }}>
          <div className="form-group" style={{ marginBottom: 0, minWidth: '160px' }}>
            <label className="form-label"><FiFilter size={12} /> Category</label>
            <select className="form-control" value={filters.category} onChange={e => setFilters({ ...filters, category: e.target.value })}>
              {CATEGORIES.map(c => <option key={c.v} value={c.v}>{c.l}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ marginBottom: 0, minWidth: '140px' }}>
            <label className="form-label">Severity</label>
            <select className="form-control" value={filters.severity} onChange={e => setFilters({ ...filters, severity: e.target.value })}>
              {SEVERITIES.map(s => <option key={s.v} value={s.v}>{s.l}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ marginBottom: 0, minWidth: '140px' }}>
            <label className="form-label">Status</label>
            <select className="form-control" value={filters.event_status} onChange={e => setFilters({ ...filters, event_status: e.target.value })}>
              {STATUSES.map(s => <option key={s.v} value={s.v}>{s.l}</option>)}
            </select>
          </div>
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: '8px', flex: 1, minWidth: '200px' }}>
            <input type="text" className="form-control" placeholder="Search events…" value={filters.search}
              onChange={e => setFilters({ ...filters, search: e.target.value })} />
            <button type="submit" className="btn btn-outline"><FiSearch /></button>
          </form>
        </div>
      </div>

      {/* Events Table */}
      <div className="card">
        <div className="table-wrapper" style={{ borderRadius: 0, border: 'none', boxShadow: 'none' }}>
          {loading ? (
            <div className="loading-page"><span className="spinner spinner-dark" /></div>
          ) : events.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">⚠️</div>
              <h3>No events found</h3>
              <p>No events match your current filters.</p>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date/Time</th>
                  <th>Category</th>
                  <th>Severity</th>
                  <th>Title</th>
                  <th>Equipment</th>
                  <th>Status</th>
                  <th>Reported By</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {events.map(event => (
                  <tr key={event.id}>
                    <td className="font-mono" style={{ fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                      {event.date}<br />
                      <span className="text-muted">{event.time?.slice(0, 5)}</span>
                    </td>
                    <td><span className="badge badge-draft">{event.category_display}</span></td>
                    <td>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: '4px',
                        padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600,
                        background: `${SEVERITY_COLORS[event.severity]}15`,
                        color: SEVERITY_COLORS[event.severity],
                      }}>
                        ● {event.severity_display}
                      </span>
                    </td>
                    <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {event.title}
                    </td>
                    <td className="font-mono" style={{ fontSize: '0.8rem' }}>{event.equipment_tag || '—'}</td>
                    <td><span className={`badge ${STATUS_BADGE[event.event_status] || 'badge-draft'}`}>{event.status_display}</span></td>
                    <td style={{ fontSize: '0.8rem' }}>{event.reported_by_name}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/events/${event.id}`)} title="View">
                          <FiEye size={14} />
                        </button>
                        <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/events/${event.id}/edit`)} title="Edit">
                          <FiEdit2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
