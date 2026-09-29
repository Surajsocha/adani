import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { FiPlus, FiSearch, FiEye, FiEdit2, FiCheckCircle, FiXCircle, FiDroplet, FiX, FiClock, FiCalendar, FiUser, FiFileText, FiDownload, FiUpload, FiChevronDown } from 'react-icons/fi'
import api from '../../api/axios'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import { exportWetEntries, parseImportFile, mapWetSheets, downloadWetTemplate } from '../../utils/exportImport'

export default function AHPWetListPage() {
  const navigate = useNavigate()
  const { user } = useSelector(s => s.auth)
  const [entries, setEntries]   = useState([])
  const [loading, setLoading]   = useState(true)
  const [total, setTotal]       = useState(0)
  const [page, setPage]         = useState(1)
  const [filters, setFilters]   = useState({ date: '', shift: '', status: '', search: '' })
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
      const res = await api.get(`/logbook/ahp/wet/?${params}`)
      setEntries(res.data.results || [])
      setTotal(res.data.count || 0)
    } catch { toast.error('Failed to load entries') }
    setLoading(false)
  }, [page, filters])

  useEffect(() => { fetchEntries() }, [fetchEntries])

  const handleSubmitEntry = async (id) => {
    try {
      await api.post(`/logbook/ahp/wet/${id}/submit/`)
      toast.success('Entry submitted for approval')
      fetchEntries()
    } catch (err) { toast.error(err.response?.data?.error || 'Submit failed') }
  }

  const handleApprove = async () => {
    setSubmitting(true)
    try {
      await api.post(`/logbook/ahp/wet/${approvalModal.entry.id}/${approvalModal.action}/`, { remarks: approvalRemarks })
      toast.success(`Entry ${approvalModal.action}d successfully`)
      setApprovalModal(null)
      if (viewModal) {
        const res = await api.get(`/logbook/ahp/wet/${viewModal.id}/`)
        setViewModal(res.data)
      }
      fetchEntries()
    } catch (err) { toast.error(err.response?.data?.error || 'Action failed') }
    setSubmitting(false)
  }

  const handleViewEntry = async (entry) => {
    setViewLoading(true)
    setViewModal(entry)
    try {
      const res = await api.get(`/logbook/ahp/wet/${entry.id}/`)
      setViewModal(res.data)
    } catch {
      toast.error('Failed to load entry details')
    }
    setViewLoading(false)
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)
  const canApproveReject = ['superadmin','dept_admin','supervisor'].includes(user?.role)

  // ── Export ───────────────────────────────────────────────────────────────
  const handleExport = (fmt) => {
    if (!entries.length) { toast.error('No entries to export'); return }
    exportWetEntries(entries, fmt)
    setExportOpen(false)
    toast.success(`Exported ${entries.length} entries as ${fmt.toUpperCase()}`)
  }

  // ── Import ────────────────────────────────────────────────────────────────
  const handleFileChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImportFile(file)
    try {
      const parsed = await parseImportFile(file)
      setImportSheets(parsed)
      toast.success(`File loaded: ${parsed.sheetNames.length} sheets detected`)
    } catch (err) { toast.error(err.message); setImportSheets(null) }
  }

  const handleImportSubmit = async () => {
    if (!importSheets) { toast.error('No file loaded'); return }
    setImportLoading(true)
    try {
      const { formData, esp_wet_deashing, esp_field_availability, pump_status } = mapWetSheets(importSheets.sheets)
      await api.post('/logbook/ahp/wet/', { ...formData, esp_wet_deashing, esp_field_availability, pump_status })
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
      <div className="page-header">
        <div className="page-header-left">
          <div className="page-breadcrumb">AHP › Wet System</div>
          <h1 className="page-title"><FiDroplet /> Wet System Logbook</h1>
        </div>
        <div className="page-actions">
          <button className="btn btn-outline" onClick={() => { setImportModal(true); setImportRows([]); setImportFile(null) }}>
            <FiUpload /> Import
          </button>
          <div style={{ position: 'relative' }}>
            <button className="btn btn-outline" onClick={() => setExportOpen(v => !v)}>
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
          <Link to="/logbook/ahp/wet/new" className="btn btn-primary"><FiPlus /> New Entry</Link>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 16px', background: '#EAF0FA', borderRadius: '8px', marginBottom: '12px', fontSize: '0.8125rem', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border-light)' }}>
        <span>Document No: <strong>ADTPS/AHP/OPN/F/02</strong></span>
        <span>Adani Power Limited – Dahanu Thermal Power Station (2×250 MW)</span>
        <span>Total: <strong>{total}</strong> entries</span>
      </div>

      <div className="filter-bar">
        <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
          <FiSearch style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#A0AEC0' }} />
          <input type="text" placeholder="Search entries..." value={filters.search} onChange={e => setFilters(f => ({ ...f, search: e.target.value }))} style={{ paddingLeft: '34px', width: '100%' }} />
        </div>
        <input type="date" value={filters.date} onChange={e => setFilters(f => ({ ...f, date: e.target.value }))} />
        <select value={filters.shift} onChange={e => setFilters(f => ({ ...f, shift: e.target.value }))}>
          <option value="">All Shifts</option>
          <option value="A">A Shift</option><option value="B">B Shift</option>
          <option value="C">C Shift</option><option value="G">General</option>
        </select>
        <select value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}>
          <option value="">All Status</option>
          <option value="draft">Draft</option><option value="submitted">Submitted</option>
          <option value="approved">Approved</option><option value="rejected">Rejected</option>
        </select>
        <button className="btn btn-outline btn-sm" onClick={() => setFilters({ date: '', shift: '', status: '', search: '' })}>Clear</button>
      </div>

      <div className="table-wrapper">
        {loading ? (
          <div className="loading-page"><span className="spinner spinner-dark" /><span>Loading…</span></div>
        ) : !entries.length ? (
          <div className="empty-state">
            <div className="empty-state-icon">💧</div>
            <h3>No wet system entries found</h3>
            <Link to="/logbook/ahp/wet/new" className="btn btn-primary" style={{ marginTop: 16 }}><FiPlus /> New Entry</Link>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>#</th><th>Date</th><th>Shift</th><th>U1 Load (MW)</th>
                <th>Status</th><th>Prepared By</th><th>Approved By</th><th>Created At</th>
                <th style={{ textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry, i) => (
                <tr key={entry.id}>
                  <td className="font-mono text-muted">{(page-1)*PAGE_SIZE+i+1}</td>
                  <td className="font-mono" style={{ fontWeight: 600 }}>{entry.date}</td>
                  <td><span className="badge badge-submitted">{entry.shift_display}</span></td>
                  <td className="font-mono">{entry.unit1_load || '—'}</td>
                  <td><StatusBadge status={entry.status} label={entry.status_display} /></td>
                  <td>{entry.prepared_by_name}</td>
                  <td>{entry.approved_by_name || '—'}</td>
                  <td className="font-mono text-muted" style={{ fontSize: '0.8rem' }}>{format(new Date(entry.created_at), 'dd/MM/yy HH:mm')}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                      <button className="btn btn-ghost btn-sm btn-icon" title="View Details" onClick={() => handleViewEntry(entry)}>
                        <FiEye size={14} />
                      </button>
                      {entry.status === 'draft' && (
                        <>
                          <Link to={`/logbook/ahp/wet/${entry.id}/edit`} className="btn btn-ghost btn-sm btn-icon"><FiEdit2 size={14} /></Link>
                          <button className="btn btn-outline btn-sm" onClick={() => handleSubmitEntry(entry.id)}>Submit</button>
                        </>
                      )}
                      {entry.status === 'submitted' && canApproveReject && (
                        <>
                          <button className="btn btn-success btn-sm btn-icon" title="Approve" onClick={() => { setApprovalModal({ entry, action: 'approve' }); setApprovalRemarks('') }}><FiCheckCircle size={14} /></button>
                          <button className="btn btn-danger btn-sm btn-icon" title="Reject" onClick={() => { setApprovalModal({ entry, action: 'reject' }); setApprovalRemarks('') }}><FiXCircle size={14} /></button>
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

      {totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--color-border-light)' }}>
          <button className="btn btn-outline btn-sm" disabled={page===1} onClick={() => setPage(p=>p-1)}>← Previous</button>
          <span style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>Page {page} of {totalPages}</span>
          <button className="btn btn-outline btn-sm" disabled={page===totalPages} onClick={() => setPage(p=>p+1)}>Next →</button>
        </div>
      )}

      {/* ── View Details Modal ─────────────────────────────────────── */}
      {viewModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setViewModal(null)}>
          <div className="modal modal-xl" style={{ maxHeight: '92vh' }}>
            <div className="modal-header" style={{ background: 'linear-gradient(to right, #0D3B6E, #1A5B9E)', borderRadius: '16px 16px 0 0', padding: '16px 24px' }}>
              <span className="modal-title" style={{ color: 'white', fontSize: '1.1rem' }}>
                <FiFileText /> AHP Wet System – Entry Details
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
                    <div style={styles.infoChip}><FiCalendar size={13} /><span>Date: <strong>{viewModal.date}</strong></span></div>
                    <div style={styles.infoChip}><FiClock size={13} /><span>Shift: <strong>{viewModal.shift_display || viewModal.shift}</strong></span></div>
                    <div style={styles.infoChip}><FiUser size={13} /><span>Prepared By: <strong>{viewModal.prepared_by_name || '—'}</strong></span></div>
                    <div style={{ marginLeft: 'auto' }}>
                      <StatusBadge status={viewModal.status} label={viewModal.status_display || viewModal.status} />
                    </div>
                  </div>

                  <div style={{ padding: '20px 24px' }}>
                    {/* Unit Load & Coal Flow */}
                    <div style={styles.sectionTitle}>🏭 Unit Load & Coal Flow</div>
                    <div style={styles.infoGrid}>
                      <InfoRow label="Unit-1 Load (MW)" value={viewModal.unit1_load ?? '—'} />
                      <InfoRow label="Unit-1 Coal Flow (T/hr)" value={viewModal.unit1_coal_flow ?? '—'} />
                      <InfoRow label="Unit-2 Load (MW)" value={viewModal.unit2_load ?? '—'} />
                      <InfoRow label="Unit-2 Coal Flow (T/hr)" value={viewModal.unit2_coal_flow ?? '—'} />
                    </div>

                    {/* ESP Status */}
                    <div style={styles.sectionTitle}>⚡ ESP Status – Unit 1</div>
                    <div style={styles.infoGrid}>
                      <InfoRow label="Fields Discharged" value={viewModal.u1_esp_fields_discharged || '—'} />
                      <InfoRow label="Hopper Level High" value={viewModal.u1_esp_hopper_level_hi || '—'} />
                      <InfoRow label="CERM Available" value={viewModal.u1_esp_cerm_avail || '—'} />
                      <InfoRow label="EERM Available" value={viewModal.u1_esp_eerm_avail || '—'} />
                    </div>

                    <div style={styles.sectionTitle}>⚡ ESP Status – Unit 2</div>
                    <div style={styles.infoGrid}>
                      <InfoRow label="Fields Discharged" value={viewModal.u2_esp_fields_discharged || '—'} />
                      <InfoRow label="Hopper Level High" value={viewModal.u2_esp_hopper_level_hi || '—'} />
                      <InfoRow label="CERM Available" value={viewModal.u2_esp_cerm_avail || '—'} />
                      <InfoRow label="EERM Available" value={viewModal.u2_esp_eerm_avail || '—'} />
                    </div>

                    {/* Power Consumption */}
                    <div style={styles.sectionTitle}>⚡ Transformer Power Consumption (500 KVA)</div>
                    <div style={styles.infoGrid}>
                      <InfoRow label="Incomer OSA Initial" value={viewModal.incomer_osa_initial ?? '—'} />
                      <InfoRow label="Incomer OSA Final" value={viewModal.incomer_osa_final ?? '—'} />
                      <InfoRow label="Incomer OSC Initial" value={viewModal.incomer_osc_initial ?? '—'} />
                      <InfoRow label="Incomer OSC Final" value={viewModal.incomer_osc_final ?? '—'} />
                      <InfoRow label="AHP Lighting Initial" value={viewModal.ahp_lighting_initial ?? '—'} />
                      <InfoRow label="AHP Lighting Final" value={viewModal.ahp_lighting_final ?? '—'} />
                      <InfoRow label="Grand Total (kWh)" value={viewModal.grand_total_kwh ?? '—'} />
                    </div>

                    {/* Bottom Ash Hopper */}
                    <div style={styles.sectionTitle}>🔧 Bottom Ash Hopper De-ashing</div>
                    <div style={styles.infoGrid}>
                      <InfoRow label="U1 BA Start" value={viewModal.u1_ba_start || '—'} />
                      <InfoRow label="U1 BA Stop" value={viewModal.u1_ba_stop || '—'} />
                      <InfoRow label="U1 BA Total Time (hrs)" value={viewModal.u1_ba_total_time ?? '—'} />
                      <InfoRow label="U2 BA Start" value={viewModal.u2_ba_start || '—'} />
                      <InfoRow label="U2 BA Stop" value={viewModal.u2_ba_stop || '—'} />
                      <InfoRow label="U2 BA Total Time (hrs)" value={viewModal.u2_ba_total_time ?? '—'} />
                    </div>

                    {/* ESP Wet Deashing Table */}
                    {viewModal.esp_wet_deashing && viewModal.esp_wet_deashing.length > 0 && (
                      <>
                        <div style={styles.sectionTitle}>🔧 ESP/APH/ECO/Duct Wet De-ashing Cycles</div>
                        <div style={{ overflowX: 'auto', marginBottom: '16px' }}>
                          <table className="data-table" style={{ minWidth: '600px' }}>
                            <thead>
                              <tr>
                                <th>Unit</th><th>Component</th><th>Cycle</th>
                                <th>Start Time</th><th>Stop Time</th><th>Total Time (hrs)</th>
                              </tr>
                            </thead>
                            <tbody>
                              {viewModal.esp_wet_deashing.filter(e => e.start_time || e.stop_time).map((e, i) => (
                                <tr key={i}>
                                  <td>Unit {e.unit}</td>
                                  <td><strong>{e.component}</strong></td>
                                  <td>{e.cycle}</td>
                                  <td className="font-mono">{e.start_time || '—'}</td>
                                  <td className="font-mono">{e.stop_time || '—'}</td>
                                  <td className="font-mono" style={{ fontWeight: 600 }}>{e.total_time ?? '—'}</td>
                                </tr>
                              ))}
                              {viewModal.esp_wet_deashing.filter(e => e.start_time || e.stop_time).length === 0 && (
                                <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>No deashing data entered</td></tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </>
                    )}

                    {/* Pump Status Table */}
                    {viewModal.pump_status && viewModal.pump_status.length > 0 && (
                      <>
                        <div style={styles.sectionTitle}>⚙️ HT Pump Running Status</div>
                        <div style={{ overflowX: 'auto', marginBottom: '16px' }}>
                          <table className="data-table" style={{ minWidth: '600px' }}>
                            <thead>
                              <tr>
                                <th>Pump</th><th>Cycle</th><th>Start Time</th>
                                <th>Stop Time</th><th>Running Hrs</th><th>Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {viewModal.pump_status.filter(e => e.start_time || e.stop_time || e.avail_status).map((e, i) => (
                                <tr key={i}>
                                  <td><strong>{e.pump}</strong></td>
                                  <td>{e.cycle}</td>
                                  <td className="font-mono">{e.start_time || '—'}</td>
                                  <td className="font-mono">{e.stop_time || '—'}</td>
                                  <td className="font-mono" style={{ fontWeight: 600 }}>{e.running_hrs ?? '—'}</td>
                                  <td>
                                    <span style={{ padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 700,
                                      background: e.avail_status === 'R' ? '#D1FAE5' : e.avail_status === 'B' ? '#FEE2E2' : e.avail_status === 'P' ? '#FEF3C7' : '#F3F4F6',
                                      color: e.avail_status === 'R' ? '#065F46' : e.avail_status === 'B' ? '#991B1B' : e.avail_status === 'P' ? '#92400E' : '#374151'
                                    }}>{e.avail_status || '—'}</span>
                                  </td>
                                </tr>
                              ))}
                              {viewModal.pump_status.filter(e => e.start_time || e.stop_time || e.avail_status).length === 0 && (
                                <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>No pump data entered</td></tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </>
                    )}

                    {/* Events & Remarks */}
                    {(viewModal.events_remarks || viewModal.observations || viewModal.follow_up || viewModal.protection_bypassed) && (
                      <>
                        <div style={styles.sectionTitle}>📝 Events, Observations & Remarks</div>
                        <div style={styles.infoGrid}>
                          {viewModal.events_remarks && <InfoRow label="Events / Remarks" value={viewModal.events_remarks} fullWidth />}
                          {viewModal.observations && <InfoRow label="Observations" value={viewModal.observations} fullWidth />}
                          {viewModal.follow_up && <InfoRow label="Follow Up Actions" value={viewModal.follow_up} fullWidth />}
                          {viewModal.protection_bypassed && <InfoRow label="Protection Bypassed" value={viewModal.protection_bypassed} fullWidth />}
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
                <Link to={`/logbook/ahp/wet/${viewModal.id}/edit`} className="btn btn-outline">
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
        <div className="modal-overlay" onClick={e => e.target===e.currentTarget && setApprovalModal(null)}>
          <div className="modal modal-sm">
            <div className="modal-header">
              <span className="modal-title">{approvalModal.action==='approve'?'✅ Confirm Approval':'❌ Confirm Rejection'}</span>
              <button className="modal-close" onClick={() => setApprovalModal(null)}>✕</button>
            </div>
            <div className="modal-body">
              <p style={{ marginBottom: 16 }}>
                {approvalModal.action === 'approve'
                  ? `Approve entry for ${approvalModal.entry.date} (${approvalModal.entry.shift_display || approvalModal.entry.shift})?`
                  : `Reject entry for ${approvalModal.entry.date}?`}
              </p>
              <div className="form-group">
                <label className="form-label">Remarks {approvalModal.action==='reject' && <span className="required">*</span>}</label>
                <textarea className="form-control" rows={3} placeholder="Enter remarks…" value={approvalRemarks} onChange={e => setApprovalRemarks(e.target.value)} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setApprovalModal(null)}>Cancel</button>
              <button className={`btn ${approvalModal.action==='approve'?'btn-success':'btn-danger'}`} onClick={handleApprove} disabled={submitting||(approvalModal.action==='reject'&&!approvalRemarks.trim())}>
                {submitting?<span className="spinner"/>:null} {approvalModal.action==='approve'?'Approve':'Reject'}
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
              <span className="modal-title" style={{ color: 'white' }}><FiUpload /> Import Wet System Entries</span>
              <button className="modal-close" onClick={() => setImportModal(false)} style={{ color: 'white', fontSize: '1.4rem' }}><FiX /></button>
            </div>
            <div className="modal-body" style={{ padding: '24px' }}>
              <div style={{ background: '#EAF0FA', border: '1px solid #BDD0F0', borderRadius: '8px', padding: '14px 18px', marginBottom: '20px', fontSize: '0.875rem' }}>
                <strong>📌 Import Instructions:</strong>
                <ul style={{ margin: '8px 0 0 16px', lineHeight: 1.7 }}>
                  <li>Upload an <strong>.xlsx</strong> or <strong>.csv</strong> file</li>
                  <li>Date format: <code>YYYY-MM-DD</code> &nbsp;|&nbsp; Shift: <code>A</code>, <code>B</code>, <code>C</code>, or <code>G</code></li>
                  <li>All imported entries are saved as <strong>Draft</strong></li>
                </ul>
              </div>
              <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', alignItems: 'center' }}>
                <span style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>Need a template?</span>
                <button className="btn btn-outline btn-sm" onClick={downloadWetTemplate}><FiDownload /> Download Template (.xlsx)</button>
              </div>
              <div
                style={{ border: '2px dashed var(--color-border-light)', borderRadius: '10px', padding: '32px', textAlign: 'center', cursor: 'pointer', background: importFile ? '#F0FAF0' : '#FAFBFD' }}
                onClick={() => fileInputRef.current?.click()}
              >
                <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" style={{ display: 'none' }} onChange={handleFileChange} />
                {importFile ? (
                  <div>
                    <div style={{ fontSize: '2rem', marginBottom: '8px' }}>✅</div>
                    <div style={{ fontWeight: 600 }}>{importFile.name}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>{importSheets?.sheetNames?.length || 0} sheets loaded</div>
                    <button className="btn btn-ghost btn-sm" style={{ marginTop: '8px' }} onClick={e => { e.stopPropagation(); setImportFile(null); setImportSheets(null) }}>Remove file</button>
                  </div>
                ) : (
                  <div>
                    <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>📂</div>
                    <div style={{ fontWeight: 600 }}>Click to choose file</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>Supports .xlsx, .xls</div>
                  </div>
                )}
              </div>
              {importSheets && (
                <div style={{ marginTop: '20px' }}>
                  <div style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: '10px' }}>📋 Sheets found in file:</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '8px' }}>
                    {importSheets.sheetNames.map(name => {
                      const rows = (importSheets.sheets[name]?.length || 1) - 2
                      const icons = { 'Shift Info': '📄', 'U1 ESP Wet Deashing': '💧', 'U2 ESP Wet Deashing': '💧', 'ECO APH Deashing': '🔄', 'Field Availability': '📊', 'HT Pumps': '⚙️', 'LT Pumps': '⚙️' }
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
              <button className="btn btn-primary" disabled={!importSheets || importLoading} onClick={handleImportSubmit}>
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
  return <span className={`badge ${cls[status]||'badge-draft'}`}>{label}</span>
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
