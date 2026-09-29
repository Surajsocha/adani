// Shared helpers used by the AHP log forms to auto-compute "Total" columns
// instead of asking the operator to type them in by hand.

/** Computes hours between two "HH:MM" strings. Handles shift rollover past midnight. */
export function calcHours(start, stop) {
  if (!start || !stop) return ''
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = stop.split(':').map(Number)
  if ([sh, sm, eh, em].some(n => Number.isNaN(n))) return ''
  let diffMinutes = (eh * 60 + em) - (sh * 60 + sm)
  if (diffMinutes < 0) diffMinutes += 24 * 60 // crossed midnight
  return (diffMinutes / 60).toFixed(2)
}

/** Computes a plain numeric difference (final - initial) for meter-reading style rows. */
export function calcDiff(initial, final) {
  const a = parseFloat(initial)
  const b = parseFloat(final)
  if (Number.isNaN(a) || Number.isNaN(b)) return ''
  return (b - a).toFixed(2)
}

/** Sums a list of "total_time"/"running_hrs" style values, ignoring blanks/NaN. */
export function sumHours(values) {
  const total = values.reduce((acc, v) => {
    const n = parseFloat(v)
    return Number.isNaN(n) ? acc : acc + n
  }, 0)
  return total ? total.toFixed(2) : '—'
}
