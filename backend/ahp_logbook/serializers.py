from rest_framework import serializers
from .models import (
    AHPDryLogEntry, AHPWetLogEntry, ESPDryDeashing, DryEquipmentStatus,
    ESPWetDeashing, ESPFieldAvailability, WetEquipmentStatus, LogbookAttachment,
    EventRecord, ShiftHandover, ArchivedLogbook
)
from users.serializers import UserSerializer



class ESPDryDeashingSerializer(serializers.ModelSerializer):
    class Meta:
        model = ESPDryDeashing
        fields = ['id', 'unit', 'esp_pass', 'cycle', 'start_time', 'stop_time', 'total_time']


class DryEquipmentStatusSerializer(serializers.ModelSerializer):
    class Meta:
        model = DryEquipmentStatus
        fields = ['id', 'equipment', 'cycle', 'start_time', 'stop_time', 'running_hrs', 'availability_status']


class LogbookAttachmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = LogbookAttachment
        fields = ['id', 'file', 'filename', 'uploaded_by', 'uploaded_at']
        read_only_fields = ['uploaded_by', 'uploaded_at']


class AHPDryLogEntrySerializer(serializers.ModelSerializer):
    esp_dry_deashing = ESPDryDeashingSerializer(many=True, required=False)
    equipment_status = DryEquipmentStatusSerializer(many=True, required=False)
    attachments = LogbookAttachmentSerializer(many=True, read_only=True)
    prepared_by_name = serializers.CharField(source='prepared_by.full_name', read_only=True)
    approved_by_name = serializers.CharField(source='approved_by.full_name', read_only=True)
    shift_incharge_name = serializers.CharField(source='shift_incharge.full_name', read_only=True)
    shift_display = serializers.CharField(source='get_shift_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = AHPDryLogEntry
        fields = '__all__'
        read_only_fields = ['prepared_by', 'approved_by', 'created_at', 'updated_at', 'status']

    def create(self, validated_data):
        esp_data = validated_data.pop('esp_dry_deashing', [])
        equip_data = validated_data.pop('equipment_status', [])
        entry = AHPDryLogEntry.objects.create(**validated_data)
        for item in esp_data:
            ESPDryDeashing.objects.create(log_entry=entry, **item)
        for item in equip_data:
            DryEquipmentStatus.objects.create(log_entry=entry, **item)
        return entry

    def update(self, instance, validated_data):
        esp_data = validated_data.pop('esp_dry_deashing', None)
        equip_data = validated_data.pop('equipment_status', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if esp_data is not None:
            instance.esp_dry_deashing.all().delete()
            for item in esp_data:
                ESPDryDeashing.objects.create(log_entry=instance, **item)
        if equip_data is not None:
            instance.equipment_status.all().delete()
            for item in equip_data:
                DryEquipmentStatus.objects.create(log_entry=instance, **item)
        return instance


class AHPDryLogListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for list views"""
    prepared_by_name = serializers.CharField(source='prepared_by.full_name', read_only=True)
    shift_display = serializers.CharField(source='get_shift_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = AHPDryLogEntry
        fields = ['id', 'date', 'shift', 'shift_display', 'status', 'status_display',
                  'prepared_by_name', 'created_at', 'document_no']


# ─── WET SYSTEM SERIALIZERS ──────────────────────────────────────────────────

class ESPWetDeashingSerializer(serializers.ModelSerializer):
    class Meta:
        model = ESPWetDeashing
        fields = ['id', 'unit', 'component', 'cycle', 'start_time', 'stop_time', 'total_time']


class ESPFieldAvailabilitySerializer(serializers.ModelSerializer):
    class Meta:
        model = ESPFieldAvailability
        fields = ['id', 'unit', 'field', 'avail_status']


class WetEquipmentStatusSerializer(serializers.ModelSerializer):
    class Meta:
        model = WetEquipmentStatus
        fields = ['id', 'pump', 'cycle', 'start_time', 'stop_time', 'running_hrs', 'avail_status']


class AHPWetLogEntrySerializer(serializers.ModelSerializer):
    esp_wet_deashing = ESPWetDeashingSerializer(many=True, required=False)
    esp_field_availability = ESPFieldAvailabilitySerializer(many=True, required=False)
    pump_status = WetEquipmentStatusSerializer(many=True, required=False)
    attachments = LogbookAttachmentSerializer(many=True, read_only=True)
    prepared_by_name = serializers.CharField(source='prepared_by.full_name', read_only=True)
    approved_by_name = serializers.CharField(source='approved_by.full_name', read_only=True)
    shift_display = serializers.CharField(source='get_shift_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = AHPWetLogEntry
        fields = '__all__'
        read_only_fields = ['prepared_by', 'approved_by', 'created_at', 'updated_at', 'status']

    def create(self, validated_data):
        esp_data = validated_data.pop('esp_wet_deashing', [])
        avail_data = validated_data.pop('esp_field_availability', [])
        pump_data = validated_data.pop('pump_status', [])
        entry = AHPWetLogEntry.objects.create(**validated_data)
        for item in esp_data:
            ESPWetDeashing.objects.create(log_entry=entry, **item)
        for item in avail_data:
            ESPFieldAvailability.objects.create(log_entry=entry, **item)
        for item in pump_data:
            WetEquipmentStatus.objects.create(log_entry=entry, **item)
        return entry

    def update(self, instance, validated_data):
        esp_data = validated_data.pop('esp_wet_deashing', None)
        avail_data = validated_data.pop('esp_field_availability', None)
        pump_data = validated_data.pop('pump_status', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if esp_data is not None:
            instance.esp_wet_deashing.all().delete()
            for item in esp_data:
                ESPWetDeashing.objects.create(log_entry=instance, **item)
        if avail_data is not None:
            instance.esp_field_availability.all().delete()
            for item in avail_data:
                ESPFieldAvailability.objects.create(log_entry=instance, **item)
        if pump_data is not None:
            instance.pump_status.all().delete()
            for item in pump_data:
                WetEquipmentStatus.objects.create(log_entry=instance, **item)
        return instance


class AHPWetLogListSerializer(serializers.ModelSerializer):
    prepared_by_name = serializers.CharField(source='prepared_by.full_name', read_only=True)
    approved_by_name = serializers.CharField(source='approved_by.full_name', read_only=True, default=None)
    shift_display = serializers.CharField(source='get_shift_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = AHPWetLogEntry
        fields = ['id', 'date', 'shift', 'shift_display', 'status', 'status_display',
                  'prepared_by_name', 'approved_by_name', 'created_at', 'document_no',
                  'unit1_load', 'unit2_load']


# ─── EVENT RECORD SERIALIZERS ────────────────────────────────────────────────

class EventRecordSerializer(serializers.ModelSerializer):
    reported_by_name = serializers.CharField(source='reported_by.full_name', read_only=True)
    resolved_by_name = serializers.CharField(source='resolved_by.full_name', read_only=True, default=None)
    category_display = serializers.CharField(source='get_category_display', read_only=True)
    severity_display = serializers.CharField(source='get_severity_display', read_only=True)
    status_display = serializers.CharField(source='get_event_status_display', read_only=True)
    department_display = serializers.CharField(source='get_department_display', read_only=True)

    class Meta:
        model = EventRecord
        fields = '__all__'
        read_only_fields = ['reported_by', 'resolved_by', 'resolved_at', 'created_at', 'updated_at']


class EventRecordListSerializer(serializers.ModelSerializer):
    reported_by_name = serializers.CharField(source='reported_by.full_name', read_only=True)
    category_display = serializers.CharField(source='get_category_display', read_only=True)
    severity_display = serializers.CharField(source='get_severity_display', read_only=True)
    status_display = serializers.CharField(source='get_event_status_display', read_only=True)

    class Meta:
        model = EventRecord
        fields = ['id', 'date', 'time', 'unit', 'department', 'category', 'category_display',
                  'severity', 'severity_display', 'title', 'event_status', 'status_display',
                  'equipment_tag', 'reported_by_name', 'created_at']


# ─── SHIFT HANDOVER SERIALIZERS ──────────────────────────────────────────────

class ShiftHandoverSerializer(serializers.ModelSerializer):
    outgoing_person_name = serializers.CharField(source='outgoing_person.full_name', read_only=True)
    incoming_person_name = serializers.CharField(source='incoming_person.full_name', read_only=True, default=None)
    outgoing_shift_display = serializers.CharField(source='get_outgoing_shift_display', read_only=True)
    incoming_shift_display = serializers.CharField(source='get_incoming_shift_display', read_only=True)

    class Meta:
        model = ShiftHandover
        fields = '__all__'
        read_only_fields = ['outgoing_person', 'created_at']


class ShiftHandoverListSerializer(serializers.ModelSerializer):
    outgoing_person_name = serializers.CharField(source='outgoing_person.full_name', read_only=True)
    incoming_person_name = serializers.CharField(source='incoming_person.full_name', read_only=True, default=None)
    outgoing_shift_display = serializers.CharField(source='get_outgoing_shift_display', read_only=True)
    incoming_shift_display = serializers.CharField(source='get_incoming_shift_display', read_only=True)

    class Meta:
        model = ShiftHandover
        fields = ['id', 'date', 'outgoing_shift', 'outgoing_shift_display',
                  'incoming_shift', 'incoming_shift_display',
                  'outgoing_person_name', 'incoming_person_name',
                  'is_acknowledged', 'created_at']


# ─── ARCHIVED LOGBOOK SERIALIZER ─────────────────────────────────────────────

class ArchivedLogbookSerializer(serializers.ModelSerializer):
    archived_by_name = serializers.CharField(source='archived_by.full_name', read_only=True, default=None)
    entry_shift_display = serializers.CharField(source='get_entry_shift_display', read_only=True)

    class Meta:
        model = ArchivedLogbook
        fields = '__all__'
        read_only_fields = ['archived_by', 'archived_at', 'version']
