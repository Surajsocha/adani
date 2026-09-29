from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()

SHIFT_CHOICES = [
    ('A', 'A Shift (06:00 - 14:00)'),
    ('B', 'B Shift (14:00 - 22:00)'),
    ('C', 'C Shift (22:00 - 06:00)'),
    ('G', 'General Shift'),
]

STATUS_CHOICES = [
    ('draft', 'Draft'),
    ('submitted', 'Submitted'),
    ('approved', 'Approved'),
    ('rejected', 'Rejected'),
]

AVAIL_STATUS = [
    ('R', 'Running'),
    ('A', 'Available'),
    ('B', 'Breakdown'),
    ('P', 'PTW (Permit to Work)'),
]


# ─── AHP DRY SYSTEM ─────────────────────────────────────────────────────────

class AHPDryLogEntry(models.Model):
    """Main entry: AHP Dry System Shift Log"""
    # Header
    date = models.DateField()
    shift = models.CharField(max_length=1, choices=SHIFT_CHOICES)
    shift_incharge = models.ForeignKey(
        User, on_delete=models.PROTECT, related_name='dry_logs_incharge', null=True, blank=True
    )
    field_operator = models.ForeignKey(
        User, on_delete=models.PROTECT, related_name='dry_logs_operator', null=True, blank=True
    )
    document_no = models.CharField(max_length=30, default='ADTPS/AHP/OPN/F/01')

    # Power consumption
    ic1_initial = models.FloatField(null=True, blank=True, verbose_name='I/C-1 (AXC) Initial Reading')
    ic1_final = models.FloatField(null=True, blank=True, verbose_name='I/C-1 (AXC) Final Reading')
    ic2_initial = models.FloatField(null=True, blank=True, verbose_name='I/C-2 (AXD) Initial Reading')
    ic2_final = models.FloatField(null=True, blank=True, verbose_name='I/C-2 (AXD) Final Reading')

    # Silo evacuation levels
    fine_ash_silo_level = models.FloatField(null=True, blank=True, verbose_name='Fine Ash Silo Level (%)')
    coarse_ash_silo_level = models.FloatField(null=True, blank=True, verbose_name='Coarse Ash Silo Level (%)')
    mt300_ash_silo_level = models.FloatField(null=True, blank=True, verbose_name='300 MT Ash Silo Level (%)')
    fly_ash_quantity = models.FloatField(null=True, blank=True, verbose_name='Fly Ash Quantity (MT)')

    # Observations & remarks
    observations = models.TextField(blank=True, verbose_name='Details of Observation/Action Taken')
    remarks = models.TextField(blank=True)
    operator_signature = models.CharField(max_length=100, blank=True)

    # Workflow
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='draft')
    prepared_by = models.ForeignKey(
        User, on_delete=models.PROTECT, related_name='dry_logs_prepared'
    )
    approved_by = models.ForeignKey(
        User, on_delete=models.PROTECT, related_name='dry_logs_approved',
        null=True, blank=True
    )
    approval_remarks = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'ahp_dry_log_entries'
        unique_together = ['date', 'shift']
        ordering = ['-date', 'shift']

    def __str__(self):
        return f'AHP Dry Log – {self.date} {self.shift} Shift'


class ESPDryDeashing(models.Model):
    """U-1 and U-2 ESP Dry Deashing cycles"""
    UNIT_CHOICES = [('1', 'Unit 1'), ('2', 'Unit 2')]
    PASS_CHOICES = [
        ('AB-1', 'AB-1st Field'), ('CD-1', 'CD-1st Field'),
        ('AB-2', 'AB-2nd Field'), ('CD-2', 'CD-2nd Field'),
        ('AB-3', 'AB-3rd Field'), ('CD-3', 'CD-3rd Field'),
        ('AB-4', 'AB-4th Field'), ('CD-4', 'CD-4th Field'),
        ('AB-5', 'AB-5th Field'), ('CD-5', 'CD-5th Field'),
        ('AB-6', 'AB-6th Field'), ('CD-6', 'CD-6th Field'),
    ]

    log_entry = models.ForeignKey(AHPDryLogEntry, on_delete=models.CASCADE, related_name='esp_dry_deashing')
    unit = models.CharField(max_length=1, choices=UNIT_CHOICES)
    esp_pass = models.CharField(max_length=5, choices=PASS_CHOICES)
    cycle = models.IntegerField()
    start_time = models.TimeField(null=True, blank=True)
    stop_time = models.TimeField(null=True, blank=True)
    total_time = models.FloatField(null=True, blank=True, verbose_name='Total Time (hrs)')

    class Meta:
        db_table = 'ahp_esp_dry_deashing'
        ordering = ['unit', 'esp_pass', 'cycle']


