import * as XLSX from 'xlsx'

// ─── Form constants (exactly matching forms) ──────────────────────────────────
const ESP_PASSES         = ['AB-1','CD-1','AB-2','CD-2','AB-3','CD-3','AB-4','CD-4','AB-5','CD-5','AB-6','CD-6']
const DRY_EQUIPMENTS     = ['COMP-1','COMP-2','COMP-3','COMP-4','CT-FAN','CT-PUMP-A','CT-PUMP-B','CLASS-A','CLASS-B']
const ESP_FIELDS_U       = ['AB-1','CD-1','AB-2','CD-2','AB-3','CD-3','AB-4','CD-4','AB-5','CD-5','AB-6','CD-6']
const ECO_APH_COMPONENTS = ['ECO-1-4','APH-1-3','APH-4-6','DUCT-W','DUCT-E','CAS']
const HT_PUMPS           = ['ADP-A','ADP-B','ADP-C','ADP-D','HPP-A','HPP-B','HPP-C','SWP-A','SWP-B']
const LT_PUMPS           = ['ISP-1A','ISP-2A','ISP-2B','LPP-A','LPP-B']
const FIELD_AVAIL_FIELDS = [...ESP_FIELDS_U,'ECO-1-4','APH-1-3','APH-4-6','DUCT-E','DUCT-W','CA-SILO']

// ─── Internal helpers ─────────────────────────────────────────────────────────

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a   = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

function toXlsx(wb) {
  const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
  return new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
}

function toCsv(wb) {
  const out = XLSX.write(wb, { bookType: 'csv', type: 'array' })
  return new Blob([out], { type: 'text/csv;charset=utf-8;' })
}

/** Create a worksheet from AOA and set column widths */
function makeSheet(aoa, colWidths = []) {
  const ws = XLSX.utils.aoa_to_sheet(aoa)
  if (colWidths.length) ws['!cols'] = colWidths.map(w => ({ wch: w }))
  return ws
}

/** Read rows from a sheet-as-AOA, treating row `headerRow` as keys */
function aoa2obj(aoa, headerRow = 0) {
  if (!aoa || aoa.length <= headerRow) return []
  const headers = aoa[headerRow]
  const result  = []
  for (let i = headerRow + 1; i < aoa.length; i++) {
    const obj = {}
    headers.forEach((h, j) => { obj[h] = aoa[i][j] ?? '' })
    result.push(obj)
  }
  return result
}

const n = v => (v === '' || v === undefined || v === null) ? null : String(v)
const safe = v => String(v ?? '')

