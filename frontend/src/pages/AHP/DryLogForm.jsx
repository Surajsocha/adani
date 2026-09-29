import React, { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { useForm } from 'react-hook-form'
import { FiSave, FiSend, FiArrowLeft, FiArrowRight, FiWifiOff } from 'react-icons/fi'
import api from '../../api/axios'
import toast from 'react-hot-toast'
import FormStepper from '../../components/FormStepper'
import { calcHours, calcDiff, sumHours } from '../../utils/time'
import useDraftAutosave, { loadDraft } from '../../utils/useDraftAutosave'

const SHIFTS = [{ v: 'A', l: 'A Shift (06:00–14:00)' }, { v: 'B', l: 'B Shift (14:00–22:00)' }, { v: 'C', l: 'C Shift (22:00–06:00)' }, { v: 'G', l: 'General Shift' }]

const ESP_PASSES = ['AB-1', 'CD-1', 'AB-2', 'CD-2', 'AB-3', 'CD-3', 'AB-4', 'CD-4', 'AB-5', 'CD-5', 'AB-6', 'CD-6']
const UNITS = ['1', '2']

const DRY_EQUIPMENTS_1 = ['COMP-1', 'COMP-2', 'COMP-3', 'COMP-4']
const DRY_EQUIPMENTS_2 = ['CT-FAN', 'CT-PUMP-A', 'CT-PUMP-B', 'CLASS-A', 'CLASS-B']

const STEPS = [
  { label: 'Cycle Logs' },
  { label: 'Power & Remarks' },
]

function buildDefaultESP() {
  const data = []
  for (const unit of UNITS)
    for (const esp_pass of ESP_PASSES)
      for (const cycle of [1, 2, 3])
        data.push({ unit, esp_pass, cycle, start_time: '', stop_time: '', total_time: '' })
  return data
}

function buildDefaultEquip() {
  const data = []
  for (const eq of [...DRY_EQUIPMENTS_1, ...DRY_EQUIPMENTS_2])
    for (const cycle of [1, 2, 3])
      data.push({ equipment: eq, cycle, start_time: '', stop_time: '', running_hrs: '', availability_status: '' })
  return data
}

const DEFAULT_VALUES = {
  date: new Date().toISOString().split('T')[0],
  shift: 'A',
  document_no: 'ADTPS/AHP/OPN/F/01',
  observations: '',
  remarks: '',
  operator_signature: '',
  ic1_initial: '', ic1_final: '',
  ic2_initial: '', ic2_final: '',
  fine_ash_silo_level: '',
  coarse_ash_silo_level: '',
  mt300_ash_silo_level: '',
  fly_ash_quantity: '',
}

export default function DryLogForm() {
  const navigate = useNavigate()
  const { id }   = useParams()
  const isEdit   = !!id
  const { user } = useSelector(s => s.auth)

  // A brand-new entry and "editing entry #7" each get their own local draft slot.
  const draftKey = isEdit ? `ahp_dry_draft_${id}` : 'ahp_dry_draft_new'

  const [saving, setSaving]     = useState(false)
  const [loading, setLoading]   = useState(isEdit)
  const [step, setStep]         = useState(0)
  const [espData, setEspData]   = useState(buildDefaultESP())
  const [equipData, setEquipData] = useState(buildDefaultEquip())
  const [restoredDraft, setRestoredDraft] = useState(false)

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm({
    defaultValues: DEFAULT_VALUES,
  })
  const formValues = watch()

  // ── Load existing entry, or a locally-saved draft, whichever applies ──────
  useEffect(() => {
    const draft = loadDraft(draftKey)
    if (draft) {
      reset({ ...DEFAULT_VALUES, ...draft.formValues })
      if (draft.espData?.length) setEspData(draft.espData)
      if (draft.equipData?.length) setEquipData(draft.equipData)
      setRestoredDraft(true)
      toast.success('Unsaved draft restored from this device', { icon: '💾' })
      setLoading(false)
      return
    }
    if (isEdit) {
      api.get(`/logbook/ahp/dry/${id}/`).then(res => {
        const d = res.data
        reset(d)
        if (d.esp_dry_deashing?.length) setEspData(d.esp_dry_deashing)
        if (d.equipment_status?.length) setEquipData(d.equipment_status)
        setLoading(false)
      }).catch(() => { toast.error('Failed to load entry'); navigate('/logbook/ahp/dry') })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  // ── Keep a local draft so the form survives a dropped network / reload ───
  const { clearDraft } = useDraftAutosave(
    draftKey,
    { formValues, espData, equipData },
    !loading
  )

  const onSave = async (formData, submit = false) => {
    setSaving(true)
    const payload = {
      ...formData,
      esp_dry_deashing: espData.map(e => ({ ...e, start_time: e.start_time || null, stop_time: e.stop_time || null, total_time: e.total_time || null })),
      equipment_status: equipData.map(e => ({ ...e, start_time: e.start_time || null, stop_time: e.stop_time || null, running_hrs: e.running_hrs || null, availability_status: e.availability_status || null })),
    }
    try {
      let entry
      if (isEdit) {
        entry = await api.put(`/logbook/ahp/dry/${id}/`, payload)
        toast.success('Entry updated')
      } else {
        entry = await api.post('/logbook/ahp/dry/', payload)
        toast.success('Entry saved as draft')
      }
      if (submit) {
        await api.post(`/logbook/ahp/dry/${entry.data.id}/submit/`)
        toast.success('Entry submitted for approval')
      }
      clearDraft() // safely on the server now — the local safety copy is no longer needed
      navigate('/logbook/ahp/dry')
    } catch (err) {
      const msg = err.response?.data
      const isNetworkError = !err.response
      if (isNetworkError) {
        toast.error("No network — your data is safely kept on this device. Try again once you're back online.", { duration: 5000 })
      } else {
        toast.error(typeof msg === 'string' ? msg : JSON.stringify(msg) || 'Save failed')
      }
    }
    setSaving(false)
  }

  const updateEsp = (idx, field, value) => {
    setEspData(prev => {
      const n = [...prev]
      const row = { ...n[idx], [field]: value }
      if (field === 'start_time' || field === 'stop_time') row.total_time = calcHours(row.start_time, row.stop_time)
      n[idx] = row
      return n
    })
  }
  const updateEquip = (idx, field, value) => {
    setEquipData(prev => {
      const n = [...prev]
      const row = { ...n[idx], [field]: value }
      if (field === 'start_time' || field === 'stop_time') row.running_hrs = calcHours(row.start_time, row.stop_time)
      n[idx] = row
      return n
    })
  }

  if (loading) return <div className="loading-page"><span className="spinner spinner-dark" /></div>

  const ic1Total = calcDiff(formValues.ic1_initial, formValues.ic1_final)
  const ic2Total = calcDiff(formValues.ic2_initial, formValues.ic2_final)

  const goNext = () => setStep(s => Math.min(s + 1, STEPS.length - 1))
  const goBack = () => setStep(s => Math.max(s - 1, 0))

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div className="page-header-left">
          <div className="page-breadcrumb">AHP › Dry System › {isEdit ? 'Edit Entry' : 'New Entry'}</div>
          <h1 className="page-title">{isEdit ? 'Edit Dry Log Entry' : 'New Dry System Entry'}</h1>
        </div>
        <div className="page-actions">
          <button className="btn btn-ghost" onClick={() => navigate('/logbook/ahp/dry')}>
            <FiArrowLeft /> Back
          </button>
          <button className="btn btn-outline" onClick={handleSubmit(d => onSave(d, false))} disabled={saving}>
            <FiSave /> {saving ? 'Saving…' : 'Save Draft'}
          </button>
          <button className="btn btn-primary" onClick={handleSubmit(d => onSave(d, true))} disabled={saving}>
            <FiSend /> Save & Submit
          </button>
        </div>
      </div>

      {restoredDraft && (
        <div className="alert alert-info" style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FiWifiOff /> Restored data you'd already filled in on this device — nothing was lost.
        </div>
      )}

      <FormStepper steps={STEPS} currentStep={step} onStepClick={setStep} />

      <form>
        {/* ── Document Header ─────────────────────────── */}
        <div className="logbook-doc-header" style={{ borderRadius: '12px 12px 0 0' }}>
          <div className="company-name">ADANI POWER LIMITED (ADTPS – 2×250 MW)</div>
          <div className="doc-title">SHIFT INCHARGE LOG BOOK – ASH HANDLING DRY SYSTEM</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
            <span className="doc-no">Document No: ADTPS/AHP/OPN/F/01</span>
          </div>
        </div>

        {/* ── Shift Info Bar ───────────────────────────── */}
        <div className="shift-info-bar" style={{ border: '1px solid var(--color-border-light)', borderTop: 'none' }}>
          <div className="shift-info-item">
            <label>Date</label>
            <input type="date" {...register('date', { required: true })} className="form-control" style={{ width: 'auto', fontFamily: 'var(--font-mono)' }} />
          </div>
          <div className="shift-info-item">
            <label>Shift</label>
            <select {...register('shift', { required: true })} className="form-control" style={{ width: 'auto' }}>
              {SHIFTS.map(s => <option key={s.v} value={s.v}>{s.l}</option>)}
            </select>
          </div>
          <div className="shift-info-item" style={{ flex: 1 }}>
            <label>Shift Incharge</label>
            <input type="text" className="form-control" {...register('_shift_incharge_name')} placeholder="Name" />
          </div>
          <div className="shift-info-item" style={{ flex: 1 }}>
            <label>Field Operator</label>
            <input type="text" className="form-control" {...register('_field_operator_name')} placeholder="Name" />
          </div>
        </div>

        <div style={{ background: 'white', border: '1px solid var(--color-border-light)', borderTop: 'none', borderRadius: '0 0 12px 12px', padding: '24px' }}>

          {step === 0 && (
            <>
              {/* ═══ Section 1: U-1 ESP DRY DEASHING ═══════════ */}
              <div className="section-header" style={{ marginTop: 0 }}>
                📋 U-1 ESP DRY DE-ASHING – Unit #1
              </div>
              <ESPDryTable unit="1" espData={espData} updateEsp={updateEsp} />

              <div className="section-header">
                📋 U-2 ESP DRY DE-ASHING – Unit #2
              </div>
              <ESPDryTable unit="2" espData={espData} updateEsp={updateEsp} />

              {/* ═══ Section 2: Silo Levels ══════════════════════ */}
              <div className="section-header">
                🏭 SILO EVACUATION & FLY ASH QUANTITY
              </div>
              <div style={{ background: '#F7F9FC', border: '1px solid var(--color-border-light)', borderRadius: '0 0 8px 8px', padding: '20px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
                  {[
                    { label: 'Fine Ash Silo Level (%)', name: 'fine_ash_silo_level' },
                    { label: 'Coarse Ash Silo Level (%)', name: 'coarse_ash_silo_level' },
                    { label: '300 MT Ash Silo Level (%)', name: 'mt300_ash_silo_level' },
                    { label: 'Fly Ash Quantity (MT)', name: 'fly_ash_quantity' },
                  ].map(f => (
                    <div className="form-group" key={f.name} style={{ marginBottom: 0 }}>
                      <label className="form-label">{f.label}</label>
                      <input type="number" step="0.01" className="form-control font-mono" {...register(f.name)} placeholder="0.00" />
                    </div>
                  ))}
                </div>
              </div>

              {/* ═══ Section 3: Equipment Status (Compressors) ══ */}
              <div className="section-header">
                ⚙️ DRY SYSTEM – EQUIPMENT RUNNING STATUS (Compressors)
              </div>
              <EquipmentTable equipments={DRY_EQUIPMENTS_1} equipData={equipData} updateEquip={updateEquip} />

              {/* ═══ Section 4: Equipment Status (CT, Classifier) */}
              <div className="section-header">
                ⚙️ DRY SYSTEM – EQUIPMENT RUNNING STATUS (CT Fan, Pumps, Classifier)
              </div>
              <EquipmentTable equipments={DRY_EQUIPMENTS_2} equipData={equipData} updateEquip={updateEquip} />

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
                <button type="button" className="btn btn-primary" onClick={goNext}>
                  Next: Power & Remarks <FiArrowRight />
                </button>
              </div>
            </>
          )}

          {step === 1 && (
            <>
              {/* ═══ Section 5: Power Consumption ════════════════ */}
              <div className="section-header" style={{ marginTop: 0 }}>
                ⚡ DRY ASH SYSTEM – POWER CONSUMPTION
              </div>
              <div style={{ background: '#F7F9FC', border: '1px solid var(--color-border-light)', borderRadius: '0 0 8px 8px', padding: '20px' }}>
                <table className="logbook-table">
                  <thead>
                    <tr>
                      <th>Sr. No.</th><th>Location</th>
                      <th>Initial Reading (A)</th><th>Final Reading (B)</th><th>Total (B-A)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>1</td><td style={{ textAlign: 'left' }}>I/C-1 (From AXC)</td>
                      <td><input type="number" step="0.01" {...register('ic1_initial')} placeholder="0.00" /></td>
                      <td><input type="number" step="0.01" {...register('ic1_final')} placeholder="0.00" /></td>
                      <td style={{ fontWeight: 600 }} title="Auto-calculated (Final − Initial)">{ic1Total || '—'}</td>
                    </tr>
                    <tr>
                      <td>2</td><td style={{ textAlign: 'left' }}>I/C-2 (From AXD)</td>
                      <td><input type="number" step="0.01" {...register('ic2_initial')} placeholder="0.00" /></td>
                      <td><input type="number" step="0.01" {...register('ic2_final')} placeholder="0.00" /></td>
                      <td style={{ fontWeight: 600 }} title="Auto-calculated (Final − Initial)">{ic2Total || '—'}</td>
                    </tr>
                  </tbody>
                </table>
                <div style={{ marginTop: '8px', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                  Legend: <strong>R</strong> – Running &nbsp;|&nbsp; <strong>A</strong> – Available &nbsp;|&nbsp; <strong>B</strong> – Breakdown &nbsp;|&nbsp; <strong>P</strong> – PTW
                </div>
              </div>

              {/* ═══ Section 6: Observations ═════════════════════ */}
              <div className="section-header">
                📝 DETAILS OF OBSERVATION / ACTION TAKEN
              </div>
              <div style={{ background: '#F7F9FC', border: '1px solid var(--color-border-light)', borderRadius: '0 0 8px 8px', padding: '20px' }}>
                <table className="logbook-table" style={{ marginBottom: '16px' }}>
                  <thead>
                    <tr>
                      <th style={{ width: '100px' }}>Time</th>
                      <th>Details of Observation / Action Taken</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={{ verticalAlign: 'top' }}>—</td>
                      <td style={{ textAlign: 'left' }}>
                        <textarea
                          className="form-control"
                          {...register('observations')}
                          rows={6}
                          placeholder="Enter detailed observations and actions taken during the shift…"
                          style={{ border: 'none', resize: 'vertical', width: '100%', background: 'transparent', outline: 'none' }}
                        />
                      </td>
                    </tr>
                  </tbody>
                </table>

                <div className="form-group">
                  <label className="form-label">Remarks</label>
                  <textarea className="form-control" {...register('remarks')} rows={3} placeholder="Additional remarks…" />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '16px', alignItems: 'center', paddingTop: '12px', borderTop: '1px solid var(--color-border-light)' }}>
                  <div className="form-group" style={{ marginBottom: 0, flex: 1, maxWidth: '300px' }}>
                    <label className="form-label">Operator Signature</label>
                    <input type="text" className="form-control" {...register('operator_signature')} placeholder="Name / Signature" />
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: '12px' }}>
                <button type="button" className="btn btn-ghost" onClick={goBack}>
                  <FiArrowLeft /> Back: Cycle Logs
                </button>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px', paddingTop: '20px', borderTop: '2px solid var(--color-border-light)' }}>
                <button type="button" className="btn btn-ghost" onClick={() => navigate('/logbook/ahp/dry')}>
                  Cancel
                </button>
                <button type="button" className="btn btn-outline btn-lg" onClick={handleSubmit(d => onSave(d, false))} disabled={saving}>
                  <FiSave /> Save Draft
                </button>
                <button type="button" className="btn btn-primary btn-lg" onClick={handleSubmit(d => onSave(d, true))} disabled={saving}>
                  {saving ? <span className="spinner" /> : <FiSend />} Save & Submit for Approval
                </button>
              </div>
            </>
          )}
        </div>
      </form>
    </div>
  )
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function ESPDryTable({ unit, espData, updateEsp }) {
  const cycles = [1, 2, 3]

  return (
    <div style={{ overflowX: 'auto', border: '1px solid var(--color-border-light)', borderTop: 'none', borderRadius: '0 0 8px 8px', marginBottom: '8px' }}>
      <table className="logbook-table" style={{ minWidth: '900px' }}>
        <thead>
          <tr>
            <th rowSpan={2} style={{ width: '60px' }}>Cycle</th>
            {ESP_PASSES.map(p => (
              <th colSpan={3} key={p}>{p.replace('-', ' ').replace('AB', 'AB-').replace('CD', 'CD-')} Field</th>
            ))}
          </tr>
          <tr>
            {ESP_PASSES.map(p => (
              <React.Fragment key={p}>
                <th>Start</th><th>Stop</th><th>Total</th>
              </React.Fragment>
            ))}
          </tr>
        </thead>
        <tbody>
          {cycles.map(cycle => (
            <tr key={cycle}>
              <td style={{ fontWeight: 600, background: '#F0F4FA' }}>{cycle}</td>
              {ESP_PASSES.map(esp_pass => {
                const idx = espData.findIndex(e => e.unit === unit && e.esp_pass === esp_pass && e.cycle === cycle)
                return (
                  <React.Fragment key={esp_pass}>
                    <td><input type="time" value={espData[idx]?.start_time || ''} onChange={e => updateEsp(idx, 'start_time', e.target.value)} /></td>
                    <td><input type="time" value={espData[idx]?.stop_time || ''} onChange={e => updateEsp(idx, 'stop_time', e.target.value)} /></td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, background: '#FAFBFD' }} title="Auto-calculated from Start/Stop">
                      {espData[idx]?.total_time || '—'}
                    </td>
                  </React.Fragment>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function EquipmentTable({ equipments, equipData, updateEquip }) {
  const cycles = [1, 2, 3]
  return (
    <div style={{ overflowX: 'auto', border: '1px solid var(--color-border-light)', borderTop: 'none', borderRadius: '0 0 8px 8px', marginBottom: '8px' }}>
      <table className="logbook-table" style={{ minWidth: '800px' }}>
        <thead>
          <tr>
            <th rowSpan={2} style={{ width: '60px' }}>Cycle</th>
            {equipments.map(eq => <th colSpan={4} key={eq}>{eq.replace(/-/g, ' ')}</th>)}
          </tr>
          <tr>
            {equipments.map(eq => (
              <React.Fragment key={eq}>
                <th>Start</th><th>Stop</th><th>Run Hrs</th><th>Status</th>
              </React.Fragment>
            ))}
          </tr>
        </thead>
        <tbody>
          {cycles.map(cycle => (
            <tr key={cycle}>
              <td style={{ fontWeight: 600, background: '#F0F4FA' }}>{cycle}</td>
              {equipments.map(equipment => {
                const idx = equipData.findIndex(e => e.equipment === equipment && e.cycle === cycle)
                return (
                  <React.Fragment key={equipment}>
                    <td><input type="time" value={equipData[idx]?.start_time || ''} onChange={e => updateEquip(idx, 'start_time', e.target.value)} /></td>
                    <td><input type="time" value={equipData[idx]?.stop_time || ''} onChange={e => updateEquip(idx, 'stop_time', e.target.value)} /></td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, background: '#FAFBFD' }} title="Auto-calculated from Start/Stop">
                      {equipData[idx]?.running_hrs || '—'}
                    </td>
                    <td>
                      <select value={equipData[idx]?.availability_status || ''} onChange={e => updateEquip(idx, 'availability_status', e.target.value)}>
                        {[{ v: '', l: '—' }, { v: 'R', l: 'R' }, { v: 'A', l: 'A' }, { v: 'B', l: 'B' }, { v: 'P', l: 'P' }].map(o => (
                          <option key={o.v} value={o.v}>{o.l}</option>
                        ))}
                      </select>
                    </td>
                  </React.Fragment>
                )
              })}
            </tr>
          ))}
          <tr style={{ background: '#F0F4FA', fontWeight: 600 }}>
            <td>Total Hrs</td>
            {equipments.map(eq => {
              const total = sumHours(equipData.filter(e => e.equipment === eq).map(e => e.running_hrs))
              return <React.Fragment key={eq}><td colSpan={2} /><td>{total}</td><td /></React.Fragment>
            })}
          </tr>
        </tbody>
      </table>
    </div>
  )
}