class DryEquipmentStatus(models.Model):
    """Running status of dry system equipment (compressors, CT fan, CT pump, classifier)"""
    EQUIPMENT_CHOICES = [
        ('COMP-1', 'Compressor No-1'), ('COMP-2', 'Compressor No-2'),
        ('COMP-3', 'Compressor No-3'), ('COMP-4', 'Compressor No-4'),
        ('CT-FAN', 'Cooling Tower Fan'),
        ('CT-PUMP-A', 'Cooling Tower Pump-A'), ('CT-PUMP-B', 'Cooling Tower Pump-B'),
        ('CLASS-A', 'Classifier-A'), ('CLASS-B', 'Classifier-B'),
    ]

    log_entry = models.ForeignKey(AHPDryLogEntry, on_delete=models.CASCADE, related_name='equipment_status')
    equipment = models.CharField(max_length=20, choices=EQUIPMENT_CHOICES)
    cycle = models.IntegerField()
    start_time = models.TimeField(null=True, blank=True)
    stop_time = models.TimeField(null=True, blank=True)
    running_hrs = models.FloatField(null=True, blank=True)
    availability_status = models.CharField(max_length=1, choices=AVAIL_STATUS, null=True, blank=True)

    class Meta:
        db_table = 'ahp_dry_equipment_status'


# ─── AHP WET SYSTEM ─────────────────────────────────────────────────────────

class AHPWetLogEntry(models.Model):
    """Main entry: AHP Wet System Shift Log"""
    date = models.DateField()
    shift = models.CharField(max_length=1, choices=SHIFT_CHOICES)
    document_no = models.CharField(max_length=30, default='ADTPS/AHP/OPN/F/02')

    # Unit load & coal flow
    unit1_load = models.FloatField(null=True, blank=True, verbose_name='Unit-1 Load (MW)')
    unit1_coal_flow = models.FloatField(null=True, blank=True, verbose_name='Unit-1 Coal Flow (T/hr)')
    unit2_load = models.FloatField(null=True, blank=True, verbose_name='Unit-2 Load (MW)')
    unit2_coal_flow = models.FloatField(null=True, blank=True, verbose_name='Unit-2 Coal Flow (T/hr)')

    # ESP Status – Unit 1
    u1_esp_fields_discharged = models.CharField(max_length=100, blank=True)
    u1_esp_hopper_level_hi = models.CharField(max_length=100, blank=True)
    u1_esp_cerm_avail = models.CharField(max_length=50, blank=True)
    u1_esp_eerm_avail = models.CharField(max_length=50, blank=True)

    # ESP Status – Unit 2
    u2_esp_fields_discharged = models.CharField(max_length=100, blank=True)
    u2_esp_hopper_level_hi = models.CharField(max_length=100, blank=True)
    u2_esp_cerm_avail = models.CharField(max_length=50, blank=True)
    u2_esp_eerm_avail = models.CharField(max_length=50, blank=True)

    # Transformer power consumption (500 KVA AXA/AXB)
    incomer_osa_initial = models.FloatField(null=True, blank=True)
    incomer_osa_final = models.FloatField(null=True, blank=True)
    incomer_osc_initial = models.FloatField(null=True, blank=True)
    incomer_osc_final = models.FloatField(null=True, blank=True)
    ahp_lighting_initial = models.FloatField(null=True, blank=True)
    ahp_lighting_final = models.FloatField(null=True, blank=True)
    grand_total_kwh = models.FloatField(null=True, blank=True)

    # Bottom ash hopper de-ashing
    u1_ba_start = models.TimeField(null=True, blank=True)
    u1_ba_stop = models.TimeField(null=True, blank=True)
    u1_ba_total_time = models.FloatField(null=True, blank=True)
    u2_ba_start = models.TimeField(null=True, blank=True)
    u2_ba_stop = models.TimeField(null=True, blank=True)
    u2_ba_total_time = models.FloatField(null=True, blank=True)

    # Events / Remarks / Follow-up
    events_remarks = models.TextField(blank=True)
    follow_up = models.TextField(blank=True)
    protection_bypassed = models.TextField(blank=True)
    observations = models.TextField(blank=True)

    # Workflow
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='draft')
    prepared_by = models.ForeignKey(
        User, on_delete=models.PROTECT, related_name='wet_logs_prepared'
    )
    approved_by = models.ForeignKey(
        User, on_delete=models.PROTECT, related_name='wet_logs_approved',
        null=True, blank=True
    )
    approval_remarks = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'ahp_wet_log_entries'
        unique_together = ['date', 'shift']
        ordering = ['-date', 'shift']

    def __str__(self):
        return f'AHP Wet Log – {self.date} {self.shift} Shift'