// ═══════════════════════════════════════════════════════════════════════════════
//  DRY SYSTEM
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Download DRY template (7-sheet Excel matching form exactly) ───────────────
export function downloadDryTemplate() {
  const wb = XLSX.utils.book_new()

  // ── Sheet 1: Shift Info ──────────────────────────────────────────────────────
  const ws1 = makeSheet([
    // Row 0 – column headers
    [
      'Date\n(YYYY-MM-DD)',
      'Shift\n(A/B/C/G)',
      'Shift Incharge\n(Name)',
      'Field Operator\n(Name)',
      'Fine Ash Silo\nLevel (%)',
      'Coarse Ash Silo\nLevel (%)',
      '300MT Ash Silo\nLevel (%)',
      'Fly Ash\nQty (MT)',
      'IC1 Initial\nReading',
      'IC1 Final\nReading',
      'IC2 Initial\nReading',
      'IC2 Final\nReading',
      'Observations',
      'Remarks',
      'Operator\nSignature',
    ],
    // Row 1 – sample data
    [
      new Date().toISOString().split('T')[0],
      'A', 'Shift Incharge Name', 'Field Operator Name',
      '75.5', '60.0', '80.0', '120.5',
      '1000', '1050', '2000', '2060',
      'Normal shift. No issues.', '', '',
    ],
  ], [14, 10, 20, 20, 14, 16, 14, 12, 12, 12, 12, 12, 30, 20, 18])
  XLSX.utils.book_append_sheet(wb, ws1, 'Shift Info')

  // ── Sheet 2: U1 ESP Dry Deashing ─────────────────────────────────────────────
  const u1Rows = [
    ['=== UNIT-1  ESP DRY DE-ASHING ==='],
    ['ESP Pass', 'Cycle\n(1/2/3)', 'Start Time\n(HH:MM)', 'Stop Time\n(HH:MM)'],
  ]
  for (const pass of ESP_PASSES)
    for (const cycle of [1, 2, 3])
      u1Rows.push([pass, cycle, '', ''])
  XLSX.utils.book_append_sheet(wb, makeSheet(u1Rows, [10, 8, 14, 14]), 'U1 ESP Deashing')

  // ── Sheet 3: U2 ESP Dry Deashing ─────────────────────────────────────────────
  const u2Rows = [
    ['=== UNIT-2  ESP DRY DE-ASHING ==='],
    ['ESP Pass', 'Cycle\n(1/2/3)', 'Start Time\n(HH:MM)', 'Stop Time\n(HH:MM)'],
  ]
  for (const pass of ESP_PASSES)
    for (const cycle of [1, 2, 3])
      u2Rows.push([pass, cycle, '', ''])
  XLSX.utils.book_append_sheet(wb, makeSheet(u2Rows, [10, 8, 14, 14]), 'U2 ESP Deashing')

  // ── Sheet 4: Equipment Running Status ────────────────────────────────────────
  const eqRows = [
    ['=== DRY SYSTEM - EQUIPMENT RUNNING STATUS ==='],
    ['Equipment', 'Cycle\n(1/2/3)', 'Start Time\n(HH:MM)', 'Stop Time\n(HH:MM)', 'Status\n(R/A/B/P)'],
  ]
  const eqSections = [
    { title: '-- Compressors --', items: ['COMP-1','COMP-2','COMP-3','COMP-4'] },
    { title: '-- CT Fan, Pumps, Classifier --', items: ['CT-FAN','CT-PUMP-A','CT-PUMP-B','CLASS-A','CLASS-B'] },
  ]
  for (const sec of eqSections) {
    eqRows.push([sec.title, '', '', '', ''])
    for (const eq of sec.items)
      for (const cycle of [1, 2, 3])
        eqRows.push([eq, cycle, '', '', ''])
  }
  XLSX.utils.book_append_sheet(wb, makeSheet(eqRows, [14, 8, 14, 14, 12]), 'Equipment Status')

  downloadBlob(toXlsx(wb), `AHP_Dry_Import_Template.xlsx`)
}

