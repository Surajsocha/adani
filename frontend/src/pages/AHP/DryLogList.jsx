import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FiPlus, FiSearch, FiEye, FiEdit2, FiCheckCircle, FiXCircle, FiWind, FiX, FiClock, FiCalendar, FiUser, FiFileText, FiDownload, FiUpload, FiChevronDown } from 'react-icons/fi'
import api from '../../api/axios'
import { format } from 'date-fns'
import { useSelector } from 'react-redux'
import toast from 'react-hot-toast'
import { exportDryEntries, parseImportFile, mapDrySheets, downloadDryTemplate } from '../../utils/exportImport'

export default function AHPDryListPage() {
  const navigate   = useNavigate()
  const { user }   = useSelector(s => s.auth)
  const [entries, setEntries]     = useState([])
  const [loading, setLoading]     = useState(true)
  const [total, setTotal]         = useState(0)
  const [page, setPage]           = useState(1)
  const [filters, setFilters]     = useState({ date: '', shift: '', status: '', search: '' })
  const [approvalModal, setApprovalModal] = useState(null)
  const [approvalRemarks, setApprovalRemarks] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [viewModal, setViewModal] = useState(null)
  const [viewLoading, setViewLoading] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)
  const [importModal, setImportModal] = useState(false)
  const [importSheets, setImportSheets] = useState(null)   // { sheets, sheetNames }
  const [importLoading, setImportLoading] = useState(false)
  const [importFile, setImportFile]   = useState(null)
  const fileInputRef = useRef()

  const PAGE_SIZE = 20

  const fetchEntries = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page, page_size: PAGE_SIZE })
      if (filters.date)   params.append('date', filters.date)
      if (filters.shift)  params.append('shift', filters.shift)
      if (filters.status) params.append('status', filters.status)
      if (filters.search) params.append('search', filters.search)
      const res = await api.get(`/logbook/ahp/dry/?${params}`)
      setEntries(res.data.results || [])
      setTotal(res.data.count || 0)
    } catch { toast.error('Failed to load entries') }
    setLoading(false)
  }, [page, filters])

  useEffect(() => { fetchEntries() }, [fetchEntries])

  const handleApprove = async () => {
    setSubmitting(true)
    try {
      await api.post(`/logbook/ahp/dry/${approvalModal.entry.id}/${approvalModal.action}/`, {
        remarks: approvalRemarks
      })
      toast.success(`Entry ${approvalModal.action}d successfully`)
      setApprovalModal(null)
      if (viewModal) {
        // refresh view modal entry
        const res = await api.get(`/logbook/ahp/dry/${viewModal.id}/`)
        setViewModal(res.data)
      }
      fetchEntries()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Action failed')
    }
    setSubmitting(false)
  }

  const handleSubmit = async (id) => {
    try {
      await api.post(`/logbook/ahp/dry/${id}/submit/`)
      toast.success('Entry submitted for approval')
      fetchEntries()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Submit failed')
    }
  }

  const handleViewEntry = async (entry) => {
    setViewLoading(true)
    setViewModal(entry) // show modal immediately with list data
    try {
      const res = await api.get(`/logbook/ahp/dry/${entry.id}/`)
      setViewModal(res.data)
    } catch {
      toast.error('Failed to load entry details')
    }
    setViewLoading(false)
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)
  const canApproveReject = ['superadmin', 'dept_admin', 'supervisor'].includes(user?.role)

  // ── Export current page entries ───────────────────────────────────────────
  const handleExport = (fmt) => {
    if (!entries.length) { toast.error('No entries to export'); return }
    exportDryEntries(entries, fmt)
    setExportOpen(false)
    toast.success(`Exported ${entries.length} entries as ${fmt.toUpperCase()}`)
  }

  // ── Import: parse file ────────────────────────────────────────────────────
  const handleFileChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImportFile(file)
    try {
      const parsed = await parseImportFile(file)
      setImportSheets(parsed)
      toast.success(`File loaded: ${parsed.sheetNames.length} sheets detected`)
    } catch (err) {
      toast.error(err.message)
      setImportSheets(null)
    }
  }

  const handleImportSubmit = async () => {
    if (!importSheets) { toast.error('No file loaded'); return }
    setImportLoading(true)
    try {
      const { formData, esp_dry_deashing, equipment_status } = mapDrySheets(importSheets.sheets)
      await api.post('/logbook/ahp/dry/', { ...formData, esp_dry_deashing, equipment_status })
      toast.success('Entry imported successfully as Draft')
      setImportModal(false)
      setImportSheets(null)
      setImportFile(null)
      fetchEntries()
    } catch (err) {
      toast.error(JSON.stringify(err.response?.data) || 'Import failed')
    }
    setImportLoading(false)
  }

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div className="page-header-left">
          <div className="page-breadcrumb">AHP › Dry System</div>
          <h1 className="page-title"><FiWind /> Dry System Logbook</h1>
        </div>
        <div className="page-actions">
          {/* Import button */}
          <button className="btn btn-outline" onClick={() => { setImportModal(true); setImportRows([]); setImportFile(null) }}>
            <FiUpload /> Import
          </button>

          {/* Export dropdown */}
          <div style={{ position: 'relative' }}>
            <button
              className="btn btn-outline"
              onClick={() => setExportOpen(v => !v)}
            >
              <FiDownload /> Export <FiChevronDown size={13} />
            </button>
            {exportOpen && (
              <div style={dropdownStyle} onMouseLeave={() => setExportOpen(false)}>
                <button style={dropItemStyle} onClick={() => handleExport('xlsx')}>
                  📊 Export as Excel (.xlsx)
                </button>
                <button style={dropItemStyle} onClick={() => handleExport('csv')}>
                  📄 Export as CSV (.csv)
                </button>
              </div>
            )}
          </div>

          <Link to="/logbook/ahp/dry/new" className="btn btn-primary">
            <FiPlus /> New Entry
          </Link>
        </div>
      </div>

      {/* Document reference strip */}
      <div style={styles.docStrip}>
        <span>Document No: <strong>ADTPS/AHP/OPN/F/01</strong></span>
        <span>Adani Power Limited – Dahanu Thermal Power Station (2×250 MW)</span>
        <span>Total: <strong>{total}</strong> entries</span>
      </div>

      {/* Filters */}
      <div className="filter-bar">
        <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
          <FiSearch style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#A0AEC0' }} />
          <input
            type="text" placeholder="Search observations..."
            value={filters.search}
            onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
            style={{ paddingLeft: '34px', width: '100%' }}
          />
        </div>
        <input
          type="date"
          value={filters.date}
          onChange={e => setFilters(f => ({ ...f, date: e.target.value }))}
        />
        <select value={filters.shift} onChange={e => setFilters(f => ({ ...f, shift: e.target.value }))}>
          <option value="">All Shifts</option>
          <option value="A">A Shift</option>
          <option value="B">B Shift</option>
          <option value="C">C Shift</option>
          <option value="G">General</option>
        </select>
        <select value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}>
          <option value="">All Status</option>
          <option value="draft">Draft</option>
          <option value="submitted">Submitted</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
        <button className="btn btn-outline btn-sm" onClick={() => setFilters({ date: '', shift: '', status: '', search: '' })}>
          Clear
        </button>
      </div>

      {/* Table */}
      <div className="table-wrapper">
        {loading ? (
          <div className="loading-page"><span className="spinner spinner-dark" /><span>Loading entries…</span></div>
        ) : entries.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🗂️</div>
            <h3>No entries found</h3>
            <p>Create a new logbook entry to get started.</p>
            <Link to="/logbook/ahp/dry/new" className="btn btn-primary" style={{ marginTop: 16 }}>
              <FiPlus /> New Entry
            </Link>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Date</th>
                <th>Shift</th>
                <th>Shift Incharge</th>
                <th>Status</th>
                <th>Prepared By</th>
                <th>Approved By</th>
                <th>Created At</th>
                <th style={{ textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry, i) => (
                <tr key={entry.id}>
                  <td className="font-mono text-muted">{(page - 1) * PAGE_SIZE + i + 1}</td>
                  <td className="font-mono" style={{ fontWeight: 600 }}>{entry.date}</td>
                  <td><span className="badge badge-submitted">{entry.shift_display}</span></td>
                  <td>{entry.shift_incharge_name || '—'}</td>
                  <td><StatusBadge status={entry.status} label={entry.status_display} /></td>
                  <td>{entry.prepared_by_name}</td>
                  <td>{entry.approved_by_name || '—'}</td>
                  <td className="font-mono text-muted" style={{ fontSize: '0.8rem' }}>
                    {format(new Date(entry.created_at), 'dd/MM/yy HH:mm')}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                      <button
                        className="btn btn-ghost btn-sm btn-icon"
                        title="View Details"
                        onClick={() => handleViewEntry(entry)}
                      >
                        <FiEye size={14} />
                      </button>
                      {entry.status === 'draft' && (
                        <>
                          <Link to={`/logbook/ahp/dry/${entry.id}/edit`} className="btn btn-ghost btn-sm btn-icon" title="Edit">
                            <FiEdit2 size={14} />
                          </Link>
                          <button
                            className="btn btn-outline btn-sm"
                            onClick={() => handleSubmit(entry.id)}
                            title="Submit for approval"
                          >
                            Submit
                          </button>
                        </>
                      )}
                      {entry.status === 'submitted' && canApproveReject && (
                        <>
                          <button
                            className="btn btn-success btn-sm btn-icon"
                            onClick={() => { setApprovalModal({ entry, action: 'approve' }); setApprovalRemarks('') }}
                            title="Approve"
                          >
                            <FiCheckCircle size={14} />
                          </button>
                          <button
                            className="btn btn-danger btn-sm btn-icon"
                            onClick={() => { setApprovalModal({ entry, action: 'reject' }); setApprovalRemarks('') }}
                            title="Reject"
                          >
                            <FiXCircle size={14} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={styles.pagination}>
          <button className="btn btn-outline btn-sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
            ← Previous
          </button>
          <span style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
            Page {page} of {totalPages} ({total} total)
          </span>
          <button className="btn btn-outline btn-sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>
            Next →
          </button>
        </div>
      )}

      {/* ── View Details Modal ─────────────────────────────────────── */}
      {viewModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setViewModal(null)}>
          <div className="modal modal-xl" style={{ maxHeight: '92vh' }}>
            <div className="modal-header" style={{ background: 'linear-gradient(to right, #0D3B6E, #1A5B9E)', borderRadius: '16px 16px 0 0', padding: '16px 24px' }}>
              <span className="modal-title" style={{ color: 'white', fontSize: '1.1rem' }}>
                <FiFileText /> AHP Dry System – Entry Details
              </span>
              <button className="modal-close" onClick={() => setViewModal(null)} style={{ color: 'white', fontSize: '1.5rem' }}>
                <FiX />
              </button>
            </div>
            <div className="modal-body" style={{ padding: '0', overflowY: 'auto' }}>
              {viewLoading ? (
                <div className="loading-page"><span className="spinner spinner-dark" /><span>Loading details…</span></div>
              ) : (
                <div>
                  {/* Header Info Bar */}
                  <div style={{ background: '#0D3B6E', color: 'white', padding: '12px 24px', display: 'flex', gap: '32px', flexWrap: 'wrap' }}>
                    <div style={styles.infoChip}>
                      <FiCalendar size={13} />
                      <span>Date: <strong>{viewModal.date}</strong></span>
                    </div>
                    <div style={styles.infoChip}>
                      <FiClock size={13} />
                      <span>Shift: <strong>{viewModal.shift_display || viewModal.shift}</strong></span>
                    </div>
                    <div style={styles.infoChip}>
                      <FiUser size={13} />
                      <span>Prepared By: <strong>{viewModal.prepared_by_name || '—'}</strong></span>
                    </div>
                    <div style={{ marginLeft: 'auto' }}>
                      <StatusBadge status={viewModal.status} label={viewModal.status_display || viewModal.status} />
                    </div>
                  </div>

                  <div style={{ padding: '20px 24px' }}>
                    {/* Shift Info */}
                    <div style={styles.sectionTitle}>📋 Shift Information</div>
                    <div style={styles.infoGrid}>
                      <InfoRow label="Shift Incharge" value={viewModal.shift_incharge_name || '—'} />
                      <InfoRow label="Field Operator" value={viewModal.field_operator_name || '—'} />
                      <InfoRow label="Document No" value={viewModal.document_no} />
                      <InfoRow label="Operator Signature" value={viewModal.operator_signature || '—'} />
                    </div>

                    {/* Silo Levels */}
                    <div style={styles.sectionTitle}>🏭 Silo Levels & Fly Ash</div>
                    <div style={styles.infoGrid}>
                      <InfoRow label="Fine Ash Silo Level (%)" value={viewModal.fine_ash_silo_level ?? '—'} />
                      <InfoRow label="Coarse Ash Silo Level (%)" value={viewModal.coarse_ash_silo_level ?? '—'} />
                      <InfoRow label="300 MT Ash Silo Level (%)" value={viewModal.mt300_ash_silo_level ?? '—'} />
                      <InfoRow label="Fly Ash Quantity (MT)" value={viewModal.fly_ash_quantity ?? '—'} />
                    </div>

                    {/* Power Consumption */}
                    <div style={styles.sectionTitle}>⚡ Power Consumption</div>
                    <div style={styles.infoGrid}>
                      <InfoRow label="I/C-1 Initial Reading" value={viewModal.ic1_initial ?? '—'} />
                      <InfoRow label="I/C-1 Final Reading" value={viewModal.ic1_final ?? '—'} />
                      <InfoRow label="I/C-2 Initial Reading" value={viewModal.ic2_initial ?? '—'} />
                      <InfoRow label="I/C-2 Final Reading" value={viewModal.ic2_final ?? '—'} />
                    </div>

                    {/* ESP Dry Deashing */}
                    {viewModal.esp_dry_deashing && viewModal.esp_dry_deashing.length > 0 && (
                      <>
                        <div style={styles.sectionTitle}>🔧 ESP Dry Deashing Cycles</div>
                        <div style={{ overflowX: 'auto', marginBottom: '16px' }}>
                          <table className="data-table" style={{ minWidth: '600px' }}>
                            <thead>
                              <tr>
                                <th>Unit</th>
                                <th>ESP Pass</th>
                                <th>Cycle</th>
                                <th>Start Time</th>
                                <th>Stop Time</th>
                                <th>Total Time (hrs)</th>
                              </tr>
                            </thead>
                            <tbody>
                              {viewModal.esp_dry_deashing.filter(e => e.start_time || e.stop_time).map((e, i) => (
                                <tr key={i}>
                                  <td>Unit {e.unit}</td>
                                  <td><strong>{e.esp_pass}</strong></td>
                                  <td>{e.cycle}</td>
                                  <td className="font-mono">{e.start_time || '—'}</td>
                                  <td className="font-mono">{e.stop_time || '—'}</td>
                                  <td className="font-mono" style={{ fontWeight: 600 }}>{e.total_time ?? '—'}</td>
                                </tr>
                              ))}
                              {viewModal.esp_dry_deashing.filter(e => e.start_time || e.stop_time).length === 0 && (
                                <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>No deashing data entered</td></tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </>
                    )}

                    {/* Equipment Status */}
                    {viewModal.equipment_status && viewModal.equipment_status.length > 0 && (
                      <>
                        <div style={styles.sectionTitle}>⚙️ Equipment Running Status</div>
                        <div style={{ overflowX: 'auto', marginBottom: '16px' }}>
                          <table className="data-table" style={{ minWidth: '600px' }}>
                            <thead>
                              <tr>
                                <th>Equipment</th>
                                <th>Cycle</th>
                                <th>Start Time</th>
                                <th>Stop Time</th>
                                <th>Running Hrs</th>
                                <th>Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {viewModal.equipment_status.filter(e => e.start_time || e.stop_time || e.availability_status).map((e, i) => (
                                <tr key={i}>
                                  <td><strong>{e.equipment}</strong></td>
                                  <td>{e.cycle}</td>
                                  <td className="font-mono">{e.start_time || '—'}</td>
                                  <td className="font-mono">{e.stop_time || '—'}</td>
                                  <td className="font-mono" style={{ fontWeight: 600 }}>{e.running_hrs ?? '—'}</td>
                                  <td>
                                    <span style={{ padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 700,
                                      background: e.availability_status === 'R' ? '#D1FAE5' : e.availability_status === 'B' ? '#FEE2E2' : e.availability_status === 'P' ? '#FEF3C7' : '#F3F4F6',
                                      color: e.availability_status === 'R' ? '#065F46' : e.availability_status === 'B' ? '#991B1B' : e.availability_status === 'P' ? '#92400E' : '#374151'
                                    }}>{e.availability_status || '—'}</span>
                                  </td>
                                </tr>
                              ))}
                              {viewModal.equipment_status.filter(e => e.start_time || e.stop_time || e.availability_status).length === 0 && (
                                <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>No equipment data entered</td></tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </>
                    )}

                    {/* Observations */}
                    {(viewModal.observations || viewModal.remarks) && (
                      <>
                        <div style={styles.sectionTitle}>📝 Observations & Remarks</div>
                        <div style={styles.infoGrid}>
                          {viewModal.observations && <InfoRow label="Observations" value={viewModal.observations} fullWidth />}
                          {viewModal.remarks && <InfoRow label="Remarks" value={viewModal.remarks} fullWidth />}
                        </div>
                      </>
                    )}

                    {/* Approval Info */}
                    {(viewModal.approved_by_name || viewModal.approval_remarks) && (
                      <>
                        <div style={styles.sectionTitle}>✅ Approval Information</div>
                        <div style={styles.infoGrid}>
                          <InfoRow label="Approved/Reviewed By" value={viewModal.approved_by_name || '—'} />
                          <InfoRow label="Approval Remarks" value={viewModal.approval_remarks || '—'} />
                        </div>
                      </>
                    )}

                    {/* ── Approve / Reject Section ─────────────────────── */}
                    {viewModal.status === 'submitted' && canApproveReject && (
                      <div style={styles.approvalSection}>
                        <div style={styles.approvalSectionTitle}>
                          🔐 Supervisor Action – Approve or Reject Entry
                        </div>
                        <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', marginBottom: '16px' }}>
                          This entry has been submitted by <strong>{viewModal.prepared_by_name}</strong> for approval.
                          Please review the data above before taking action.
                        </p>
                        <div className="form-group" style={{ marginBottom: '16px' }}>
                          <label className="form-label">Remarks (required for rejection)</label>
                          <textarea
                            className="form-control"
                            rows={3}
                            placeholder="Enter approval or rejection remarks…"
                            value={approvalRemarks}
                            onChange={e => setApprovalRemarks(e.target.value)}
                          />
                        </div>
                        <div style={{ display: 'flex', gap: '12px' }}>
                          <button
                            className="btn btn-success btn-lg"
                            style={{ flex: 1 }}
                            onClick={() => setApprovalModal({ entry: viewModal, action: 'approve' })}
                          >
                            <FiCheckCircle /> Approve Entry
                          </button>
                          <button
                            className="btn btn-danger btn-lg"
                            style={{ flex: 1 }}
                            disabled={!approvalRemarks.trim()}
                            onClick={() => setApprovalModal({ entry: viewModal, action: 'reject' })}
                          >
                            <FiXCircle /> Reject Entry
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            <div className="modal-footer">
              {viewModal.status === 'draft' && (
                <Link to={`/logbook/ahp/dry/${viewModal.id}/edit`} className="btn btn-outline">
                  <FiEdit2 /> Edit Entry
                </Link>
              )}
              <button className="btn btn-ghost" onClick={() => setViewModal(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Approval Confirm Modal */}
      {approvalModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setApprovalModal(null)}>
          <div className="modal modal-sm">
            <div className="modal-header">
              <span className="modal-title">
                {approvalModal.action === 'approve' ? '✅ Confirm Approval' : '❌ Confirm Rejection'}
              </span>
              <button className="modal-close" onClick={() => setApprovalModal(null)}>✕</button>
            </div>
            <div className="modal-body">
              <p style={{ marginBottom: 16 }}>
                {approvalModal.action === 'approve'
                  ? `Approve the logbook entry for ${approvalModal.entry.date} (${approvalModal.entry.shift_display || approvalModal.entry.shift})?`
                  : `Reject the logbook entry for ${approvalModal.entry.date}?`}
              </p>
              <div className="form-group">
                <label className="form-label">
                  Remarks {approvalModal.action === 'reject' && <span className="required">*</span>}
                </label>
                <textarea
                  className="form-control"
                  rows={3}
                  placeholder={approvalModal.action === 'approve' ? 'Optional remarks…' : 'Reason for rejection…'}
                  value={approvalRemarks}
                  onChange={e => setApprovalRemarks(e.target.value)}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setApprovalModal(null)}>Cancel</button>
              <button
                className={`btn ${approvalModal.action === 'approve' ? 'btn-success' : 'btn-danger'}`}
                onClick={handleApprove}
                disabled={submitting || (approvalModal.action === 'reject' && !approvalRemarks.trim())}
              >
                {submitting ? <span className="spinner" /> : null}
                {approvalModal.action === 'approve' ? 'Approve Entry' : 'Reject Entry'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Import Modal ──────────────────────────────────────────────── */}
      {importModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setImportModal(false)}>
          <div className="modal modal-lg">
            <div className="modal-header" style={{ background: 'linear-gradient(to right, #0D3B6E, #1A5B9E)', borderRadius: '16px 16px 0 0', padding: '16px 24px' }}>
              <span className="modal-title" style={{ color: 'white' }}>
                <FiUpload /> Import Dry System Entries
              </span>
              <button className="modal-close" onClick={() => setImportModal(false)} style={{ color: 'white', fontSize: '1.4rem' }}><FiX /></button>
            </div>
            <div className="modal-body" style={{ padding: '24px' }}>
              {/* Instructions */}
              <div style={{ background: '#EAF0FA', border: '1px solid #BDD0F0', borderRadius: '8px', padding: '14px 18px', marginBottom: '20px', fontSize: '0.875rem' }}>
                <strong>📌 Import Instructions:</strong>
                <ul style={{ margin: '8px 0 0 16px', lineHeight: 1.7 }}>
                  <li>Upload an <strong>.xlsx</strong> or <strong>.csv</strong> file with entries</li>
                  <li>Date format: <code>YYYY-MM-DD</code> &nbsp;|&nbsp; Shift: <code>A</code>, <code>B</code>, <code>C</code>, or <code>G</code></li>
                  <li>All imported entries are saved as <strong>Draft</strong> — submit them manually after review</li>
                </ul>
              </div>

              {/* Template download */}
              <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', alignItems: 'center' }}>
                <span style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>Don't have a template?</span>
                <button className="btn btn-outline btn-sm" onClick={downloadDryTemplate}>
                  <FiDownload /> Download Template (.xlsx)
                </button>
              </div>

              {/* File picker */}
              <div
                style={{ border: '2px dashed var(--color-border-light)', borderRadius: '10px', padding: '32px', textAlign: 'center', cursor: 'pointer', background: importFile ? '#F0FAF0' : '#FAFBFD', transition: 'all 0.2s' }}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  style={{ display: 'none' }}
                  onChange={handleFileChange}
                />
                {importFile ? (
                  <div>
                    <div style={{ fontSize: '2rem', marginBottom: '8px' }}>✅</div>
                    <div style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{importFile.name}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                      {importSheets?.sheetNames?.length || 0} sheets loaded
                    </div>
                    <button className="btn btn-ghost btn-sm" style={{ marginTop: '8px' }} onClick={e => { e.stopPropagation(); setImportFile(null); setImportSheets(null) }}>Remove file</button>
                  </div>
                ) : (
                  <div>
                    <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>📂</div>
                    <div style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>Click to choose file</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>Supports .xlsx, .xls</div>
                  </div>
                )}
              </div>

              {/* Sheet summary preview */}
              {importSheets && (
                <div style={{ marginTop: '20px' }}>
                  <div style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: '10px' }}>📋 Sheets found in file:</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '8px' }}>
                    {importSheets.sheetNames.map(name => {
                      const rows = (importSheets.sheets[name]?.length || 1) - 2  // minus title+header rows
                      const icons = { 'Shift Info': '📄', 'U1 ESP Deashing': '🔧', 'U2 ESP Deashing': '🔧', 'Equipment Status': '⚙️' }
                      return (
                        <div key={name} style={{ background: '#F0F4FA', borderRadius: '8px', padding: '10px 12px', border: '1px solid var(--color-border-light)' }}>
                          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-primary)' }}>{icons[name] || '📊'} {name}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>{Math.max(0, rows)} data rows</div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setImportModal(false)}>Cancel</button>
              <button
                className="btn btn-primary"
                disabled={!importSheets || importLoading}
                onClick={handleImportSubmit}
              >
                {importLoading ? <span className="spinner" /> : <FiUpload />}
                {importLoading ? 'Importing…' : 'Import Entry'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function StatusBadge({ status, label }) {
  const cls = { draft: 'badge-draft', submitted: 'badge-submitted', approved: 'badge-approved', rejected: 'badge-rejected' }
  return <span className={`badge ${cls[status] || 'badge-draft'}`}>{label}</span>
}

function InfoRow({ label, value, fullWidth }) {
  return (
    <div style={{ gridColumn: fullWidth ? '1 / -1' : undefined }}>
      <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--color-text-muted)', fontWeight: 600, marginBottom: '3px' }}>{label}</div>
      <div style={{ fontSize: '0.9rem', color: 'var(--color-text-primary)', fontWeight: 500, whiteSpace: 'pre-line', wordBreak: 'break-word' }}>{value}</div>
    </div>
  )
}

const dropdownStyle = {
  position: 'absolute', top: '100%', right: 0, zIndex: 200,
  background: 'white', border: '1px solid var(--color-border-light)',
  borderRadius: '10px', boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
  minWidth: '200px', overflow: 'hidden', marginTop: '4px',
}
const dropItemStyle = {
  display: 'block', width: '100%', padding: '10px 16px', textAlign: 'left',
  background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.875rem',
  color: 'var(--color-text-primary)', fontFamily: 'inherit',
  transition: 'background 0.15s',
}

const styles = {
  docStrip: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '8px 16px', background: '#EAF0FA',
    borderRadius: '8px', marginBottom: '12px',
    fontSize: '0.8125rem', color: 'var(--color-text-secondary)',
    border: '1px solid var(--color-border-light)',
  },
  pagination: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    gap: '16px', marginTop: '16px', paddingTop: '16px',
    borderTop: '1px solid var(--color-border-light)',
  },
  sectionTitle: {
    fontFamily: 'var(--font-heading)',
    fontSize: '0.875rem',
    fontWeight: 700,
    color: 'white',
    background: 'var(--color-primary)',
    padding: '8px 14px',
    borderRadius: '6px',
    marginBottom: '12px',
    marginTop: '16px',
    letterSpacing: '0.3px',
  },
  infoGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '12px 24px',
    background: '#F7F9FC',
    border: '1px solid var(--color-border-light)',
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '8px',
  },
  infoChip: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '0.8375rem',
    color: 'rgba(255,255,255,0.9)',
  },
  approvalSection: {
    marginTop: '20px',
    padding: '20px',
    background: 'linear-gradient(135deg, #FEF9EC, #FFFDF5)',
    border: '2px solid var(--color-accent)',
    borderRadius: '10px',
  },
  approvalSectionTitle: {
    fontSize: '1rem',
    fontWeight: 700,
    fontFamily: 'var(--font-heading)',
    color: 'var(--color-primary)',
    marginBottom: '10px',
  },
}