class ESPWetDeashing(models.Model):
    """ESP/APH/ECO/Duct Wet De-ashing cycles"""
    UNIT_CHOICES = [('1', 'Unit 1'), ('2', 'Unit 2')]
    COMPONENT_CHOICES = [
        ('AB-1', 'AB-1st Field'), ('CD-1', 'CD-1st Field'),
        ('AB-2', 'AB-2nd Field'), ('CD-2', 'CD-2nd Field'),
        ('AB-3', 'AB-3rd Field'), ('CD-3', 'CD-3rd Field'),
        ('AB-4', 'AB-4th Field'), ('CD-4', 'CD-4th Field'),
        ('AB-5', 'AB-5th Field'), ('CD-5', 'CD-5th Field'),
        ('AB-6', 'AB-6th Field'), ('CD-6', 'CD-6th Field'),
        ('ECO-1-4', 'Economiser 1 to 4'),
        ('APH-1-3', 'Air Pre Heater 1 to 3'), ('APH-4-6', 'Air Pre Heater 4 to 6'),
        ('DUCT-W', 'Duct-West'), ('DUCT-E', 'Duct-East'),
        ('CAS', 'Coarse Ash Silo'),
    ]

    log_entry = models.ForeignKey(AHPWetLogEntry, on_delete=models.CASCADE, related_name='esp_wet_deashing')
    unit = models.CharField(max_length=1, choices=UNIT_CHOICES)
    component = models.CharField(max_length=10, choices=COMPONENT_CHOICES)
    cycle = models.IntegerField()
    start_time = models.TimeField(null=True, blank=True)
    stop_time = models.TimeField(null=True, blank=True)
    total_time = models.FloatField(null=True, blank=True)

    class Meta:
        db_table = 'ahp_esp_wet_deashing'


class ESPFieldAvailability(models.Model):
    """Wet System – ESP field availability status"""
    UNIT_CHOICES = [('1', 'Unit 1'), ('2', 'Unit 2')]
    FIELD_CHOICES = [
        ('AB-1', 'AB-1st'), ('CD-1', 'CD-1st'),
        ('AB-2', 'AB-2nd'), ('CD-2', 'CD-2nd'),
        ('AB-3', 'AB-3rd'), ('CD-3', 'CD-3rd'),
        ('AB-4', 'AB-4th'), ('CD-4', 'CD-4th'),
        ('AB-5', 'AB-5th'), ('CD-5', 'CD-5th'),
        ('AB-6', 'AB-6th'), ('CD-6', 'CD-6th'),
        ('ECO-1-4', 'ECO 1-4'), ('APH-1-3', 'APH 1-3'), ('APH-4-6', 'APH 4-6'),
        ('DUCT-E', 'Duct-East'), ('DUCT-W', 'Duct-West'), ('CA-SILO', 'C.A. Silo'),
    ]

    log_entry = models.ForeignKey(AHPWetLogEntry, on_delete=models.CASCADE, related_name='esp_field_availability')
    unit = models.CharField(max_length=1, choices=UNIT_CHOICES)
    field = models.CharField(max_length=10, choices=FIELD_CHOICES)
    avail_status = models.CharField(max_length=1, choices=AVAIL_STATUS, null=True, blank=True)

    class Meta:
        db_table = 'ahp_esp_field_availability'


