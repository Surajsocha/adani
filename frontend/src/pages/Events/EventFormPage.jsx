import React, { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { useForm } from 'react-hook-form'
import { FiSave, FiArrowLeft, FiAlertTriangle } from 'react-icons/fi'
import api from '../../api/axios'
import toast from 'react-hot-toast'

const CATEGORIES = [
  { v: 'abnormality', l: 'Plant Abnormality' },
  { v: 'unit_trip', l: 'Unit Trip' },
  { v: 'breakdown', l: 'Equipment Breakdown' },
  { v: 'safety', l: 'Safety Incident' },
  { v: 'near_miss', l: 'Near Miss' },
  { v: 'environmental', l: 'Environmental Observation' },
  { v: 'instruction', l: 'Operational Instruction' },
  { v: 'maintenance', l: 'Maintenance Activity' },
]

const SEVERITIES = [
  { v: 'low', l: 'Low' },
  { v: 'medium', l: 'Medium' },
  { v: 'high', l: 'High' },
  { v: 'critical', l: 'Critical' },
]

const UNITS = [
  { v: '1', l: 'Unit 1' },
  { v: '2', l: 'Unit 2' },
  { v: 'common', l: 'Common' },
]

const DEPARTMENTS = [
  { v: 'ahp', l: 'Ash Handling' },
  { v: 'operations', l: 'Operations' },
  { v: 'electrical', l: 'Electrical' },
  { v: 'mechanical', l: 'Mechanical' },
  { v: 'ci', l: 'C&I' },
  { v: 'chp', l: 'CHP' },
]

export default function EventFormPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEdit = !!id
  const { user } = useSelector(s => s.auth)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(isEdit)

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm({
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
      time: new Date().toTimeString().slice(0, 5),
      unit: '1',
      department: 'ahp',
      category: 'abnormality',
      severity: 'medium',
      title: '',
      description: '',
      equipment_tag: '',
      action_taken: '',
    }
  })

  useEffect(() => {
    if (isEdit) {
      api.get(`/logbook/ahp/events/${id}/`).then(res => {
        reset(res.data)
        setLoading(false)
      }).catch(() => { toast.error('Failed to load event'); navigate('/events') })
    }
  }, [id])

  const onSave = async (data) => {
    setSaving(true)
    try {
      if (isEdit) {
        await api.put(`/logbook/ahp/events/${id}/`, data)
        toast.success('Event updated')
      } else {
        await api.post('/logbook/ahp/events/', data)
        toast.success('Event recorded')
      }
      navigate('/events')
    } catch (err) {
      const msg = err.response?.data
      toast.error(typeof msg === 'string' ? msg : JSON.stringify(msg) || 'Save failed')
    }
    setSaving(false)
  }

  if (loading) return <div className="loading-page"><span className="spinner spinner-dark" /></div>

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <div className="page-breadcrumb">Events › {isEdit ? 'Edit Event' : 'New Event'}</div>
          <h1 className="page-title"><FiAlertTriangle /> {isEdit ? 'Edit Event' : 'Record New Event'}</h1>
        </div>
        <div className="page-actions">
          <button className="btn btn-ghost" onClick={() => navigate('/events')}><FiArrowLeft /> Back</button>
          <button className="btn btn-primary" onClick={handleSubmit(onSave)} disabled={saving}>
            <FiSave /> {saving ? 'Saving…' : 'Save Event'}
          </button>
        </div>
      </div>

      <form>
        <div className="card">
          <div className="card-header"><span className="card-title">Event Details</span></div>
          <div className="card-body">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">Date *</label>
                <input type="date" className="form-control font-mono" {...register('date', { required: true })} />
                {errors.date && <span className="form-error">Required</span>}
              </div>
              <div className="form-group">
                <label className="form-label">Time *</label>
                <input type="time" className="form-control font-mono" {...register('time', { required: true })} />
                {errors.time && <span className="form-error">Required</span>}
              </div>
              <div className="form-group">
                <label className="form-label">Unit *</label>
                <select className="form-control" {...register('unit', { required: true })}>
                  {UNITS.map(u => <option key={u.v} value={u.v}>{u.l}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Department *</label>
                <select className="form-control" {...register('department', { required: true })}>
                  {DEPARTMENTS.map(d => <option key={d.v} value={d.v}>{d.l}</option>)}
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">Category *</label>
                <select className="form-control" {...register('category', { required: true })}>
                  {CATEGORIES.map(c => <option key={c.v} value={c.v}>{c.l}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Severity *</label>
                <select className="form-control" {...register('severity', { required: true })}>
                  {SEVERITIES.map(s => <option key={s.v} value={s.v}>{s.l}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Equipment Tag</label>
                <input type="text" className="form-control font-mono" {...register('equipment_tag')} placeholder="e.g. COMP-1, ESP-AB-1" />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Event Title *</label>
              <input type="text" className="form-control" {...register('title', { required: true })} placeholder="Brief title of the event" />
              {errors.title && <span className="form-error">Required</span>}
            </div>

            <div className="form-group">
              <label className="form-label">Description *</label>
              <textarea className="form-control" {...register('description', { required: true })} rows={5} placeholder="Detailed description of what happened…" />
              {errors.description && <span className="form-error">Required</span>}
            </div>

            <div className="form-group">
              <label className="form-label">Action Taken</label>
              <textarea className="form-control" {...register('action_taken')} rows={3} placeholder="Actions taken to resolve or mitigate the event…" />
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px' }}>
          <button type="button" className="btn btn-ghost" onClick={() => navigate('/events')}>Cancel</button>
          <button type="button" className="btn btn-primary btn-lg" onClick={handleSubmit(onSave)} disabled={saving}>
            {saving ? <span className="spinner" /> : <FiSave />} {isEdit ? 'Update Event' : 'Record Event'}
          </button>
        </div>
      </form>
    </div>
  )
}
