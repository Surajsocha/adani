import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { useForm } from 'react-hook-form'
import { FiRepeat, FiPlus, FiCheck, FiArrowLeft } from 'react-icons/fi'
import api from '../../api/axios'
import toast from 'react-hot-toast'

const SHIFTS = [
  { v: 'A', l: 'A Shift (06:00–14:00)' },
  { v: 'B', l: 'B Shift (14:00–22:00)' },
  { v: 'C', l: 'C Shift (22:00–06:00)' },
  { v: 'G', l: 'General Shift' },
]

export default function ShiftHandoverPage() {
  const navigate = useNavigate()
  const { user } = useSelector(s => s.auth)
  const [handovers, setHandovers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
      outgoing_shift: 'A',
      incoming_shift: 'B',
      summary: '',
      pending_items: '',
      critical_observations: '',
      equipment_issues: '',
      safety_concerns: '',
      handover_notes: '',
    }
  })

  useEffect(() => { fetchHandovers() }, [])

  const fetchHandovers = async () => {
    setLoading(true)
    try {
      const res = await api.get('/logbook/ahp/handover/')
      setHandovers(res.data.results || res.data || [])
    } catch { toast.error('Failed to load handovers') }
    setLoading(false)
  }

  const onSave = async (data) => {
    setSaving(true)
    try {
      await api.post('/logbook/ahp/handover/', data)
      toast.success('Shift handover created')
      setShowForm(false)
      reset()
      fetchHandovers()
    } catch (err) {
      const msg = err.response?.data
      toast.error(typeof msg === 'string' ? msg : JSON.stringify(msg) || 'Failed to save')
    }
    setSaving(false)
  }

  const acknowledge = async (id) => {
    try {
      await api.post(`/logbook/ahp/handover/${id}/acknowledge/`)
      toast.success('Handover acknowledged')
      fetchHandovers()
    } catch { toast.error('Failed to acknowledge') }
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <div className="page-breadcrumb">Home › Shift Handover</div>
          <h1 className="page-title"><FiRepeat /> Shift Handover</h1>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
            <FiPlus /> New Handover
          </button>
        </div>
      </div>

      {/* Handover Form */}
      {showForm && (
        <div className="card" style={{ marginBottom: '16px' }}>
          <div className="card-header"><span className="card-title">Create Shift Handover</span></div>
          <div className="card-body">
            <form onSubmit={handleSubmit(onSave)}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Date *</label>
                  <input type="date" className="form-control font-mono" {...register('date', { required: true })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Outgoing Shift *</label>
                  <select className="form-control" {...register('outgoing_shift', { required: true })}>
                    {SHIFTS.map(s => <option key={s.v} value={s.v}>{s.l}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Incoming Shift *</label>
                  <select className="form-control" {...register('incoming_shift', { required: true })}>
                    {SHIFTS.map(s => <option key={s.v} value={s.v}>{s.l}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Shift Summary *</label>
                <textarea className="form-control" {...register('summary', { required: true })} rows={4}
                  placeholder="Summary of activities during this shift…" />
                {errors.summary && <span className="form-error">Required</span>}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Pending Items</label>
                  <textarea className="form-control" {...register('pending_items')} rows={3}
                    placeholder="Items pending for the next shift…" />
                </div>
                <div className="form-group">
                  <label className="form-label">Critical Observations</label>
                  <textarea className="form-control" {...register('critical_observations')} rows={3}
                    placeholder="Critical observations to carry forward…" />
                </div>
                <div className="form-group">
                  <label className="form-label">Equipment Issues</label>
                  <textarea className="form-control" {...register('equipment_issues')} rows={3}
                    placeholder="Equipment issues or concerns…" />
                </div>
                <div className="form-group">
                  <label className="form-label">Safety Concerns</label>
                  <textarea className="form-control" {...register('safety_concerns')} rows={3}
                    placeholder="Safety related concerns…" />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Additional Notes</label>
                <textarea className="form-control" {...register('handover_notes')} rows={2} placeholder="Any other notes…" />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button type="button" className="btn btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? <span className="spinner" /> : <FiCheck />} Submit Handover
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Handover List */}
      <div className="card">
        <div className="table-wrapper" style={{ border: 'none', boxShadow: 'none' }}>
          {loading ? (
            <div className="loading-page"><span className="spinner spinner-dark" /></div>
          ) : handovers.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">🔄</div>
              <h3>No handovers yet</h3>
              <p>Create your first shift handover record.</p>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>From</th>
                  <th>To</th>
                  <th>Outgoing Person</th>
                  <th>Incoming Person</th>
                  <th>Acknowledged</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {handovers.map(h => (
                  <tr key={h.id}>
                    <td className="font-mono">{h.date}</td>
                    <td><span className="badge badge-draft">{h.outgoing_shift_display}</span></td>
                    <td><span className="badge badge-submitted">{h.incoming_shift_display}</span></td>
                    <td>{h.outgoing_person_name}</td>
                    <td>{h.incoming_person_name || '—'}</td>
                    <td>
                      <span className={`badge ${h.is_acknowledged ? 'badge-approved' : 'badge-rejected'}`}>
                        {h.is_acknowledged ? 'Yes' : 'Pending'}
                      </span>
                    </td>
                    <td>
                      {!h.is_acknowledged && (
                        <button className="btn btn-outline btn-sm" onClick={() => acknowledge(h.id)}>
                          <FiCheck size={12} /> Acknowledge
                        </button>
                      )}
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