class WetEquipmentStatus(models.Model):
    """Wet system HT pump running status"""
    PUMP_CHOICES = [
        ('ADP-A', 'ADP-A'), ('ADP-B', 'ADP-B'), ('ADP-C', 'ADP-C'), ('ADP-D', 'ADP-D'),
        ('HPP-A', 'HPP-A'), ('HPP-B', 'HPP-B'), ('HPP-C', 'HPP-C'),
        ('SWP-A', 'SWP-A'), ('SWP-B', 'SWP-B'),
        ('ISP-1A', 'ISP-1A'), ('ISP-2A', 'ISP-2A'), ('ISP-2B', 'ISP-2B'),
        ('LPP-A', 'LPP-A'), ('LPP-B', 'LPP-B'),
    ]

    log_entry = models.ForeignKey(AHPWetLogEntry, on_delete=models.CASCADE, related_name='pump_status')
    pump = models.CharField(max_length=10, choices=PUMP_CHOICES)
    cycle = models.IntegerField()
    start_time = models.TimeField(null=True, blank=True)
    stop_time = models.TimeField(null=True, blank=True)
    running_hrs = models.FloatField(null=True, blank=True)
    avail_status = models.CharField(max_length=1, choices=AVAIL_STATUS, null=True, blank=True)

    class Meta:
        db_table = 'ahp_wet_equipment_status'


class LogbookAttachment(models.Model):
    """File attachments for any logbook entry"""
    LOG_TYPE_CHOICES = [('dry', 'Dry System'), ('wet', 'Wet System')]
    log_type = models.CharField(max_length=5, choices=LOG_TYPE_CHOICES)
    dry_entry = models.ForeignKey(
        AHPDryLogEntry, on_delete=models.CASCADE, related_name='attachments',
        null=True, blank=True
    )
    wet_entry = models.ForeignKey(
        AHPWetLogEntry, on_delete=models.CASCADE, related_name='attachments',
        null=True, blank=True
    )
    file = models.FileField(upload_to='ahp_attachments/')
    filename = models.CharField(max_length=255)
    uploaded_by = models.ForeignKey(User, on_delete=models.PROTECT)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'ahp_attachments'


# ─── EVENT RECORDING (SOW Section D) ────────────────────────────────────────

