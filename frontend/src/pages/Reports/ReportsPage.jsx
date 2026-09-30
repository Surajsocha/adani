import React, { useState, useEffect } from 'react'
import { useSelector } from 'react-redux'
import {
  FiFileText, FiDownload, FiFilter, FiBarChart2, FiCalendar,
  FiAlertTriangle, FiAlertCircle, FiTrendingUp
} from 'react-icons/fi'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, PieChart, Pie, Cell
} from 'recharts'
import api from '../../api/axios'
import toast from 'react-hot-toast'

const PIE_COLORS = ['#0D3B6E', '#1A7F4B', '#E8A317', '#EF4444', '#8B5CF6', '#06B6D4']

export default function ReportsPage() {
  const { user } = useSelector(s => s.auth)
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [exportingPdf, setExportingPdf] = useState(false)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [logType, setLogType] = useState('all')
  const [activeTab, setActiveTab] = useState('summary')

  // Additional report data
  const [dailyData, setDailyData] = useState(null)
  const [monthlyData, setMonthlyData] = useState(null)
  const [deptData, setDeptData] = useState(null)
  const [exceptionData, setExceptionData] = useState(null)
  const [dailyDate, setDailyDate] = useState(new Date().toISOString().split('T')[0])
  const [monthlyYear, setMonthlyYear] = useState(new Date().getFullYear())
  const [monthlyMonth, setMonthlyMonth] = useState(new Date().getMonth() + 1)

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

  const fetchDaily = async () => {
    try {
      const res = await api.get(`/reports/daily/?date=${dailyDate}`)
      setDailyData(res.data)
    } catch { toast.error('Failed to load daily report') }
  }

  const fetchMonthly = async () => {
    try {
      const res = await api.get(`/reports/monthly/?year=${monthlyYear}&month=${monthlyMonth}`)
      setMonthlyData(res.data)
    } catch { toast.error('Failed to load monthly report') }
  }

  const fetchDepartment = async () => {
    try {
      const params = new URLSearchParams()
      if (dateFrom) params.append('date_from', dateFrom)
      if (dateTo) params.append('date_to', dateTo)
      const res = await api.get(`/reports/department/?${params.toString()}`)
      setDeptData(res.data)
    } catch { toast.error('Failed to load department report') }
  }

  const fetchExceptions = async () => {
    try {
      const params = new URLSearchParams()
      if (dateFrom) params.append('date_from', dateFrom)
      if (dateTo) params.append('date_to', dateTo)
      const res = await api.get(`/reports/exceptions/?${params.toString()}`)
      setExceptionData(res.data)
    } catch { toast.error('Failed to load exception report') }
  }

  useEffect(() => {
    if (activeTab === 'daily') fetchDaily()
    if (activeTab === 'monthly') fetchMonthly()
    if (activeTab === 'department') fetchDepartment()
    if (activeTab === 'exceptions') fetchExceptions()
  }, [activeTab])

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

  const exportPdf = async () => {
    setExportingPdf(true)
    try {
      const params = new URLSearchParams()
      if (dateFrom) params.append('date_from', dateFrom)
      if (dateTo) params.append('date_to', dateTo)
      params.append('log_type', logType)

      const res = await api.get(`/reports/export/pdf/?${params.toString()}`, { responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `AHP_Logbook_Report_${logType}_${dateFrom || 'all'}.pdf`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
      toast.success('PDF report downloaded')
    } catch { toast.error('PDF export failed') }
    setExportingPdf(false)
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

  const TABS = [
    { key: 'summary', label: '📊 Summary', icon: <FiBarChart2 /> },
    { key: 'daily', label: '📅 Daily Report', icon: <FiCalendar /> },
    { key: 'monthly', label: '📆 Monthly Report', icon: <FiTrendingUp /> },
    { key: 'department', label: '🏢 Department', icon: <FiFileText /> },
    { key: 'exceptions', label: '⚠️ Exceptions', icon: <FiAlertTriangle /> },
  ]

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
          <button className="btn btn-outline" onClick={exportPdf} disabled={exportingPdf} title="Export as PDF">
            <FiFileText /> {exportingPdf ? 'Exporting…' : 'Export PDF'}
          </button>
          <button className="btn btn-primary" onClick={exportExcel} disabled={exporting}>
            <FiDownload /> {exporting ? 'Exporting…' : 'Export Excel'}
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '16px', borderBottom: '2px solid var(--color-border-light)', paddingBottom: '0' }}>
        {TABS.map(tab => (
          <button
            key={tab.key}
            className={`btn ${activeTab === tab.key ? 'btn-primary' : 'btn-ghost'}`}
            style={{
              borderRadius: '8px 8px 0 0',
              borderBottom: activeTab === tab.key ? '2px solid var(--color-primary)' : '2px solid transparent',
              fontWeight: activeTab === tab.key ? 700 : 400,
            }}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
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
          {activeTab === 'daily' && (
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Report Date</label>
              <input type="date" className="form-control font-mono" value={dailyDate} onChange={e => setDailyDate(e.target.value)} />
              <button className="btn btn-ghost btn-sm" style={{ marginTop: 4 }} onClick={fetchDaily}>Load</button>
            </div>
          )}
          {activeTab === 'monthly' && (
            <>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Year</label>
                <input type="number" className="form-control font-mono" value={monthlyYear} onChange={e => setMonthlyYear(e.target.value)} style={{ width: '100px' }} />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Month</label>
                <select className="form-control" value={monthlyMonth} onChange={e => setMonthlyMonth(e.target.value)}>
                  {[1,2,3,4,5,6,7,8,9,10,11,12].map(m => (
                    <option key={m} value={m}>{new Date(2000, m-1).toLocaleString('default', {month: 'long'})}</option>
                  ))}
                </select>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={fetchMonthly}>Load</button>
            </>
          )}
          <button className="btn btn-outline" onClick={() => { setDateFrom(''); setDateTo('') }}>
            Clear Filters
          </button>
        </div>
      </div>

      {/* ═══ SUMMARY TAB ═══ */}
      {activeTab === 'summary' && (
        loading ? (
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
        )
      )}

      {/* ═══ DAILY REPORT TAB ═══ */}
      {activeTab === 'daily' && dailyData && (
        <>
          <div className="card" style={{ marginBottom: '16px' }}>
            <div className="card-header">
              <span className="card-title">📅 Daily Report – {dailyData.date}</span>
            </div>
            <div className="card-body">
              <div className="stats-grid" style={{ marginBottom: '16px' }}>
                <div className="stat-card primary">
                  <div className="stat-body">
                    <div className="stat-value">{dailyData.totals?.dry || 0}</div>
                    <div className="stat-label">Dry Entries</div>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-body">
                    <div className="stat-value">{dailyData.totals?.wet || 0}</div>
                    <div className="stat-label">Wet Entries</div>
                  </div>
                </div>
                <div className="stat-card warning">
                  <div className="stat-body">
                    <div className="stat-value">{dailyData.totals?.events || 0}</div>
                    <div className="stat-label">Events</div>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-body">
                    <div className="stat-value">{dailyData.totals?.handovers || 0}</div>
                    <div className="stat-label">Handovers</div>
                  </div>
                </div>
              </div>

              {/* Shift Summary */}
              <table className="data-table">
                <thead>
                  <tr><th>Shift</th><th>Dry Entries</th><th>Wet Entries</th></tr>
                </thead>
                <tbody>
                  {dailyData.shift_summary?.map(s => (
                    <tr key={s.shift_code}>
                      <td><span className="badge badge-draft">{s.shift}</span></td>
                      <td className="font-mono">{s.dry_count}</td>
                      <td className="font-mono">{s.wet_count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ═══ MONTHLY REPORT TAB ═══ */}
      {activeTab === 'monthly' && monthlyData && (
        <>
          <div className="card" style={{ marginBottom: '16px' }}>
            <div className="card-header">
              <span className="card-title">📆 Monthly Report – {monthlyData.month_name} {monthlyData.year}</span>
            </div>
            <div className="card-body">
              <div className="stats-grid" style={{ marginBottom: '16px' }}>
                <div className="stat-card primary">
                  <div className="stat-body">
                    <div className="stat-value">{monthlyData.combined?.total || 0}</div>
                    <div className="stat-label">Total Entries</div>
                  </div>
                </div>
                <div className="stat-card success">
                  <div className="stat-body">
                    <div className="stat-value" style={{ color: 'var(--color-success)' }}>{monthlyData.combined?.approved || 0}</div>
                    <div className="stat-label">Approved</div>
                  </div>
                </div>
                <div className="stat-card danger">
                  <div className="stat-body">
                    <div className="stat-value" style={{ color: 'var(--color-danger)' }}>{monthlyData.combined?.rejected || 0}</div>
                    <div className="stat-label">Rejected</div>
                  </div>
                </div>
                <div className="stat-card warning">
                  <div className="stat-body">
                    <div className="stat-value">{monthlyData.events?.total || 0}</div>
                    <div className="stat-label">Events</div>
                  </div>
                </div>
              </div>

              {/* Daily breakdown chart */}
              {monthlyData.daily_breakdown?.length > 0 && (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={monthlyData.daily_breakdown} barSize={8}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F0F4FA" />
                    <XAxis dataKey="date" tick={{ fontSize: 8 }} angle={-45} textAnchor="end" height={50} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="dry" name="Dry" fill="#0D3B6E" radius={[2, 2, 0, 0]} />
                    <Bar dataKey="wet" name="Wet" fill="#E8A317" radius={[2, 2, 0, 0]} />
                    <Bar dataKey="events" name="Events" fill="#EF4444" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </>
      )}

      {/* ═══ DEPARTMENT REPORT TAB ═══ */}
      {activeTab === 'department' && deptData && (
        <div className="card" style={{ marginBottom: '16px' }}>
          <div className="card-header">
            <span className="card-title">🏢 Department-wise Report</span>
          </div>
          <div className="card-body">
            {/* AHP Logbook Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '16px' }}>
              <div className="card" style={{ padding: '12px', textAlign: 'center' }}>
                <div className="font-mono" style={{ fontSize: '1.5rem', fontWeight: 700 }}>{deptData.ahp_logbook_stats?.dry_total || 0}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Dry Entries</div>
              </div>
              <div className="card" style={{ padding: '12px', textAlign: 'center' }}>
                <div className="font-mono" style={{ fontSize: '1.5rem', fontWeight: 700 }}>{deptData.ahp_logbook_stats?.wet_total || 0}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Wet Entries</div>
              </div>
              <div className="card" style={{ padding: '12px', textAlign: 'center' }}>
                <div className="font-mono" style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-success)' }}>{deptData.ahp_logbook_stats?.dry_approved || 0}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Dry Approved</div>
              </div>
              <div className="card" style={{ padding: '12px', textAlign: 'center' }}>
                <div className="font-mono" style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-success)' }}>{deptData.ahp_logbook_stats?.wet_approved || 0}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Wet Approved</div>
              </div>
            </div>

            {/* Department Event Summary */}
            {deptData.department_summary?.length > 0 && (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Department</th><th>Total Events</th><th>Open</th><th>Resolved</th>
                    <th>Critical</th><th>High</th><th>Medium</th><th>Low</th>
                  </tr>
                </thead>
                <tbody>
                  {deptData.department_summary.map(d => (
                    <tr key={d.department}>
                      <td style={{ fontWeight: 600 }}>{d.department?.toUpperCase()}</td>
                      <td className="font-mono" style={{ fontWeight: 700 }}>{d.total}</td>
                      <td className="font-mono" style={{ color: 'var(--color-warning)' }}>{d.open}</td>
                      <td className="font-mono" style={{ color: 'var(--color-success)' }}>{d.resolved}</td>
                      <td className="font-mono" style={{ color: '#DC2626' }}>{d.critical}</td>
                      <td className="font-mono" style={{ color: '#EF4444' }}>{d.high}</td>
                      <td className="font-mono">{d.medium}</td>
                      <td className="font-mono">{d.low}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {(!deptData.department_summary || deptData.department_summary.length === 0) && (
              <div className="empty-state">
                <div className="empty-state-icon">🏢</div>
                <h3>No department data</h3>
                <p>No event records found for the selected period.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══ EXCEPTION REPORT TAB ═══ */}
      {activeTab === 'exceptions' && exceptionData && (
        <>
          <div className="stats-grid" style={{ marginBottom: '16px' }}>
            <div className="stat-card danger">
              <div className="stat-icon"><FiAlertCircle /></div>
              <div className="stat-body">
                <div className="stat-value" style={{ color: 'var(--color-danger)' }}>
                  {(exceptionData.overdue_approvals?.dry_count || 0) + (exceptionData.overdue_approvals?.wet_count || 0)}
                </div>
                <div className="stat-label">Overdue Approvals</div>
              </div>
            </div>
            <div className="stat-card warning">
              <div className="stat-icon"><FiAlertTriangle /></div>
              <div className="stat-body">
                <div className="stat-value" style={{ color: 'var(--color-warning)' }}>
                  {(exceptionData.rejected_entries?.dry_count || 0) + (exceptionData.rejected_entries?.wet_count || 0)}
                </div>
                <div className="stat-label">Rejected Entries</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-body">
                <div className="stat-value">
                  {exceptionData.missing_entries?.dry_missing_count || 0}
                </div>
                <div className="stat-label">Missing Dry Entries</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-body">
                <div className="stat-value">{exceptionData.critical_open_events?.count || 0}</div>
                <div className="stat-label">Critical Open Events</div>
              </div>
            </div>
          </div>

          {/* Overdue Approvals */}
          {((exceptionData.overdue_approvals?.dry_count || 0) + (exceptionData.overdue_approvals?.wet_count || 0)) > 0 && (
            <div className="card" style={{ marginBottom: '16px' }}>
              <div className="card-header">
                <span className="card-title" style={{ color: 'var(--color-danger)' }}>🔴 Overdue Approvals (Pending &gt; 24 hours)</span>
              </div>
              <div className="card-body">
                {exceptionData.overdue_approvals?.dry_entries?.map(e => (
                  <div key={`od-${e.id}`} style={{ padding: '8px 0', borderBottom: '1px solid var(--color-border-light)', display: 'flex', justifyContent: 'space-between' }}>
                    <span><span className="badge badge-submitted">DRY</span> {e.date} – {e.shift_display}</span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>by {e.prepared_by_name}</span>
                  </div>
                ))}
                {exceptionData.overdue_approvals?.wet_entries?.map(e => (
                  <div key={`ow-${e.id}`} style={{ padding: '8px 0', borderBottom: '1px solid var(--color-border-light)', display: 'flex', justifyContent: 'space-between' }}>
                    <span><span className="badge badge-submitted">WET</span> {e.date} – {e.shift_display}</span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>by {e.prepared_by_name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Critical Open Events */}
          {exceptionData.critical_open_events?.entries?.length > 0 && (
            <div className="card" style={{ marginBottom: '16px' }}>
              <div className="card-header">
                <span className="card-title" style={{ color: '#DC2626' }}>🚨 Critical/High Open Events</span>
              </div>
              <div className="card-body">
                <table className="data-table">
                  <thead><tr><th>Date</th><th>Title</th><th>Severity</th><th>Category</th><th>Reported By</th></tr></thead>
                  <tbody>
                    {exceptionData.critical_open_events.entries.map(e => (
                      <tr key={e.id}>
                        <td className="font-mono">{e.date}</td>
                        <td style={{ fontWeight: 600 }}>{e.title}</td>
                        <td><span className="badge badge-rejected">{e.severity}</span></td>
                        <td>{e.category}</td>
                        <td>{e.reported_by}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Missing Entries */}
          {(exceptionData.missing_entries?.dry_missing_count > 0 || exceptionData.missing_entries?.wet_missing_count > 0) && (
            <div className="card">
              <div className="card-header">
                <span className="card-title">📭 Missing Logbook Entries</span>
              </div>
              <div className="card-body">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <h4 style={{ fontSize: '0.875rem', marginBottom: '8px' }}>Dry System – {exceptionData.missing_entries.dry_missing_count} missing dates</h4>
                    <div style={{ maxHeight: '200px', overflow: 'auto', fontSize: '0.8rem' }}>
                      {exceptionData.missing_entries.dry_missing_dates?.map(d => (
                        <div key={d} className="font-mono" style={{ padding: '2px 0', color: 'var(--color-text-muted)' }}>{d}</div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 style={{ fontSize: '0.875rem', marginBottom: '8px' }}>Wet System – {exceptionData.missing_entries.wet_missing_count} missing dates</h4>
                    <div style={{ maxHeight: '200px', overflow: 'auto', fontSize: '0.8rem' }}>
                      {exceptionData.missing_entries.wet_missing_dates?.map(d => (
                        <div key={d} className="font-mono" style={{ padding: '2px 0', color: 'var(--color-text-muted)' }}>{d}</div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
