"""
Seed realistic dummy data for AHP Wet System Logbook.
Run: python seed_wet_dummy.py
"""
import os, django, random
from datetime import date, timedelta, time

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from users.models import CustomUser
from ahp_logbook.models import (
    AHPWetLogEntry, ESPWetDeashing, ESPFieldAvailability, WetEquipmentStatus
)

# ── Helpers ──────────────────────────────────────────────────────────────────
def t(h, m=0):
    """Return a time object, safely handling minute/hour overflow."""
    total_min = h * 60 + m
    total_min %= (24 * 60)
    return time(total_min // 60, total_min % 60)

def hrs(start, stop):
    """Return float hours between two time objects."""
    s = start.hour * 60 + start.minute
    e = stop.hour * 60 + stop.minute
    diff = (e - s) % (24 * 60)
    return round(diff / 60, 2)

ESP_FIELDS   = ['AB-1','CD-1','AB-2','CD-2','AB-3','CD-3','AB-4','CD-4','AB-5','CD-5','AB-6','CD-6']
ECO_APH_COMPS = ['ECO-1-4','APH-1-3','APH-4-6','DUCT-W','DUCT-E','CAS']
ALL_COMPS    = ESP_FIELDS + ECO_APH_COMPS
AVAIL_FIELD_LIST = ESP_FIELDS + ['ECO-1-4','APH-1-3','APH-4-6','DUCT-E','DUCT-W','CA-SILO']
HT_PUMPS     = ['ADP-A','ADP-B','ADP-C','ADP-D','HPP-A','HPP-B','HPP-C','SWP-A','SWP-B']
LT_PUMPS     = ['ISP-1A','ISP-2A','ISP-2B','LPP-A','LPP-B']
ALL_PUMPS    = HT_PUMPS + LT_PUMPS

SHIFTS = ['A', 'B', 'C']

# Fetch users
try:
    admin_user = CustomUser.objects.get(employee_id='ADMIN001')
    supervisor = CustomUser.objects.get(employee_id='SUP001')
    operator   = CustomUser.objects.get(employee_id='OPR001')
except CustomUser.DoesNotExist:
    print("ERROR: Run python setup_demo.py first to create users!")
    exit(1)

# ── Sample entries: last 5 days × 3 shifts ──────────────────────────────────
ENTRIES = []
today = date.today()

for day_offset in range(5, 0, -1):
    d = today - timedelta(days=day_offset)
    for shift in SHIFTS:
        ENTRIES.append({'date': d, 'shift': shift})

STATUSES = ['approved', 'approved', 'submitted', 'draft']

created_count = 0
skipped_count = 0

for entry_def in ENTRIES:
    d, shift = entry_def['date'], entry_def['shift']

    if AHPWetLogEntry.objects.filter(date=d, shift=shift).exists():
        print(f"  SKIP  {d} {shift} – already exists")
        skipped_count += 1
        continue

    status = random.choice(STATUSES)
    u1_load = random.randint(220, 250)
    u2_load = random.randint(215, 250)

    entry = AHPWetLogEntry.objects.create(
        date=d,
        shift=shift,
        document_no='ADTPS/AHP/OPN/F/02',
        unit1_load=u1_load,
        unit1_coal_flow=round(u1_load * 0.52 + random.uniform(-5, 5), 1),
        unit2_load=u2_load,
        unit2_coal_flow=round(u2_load * 0.52 + random.uniform(-5, 5), 1),
        # ESP Status Unit 1
        u1_esp_fields_discharged=f"AB-1,CD-1,AB-{random.randint(2,4)}",
        u1_esp_hopper_level_hi=random.choice(['NIL', 'AB-3 HIGH', 'CD-2 HIGH', 'NIL', 'NIL']),
        u1_esp_cerm_avail=random.choice(['R', 'A', 'B']),
        u1_esp_eerm_avail=random.choice(['R', 'A', 'A']),
        # ESP Status Unit 2
        u2_esp_fields_discharged=f"AB-2,CD-2,AB-{random.randint(3,5)}",
        u2_esp_hopper_level_hi=random.choice(['NIL', 'AB-4 HIGH', 'NIL', 'NIL']),
        u2_esp_cerm_avail=random.choice(['R', 'A', 'R']),
        u2_esp_eerm_avail=random.choice(['R', 'A', 'B']),
        # Power consumption
        incomer_osa_initial=round(random.uniform(1200, 1400), 2),
        incomer_osa_final=round(random.uniform(1600, 1800), 2),
        incomer_osc_initial=round(random.uniform(900, 1100), 2),
        incomer_osc_final=round(random.uniform(1200, 1400), 2),
        ahp_lighting_initial=round(random.uniform(300, 400), 2),
        ahp_lighting_final=round(random.uniform(420, 500), 2),
        grand_total_kwh=round(random.uniform(500, 800), 2),
        # Bottom ash
        u1_ba_start=t(6 + random.randint(0, 2), random.choice([0, 15, 30, 45])),
        u1_ba_stop=t(7 + random.randint(0, 3), random.choice([0, 15, 30])),
        u1_ba_total_time=round(random.uniform(1.5, 3.0), 2),
        u2_ba_start=t(8 + random.randint(0, 2), random.choice([0, 15, 30, 45])),
        u2_ba_stop=t(10 + random.randint(0, 2), random.choice([0, 15, 30])),
        u2_ba_total_time=round(random.uniform(1.5, 3.0), 2),
        # Remarks
        events_remarks=random.choice([
            'All systems normal. No major events.',
            'ADP-B stopped at 09:15 due to high vibration. Restarted at 10:30.',
            'Shift started smoothly. ESP flushing completed.',
            'HPP-A tripped at 14:45. Standby HPP-B taken in service.',
            'Routine de-ashing completed for all ESP fields.',
        ]),
        follow_up=random.choice([
            'Monitor ADP-B vibration levels.',
            'Check HPP-A seal water leakage.',
            'Nil.',
            'Inspect AB-3 hopper for blockage.',
        ]),
        protection_bypassed=random.choice(['NIL', 'NIL', 'HPP-A motor protection bypassed (permit issued)', 'NIL']),
        observations=random.choice([
            'All parameters within normal range.',
            'U1 ESP hopper level slightly elevated – monitored.',
            'Pond water level normal.',
            'Slight vibration in SWP-A – informed mechanical team.',
        ]),
        status=status,
        prepared_by=operator,
        approved_by=supervisor if status in ('approved',) else None,
        approval_remarks='Reviewed and approved.' if status == 'approved' else '',
    )

    # ── ESP Wet De-ashing cycles ─────────────────────────────────────────────
    for unit in ['1', '2']:
        for comp in ALL_COMPS:
            for cycle in [1, 2, 3]:
                # Only fill ~60% of cycles with data
                if random.random() < 0.6:
                    sh = random.randint(6, 21)
                    sm = random.choice([0, 15, 30, 45])
                    start = t(sh, sm)
                    dur   = random.randint(30, 120)   # minutes
                    stop  = t(sh, sm + dur)
                    ESPWetDeashing.objects.create(
                        log_entry=entry,
                        unit=unit,
                        component=comp,
                        cycle=cycle,
                        start_time=start,
                        stop_time=stop,
                        total_time=round(dur / 60, 2),
                    )
                else:
                    ESPWetDeashing.objects.create(
                        log_entry=entry,
                        unit=unit,
                        component=comp,
                        cycle=cycle,
                        start_time=None,
                        stop_time=None,
                        total_time=None,
                    )

    # ── ESP Field Availability ───────────────────────────────────────────────
    AVAIL_CHOICES = ['R', 'R', 'R', 'A', 'B', 'P']
    for unit in ['1', '2']:
        for field in AVAIL_FIELD_LIST:
            ESPFieldAvailability.objects.create(
                log_entry=entry,
                unit=unit,
                field=field,
                avail_status=random.choice(AVAIL_CHOICES),
            )

    # ── Pump Status ──────────────────────────────────────────────────────────
    for pump in ALL_PUMPS:
        for cycle in [1, 2, 3, 4]:
            if random.random() < 0.5:
                sh = random.randint(6, 20)
                sm = random.choice([0, 15, 30])
                start = t(sh, sm)
                dur   = random.randint(60, 240)
                stop  = t(sh, sm + dur)
                WetEquipmentStatus.objects.create(
                    log_entry=entry,
                    pump=pump,
                    cycle=cycle,
                    start_time=start,
                    stop_time=stop,
                    running_hrs=round(dur / 60, 2),
                    avail_status=random.choice(['R', 'R', 'A', 'B']),
                )
            else:
                WetEquipmentStatus.objects.create(
                    log_entry=entry,
                    pump=pump,
                    cycle=cycle,
                    avail_status=random.choice(['R', 'A', 'B', 'P']),
                )

    print(f"  CREATED  {d} Shift-{shift} | U1={u1_load}MW U2={u2_load}MW | Status={status}")
    created_count += 1

print()
print(f"=== Wet System Dummy Data Seeding Complete ===")
print(f"  Created : {created_count} entries")
print(f"  Skipped : {skipped_count} (already existed)")