// ─── Parse DRY import file → payload ─────────────────────────────────────────
export function mapDrySheets(sheets) {
  // Sheet 1: Shift Info (row 0 = headers, row 1 = data)
  const si     = sheets['Shift Info']
  const hdrs   = si?.[0] || []
  const dataR  = si?.[1] || []
  const main   = {}
  hdrs.forEach((h, i) => { main[safe(h)] = safe(dataR[i]) })

  const r = (k) => main[k] || ''

  let date = r('Date\n(YYYY-MM-DD)')
  try { date = new Date(date).toISOString().split('T')[0] }
  catch { date = new Date().toISOString().split('T')[0] }

  const formData = {
    date,
    shift:                 r('Shift\n(A/B/C/G)')?.[0] || 'A',
    _shift_incharge_name:  r('Shift Incharge\n(Name)'),
    _field_operator_name:  r('Field Operator\n(Name)'),
    fine_ash_silo_level:   r('Fine Ash Silo\nLevel (%)'),
    coarse_ash_silo_level: r('Coarse Ash Silo\nLevel (%)'),
    mt300_ash_silo_level:  r('300MT Ash Silo\nLevel (%)'),
    fly_ash_quantity:      r('Fly Ash\nQty (MT)'),
    ic1_initial:           r('IC1 Initial\nReading'),
    ic1_final:             r('IC1 Final\nReading'),
    ic2_initial:           r('IC2 Initial\nReading'),
    ic2_final:             r('IC2 Final\nReading'),
    observations:          r('Observations'),
    remarks:               r('Remarks'),
    operator_signature:    r('Operator\nSignature'),
    document_no:           'ADTPS/AHP/OPN/F/01',
  }

  // ESP Deashing
  const esp_dry_deashing = []
  const parseEsp = (sheetAoa, unit) => {
    const rows = aoa2obj(sheetAoa, 1)   // row 0 = section title, row 1 = headers
    for (const row of rows) {
      const pass  = safe(row['ESP Pass']).trim()
      const cycle = parseInt(row['Cycle\n(1/2/3)'])
      if (!pass || !cycle) continue
      esp_dry_deashing.push({
        unit, esp_pass: pass, cycle,
        start_time: n(row['Start Time\n(HH:MM)']),
        stop_time:  n(row['Stop Time\n(HH:MM)']),
        total_time: null,
      })
    }
  }
  if (sheets['U1 ESP Deashing']) parseEsp(sheets['U1 ESP Deashing'], '1')
  if (sheets['U2 ESP Deashing']) parseEsp(sheets['U2 ESP Deashing'], '2')

  // Equipment Status
  const equipment_status = []
  const eqSheet = sheets['Equipment Status']
  if (eqSheet) {
    const rows = aoa2obj(eqSheet, 1)
    for (const row of rows) {
      const eq    = safe(row['Equipment']).trim()
      const cycle = parseInt(row['Cycle\n(1/2/3)'])
      // skip section-title rows (equipment name will be a "--..." string)
      if (!eq || eq.startsWith('--') || eq.startsWith('===') || !cycle) continue
      equipment_status.push({
        equipment: eq, cycle,
        start_time:          n(row['Start Time\n(HH:MM)']),
        stop_time:           n(row['Stop Time\n(HH:MM)']),
        running_hrs:         null,
        availability_status: n(row['Status\n(R/A/B/P)']),
      })
    }
  }

  return { formData, esp_dry_deashing, equipment_status }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  WET SYSTEM
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Download WET template (7-sheet Excel matching form exactly) ───────────────
export function downloadWetTemplate() {
  const wb = XLSX.utils.book_new()

  // ── Sheet 1: Shift Info ──────────────────────────────────────────────────────
  const ws1 = makeSheet([
    [
      'Date\n(YYYY-MM-DD)', 'Shift\n(A/B/C/G)',
      'Unit-1 Load\n(MW)', 'U1 Coal Flow\n(T/hr)',
      'Unit-2 Load\n(MW)', 'U2 Coal Flow\n(T/hr)',
      // ESP Status Unit 1
      'U1 FTP Fields\nDischarged', 'U1 Hopper\nLevel Hi', 'U1 ESP CERM\nAvailability', 'U1 FHP EERM\nAvailability',
      // ESP Status Unit 2
      'U2 FTP Fields\nDischarged', 'U2 Hopper\nLevel Hi', 'U2 ESP CERM\nAvailability', 'U2 FHP EERM\nAvailability',
      // Bottom Ash Hopper
      'U1 BA Start\n(HH:MM)', 'U1 BA Stop\n(HH:MM)',
      'U2 BA Start\n(HH:MM)', 'U2 BA Stop\n(HH:MM)',
      // Power
      'Incomer OSA\nInitial', 'Incomer OSA\nFinal',
      'Incomer OSC\nInitial', 'Incomer OSC\nFinal',
      'AHP Lighting\nInitial', 'AHP Lighting\nFinal',
      // Remarks
      'Events /\nRemarks', 'Follow Up', 'Protection\nBypassed', 'Observations',
    ],
    [
      new Date().toISOString().split('T')[0], 'A',
      '240', '85', '245', '88',
      '10', 'AB-3', '11/12', '10/12',
      '11', 'CD-2', '12/12', '11/12',
      '06:00', '14:00', '06:30', '14:30',
      '5000', '5100', '4800', '4900', '200', '250',
      'Normal operations', 'Check pump B', '', '',
    ],
  ], Array(28).fill(16))
  XLSX.utils.book_append_sheet(wb, ws1, 'Shift Info')

  // ── Sheet 2: U1 ESP Wet Deashing ─────────────────────────────────────────────
  const u1WetRows = [
    ['=== UNIT-1  ESP WET DE-ASHING STATUS ==='],
    ['ESP Field', 'Cycle\n(1/2/3)', 'Start Time\n(HH:MM)', 'Stop Time\n(HH:MM)'],
  ]
  for (const f of ESP_FIELDS_U)
    for (const c of [1, 2, 3])
      u1WetRows.push([f, c, '', ''])
  XLSX.utils.book_append_sheet(wb, makeSheet(u1WetRows, [10, 8, 14, 14]), 'U1 ESP Wet Deashing')

  // ── Sheet 3: U2 ESP Wet Deashing ─────────────────────────────────────────────
  const u2WetRows = [
    ['=== UNIT-2  ESP WET DE-ASHING STATUS ==='],
    ['ESP Field', 'Cycle\n(1/2/3)', 'Start Time\n(HH:MM)', 'Stop Time\n(HH:MM)'],
  ]
  for (const f of ESP_FIELDS_U)
    for (const c of [1, 2, 3])
      u2WetRows.push([f, c, '', ''])
  XLSX.utils.book_append_sheet(wb, makeSheet(u2WetRows, [10, 8, 14, 14]), 'U2 ESP Wet Deashing')

  // ── Sheet 4: ECO / APH / Duct / CAS Wet Deashing (both units) ───────────────
  const ecoRows = [
    ['=== ECO / APH / DUCT / CAS WET DE-ASHING STATUS ==='],
    ['Unit\n(1/2)', 'Component', 'Cycle\n(1/2/3)', 'Start Time\n(HH:MM)', 'Stop Time\n(HH:MM)'],
  ]
  for (const unit of ['1', '2'])
    for (const comp of ECO_APH_COMPONENTS)
      for (const cycle of [1, 2, 3])
        ecoRows.push([unit, comp, cycle, '', ''])
  XLSX.utils.book_append_sheet(wb, makeSheet(ecoRows, [8, 12, 8, 14, 14]), 'ECO APH Deashing')

  // ── Sheet 5: ESP Field Availability Status ────────────────────────────────────
  const favRows = [
    ['=== WET SYSTEM - ESP FIELD AVAILABILITY STATUS ==='],
    ['Unit\n(1/2)', 'Field / Component', 'Availability\n(R/A/B/P)'],
  ]
  for (const unit of ['1', '2'])
    for (const field of FIELD_AVAIL_FIELDS)
      favRows.push([unit, field, ''])
  XLSX.utils.book_append_sheet(wb, makeSheet(favRows, [8, 14, 18]), 'Field Availability')

  // ── Sheet 6: HT Pumps ─────────────────────────────────────────────────────────
  const htRows = [
    ['=== WET SYSTEM - HT PUMPS RUNNING STATUS ==='],
    ['Pump', 'Cycle\n(1/2/3/4)', 'Start Time\n(HH:MM)', 'Stop Time\n(HH:MM)', 'Status\n(R/A/B/P)'],
  ]
  for (const pump of HT_PUMPS)
    for (const cycle of [1, 2, 3, 4])
      htRows.push([pump, cycle, '', '', ''])
  XLSX.utils.book_append_sheet(wb, makeSheet(htRows, [12, 10, 14, 14, 12]), 'HT Pumps')

  // ── Sheet 7: LT Pumps ─────────────────────────────────────────────────────────
  const ltRows = [
    ['=== WET SYSTEM - LT PUMPS RUNNING STATUS ==='],
    ['Pump', 'Cycle\n(1/2/3/4)', 'Start Time\n(HH:MM)', 'Stop Time\n(HH:MM)', 'Status\n(R/A/B/P)'],
  ]
  for (const pump of LT_PUMPS)
    for (const cycle of [1, 2, 3, 4])
      ltRows.push([pump, cycle, '', '', ''])
  XLSX.utils.book_append_sheet(wb, makeSheet(ltRows, [12, 10, 14, 14, 12]), 'LT Pumps')

  downloadBlob(toXlsx(wb), `AHP_Wet_Import_Template.xlsx`)
}

// ─── Parse WET import file → payload ─────────────────────────────────────────
export function mapWetSheets(sheets) {
  // Sheet 1: Shift Info
  const si    = sheets['Shift Info']
  const hdrs  = si?.[0] || []
  const dataR = si?.[1] || []
  const main  = {}
  hdrs.forEach((h, i) => { main[safe(h)] = safe(dataR[i]) })

  const r = (k) => main[k] || ''

  let date = r('Date\n(YYYY-MM-DD)')
  try { date = new Date(date).toISOString().split('T')[0] }
  catch { date = new Date().toISOString().split('T')[0] }

  const formData = {
    date,
    shift:                    r('Shift\n(A/B/C/G)')?.[0] || 'A',
    unit1_load:               r('Unit-1 Load\n(MW)'),
    unit1_coal_flow:          r('U1 Coal Flow\n(T/hr)'),
    unit2_load:               r('Unit-2 Load\n(MW)'),
    unit2_coal_flow:          r('U2 Coal Flow\n(T/hr)'),
    u1_esp_fields_discharged: r('U1 FTP Fields\nDischarged'),
    u1_esp_hopper_level_hi:   r('U1 Hopper\nLevel Hi'),
    u1_esp_cerm_avail:        r('U1 ESP CERM\nAvailability'),
    u1_esp_eerm_avail:        r('U1 FHP EERM\nAvailability'),
    u2_esp_fields_discharged: r('U2 FTP Fields\nDischarged'),
    u2_esp_hopper_level_hi:   r('U2 Hopper\nLevel Hi'),
    u2_esp_cerm_avail:        r('U2 ESP CERM\nAvailability'),
    u2_esp_eerm_avail:        r('U2 FHP EERM\nAvailability'),
    u1_ba_start:              r('U1 BA Start\n(HH:MM)'),
    u1_ba_stop:               r('U1 BA Stop\n(HH:MM)'),
    u2_ba_start:              r('U2 BA Start\n(HH:MM)'),
    u2_ba_stop:               r('U2 BA Stop\n(HH:MM)'),
    incomer_osa_initial:      r('Incomer OSA\nInitial'),
    incomer_osa_final:        r('Incomer OSA\nFinal'),
    incomer_osc_initial:      r('Incomer OSC\nInitial'),
    incomer_osc_final:        r('Incomer OSC\nFinal'),
    ahp_lighting_initial:     r('AHP Lighting\nInitial'),
    ahp_lighting_final:       r('AHP Lighting\nFinal'),
    events_remarks:           r('Events /\nRemarks'),
    follow_up:                r('Follow Up'),
    protection_bypassed:      r('Protection\nBypassed'),
    observations:             r('Observations'),
    document_no:              'ADTPS/AHP/OPN/F/02',
  }

  // ESP Wet Deashing + ECO/APH combined (same backend table)
  const esp_wet_deashing = []

  const parseWetEsp = (sheetAoa, unit, compKey = 'ESP Field') => {
    const rows = aoa2obj(sheetAoa, 1)
    for (const row of rows) {
      const component = safe(row[compKey]).trim()
      const cycle     = parseInt(row['Cycle\n(1/2/3)'])
      if (!component || !cycle) continue
      esp_wet_deashing.push({
        unit, component, cycle,
        start_time: n(row['Start Time\n(HH:MM)']),
        stop_time:  n(row['Stop Time\n(HH:MM)']),
        total_time: null,
      })
    }
  }
  if (sheets['U1 ESP Wet Deashing']) parseWetEsp(sheets['U1 ESP Wet Deashing'], '1')
  if (sheets['U2 ESP Wet Deashing']) parseWetEsp(sheets['U2 ESP Wet Deashing'], '2')

  // ECO/APH sheet has a 'Unit' column
  const ecoSheet = sheets['ECO APH Deashing']
  if (ecoSheet) {
    const rows = aoa2obj(ecoSheet, 1)
    for (const row of rows) {
      const unit      = safe(row['Unit\n(1/2)']).trim()
      const component = safe(row['Component']).trim()
      const cycle     = parseInt(row['Cycle\n(1/2/3)'])
      if (!unit || !component || !cycle) continue
      esp_wet_deashing.push({
        unit, component, cycle,
        start_time: n(row['Start Time\n(HH:MM)']),
        stop_time:  n(row['Stop Time\n(HH:MM)']),
        total_time: null,
      })
    }
  }

  // Field Availability
  const esp_field_availability = []
  const favSheet = sheets['Field Availability']
  if (favSheet) {
    const rows = aoa2obj(favSheet, 1)
    for (const row of rows) {
      const unit  = safe(row['Unit\n(1/2)']).trim()
      const field = safe(row['Field / Component']).trim()
      if (!unit || !field || field.startsWith('===')) continue
      esp_field_availability.push({
        unit, field,
        avail_status: n(row['Availability\n(R/A/B/P)']),
      })
    }
  }

  // Pumps
  const pump_status = []
  const parsePumps = (sheetAoa) => {
    const rows = aoa2obj(sheetAoa, 1)
    for (const row of rows) {
      const pump  = safe(row['Pump']).trim()
      const cycle = parseInt(row['Cycle\n(1/2/3/4)'])
      if (!pump || pump.startsWith('===') || !cycle) continue
      pump_status.push({
        pump, cycle,
        start_time:  n(row['Start Time\n(HH:MM)']),
        stop_time:   n(row['Stop Time\n(HH:MM)']),
        running_hrs: null,
        avail_status: n(row['Status\n(R/A/B/P)']),
      })
    }
  }
  if (sheets['HT Pumps']) parsePumps(sheets['HT Pumps'])
  if (sheets['LT Pumps']) parsePumps(sheets['LT Pumps'])

  return { formData, esp_wet_deashing, esp_field_availability, pump_status }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  GENERIC IMPORT FILE PARSER  (returns raw sheets as AOA + names)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * parseImportFile(file)
 * Returns Promise<{ sheets: { [sheetName]: any[][] }, sheetNames: string[] }>
 */
export function parseImportFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (evt) => {
      try {
        const wb   = XLSX.read(new Uint8Array(evt.target.result), { type: 'array' })
        const sheets = {}
        for (const name of wb.SheetNames) {
          sheets[name] = XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, defval: '' })
        }
        resolve({ sheets, sheetNames: wb.SheetNames })
      } catch (e) {
        reject(new Error('Cannot parse file: ' + e.message))
      }
    }
    reader.onerror = () => reject(new Error('File read error'))
    reader.readAsArrayBuffer(file)
  })
}

