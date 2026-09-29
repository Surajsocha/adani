from django.contrib import admin
from .models import (
    AHPDryLogEntry, ESPDryDeashing, DryEquipmentStatus,
    AHPWetLogEntry, ESPWetDeashing, ESPFieldAvailability, WetEquipmentStatus,
    LogbookAttachment, EventRecord, ShiftHandover, ArchivedLogbook,
)


class ESPDryDeashingInline(admin.TabularInline):
    model = ESPDryDeashing
    extra = 0


class DryEquipmentStatusInline(admin.TabularInline):
    model = DryEquipmentStatus
    extra = 0


@admin.register(AHPDryLogEntry)
class AHPDryLogEntryAdmin(admin.ModelAdmin):
    list_display = ['date', 'shift', 'status', 'prepared_by', 'created_at']
    list_filter = ['shift', 'status', 'date']
    search_fields = ['observations', 'remarks']
    inlines = [ESPDryDeashingInline, DryEquipmentStatusInline]
    date_hierarchy = 'date'


class ESPWetDeashingInline(admin.TabularInline):
    model = ESPWetDeashing
    extra = 0


class WetEquipmentStatusInline(admin.TabularInline):
    model = WetEquipmentStatus
    extra = 0


@admin.register(AHPWetLogEntry)
class AHPWetLogEntryAdmin(admin.ModelAdmin):
    list_display = ['date', 'shift', 'status', 'prepared_by', 'created_at']
    list_filter = ['shift', 'status', 'date']
    search_fields = ['events_remarks', 'observations']
    inlines = [ESPWetDeashingInline, WetEquipmentStatusInline]
    date_hierarchy = 'date'


@admin.register(EventRecord)
class EventRecordAdmin(admin.ModelAdmin):
    list_display = ['date', 'time', 'category', 'severity', 'title', 'event_status', 'reported_by']
    list_filter = ['category', 'severity', 'event_status', 'department', 'date']
    search_fields = ['title', 'description', 'equipment_tag']
    date_hierarchy = 'date'


@admin.register(ShiftHandover)
class ShiftHandoverAdmin(admin.ModelAdmin):
    list_display = ['date', 'outgoing_shift', 'incoming_shift', 'outgoing_person', 'is_acknowledged']
    list_filter = ['outgoing_shift', 'is_acknowledged', 'date']
    date_hierarchy = 'date'


@admin.register(ArchivedLogbook)
class ArchivedLogbookAdmin(admin.ModelAdmin):
    list_display = ['log_type', 'entry_date', 'entry_shift', 'version', 'archived_by', 'archived_at']
    list_filter = ['log_type', 'entry_date']
    date_hierarchy = 'entry_date'


@admin.register(LogbookAttachment)
class LogbookAttachmentAdmin(admin.ModelAdmin):
    list_display = ['filename', 'log_type', 'uploaded_by', 'uploaded_at']
    list_filter = ['log_type']
