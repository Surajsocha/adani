import React, { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { FiSave, FiSend, FiArrowLeft, FiArrowRight, FiWifiOff } from 'react-icons/fi'
import api from '../../api/axios'
import toast from 'react-hot-toast'
import FormStepper from '../../components/FormStepper'
import { calcHours, calcDiff, sumHours } from '../../utils/time'
import useDraftAutosave, { loadDraft } from '../../utils/useDraftAutosave'

const SHIFTS = [{ v: 'A', l: 'A Shift (06:00–14:00)' }, { v: 'B', l: 'B Shift (14:00–22:00)' }, { v: 'C', l: 'C Shift (22:00–06:00)' }, { v: 'G', l: 'General Shift' }]

const ESP_FIELDS_U = ['AB-1', 'CD-1', 'AB-2', 'CD-2', 'AB-3', 'CD-3', 'AB-4', 'CD-4', 'AB-5', 'CD-5', 'AB-6', 'CD-6']
const ECO_APH_COMPONENTS = ['ECO-1-4', 'APH-1-3', 'APH-4-6', 'DUCT-W', 'DUCT-E', 'CAS']
const HT_PUMPS = ['ADP-A', 'ADP-B', 'ADP-C', 'ADP-D', 'HPP-A', 'HPP-B', 'HPP-C', 'SWP-A', 'SWP-B']
const LT_PUMPS = ['ISP-1A', 'ISP-2A', 'ISP-2B', 'LPP-A', 'LPP-B']
const UNITS = ['1', '2']

const STEPS = [
  { label: 'Cycle Logs' },
  { label: 'Power & Remarks' },
]

function buildDefault(components, unit_list, cycles = [1, 2, 3], extra = {}) {
  const data = []
  for (const unit of unit_list)
    for (const comp of components)
      for (const cycle of cycles)
        data.push({ unit, component: comp, cycle, start_time: '', stop_time: '', total_time: '', ...extra })
  return data
}

function buildPumps(pumps, cycles = [1, 2, 3, 4]) {
  const data = []
  for (const pump of pumps)
    for (const cycle of cycles)
      data.push({ pump, cycle, start_time: '', stop_time: '', running_hrs: '', avail_status: '' })
  return data
}

function buildFieldAvail() {
  const fields = [...ESP_FIELDS_U, 'ECO-1-4', 'APH-1-3', 'APH-4-6', 'DUCT-E', 'DUCT-W', 'CA-SILO']
  const data = []
  for (const unit of UNITS)
    for (const field of fields)
      data.push({ unit, field, avail_status: '' })
  return data
}

const DEFAULT_VALUES = {
  date: new Date().toISOString().split('T')[0], shift: 'A',
  document_no: 'ADTPS/AHP/OPN/F/02',
  unit1_load: '', unit1_coal_flow: '', unit2_load: '', unit2_coal_flow: '',
  u1_esp_fields_discharged: '', u1_esp_hopper_level_hi: '', u1_esp_cerm_avail: '', u1_esp_eerm_avail: '',
  u2_esp_fields_discharged: '', u2_esp_hopper_level_hi: '', u2_esp_cerm_avail: '', u2_esp_eerm_avail: '',
  incomer_osa_initial: '', incomer_osa_final: '', incomer_osc_initial: '', incomer_osc_final: '',
  ahp_lighting_initial: '', ahp_lighting_final: '', grand_total_kwh: '',
  u1_ba_start: '', u1_ba_stop: '', u1_ba_total_time: '',
  u2_ba_start: '', u2_ba_stop: '', u2_ba_total_time: '',
  events_remarks: '', follow_up: '', protection_bypassed: '', observations: '',
}

export default function WetLogForm() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEdit = !!id
  const draftKey = isEdit ? `ahp_wet_draft_${id}` : 'ahp_wet_draft_new'

  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(isEdit)
  const [step, setStep] = useState(0)
  const [restoredDraft, setRestoredDraft] = useState(false)
  const [espWetData, setEspWetData] = useState(buildDefault(ESP_FIELDS_U, UNITS))
  const [ecoAphData, setEcoAphData] = useState(buildDefault(ECO_APH_COMPONENTS, UNITS))
  const [fieldAvailData, setFieldAvailData] = useState(buildFieldAvail())
  const [htPumpData, setHtPumpData] = useState(buildPumps(HT_PUMPS))
  const [ltPumpData, setLtPumpData] = useState(buildPumps(LT_PUMPS))

  const { register, handleSubmit, reset, watch } = useForm({ defaultValues: DEFAULT_VALUES })
  const formValues = watch()

  // ── Live-computed "Start ↔ Stop" total updater used by both tables below ──
  const updWet = (arr, setArr) => (idx, field, val) => {
    setArr(prev => {
      const n = [...prev]
      const row = { ...n[idx], [field]: val }
      if (field === 'start_time' || field === 'stop_time') row.total_time = calcHours(row.start_time, row.stop_time)
      n[idx] = row
      return n
    })
  }
  const updAvail = (idx, val) => setFieldAvailData(prev => { const n = [...prev]; n[idx] = { ...n[idx], avail_status: val }; return n })
  const updPump = (arr, setArr) => (idx, field, val) => {
    setArr(prev => {
      const n = [...prev]
      const row = { ...n[idx], [field]: val }
      if (field === 'start_time' || field === 'stop_time') row.running_hrs = calcHours(row.start_time, row.stop_time)
      n[idx] = row
      return n
    })
  }

  // ── Load existing entry, or a locally-saved draft, whichever applies ──────
  useEffect(() => {
    const draft = loadDraft(draftKey)
    if (draft) {
      reset({ ...DEFAULT_VALUES, ...draft.formValues })
      if (draft.espWetData?.length) setEspWetData(draft.espWetData)
      if (draft.ecoAphData?.length) setEcoAphData(draft.ecoAphData)
      if (draft.fieldAvailData?.length) setFieldAvailData(draft.fieldAvailData)
      if (draft.htPumpData?.length) setHtPumpData(draft.htPumpData)
      if (draft.ltPumpData?.length) setLtPumpData(draft.ltPumpData)
      setRestoredDraft(true)
      toast.success('Unsaved draft restored from this device', { icon: '💾' })
      setLoading(false)
      return
    }
    if (isEdit) {
      api.get(`/logbook/ahp/wet/${id}/`).then(res => {
        const d = res.data; reset(d)
        if (d.esp_wet_deashing?.length) setEspWetData(d.esp_wet_deashing)
        if (d.esp_field_availability?.length) setFieldAvailData(d.esp_field_availability)
        if (d.pump_status?.length) {
          setHtPumpData(d.pump_status.filter(p => HT_PUMPS.includes(p.pump)))
          setLtPumpData(d.pump_status.filter(p => LT_PUMPS.includes(p.pump)))
        }
        setLoading(false)
      }).catch(() => { toast.error('Failed to load'); navigate('/logbook/ahp/wet') })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  // ── Keep a local draft so the form survives a dropped network / reload ───
  const { clearDraft } = useDraftAutosave(
    draftKey,
    { formValues, espWetData, ecoAphData, fieldAvailData, htPumpData, ltPumpData },
    !loading
  )

  const onSave = async (formData, submit = false) => {
    setSaving(true)
    const n = v => v === '' ? null : v
    const payload = {
      ...formData,
      esp_wet_deashing: [...espWetData, ...ecoAphData].map(e => ({ ...e, start_time: n(e.start_time), stop_time: n(e.stop_time), total_time: n(e.total_time) || null })),
      esp_field_availability: fieldAvailData.map(e => ({ ...e, avail_status: n(e.avail_status) })),
      pump_status: [...htPumpData, ...ltPumpData].map(e => ({ ...e, start_time: n(e.start_time), stop_time: n(e.stop_time), running_hrs: n(e.running_hrs) || null, avail_status: n(e.avail_status) })),
    }
    try {
      let entry
      if (isEdit) { entry = await api.put(`/logbook/ahp/wet/${id}/`, payload); toast.success('Updated') }
      else { entry = await api.post('/logbook/ahp/wet/', payload); toast.success('Saved as draft') }
      if (submit) { await api.post(`/logbook/ahp/wet/${entry.data.id}/submit/`); toast.success('Submitted for approval') }
      clearDraft() // safely on the server now — the local safety copy is no longer needed
      navigate('/logbook/ahp/wet')
    } catch (err) {
      if (!err.response) {
        toast.error("No network — your data is safely kept on this device. Try again once you're back online.", { duration: 5000 })
      } else {
        toast.error(JSON.stringify(err.response?.data) || 'Save failed')
      }
    }
    setSaving(false)
  }

  if (loading) return <div className="loading-page"><span className="spinner spinner-dark" /></div>

  // Auto-computed power totals
  const osaTotal = calcDiff(formValues.incomer_osa_initial, formValues.incomer_osa_final)
  const oscTotal = calcDiff(formValues.incomer_osc_initial, formValues.incomer_osc_final)
  const lightingTotal = calcDiff(formValues.ahp_lighting_initial, formValues.ahp_lighting_final)
  const grandTotal = [osaTotal, oscTotal, lightingTotal].every(v => v !== '')
    ? (parseFloat(osaTotal || 0) + parseFloat(oscTotal || 0) + parseFloat(lightingTotal || 0)).toFixed(2)
    : ''

  const goNext = () => setStep(s => Math.min(s + 1, STEPS.length - 1))
  const goBack = () => setStep(s => Math.max(s - 1, 0))

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <div className="page-breadcrumb">AHP › Wet System › {isEdit ? 'Edit' : 'New'} Entry</div>
          <h1 className="page-title">{isEdit ? 'Edit' : 'New'} Wet System Entry</h1>
        </div>
        <div className="page-actions">
          <button className="btn btn-ghost" onClick={() => navigate('/logbook/ahp/wet')}><FiArrowLeft /> Back</button>
          <button className="btn btn-outline" onClick={handleSubmit(d => onSave(d, false))} disabled={saving}><FiSave /> Save Draft</button>
          <button className="btn btn-primary" onClick={handleSubmit(d => onSave(d, true))} disabled={saving}><FiSend /> Save & Submit</button>
        </div>
      </div>

      {restoredDraft && (
        <div className="alert alert-info" style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FiWifiOff /> Restored data you'd already filled in on this device — nothing was lost.
        </div>
      )}

      <FormStepper steps={STEPS} currentStep={step} onStepClick={setStep} />

      <form>
        <div className="logbook-doc-header" style={{ borderRadius: '12px 12px 0 0' }}>
          <div className="company-name">ADANI POWER LIMITED (ADTPS – 2×250 MW)</div>
          <div className="doc-title">SHIFT INCHARGE LOG BOOK – ASH HANDLING WET SYSTEM</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
            <span className="doc-no">Document No: ADTPS/AHP/OPN/F/02</span>
          </div>
        </div>

        <div className="shift-info-bar" style={{ border: '1px solid var(--color-border-light)', borderTop: 'none' }}>
          <div className="shift-info-item">
            <label>Date</label>
            <input type="date" {...register('date', { required: true })} className="form-control" style={{ width: 'auto', fontFamily: 'var(--font-mono)' }} />
          </div>
          <div className="shift-info-item">
            <label>Shift</label>
            <select {...register('shift')} className="form-control" style={{ width: 'auto' }}>
              {SHIFTS.map(s => <option key={s.v} value={s.v}>{s.l}</option>)}
            </select>
          </div>
          <div className="shift-info-item"><label>Unit-1 Load (MW)</label><input type="number" {...register('unit1_load')} className="form-control font-mono" style={{ width: '100px' }} /></div>
          <div className="shift-info-item"><label>U1 Coal Flow (T/hr)</label><input type="number" {...register('unit1_coal_flow')} className="form-control font-mono" style={{ width: '100px' }} /></div>
          <div className="shift-info-item"><label>Unit-2 Load (MW)</label><input type="number" {...register('unit2_load')} className="form-control font-mono" style={{ width: '100px' }} /></div>
          <div className="shift-info-item"><label>U2 Coal Flow (T/hr)</label><input type="number" {...register('unit2_coal_flow')} className="form-control font-mono" style={{ width: '100px' }} /></div>
        </div>

        <div style={{ background: 'white', border: '1px solid var(--color-border-light)', borderTop: 'none', borderRadius: '0 0 12px 12px', padding: '24px' }}>

          {step === 0 && (
            <>
              {/* ESP Status Unit 1 */}
              <div className="section-header" style={{ marginTop: 0 }}>📊 ESP STATUS – UNIT 1</div>
              <div style={{ background: '#F7F9FC', border: '1px solid var(--color-border-light)', borderTop: 'none', borderRadius: '0 0 8px 8px', padding: '16px', marginBottom: '8px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '16px' }}>
                  {[{ l: 'ESP Fields Discharged', n: 'u1_esp_fields_discharged' }, { l: 'ESP Hopper Level Hi (If any)', n: 'u1_esp_hopper_level_hi' }, { l: 'ESP CERM Availability', n: 'u1_esp_cerm_avail' }, { l: 'ESP EERM Availability', n: 'u1_esp_eerm_avail' }].map(f => (
                    <div className="form-group" key={f.n} style={{ marginBottom: 0 }}>
                      <label className="form-label">{f.l}</label>
                      <input type="text" {...register(f.n)} className="form-control" />
                    </div>
                  ))}
                </div>
              </div>

              {/* ESP Status Unit 2 */}
              <div className="section-header">📊 ESP STATUS – UNIT 2</div>
              <div style={{ background: '#F7F9FC', border: '1px solid var(--color-border-light)', borderTop: 'none', borderRadius: '0 0 8px 8px', padding: '16px', marginBottom: '8px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '16px' }}>
                  {[{ l: 'ESP Fields Discharged', n: 'u2_esp_fields_discharged' }, { l: 'ESP Hopper Level Hi (If any)', n: 'u2_esp_hopper_level_hi' }, { l: 'ESP CERM Availability', n: 'u2_esp_cerm_avail' }, { l: 'ESP EERM Availability', n: 'u2_esp_eerm_avail' }].map(f => (
                    <div className="form-group" key={f.n} style={{ marginBottom: 0 }}>
                      <label className="form-label">{f.l}</label>
                      <input type="text" {...register(f.n)} className="form-control" />
                    </div>
                  ))}
                </div>
              </div>

              {/* Bottom Ash Hopper */}
              <div className="section-header">🪣 BOTTOM ASH HOPPER DE-ASHING REPORT</div>
              <div style={{ background: '#F7F9FC', border: '1px solid var(--color-border-light)', borderTop: 'none', borderRadius: '0 0 8px 8px', padding: '16px', marginBottom: '8px' }}>
                <table className="logbook-table">
                  <thead><tr><th>Unit</th><th>Start Time</th><th>Stop Time</th><th>Total Time (hrs)</th></tr></thead>
                  <tbody>
                    <BottomAshRow label="Unit #1" prefix="u1_ba" register={register} watch={watch} />
                    <BottomAshRow label="Unit #2" prefix="u2_ba" register={register} watch={watch} />
                  </tbody>
                </table>
              </div>

              {/* U-1 ESP Wet De-ashing */}
              <div className="section-header">💧 U-1 ESP WET DE-ASHING STATUS</div>
              <WetESPTable unit="1" data={espWetData} update={updWet(espWetData, setEspWetData)} fields={ESP_FIELDS_U} />

              <div className="section-header">💧 U-2 ESP WET DE-ASHING STATUS</div>
              <WetESPTable unit="2" data={espWetData} update={updWet(espWetData, setEspWetData)} fields={ESP_FIELDS_U} />

              {/* ECO/APH Wet De-ashing */}
              <div className="section-header">🔄 ECO / APH / DUCT / CAS WET DE-ASHING STATUS</div>
              <EcoAphTable data={ecoAphData} update={updWet(ecoAphData, setEcoAphData)} />

              {/* Field Availability */}
              <div className="section-header">📋 WET SYSTEM – ESP FIELD AVAILABILITY STATUS</div>
              <FieldAvailTable data={fieldAvailData} updAvail={updAvail} />

              {/* HT Pumps */}
              <div className="section-header">⚙️ WET SYSTEM – HT PUMPS RUNNING STATUS</div>
              <PumpTable pumps={HT_PUMPS} data={htPumpData} update={updPump(htPumpData, setHtPumpData)} />

              {/* LT Pumps */}
              <div className="section-header">⚙️ WET SYSTEM – LT PUMPS RUNNING STATUS</div>
              <PumpTable pumps={LT_PUMPS} data={ltPumpData} update={updPump(ltPumpData, setLtPumpData)} />

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
                <button type="button" className="btn btn-primary" onClick={goNext}>
                  Next: Power & Remarks <FiArrowRight />
                </button>
              </div>
            </>
          )}

          {step === 1 && (
            <>
              {/* Power */}
              <div className="section-header" style={{ marginTop: 0 }}>⚡ TOTAL (DRY + WET SYSTEM) POWER CONSUMPTION</div>
              <div style={{ background: '#F7F9FC', border: '1px solid var(--color-border-light)', borderTop: 'none', borderRadius: '0 0 8px 8px', padding: '16px', marginBottom: '8px' }}>
                <table className="logbook-table">
                  <thead><tr><th>Sr.</th><th>Description</th><th>Initial (A)</th><th>Final (B)</th><th>Total (B-A)</th></tr></thead>
                  <tbody>
                    {[
                      { sr: 1, l: 'INCOMER FROM STN SWGR OSA', ri: 'incomer_osa_initial', rf: 'incomer_osa_final', total: osaTotal },
                      { sr: 2, l: 'INCOMER FROM STN SWGR OSC', ri: 'incomer_osc_initial', rf: 'incomer_osc_final', total: oscTotal },
                      { sr: 3, l: 'AHP AREA LIGHTING', ri: 'ahp_lighting_initial', rf: 'ahp_lighting_final', total: lightingTotal },
                    ].map(r => (
                      <tr key={r.sr}>
                        <td>{r.sr}</td><td style={{ textAlign: 'left' }}>{r.l}</td>
                        <td><input type="number" step="0.01" {...register(r.ri)} /></td>
                        <td><input type="number" step="0.01" {...register(r.rf)} /></td>
                        <td style={{ fontWeight: 600 }} title="Auto-calculated (Final − Initial)">{r.total || '—'}</td>
                      </tr>
                    ))}
                    <tr style={{ background: '#E8F0FA', fontWeight: 700 }}>
                      <td colSpan={2}>Grand Total (KWh)</td>
                      <td colSpan={2} style={{ textAlign: 'center' }} title="Auto-calculated: sum of the totals above">{grandTotal || '—'}</td>
                      <td>—</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Events/Remarks */}
              <div className="section-header">📝 EVENTS / REMARKS / FOLLOW-UP</div>
              <div style={{ background: '#F7F9FC', border: '1px solid var(--color-border-light)', borderTop: 'none', borderRadius: '0 0 8px 8px', padding: '20px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Events / Unit Remarks</label>
                    <textarea className="form-control" {...register('events_remarks')} rows={5} placeholder="Events during shift…" />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Follow-Up Items</label>
                    <textarea className="form-control" {...register('follow_up')} rows={5} placeholder="Pending follow-ups…" />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Protection Bypassed</label>
                    <textarea className="form-control" {...register('protection_bypassed')} rows={3} placeholder="Any protection bypass details…" />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">General Observations</label>
                    <textarea className="form-control" {...register('observations')} rows={3} placeholder="Other observations…" />
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: '12px' }}>
                <button type="button" className="btn btn-ghost" onClick={goBack}>
                  <FiArrowLeft /> Back: Cycle Logs
                </button>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px', paddingTop: '20px', borderTop: '2px solid var(--color-border-light)' }}>
                <button type="button" className="btn btn-ghost" onClick={() => navigate('/logbook/ahp/wet')}>Cancel</button>
                <button type="button" className="btn btn-outline btn-lg" onClick={handleSubmit(d => onSave(d, false))} disabled={saving}><FiSave /> Save Draft</button>
                <button type="button" className="btn btn-primary btn-lg" onClick={handleSubmit(d => onSave(d, true))} disabled={saving}>
                  {saving ? <span className="spinner" /> : <FiSend />} Save & Submit
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

function BottomAshRow({ label, prefix, register, watch }) {
  const start = watch(`${prefix}_start`)
  const stop = watch(`${prefix}_stop`)
  const total = calcHours(start, stop)
  return (
    <tr>
      <td style={{ fontWeight: 600 }}>{label}</td>
      <td><input type="time" {...register(`${prefix}_start`)} /></td>
      <td><input type="time" {...register(`${prefix}_stop`)} /></td>
      <td style={{ fontWeight: 600 }} title="Auto-calculated from Start/Stop">{total || '—'}</td>
    </tr>
  )
}

function WetESPTable({ unit, data, update, fields }) {
  return (
    <div style={{ overflowX: 'auto', border: '1px solid var(--color-border-light)', borderTop: 'none', borderRadius: '0 0 8px 8px', marginBottom: '8px' }}>
      <table className="logbook-table" style={{ minWidth: '1000px' }}>
        <thead>
          <tr><th rowSpan={2}>Cycle</th>{fields.map(f => <th colSpan={3} key={f}>{f} Field</th>)}</tr>
          <tr>{fields.map(f => <React.Fragment key={f}><th>Start</th><th>Stop</th><th>Total</th></React.Fragment>)}</tr>
        </thead>
        <tbody>
          {[1, 2, 3].map(cycle => (
            <tr key={cycle}>
              <td style={{ fontWeight: 600, background: '#F0F4FA' }}>{cycle}</td>
              {fields.map(comp => {
                const idx = data.findIndex(e => e.unit === unit && e.component === comp && e.cycle === cycle)
                return <React.Fragment key={comp}>
                  <td><input type="time" value={data[idx]?.start_time || ''} onChange={e => update(idx, 'start_time', e.target.value)} /></td>
                  <td><input type="time" value={data[idx]?.stop_time || ''} onChange={e => update(idx, 'stop_time', e.target.value)} /></td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, background: '#FAFBFD' }} title="Auto-calculated from Start/Stop">
                    {data[idx]?.total_time || '—'}
                  </td>
                </React.Fragment>
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function EcoAphTable({ data, update }) {
  const comps = ['ECO-1-4', 'APH-1-3', 'APH-4-6', 'DUCT-W', 'DUCT-E', 'CAS']
  return (
    <div style={{ overflowX: 'auto', border: '1px solid var(--color-border-light)', borderTop: 'none', borderRadius: '0 0 8px 8px', marginBottom: '8px' }}>
      <table className="logbook-table" style={{ minWidth: '900px' }}>
        <thead>
          <tr><th>Unit</th><th rowSpan={1}>Cycle</th>{comps.map(c => <th colSpan={3} key={c}>{c.replace(/-/g, ' ')}</th>)}</tr>
          <tr><th /><th />{comps.map(c => <React.Fragment key={c}><th>Start</th><th>Stop</th><th>Total</th></React.Fragment>)}</tr>
        </thead>
        <tbody>
          {['1', '2'].map(unit => [1, 2, 3].map(cycle => (
            <tr key={`${unit}-${cycle}`}>
              {cycle === 1 && <td rowSpan={3} style={{ fontWeight: 700, background: '#E8F0FA' }}>U-{unit}</td>}
              <td style={{ fontWeight: 600, background: '#F0F4FA' }}>{cycle}</td>
              {comps.map(comp => {
                const idx = data.findIndex(e => e.unit === unit && e.component === comp && e.cycle === cycle)
                return <React.Fragment key={comp}>
                  <td><input type="time" value={data[idx]?.start_time || ''} onChange={e => update(idx, 'start_time', e.target.value)} /></td>
                  <td><input type="time" value={data[idx]?.stop_time || ''} onChange={e => update(idx, 'stop_time', e.target.value)} /></td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, background: '#FAFBFD' }} title="Auto-calculated from Start/Stop">
                    {data[idx]?.total_time || '—'}
                  </td>
                </React.Fragment>
              })}
            </tr>
          )))}
        </tbody>
      </table>
    </div>
  )
}

function FieldAvailTable({ data, updAvail }) {
  const fields_u1 = [...ESP_FIELDS_U, 'ECO-1-4', 'APH-1-3', 'APH-4-6', 'DUCT-E', 'DUCT-W', 'CA-SILO']
  const AVAIL_OPT = [{ v: '', l: '—' }, { v: 'R', l: 'R' }, { v: 'A', l: 'A' }, { v: 'B', l: 'B' }, { v: 'P', l: 'P' }]
  return (
    <div style={{ overflowX: 'auto', border: '1px solid var(--color-border-light)', borderTop: 'none', borderRadius: '0 0 8px 8px', marginBottom: '8px' }}>
      <table className="logbook-table" style={{ minWidth: '1200px' }}>
        <thead>
          <tr>
            <th>Unit</th>
            {fields_u1.map(f => <th key={f}>{f}</th>)}
          </tr>
        </thead>
        <tbody>
          {['1', '2'].map(unit => (
            <tr key={unit}>
              <td style={{ fontWeight: 700, background: '#E8F0FA' }}>U-{unit}</td>
              {fields_u1.map(field => {
                const idx = data.findIndex(e => e.unit === unit && e.field === field)
                return <td key={field}>
                  <select value={data[idx]?.avail_status || ''} onChange={e => updAvail(idx, e.target.value)}>
                    {AVAIL_OPT.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
                  </select>
                </td>
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function PumpTable({ pumps, data, update }) {
  const AVAIL_OPT = [{ v: '', l: '—' }, { v: 'R', l: 'R' }, { v: 'A', l: 'A' }, { v: 'B', l: 'B' }, { v: 'P', l: 'P' }]
  return (
    <div style={{ overflowX: 'auto', border: '1px solid var(--color-border-light)', borderTop: 'none', borderRadius: '0 0 8px 8px', marginBottom: '8px' }}>
      <table className="logbook-table" style={{ minWidth: '900px' }}>
        <thead>
          <tr><th rowSpan={2}>Cycle</th>{pumps.map(p => <th colSpan={4} key={p}>{p}</th>)}</tr>
          <tr>{pumps.map(p => <React.Fragment key={p}><th>Start</th><th>Stop</th><th>Run Hrs</th><th>Status</th></React.Fragment>)}</tr>
        </thead>
        <tbody>
          {[1, 2, 3, 4].map(cycle => (
            <tr key={cycle}>
              <td style={{ fontWeight: 600, background: '#F0F4FA' }}>{cycle}</td>
              {pumps.map(pump => {
                const idx = data.findIndex(e => e.pump === pump && e.cycle === cycle)
                return <React.Fragment key={pump}>
                  <td><input type="time" value={data[idx]?.start_time || ''} onChange={e => update(idx, 'start_time', e.target.value)} /></td>
                  <td><input type="time" value={data[idx]?.stop_time || ''} onChange={e => update(idx, 'stop_time', e.target.value)} /></td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, background: '#FAFBFD' }} title="Auto-calculated from Start/Stop">
                    {data[idx]?.running_hrs || '—'}
                  </td>
                  <td><select value={data[idx]?.avail_status || ''} onChange={e => update(idx, 'avail_status', e.target.value)}>{AVAIL_OPT.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}</select></td>
                </React.Fragment>
              })}
            </tr>
          ))}
          <tr style={{ background: '#F0F4FA', fontWeight: 600 }}>
            <td>Total Hrs</td>
            {pumps.map(p => {
              const total = sumHours(data.filter(e => e.pump === p).map(e => e.running_hrs))
              return <React.Fragment key={p}><td colSpan={2} /><td>{total}</td><td /></React.Fragment>
            })}
          </tr>
        </tbody>
      </table>
    </div>
  )
}
