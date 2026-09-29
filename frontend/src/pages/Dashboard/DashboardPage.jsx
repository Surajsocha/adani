import React, { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import { Link } from 'react-router-dom'
import {
  FiBook, FiCheckCircle, FiClock, FiAlertCircle, FiTrendingUp, FiCalendar,
  FiAlertTriangle, FiRepeat, FiUsers, FiActivity
} from 'react-icons/fi'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell, LineChart, Line
} from 'recharts'
import api from '../../api/axios'
import { format } from 'date-fns'

const PIE_COLORS = ['#0D3B6E', '#E8A317', '#22C55E', '#EF4444', '#8B5CF6']

export default function DashboardPage() {
  const { user } = useSelector(s => s.auth)
  const [stats, setStats] = useState(null)
  const [dryLogs, setDryLogs] = useState([])
  const [wetLogs, setWetLogs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [dashRes, dryRes, wetRes] = await Promise.all([
          api.get('/logbook/ahp/dashboard-stats/'),
          api.get('/logbook/ahp/dry/?ordering=-date&page_size=5'),
          api.get('/logbook/ahp/wet/?ordering=-date&page_size=5'),
        ])
        setStats(dashRes.data)
        setDryLogs(dryRes.data.results || [])
        setWetLogs(wetRes.data.results || [])
      } catch {}
      setLoading(false)
    }
    fetchAll()
  }, [])

  const shiftData = stats?.shift_breakdown || []

  const eventPieData = stats?.events?.by_severity?.map(item => ({
    name: item.severity.charAt(0).toUpperCase() + item.severity.slice(1),
    value: item.count,
  })) || []

  const statusPieData = stats ? [
    { name: 'Draft', value: (stats.status?.dry?.draft || 0) + (stats.status?.wet?.draft || 0) },
    { name: 'Submitted', value: (stats.status?.dry?.submitted || 0) + (stats.status?.wet?.submitted || 0) },
    { name: 'Approved', value: (stats.status?.dry?.approved || 0) + (stats.status?.wet?.approved || 0) },
    { name: 'Rejected', value: (stats.status?.dry?.rejected || 0) + (stats.status?.wet?.rejected || 0) },
  ].filter(d => d.value > 0) : []

  if (loading) return <div className="loading-page"><span className="spinner spinner-dark" /></div>

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div className="page-header-left">
          <div className="page-breadcrumb">Home › Dashboard</div>
          <h1 className="page-title"><FiBook /> AHP E-Logbook Dashboard</h1>
        </div>
        <div className="page-actions">
          <div className="header-date" style={{ fontSize: '0.875rem' }}>
            <FiCalendar style={{ marginRight: 6 }} />
            {format(new Date(), 'EEEE, dd MMMM yyyy')}
          </div>
        </div>
      </div>

      {/* Welcome Banner */}
      <div style={styles.welcomeBanner}>
        <div>
          <h3 style={{ color: 'white', marginBottom: '4px' }}>
            Good {getGreeting()}, {user?.first_name}!
          </h3>
          <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.875rem' }}>
            ADTPS – Ash Handling Plant (AHP) Digital Logbook System | Dept: AHP
          </p>
        </div>
        <div style={styles.bannerDocRef}>
          <div style={{ fontSize: '0.7rem', opacity: 0.7 }}>DOCUMENT NO.</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
            ADTPS/AHP/OPN/F/01 &amp; /02
          </div>
        </div>
      </div>

      {/* Main Stats Row */}
      <div className="stats-grid">
        <div className="stat-card primary">
          <div className="stat-icon"><FiBook /></div>
          <div className="stat-body">
            <div className="stat-value">{stats?.totals?.combined || 0}</div>
            <div className="stat-label">Total Entries</div>
          </div>
        </div>
        <div className="stat-card warning">
          <div className="stat-icon"><FiClock /></div>
          <div className="stat-body">
            <div className="stat-value" style={{ color: 'var(--color-warning)' }}>{stats?.pending?.total || 0}</div>
            <div className="stat-label">Pending Approval</div>
          </div>
        </div>
        <div className="stat-card success">
          <div className="stat-icon"><FiCheckCircle /></div>
          <div className="stat-body">
            <div className="stat-value" style={{ color: 'var(--color-success)' }}>
              {(stats?.status?.dry?.approved || 0) + (stats?.status?.wet?.approved || 0)}
            </div>
            <div className="stat-label">Approved</div>
          </div>
        </div>
        <div className="stat-card danger">
          <div className="stat-icon"><FiAlertTriangle /></div>
          <div className="stat-body">
            <div className="stat-value" style={{ color: 'var(--color-danger)' }}>{stats?.events?.open || 0}</div>
            <div className="stat-label">Open Events</div>
          </div>
        </div>
      </div>

      {/* Second Row - Additional Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '16px' }}>
        <MiniStat icon="🏭" label="Dry System" value={stats?.totals?.dry || 0} />
        <MiniStat icon="💧" label="Wet System" value={stats?.totals?.wet || 0} />
        <MiniStat icon="⚠️" label="Total Events" value={stats?.events?.total || 0} />
        <MiniStat icon="🔄" label="Pending Handovers" value={stats?.pending?.handovers || 0} />
      </div>

      {/* Charts Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '16px', marginBottom: '16px' }}>
        {/* Shift-wise Chart */}
        <div className="card">
          <div className="card-header">
            <span className="card-title"><FiTrendingUp /> Shift-wise Entry Distribution (Last 30 Days)</span>
          </div>
          <div className="card-body">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={shiftData} barSize={24}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F0F4FA" />
                <XAxis dataKey="shift" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="dry" name="Dry" fill="#0D3B6E" radius={[4, 4, 0, 0]} />
                <Bar dataKey="wet" name="Wet" fill="#E8A317" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Status Pie */}
        <div className="card">
          <div className="card-header"><span className="card-title">📊 Approval Status</span></div>
          <div className="card-body" style={{ display: 'flex', justifyContent: 'center' }}>
            {statusPieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={statusPieData} cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => `${name}: ${value}`} dataKey="value">
                    {statusPieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '220px', color: 'var(--color-text-muted)' }}>
                No data available
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions + Event Severity Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
        <div className="card">
          <div className="card-header"><span className="card-title">🚀 Quick Actions</span></div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <Link to="/logbook/ahp/dry/new" className="btn btn-primary">+ New Dry System Entry</Link>
            <Link to="/logbook/ahp/wet/new" className="btn btn-outline">+ New Wet System Entry</Link>
            <Link to="/events/new" className="btn btn-outline" style={{ borderColor: '#E8A317', color: '#E8A317' }}>⚠️ Report Event</Link>
            <Link to="/handover" className="btn btn-ghost">🔄 Shift Handover</Link>
            <Link to="/reports" className="btn btn-ghost">📊 View Reports</Link>
          </div>
        </div>

        {/* User Activity */}
        <div className="card">
          <div className="card-header"><span className="card-title"><FiUsers /> Top Contributors (Last 30 Days)</span></div>
          <div className="card-body">
            {stats?.user_activity?.length > 0 ? (
              <table className="data-table">
                <thead><tr><th>User</th><th>Entries</th></tr></thead>
                <tbody>
                  {stats.user_activity.map((u, i) => (
                    <tr key={i}>
                      <td style={{ fontWeight: 600 }}>{u.prepared_by__first_name} {u.prepared_by__last_name}</td>
                      <td className="font-mono" style={{ fontWeight: 700 }}>
                        <span style={{
                          display: 'inline-block', minWidth: '40px', textAlign: 'center',
                          background: `hsl(${210 - i * 15}, 60%, ${45 + i * 5}%)`,
                          color: 'white', borderRadius: '4px', padding: '2px 8px',
                        }}>
                          {u.count}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div style={{ textAlign: 'center', padding: '20px', color: 'var(--color-text-muted)' }}>
                No activity data available
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Logs */}
      <div className="card" style={{ marginBottom: '16px' }}>
        <div className="card-header">
          <span className="card-title">Recent Dry System Entries</span>
          <Link to="/logbook/ahp/dry" className="btn btn-ghost btn-sm">View All</Link>
        </div>
        <div className="table-wrapper" style={{ borderRadius: 0, border: 'none', boxShadow: 'none' }}>
          <RecentTable logs={dryLogs} />
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <span className="card-title">Recent Wet System Entries</span>
          <Link to="/logbook/ahp/wet" className="btn btn-ghost btn-sm">View All</Link>
        </div>
        <div className="table-wrapper" style={{ borderRadius: 0, border: 'none', boxShadow: 'none' }}>
          <RecentTable logs={wetLogs} />
        </div>
      </div>
    </div>
  )
}

function MiniStat({ icon, label, value }) {
  return (
    <div className="card" style={{ textAlign: 'center', padding: '16px 12px' }}>
      <div style={{ fontSize: '1.5rem', marginBottom: '4px' }}>{icon}</div>
      <div style={{ fontWeight: 700, fontSize: '1.25rem', fontFamily: 'var(--font-mono)' }}>{value}</div>
      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{label}</div>
    </div>
  )
}

function RecentTable({ logs }) {
  if (!logs.length) return (
    <div className="empty-state">
      <div className="empty-state-icon">📋</div>
      <h3>No entries yet</h3>
      <p>Create your first logbook entry to get started.</p>
    </div>
  )
  return (
    <table className="data-table">
      <thead>
        <tr>
          <th>Date</th><th>Shift</th><th>Status</th><th>Prepared By</th><th>Created</th>
        </tr>
      </thead>
      <tbody>
        {logs.map(log => (
          <tr key={log.id}>
            <td className="font-mono">{log.date}</td>
            <td><span className="badge badge-draft">{log.shift_display}</span></td>
            <td><StatusBadge status={log.status} label={log.status_display} /></td>
            <td>{log.prepared_by_name}</td>
            <td className="text-muted font-mono" style={{ fontSize: '0.8rem' }}>
              {format(new Date(log.created_at), 'dd/MM/yy HH:mm')}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function StatusBadge({ status, label }) {
  const cls = { draft: 'badge-draft', submitted: 'badge-submitted', approved: 'badge-approved', rejected: 'badge-rejected' }
  return <span className={`badge ${cls[status] || 'badge-draft'}`}>{label}</span>
}

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Morning'
  if (h < 17) return 'Afternoon'
  return 'Evening'
}

const styles = {
  welcomeBanner: {
    background: 'linear-gradient(135deg, #0D3B6E, #1A5B9E)',
    borderRadius: '12px',
    padding: '20px 24px',
    marginBottom: '20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bannerDocRef: {
    textAlign: 'right',
    color: 'white',
    fontSize: '0.8125rem',
  },
}
