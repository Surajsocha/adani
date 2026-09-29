import React, { useState, useEffect } from 'react'
import { FiShield, FiSearch, FiFilter } from 'react-icons/fi'
import { format } from 'date-fns'
import api from '../../api/axios'
import toast from 'react-hot-toast'

const ACTION_ICONS = {
  create: '➕', update: '✏️', delete: '🗑️',
  submit: '📤', approve: '✅', reject: '❌',
  login: '🔑', logout: '🚪', password_change: '🔒',
  export: '📥', handover: '🔄',
}

const ACTION_COLORS = {
  create: '#22C55E', update: '#3B82F6', delete: '#EF4444',
  submit: '#E8A317', approve: '#22C55E', reject: '#EF4444',
  login: '#06B6D4', logout: '#6B7280', password_change: '#8B5CF6',
  export: '#0D3B6E', handover: '#F59E0B',
}

export default function AuditLogPage() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [action, setAction] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => { fetchLogs() }, [action])

  const fetchLogs = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (action) params.append('action', action)
      if (search) params.append('search', search)
      const res = await api.get(`/audit/?${params.toString()}`)
      setLogs(res.data.results || res.data || [])
    } catch { toast.error('Failed to load audit logs') }
    setLoading(false)
  }

  const handleSearch = (e) => {
    e.preventDefault()
    fetchLogs()
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <div className="page-breadcrumb">Administration › Audit Trail</div>
          <h1 className="page-title"><FiShield /> Audit Trail</h1>
        </div>
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: '16px' }}>
        <div className="card-body" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label"><FiFilter size={12} /> Action Type</label>
            <select className="form-control" value={action} onChange={e => setAction(e.target.value)}>
              <option value="">All Actions</option>
              <option value="create">Created</option>
              <option value="update">Updated</option>
              <option value="submit">Submitted</option>
              <option value="approve">Approved</option>
              <option value="reject">Rejected</option>
              <option value="login">Login</option>
              <option value="logout">Logout</option>
              <option value="export">Export</option>
              <option value="handover">Handover</option>
            </select>
          </div>
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: '8px', flex: 1, minWidth: '200px' }}>
            <input type="text" className="form-control" placeholder="Search by user, object…"
              value={search} onChange={e => setSearch(e.target.value)} />
            <button type="submit" className="btn btn-outline"><FiSearch /></button>
          </form>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="card">
        <div className="table-wrapper" style={{ border: 'none', boxShadow: 'none' }}>
          {loading ? (
            <div className="loading-page"><span className="spinner spinner-dark" /></div>
          ) : logs.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📋</div>
              <h3>No audit logs found</h3>
              <p>All system activities are recorded here.</p>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '40px' }}></th>
                  <th>Timestamp</th>
                  <th>User</th>
                  <th>Action</th>
                  <th>Object</th>
                  <th>Details</th>
                  <th>IP</th>
                </tr>
              </thead>
              <tbody>
                {logs.map(log => (
                  <tr key={log.id}>
                    <td style={{ textAlign: 'center', fontSize: '1.1rem' }}>
                      {ACTION_ICONS[log.action] || '📋'}
                    </td>
                    <td className="font-mono" style={{ fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
                      {log.timestamp ? format(new Date(log.timestamp), 'dd/MM/yy HH:mm:ss') : '—'}
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: '0.8125rem' }}>{log.user_name || 'System'}</div>
                      {log.user_employee_id && (
                        <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>{log.user_employee_id}</div>
                      )}
                    </td>
                    <td>
                      <span style={{
                        padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600,
                        background: `${ACTION_COLORS[log.action] || '#6B7280'}12`,
                        color: ACTION_COLORS[log.action] || '#6B7280',
                      }}>
                        {log.action_display}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.8rem' }}>
                      {log.model_name && (
                        <span className="font-mono" style={{ fontSize: '0.75rem', color: 'var(--color-primary)' }}>
                          {log.model_name}#{log.object_id}
                        </span>
                      )}
                      {log.object_repr && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                          {log.object_repr.slice(0, 80)}
                        </div>
                      )}
                    </td>
                    <td style={{ fontSize: '0.75rem', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {log.extra_info || '—'}
                    </td>
                    <td className="font-mono" style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
                      {log.ip_address || '—'}
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
