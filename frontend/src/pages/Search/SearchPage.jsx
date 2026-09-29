import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FiSearch, FiFilter, FiBook, FiAlertTriangle, FiDroplet, FiWind } from 'react-icons/fi'
import api from '../../api/axios'
import toast from 'react-hot-toast'

export default function SearchPage() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [entryType, setEntryType] = useState('all')
  const [unit, setUnit] = useState('')
  const [department, setDepartment] = useState('')
  const [category, setCategory] = useState('')
  const [equipmentTag, setEquipmentTag] = useState('')
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)

  const handleSearch = async (e) => {
    e?.preventDefault()
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (query) params.append('q', query)
      if (dateFrom) params.append('date_from', dateFrom)
      if (dateTo) params.append('date_to', dateTo)
      if (entryType !== 'all') params.append('type', entryType)
      if (unit) params.append('unit', unit)
      if (department) params.append('department', department)
      if (category) params.append('category', category)
      if (equipmentTag) params.append('equipment_tag', equipmentTag)

      const res = await api.get(`/logbook/ahp/search/?${params.toString()}`)
      setResults(res.data)
    } catch { toast.error('Search failed') }
    setLoading(false)
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <div className="page-breadcrumb">Home › Search</div>
          <h1 className="page-title"><FiSearch /> Advanced Search</h1>
        </div>
      </div>

      {/* Search Form */}
      <div className="card" style={{ marginBottom: '16px' }}>
        <div className="card-body">
          <form onSubmit={handleSearch}>
            <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
              <input
                type="text" className="form-control" style={{ flex: 1, fontSize: '1rem' }}
                placeholder="Search across all logbooks and events…"
                value={query} onChange={e => setQuery(e.target.value)}
              />
              <button type="submit" className="btn btn-primary" disabled={loading}>
                <FiSearch /> {loading ? 'Searching…' : 'Search'}
              </button>
            </div>

            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Date From</label>
                <input type="date" className="form-control font-mono" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Date To</label>
                <input type="date" className="form-control font-mono" value={dateTo} onChange={e => setDateTo(e.target.value)} />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Entry Type</label>
                <select className="form-control" value={entryType} onChange={e => setEntryType(e.target.value)}>
                  <option value="all">All Types</option>
                  <option value="dry">Dry System</option>
                  <option value="wet">Wet System</option>
                  <option value="event">Events Only</option>
                </select>
              </div>
              <button type="button" className="btn btn-ghost" onClick={() => setShowAdvanced(!showAdvanced)}>
                <FiFilter /> {showAdvanced ? 'Hide' : 'More'} Filters
              </button>
            </div>

            {showAdvanced && (
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--color-border-light)' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Unit</label>
                  <select className="form-control" value={unit} onChange={e => setUnit(e.target.value)}>
                    <option value="">All Units</option>
                    <option value="1">Unit 1</option>
                    <option value="2">Unit 2</option>
                    <option value="common">Common</option>
                  </select>
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Department</label>
                  <select className="form-control" value={department} onChange={e => setDepartment(e.target.value)}>
                    <option value="">All Departments</option>
                    <option value="ahp">AHP</option>
                    <option value="operations">Operations</option>
                    <option value="electrical">Electrical</option>
                    <option value="mechanical">Mechanical</option>
                    <option value="ci">C&I</option>
                    <option value="chp">CHP</option>
                  </select>
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Event Category</label>
                  <select className="form-control" value={category} onChange={e => setCategory(e.target.value)}>
                    <option value="">All Categories</option>
                    <option value="abnormality">Abnormality</option>
                    <option value="unit_trip">Unit Trip</option>
                    <option value="breakdown">Breakdown</option>
                    <option value="safety">Safety</option>
                    <option value="near_miss">Near Miss</option>
                  </select>
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Equipment Tag</label>
                  <input type="text" className="form-control font-mono" placeholder="e.g. COMP-1" value={equipmentTag} onChange={e => setEquipmentTag(e.target.value)} />
                </div>
              </div>
            )}
          </form>
        </div>
      </div>

      {/* Results */}
      {results && (
        <>
          <div style={{ marginBottom: '12px', fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
            Found <strong>{results.total_count}</strong> results
            ({results.dry?.length || 0} dry, {results.wet?.length || 0} wet, {results.events?.length || 0} events)
          </div>

          {/* Dry Results */}
          {results.dry?.length > 0 && (
            <div className="card" style={{ marginBottom: '16px' }}>
              <div className="card-header">
                <span className="card-title"><FiWind /> Dry System Entries ({results.dry.length})</span>
              </div>
              <div className="table-wrapper" style={{ border: 'none', boxShadow: 'none' }}>
                <table className="data-table">
                  <thead><tr><th>Date</th><th>Shift</th><th>Status</th><th>Prepared By</th><th></th></tr></thead>
                  <tbody>
                    {results.dry.map(entry => (
                      <tr key={`dry-${entry.id}`}>
                        <td className="font-mono">{entry.date}</td>
                        <td><span className="badge badge-draft">{entry.shift_display}</span></td>
                        <td><span className={`badge badge-${entry.status}`}>{entry.status_display}</span></td>
                        <td>{entry.prepared_by_name}</td>
                        <td><button className="btn btn-ghost btn-sm" onClick={() => navigate(`/logbook/ahp/dry/${entry.id}`)}>View</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Wet Results */}
          {results.wet?.length > 0 && (
            <div className="card" style={{ marginBottom: '16px' }}>
              <div className="card-header">
                <span className="card-title"><FiDroplet /> Wet System Entries ({results.wet.length})</span>
              </div>
              <div className="table-wrapper" style={{ border: 'none', boxShadow: 'none' }}>
                <table className="data-table">
                  <thead><tr><th>Date</th><th>Shift</th><th>Status</th><th>Prepared By</th><th></th></tr></thead>
                  <tbody>
                    {results.wet.map(entry => (
                      <tr key={`wet-${entry.id}`}>
                        <td className="font-mono">{entry.date}</td>
                        <td><span className="badge badge-draft">{entry.shift_display}</span></td>
                        <td><span className={`badge badge-${entry.status}`}>{entry.status_display}</span></td>
                        <td>{entry.prepared_by_name}</td>
                        <td><button className="btn btn-ghost btn-sm" onClick={() => navigate(`/logbook/ahp/wet/${entry.id}`)}>View</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Event Results */}
          {results.events?.length > 0 && (
            <div className="card" style={{ marginBottom: '16px' }}>
              <div className="card-header">
                <span className="card-title"><FiAlertTriangle /> Events ({results.events.length})</span>
              </div>
              <div className="table-wrapper" style={{ border: 'none', boxShadow: 'none' }}>
                <table className="data-table">
                  <thead><tr><th>Date</th><th>Category</th><th>Severity</th><th>Title</th><th>Status</th><th></th></tr></thead>
                  <tbody>
                    {results.events.map(event => (
                      <tr key={`evt-${event.id}`}>
                        <td className="font-mono">{event.date}</td>
                        <td><span className="badge badge-draft">{event.category_display}</span></td>
                        <td><span className="badge badge-submitted">{event.severity_display}</span></td>
                        <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{event.title}</td>
                        <td><span className={`badge badge-${event.event_status === 'resolved' ? 'approved' : 'draft'}`}>{event.status_display}</span></td>
                        <td><button className="btn btn-ghost btn-sm" onClick={() => navigate(`/events/${event.id}`)}>View</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {results.total_count === 0 && (
            <div className="card">
              <div className="empty-state">
                <div className="empty-state-icon">🔍</div>
                <h3>No results found</h3>
                <p>Try adjusting your search criteria or filters.</p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
