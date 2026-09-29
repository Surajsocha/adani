import React, { useState, useEffect } from 'react'
import { useSelector } from 'react-redux'
import { FiFileText, FiDownload, FiFilter, FiBarChart2, FiCalendar } from 'react-icons/fi'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from 'recharts'
import api from '../../api/axios'
import toast from 'react-hot-toast'

const PIE_COLORS = ['#0D3B6E', '#1A7F4B', '#E8A317', '#EF4444', '#8B5CF6', '#06B6D4']

export default function ReportsPage() {
  const { user } = useSelector(s => s.auth)
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [logType, setLogType] = useState('all')

  useEffect(() => { fetchSummary() }, [dateFrom, dateTo])

  const fetchSummary = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (dateFrom) params.append('date_from', dateFrom)
      if (dateTo) params.append('date_to', dateTo)
      const res = await api.get(`/reports/summary/?${params.toString()}`)
      setSummary(res.data)
    } catch { toast.error('Failed to load report data') }
    setLoading(false)
  }

  const exportExcel = async () => {
    setExporting(true)
    try {
      const params = new URLSearchParams()
      if (dateFrom) params.append('date_from', dateFrom)
      if (dateTo) params.append('date_to', dateTo)
      params.append('log_type', logType)

      const res = await api.get(`/reports/export/excel/?${params.toString()}`, { responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `AHP_Logbook_Report_${logType}_${dateFrom || 'all'}.xlsx`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
      toast.success('Excel report downloaded')
    } catch { toast.error('Export failed') }
    setExporting(false)
  }

  const shiftChartData = summary ? [
    { name: 'A Shift', Dry: summary.shift_breakdown?.dry?.find(s => s.shift === 'A')?.count || 0, Wet: summary.shift_breakdown?.wet?.find(s => s.shift === 'A')?.count || 0 },
    { name: 'B Shift', Dry: summary.shift_breakdown?.dry?.find(s => s.shift === 'B')?.count || 0, Wet: summary.shift_breakdown?.wet?.find(s => s.shift === 'B')?.count || 0 },
    { name: 'C Shift', Dry: summary.shift_breakdown?.dry?.find(s => s.shift === 'C')?.count || 0, Wet: summary.shift_breakdown?.wet?.find(s => s.shift === 'C')?.count || 0 },
    { name: 'General', Dry: summary.shift_breakdown?.dry?.find(s => s.shift === 'G')?.count || 0, Wet: summary.shift_breakdown?.wet?.find(s => s.shift === 'G')?.count || 0 },
  ] : []

  const statusPieData = summary ? [
    { name: 'Draft', value: summary.combined?.draft || 0 },
    { name: 'Submitted', value: summary.combined?.submitted || 0 },
    { name: 'Approved', value: summary.combined?.approved || 0 },
    { name: 'Rejected', value: summary.combined?.rejected || 0 },
  ].filter(d => d.value > 0) : []

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <div className="page-breadcrumb">Home › Reports</div>
          <h1 className="page-title"><FiBarChart2 /> Report Management</h1>
        </div>
        <div className="page-actions">
          <select className="form-control" style={{ width: 'auto' }} value={logType} onChange={e => setLogType(e.target.value)}>
            <option value="all">All Systems</option>
            <option value="dry">Dry System Only</option>
            <option value="wet">Wet System Only</option>
          </select>
          <button className="btn btn-primary" onClick={exportExcel} disabled={exporting}>
            <FiDownload /> {exporting ? 'Exporting…' : 'Export Excel'}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: '16px' }}>
        <div className="card-body" style={{ display: 'flex', gap: '16px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label"><FiCalendar size={12} /> Date From</label>
            <input type="date" className="form-control font-mono" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Date To</label>
            <input type="date" className="form-control font-mono" value={dateTo} onChange={e => setDateTo(e.target.value)} />
          </div>
          <button className="btn btn-outline" onClick={() => { setDateFrom(''); setDateTo('') }}>
            Clear Filters
          </button>
        </div>
      </div>

      {loading ? (
        <div className="loading-page"><span className="spinner spinner-dark" /></div>
      ) : summary && (
        <>
          {/* Summary Stats */}
          <div className="stats-grid" style={{ marginBottom: '16px' }}>
            <div className="stat-card primary">
              <div className="stat-icon">📊</div>
              <div className="stat-body">
                <div className="stat-value">{summary.combined?.total || 0}</div>
                <div className="stat-label">Total Entries</div>
              </div>
            </div>
            <div className="stat-card" style={{ '--stat-accent': '#0D3B6E' }}>
              <div className="stat-icon">🏭</div>
              <div className="stat-body">
                <div className="stat-value">{summary.dry?.total || 0}</div>
                <div className="stat-label">Dry System</div>
              </div>
            </div>
            <div className="stat-card" style={{ '--stat-accent': '#E8A317' }}>
              <div className="stat-icon">💧</div>
              <div className="stat-body">
                <div className="stat-value">{summary.wet?.total || 0}</div>
                <div className="stat-label">Wet System</div>
              </div>
            </div>
            <div className="stat-card success">
              <div className="stat-icon">✅</div>
              <div className="stat-body">
                <div className="stat-value" style={{ color: 'var(--color-success)' }}>{summary.combined?.approved || 0}</div>
                <div className="stat-label">Approved</div>
              </div>
            </div>
          </div>

          {/* Charts Row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div className="card">
              <div className="card-header"><span className="card-title">📊 Shift-wise Distribution</span></div>
              <div className="card-body">
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={shiftChartData} barSize={28}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F0F4FA" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="Dry" fill="#0D3B6E" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Wet" fill="#E8A317" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="card">
              <div className="card-header"><span className="card-title">📋 Approval Status</span></div>
              <div className="card-body" style={{ display: 'flex', justifyContent: 'center' }}>
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie data={statusPieData} cx="50%" cy="50%" outerRadius={90} label={({ name, value }) => `${name}: ${value}`} dataKey="value">
                      {statusPieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Detailed Tables */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="card">
              <div className="card-header"><span className="card-title">🏭 Dry System Breakdown</span></div>
              <div className="card-body">
                <table className="data-table">
                  <thead><tr><th>Status</th><th>Count</th></tr></thead>
                  <tbody>
                    {['draft', 'submitted', 'approved', 'rejected'].map(s => (
                      <tr key={s}>
                        <td><span className={`badge badge-${s}`}>{s.charAt(0).toUpperCase() + s.slice(1)}</span></td>
                        <td className="font-mono" style={{ fontWeight: 600 }}>{summary.dry?.[s] || 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="card">
              <div className="card-header"><span className="card-title">💧 Wet System Breakdown</span></div>
              <div className="card-body">
                <table className="data-table">
                  <thead><tr><th>Status</th><th>Count</th></tr></thead>
                  <tbody>
                    {['draft', 'submitted', 'approved', 'rejected'].map(s => (
                      <tr key={s}>
                        <td><span className={`badge badge-${s}`}>{s.charAt(0).toUpperCase() + s.slice(1)}</span></td>
                        <td className="font-mono" style={{ fontWeight: 600 }}>{summary.wet?.[s] || 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