// ═══════════════════════════════════════════════════════════════════════════════
//  EXPORT current entries as flat list (for report download)
// ═══════════════════════════════════════════════════════════════════════════════

export function exportDryEntries(entries, format = 'xlsx') {
  const rows = entries.map((e, i) => ({
    'Sr. No.':             i + 1,
    'Date':                e.date,
    'Shift':               e.shift_display || e.shift,
    'Shift Incharge':      e.shift_incharge_name || '',
    'Field Operator':      e.field_operator_name || '',
    'Status':              e.status_display || e.status,
    'Prepared By':         e.prepared_by_name || '',
    'Approved By':         e.approved_by_name || '',
    'Fine Ash Silo (%)':   e.fine_ash_silo_level ?? '',
    'Coarse Ash Silo (%)': e.coarse_ash_silo_level ?? '',
    '300MT Ash Silo (%)':  e.mt300_ash_silo_level ?? '',
    'Fly Ash Qty (MT)':    e.fly_ash_quantity ?? '',
    'IC1 Initial':         e.ic1_initial ?? '',
    'IC1 Final':           e.ic1_final ?? '',
    'IC2 Initial':         e.ic2_initial ?? '',
    'IC2 Final':           e.ic2_final ?? '',
    'Observations':        e.observations || '',
    'Remarks':             e.remarks || '',
    'Approval Remarks':    e.approval_remarks || '',
    'Created At':          e.created_at ? new Date(e.created_at).toLocaleString('en-IN') : '',
  }))
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Dry System Logbook')
  const ext  = format === 'csv' ? 'csv' : 'xlsx'
  const blob = format === 'csv' ? toCsv(wb) : toXlsx(wb)
  downloadBlob(blob, `AHP_Dry_Logbook_${new Date().toISOString().split('T')[0]}.${ext}`)
}