class EventRecord(models.Model):
    """Records plant events: abnormalities, trips, breakdowns, safety, etc."""
    CATEGORY_CHOICES = [
        ('abnormality', 'Plant Abnormality'),
        ('unit_trip', 'Unit Trip'),
        ('breakdown', 'Equipment Breakdown'),
        ('safety', 'Safety Incident'),
        ('near_miss', 'Near Miss'),
        ('environmental', 'Environmental Observation'),
        ('instruction', 'Operational Instruction'),
        ('maintenance', 'Maintenance Activity'),
    ]

    SEVERITY_CHOICES = [
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
        ('critical', 'Critical'),
    ]

    EVENT_STATUS_CHOICES = [
        ('open', 'Open'),
        ('in_progress', 'In Progress'),
        ('resolved', 'Resolved'),
        ('closed', 'Closed'),
    ]

    DEPARTMENT_CHOICES = [
        ('ahp', 'Ash Handling'),
        ('operations', 'Operations'),
        ('electrical', 'Electrical'),
        ('mechanical', 'Mechanical'),
        ('ci', 'C&I'),
        ('chp', 'CHP'),
    ]

    UNIT_CHOICES = [('1', 'Unit 1'), ('2', 'Unit 2'), ('common', 'Common')]

    date = models.DateField()
    time = models.TimeField()
    unit = models.CharField(max_length=10, choices=UNIT_CHOICES)
    department = models.CharField(max_length=20, choices=DEPARTMENT_CHOICES, default='ahp')
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES)
    severity = models.CharField(max_length=10, choices=SEVERITY_CHOICES, default='medium')
    title = models.CharField(max_length=300)
    description = models.TextField()
    equipment_tag = models.CharField(max_length=100, blank=True, help_text='Equipment identifier')
    action_taken = models.TextField(blank=True)
    event_status = models.CharField(max_length=15, choices=EVENT_STATUS_CHOICES, default='open')
    reported_by = models.ForeignKey(
        User, on_delete=models.PROTECT, related_name='reported_events'
    )
    resolved_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name='resolved_events'
    )
    resolved_at = models.DateTimeField(null=True, blank=True)
    dry_log_entry = models.ForeignKey(
        AHPDryLogEntry, on_delete=models.SET_NULL, null=True, blank=True, related_name='events'
    )
    wet_log_entry = models.ForeignKey(
        AHPWetLogEntry, on_delete=models.SET_NULL, null=True, blank=True, related_name='events'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'event_records'
        ordering = ['-date', '-time']
        indexes = [
            models.Index(fields=['category', '-date']),
            models.Index(fields=['severity', 'event_status']),
            models.Index(fields=['department', '-date']),
        ]

    def __str__(self):
        return f'[{self.category}] {self.title} – {self.date}'


# ─── SHIFT HANDOVER (SOW Section B) ─────────────────────────────────────────

class ShiftHandover(models.Model):
    """Records shift handover from outgoing to incoming shift personnel."""
    date = models.DateField()
    outgoing_shift = models.CharField(max_length=1, choices=SHIFT_CHOICES)
    incoming_shift = models.CharField(max_length=1, choices=SHIFT_CHOICES)
    outgoing_person = models.ForeignKey(
        User, on_delete=models.PROTECT, related_name='handovers_given'
    )
    incoming_person = models.ForeignKey(
        User, on_delete=models.PROTECT, related_name='handovers_received',
        null=True, blank=True
    )
    summary = models.TextField(help_text='Summary of shift activities')
    pending_items = models.TextField(blank=True, help_text='Pending items for next shift')
    critical_observations = models.TextField(blank=True, help_text='Critical observations to carry forward')
    equipment_issues = models.TextField(blank=True, help_text='Equipment issues or concerns')
    safety_concerns = models.TextField(blank=True, help_text='Safety related concerns')
    handover_notes = models.TextField(blank=True)
    is_acknowledged = models.BooleanField(default=False)
    acknowledged_at = models.DateTimeField(null=True, blank=True)
    dry_log_entry = models.ForeignKey(
        AHPDryLogEntry, on_delete=models.SET_NULL, null=True, blank=True, related_name='handovers'
    )
    wet_log_entry = models.ForeignKey(
        AHPWetLogEntry, on_delete=models.SET_NULL, null=True, blank=True, related_name='handovers'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'shift_handovers'
        ordering = ['-date', '-created_at']

    def __str__(self):
        return f'Handover {self.outgoing_shift}→{self.incoming_shift} on {self.date}'


# ─── DOCUMENT REPOSITORY (SOW Section 3.3) ──────────────────────────────────

class ArchivedLogbook(models.Model):
    """Stores approved logbooks as archived PDF copies with version history."""
    LOG_TYPE_CHOICES = [('dry', 'Dry System'), ('wet', 'Wet System')]

    log_type = models.CharField(max_length=5, choices=LOG_TYPE_CHOICES)
    dry_entry = models.ForeignKey(
        AHPDryLogEntry, on_delete=models.SET_NULL, null=True, blank=True, related_name='archives'
    )
    wet_entry = models.ForeignKey(
        AHPWetLogEntry, on_delete=models.SET_NULL, null=True, blank=True, related_name='archives'
    )
    pdf_file = models.FileField(upload_to='archived_logbooks/', null=True, blank=True)
    version = models.IntegerField(default=1)
    entry_date = models.DateField()
    entry_shift = models.CharField(max_length=1, choices=SHIFT_CHOICES)
    archived_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    archived_at = models.DateTimeField(auto_now_add=True)
    retention_until = models.DateField(null=True, blank=True, help_text='Date until which to retain')
    snapshot_data = models.JSONField(null=True, blank=True, help_text='JSON snapshot of entry at archive time')

    class Meta:
        db_table = 'archived_logbooks'
        ordering = ['-archived_at']

    def __str__(self):
        return f'Archive: {self.log_type} {self.entry_date} {self.entry_shift} v{self.version}'