export function exportWetEntries(entries, format = 'xlsx') {
  const rows = entries.map((e, i) => ({
    'Sr. No.':              i + 1,
    'Date':                 e.date,
    'Shift':                e.shift_display || e.shift,
    'Status':               e.status_display || e.status,
    'U1 Load (MW)':         e.unit1_load ?? '',
    'U1 Coal Flow (T/hr)':  e.unit1_coal_flow ?? '',
    'U2 Load (MW)':         e.unit2_load ?? '',
    'U2 Coal Flow (T/hr)':  e.unit2_coal_flow ?? '',
    'U1 ESP Fields Disch.': e.u1_esp_fields_discharged || '',
    'U1 Hopper Level Hi':   e.u1_esp_hopper_level_hi || '',
    'U1 CERM Avail':        e.u1_esp_cerm_avail || '',
    'U1 EERM Avail':        e.u1_esp_eerm_avail || '',
    'U2 ESP Fields Disch.': e.u2_esp_fields_discharged || '',
    'U2 Hopper Level Hi':   e.u2_esp_hopper_level_hi || '',
    'U2 CERM Avail':        e.u2_esp_cerm_avail || '',
    'U2 EERM Avail':        e.u2_esp_eerm_avail || '',
    'U1 BA Start':          e.u1_ba_start || '',
    'U1 BA Stop':           e.u1_ba_stop || '',
    'U2 BA Start':          e.u2_ba_start || '',
    'U2 BA Stop':           e.u2_ba_stop || '',
    'Incomer OSA Initial':  e.incomer_osa_initial ?? '',
    'Incomer OSA Final':    e.incomer_osa_final ?? '',
    'Incomer OSC Initial':  e.incomer_osc_initial ?? '',
    'Incomer OSC Final':    e.incomer_osc_final ?? '',
    'AHP Lighting Initial': e.ahp_lighting_initial ?? '',
    'AHP Lighting Final':   e.ahp_lighting_final ?? '',
    'Grand Total (kWh)':    e.grand_total_kwh ?? '',
    'Prepared By':          e.prepared_by_name || '',
    'Approved By':          e.approved_by_name || '',
    'Events / Remarks':     e.events_remarks || '',
    'Follow Up':            e.follow_up || '',
    'Protection Bypassed':  e.protection_bypassed || '',
    'Observations':         e.observations || '',
    'Approval Remarks':     e.approval_remarks || '',
    'Created At':           e.created_at ? new Date(e.created_at).toLocaleString('en-IN') : '',
  }))
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Wet System Logbook')
  const ext  = format === 'csv' ? 'csv' : 'xlsx'
  const blob = format === 'csv' ? toCsv(wb) : toXlsx(wb)
  downloadBlob(blob, `AHP_Wet_Logbook_${new Date().toISOString().split('T')[0]}.${ext}`)
}
