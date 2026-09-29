from rest_framework import viewsets, status, permissions, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django_filters.rest_framework import DjangoFilterBackend
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.db.models import Q, Count

from .models import (
    AHPDryLogEntry, AHPWetLogEntry, LogbookAttachment,
    EventRecord, ShiftHandover, ArchivedLogbook
)
from .serializers import (
    AHPDryLogEntrySerializer, AHPDryLogListSerializer,
    AHPWetLogEntrySerializer, AHPWetLogListSerializer,
    LogbookAttachmentSerializer,
    EventRecordSerializer, EventRecordListSerializer,
    ShiftHandoverSerializer, ShiftHandoverListSerializer,
    ArchivedLogbookSerializer,
)
from users.permissions import IsSupervisorOrHigher, IsOperatorOrHigher
from notifications.signals import notify_supervisors, notify_user
from audit.utils import log_audit

User = get_user_model()


# ─── AHP DRY SYSTEM ─────────────────────────────────────────────────────────

class AHPDryLogViewSet(viewsets.ModelViewSet):
    queryset = AHPDryLogEntry.objects.select_related(
        'prepared_by', 'approved_by', 'shift_incharge', 'field_operator'
    ).prefetch_related('esp_dry_deashing', 'equipment_status', 'attachments')
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['date', 'shift', 'status']
    search_fields = ['observations', 'remarks']
    ordering_fields = ['date', 'created_at']
    ordering = ['-date']

    def get_serializer_class(self):
        if self.action == 'list':
            return AHPDryLogListSerializer
        return AHPDryLogEntrySerializer

    def get_permissions(self):
        if self.action in ['approve', 'reject']:
            return [IsSupervisorOrHigher()]
        return [IsOperatorOrHigher()]

    def perform_create(self, serializer):
        entry = serializer.save(prepared_by=self.request.user)
        log_audit(self.request, 'create', 'AHPDryLogEntry', entry.id, str(entry))

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.status == 'approved' and request.user.role not in ['superadmin', 'dept_admin']:
            return Response({'error': 'Approved entries cannot be modified.'}, status=status.HTTP_403_FORBIDDEN)
        response = super().update(request, *args, **kwargs)
        log_audit(request, 'update', 'AHPDryLogEntry', instance.id, str(instance))
        return response

    @action(detail=True, methods=['post'], permission_classes=[IsOperatorOrHigher])
    def submit(self, request, pk=None):
        entry = self.get_object()
        if entry.prepared_by != request.user and request.user.role not in ['superadmin', 'dept_admin']:
            return Response({'error': 'You can only submit your own entries.'}, status=status.HTTP_403_FORBIDDEN)
        if entry.status != 'draft':
            return Response({'error': 'Only draft entries can be submitted.'}, status=status.HTTP_400_BAD_REQUEST)
        entry.status = 'submitted'
        entry.save()
        log_audit(request, 'submit', 'AHPDryLogEntry', entry.id, str(entry))
        # Notify supervisors
        notify_supervisors(
            request.user, 'logbook_submitted', 'medium',
            f'Dry System Log Submitted – {entry.date} {entry.get_shift_display()}',
            f'{request.user.full_name} has submitted a Dry System logbook entry for {entry.date} ({entry.get_shift_display()}).',
            f'/logbook/ahp/dry/{entry.id}'
        )
        return Response({'message': 'Entry submitted for approval.', 'status': entry.status})

    @action(detail=True, methods=['post'], permission_classes=[IsSupervisorOrHigher])
    def approve(self, request, pk=None):
        entry = self.get_object()
        if entry.status != 'submitted':
            return Response({'error': 'Only submitted entries can be approved.'}, status=status.HTTP_400_BAD_REQUEST)
        entry.status = 'approved'
        entry.approved_by = request.user
        entry.approval_remarks = request.data.get('remarks', '')
        entry.save()
        log_audit(request, 'approve', 'AHPDryLogEntry', entry.id, str(entry),
                  extra_info=f'Remarks: {entry.approval_remarks}')
        # Notify preparer
        notify_user(
            entry.prepared_by, request.user, 'logbook_approved', 'low',
            f'Dry System Log Approved – {entry.date} {entry.get_shift_display()}',
            f'Your Dry System logbook entry for {entry.date} ({entry.get_shift_display()}) has been approved by {request.user.full_name}.',
            f'/logbook/ahp/dry/{entry.id}'
        )
        return Response({'message': 'Entry approved.', 'status': entry.status})

    @action(detail=True, methods=['post'], permission_classes=[IsSupervisorOrHigher])
    def reject(self, request, pk=None):
        entry = self.get_object()
        if entry.status != 'submitted':
            return Response({'error': 'Only submitted entries can be rejected.'}, status=status.HTTP_400_BAD_REQUEST)
        entry.status = 'rejected'
        entry.approved_by = request.user
        entry.approval_remarks = request.data.get('remarks', '')
        entry.save()
        log_audit(request, 'reject', 'AHPDryLogEntry', entry.id, str(entry),
                  extra_info=f'Rejection remarks: {entry.approval_remarks}')
        # Notify preparer
        notify_user(
            entry.prepared_by, request.user, 'logbook_rejected', 'high',
            f'Dry System Log Rejected – {entry.date} {entry.get_shift_display()}',
            f'Your Dry System logbook entry for {entry.date} ({entry.get_shift_display()}) has been rejected by {request.user.full_name}. Remarks: {entry.approval_remarks}',
            f'/logbook/ahp/dry/{entry.id}/edit'
        )
        return Response({'message': 'Entry rejected.', 'status': entry.status})

    @action(detail=True, methods=['post'], parser_classes=[MultiPartParser, FormParser])
    def upload_attachment(self, request, pk=None):
        entry = self.get_object()
        file = request.FILES.get('file')
        if not file:
            return Response({'error': 'No file provided.'}, status=status.HTTP_400_BAD_REQUEST)
        attachment = LogbookAttachment.objects.create(
            log_type='dry', dry_entry=entry, file=file,
            filename=file.name, uploaded_by=request.user
        )
        return Response(LogbookAttachmentSerializer(attachment).data, status=status.HTTP_201_CREATED)


# ─── AHP WET SYSTEM ─────────────────────────────────────────────────────────

class AHPWetLogViewSet(viewsets.ModelViewSet):
    queryset = AHPWetLogEntry.objects.select_related(
        'prepared_by', 'approved_by'
    ).prefetch_related('esp_wet_deashing', 'esp_field_availability', 'pump_status', 'attachments')
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['date', 'shift', 'status']
    search_fields = ['events_remarks', 'observations']
    ordering_fields = ['date', 'created_at']
    ordering = ['-date']

    def get_serializer_class(self):
        if self.action == 'list':
            return AHPWetLogListSerializer
        return AHPWetLogEntrySerializer

    def get_permissions(self):
        if self.action in ['approve', 'reject']:
            return [IsSupervisorOrHigher()]
        return [IsOperatorOrHigher()]

    def perform_create(self, serializer):
        entry = serializer.save(prepared_by=self.request.user)
        log_audit(self.request, 'create', 'AHPWetLogEntry', entry.id, str(entry))

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.status == 'approved' and request.user.role not in ['superadmin', 'dept_admin']:
            return Response({'error': 'Approved entries cannot be modified.'}, status=status.HTTP_403_FORBIDDEN)
        response = super().update(request, *args, **kwargs)
        log_audit(request, 'update', 'AHPWetLogEntry', instance.id, str(instance))
        return response

    @action(detail=True, methods=['post'], permission_classes=[IsOperatorOrHigher])
    def submit(self, request, pk=None):
        entry = self.get_object()
        if entry.status != 'draft':
            return Response({'error': 'Only draft entries can be submitted.'}, status=status.HTTP_400_BAD_REQUEST)
        entry.status = 'submitted'
        entry.save()
        log_audit(request, 'submit', 'AHPWetLogEntry', entry.id, str(entry))
        notify_supervisors(
            request.user, 'logbook_submitted', 'medium',
            f'Wet System Log Submitted – {entry.date} {entry.get_shift_display()}',
            f'{request.user.full_name} has submitted a Wet System logbook entry for {entry.date} ({entry.get_shift_display()}).',
            f'/logbook/ahp/wet/{entry.id}'
        )
        return Response({'message': 'Entry submitted for approval.', 'status': entry.status})

    @action(detail=True, methods=['post'], permission_classes=[IsSupervisorOrHigher])
    def approve(self, request, pk=None):
        entry = self.get_object()
        if entry.status != 'submitted':
            return Response({'error': 'Only submitted entries can be approved.'}, status=status.HTTP_400_BAD_REQUEST)
        entry.status = 'approved'
        entry.approved_by = request.user
        entry.approval_remarks = request.data.get('remarks', '')
        entry.save()
        log_audit(request, 'approve', 'AHPWetLogEntry', entry.id, str(entry),
                  extra_info=f'Remarks: {entry.approval_remarks}')
        notify_user(
            entry.prepared_by, request.user, 'logbook_approved', 'low',
            f'Wet System Log Approved – {entry.date} {entry.get_shift_display()}',
            f'Your Wet System logbook entry for {entry.date} ({entry.get_shift_display()}) has been approved by {request.user.full_name}.',
            f'/logbook/ahp/wet/{entry.id}'
        )
        return Response({'message': 'Entry approved.', 'status': entry.status})

    @action(detail=True, methods=['post'], permission_classes=[IsSupervisorOrHigher])
    def reject(self, request, pk=None):
        entry = self.get_object()
        if entry.status != 'submitted':
            return Response({'error': 'Only submitted entries can be rejected.'}, status=status.HTTP_400_BAD_REQUEST)
        entry.status = 'rejected'
        entry.approved_by = request.user
        entry.approval_remarks = request.data.get('remarks', '')
        entry.save()
        log_audit(request, 'reject', 'AHPWetLogEntry', entry.id, str(entry),
                  extra_info=f'Rejection remarks: {entry.approval_remarks}')
        notify_user(
            entry.prepared_by, request.user, 'logbook_rejected', 'high',
            f'Wet System Log Rejected – {entry.date} {entry.get_shift_display()}',
            f'Your Wet System logbook entry for {entry.date} ({entry.get_shift_display()}) has been rejected by {request.user.full_name}. Remarks: {entry.approval_remarks}',
            f'/logbook/ahp/wet/{entry.id}/edit'
        )
        return Response({'message': 'Entry rejected.', 'status': entry.status})

    @action(detail=True, methods=['post'], parser_classes=[MultiPartParser, FormParser])
    def upload_attachment(self, request, pk=None):
        entry = self.get_object()
        file = request.FILES.get('file')
        if not file:
            return Response({'error': 'No file provided.'}, status=status.HTTP_400_BAD_REQUEST)
        attachment = LogbookAttachment.objects.create(
            log_type='wet', wet_entry=entry, file=file,
            filename=file.name, uploaded_by=request.user
        )
        return Response(LogbookAttachmentSerializer(attachment).data, status=status.HTTP_201_CREATED)


# ─── EVENT RECORDING ────────────────────────────────────────────────────────

class EventRecordViewSet(viewsets.ModelViewSet):
    """CRUD for Event Records (plant abnormalities, trips, breakdowns, etc.)"""
    queryset = EventRecord.objects.select_related('reported_by', 'resolved_by').all()
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['date', 'category', 'severity', 'event_status', 'unit', 'department']
    search_fields = ['title', 'description', 'equipment_tag', 'action_taken']
    ordering_fields = ['date', 'time', 'severity', 'created_at']
    ordering = ['-date', '-time']

    def get_serializer_class(self):
        if self.action == 'list':
            return EventRecordListSerializer
        return EventRecordSerializer

    def get_permissions(self):
        return [IsOperatorOrHigher()]

    def perform_create(self, serializer):
        event = serializer.save(reported_by=self.request.user)
        log_audit(self.request, 'create', 'EventRecord', event.id, str(event))
        # Notify supervisors about new event
        notify_supervisors(
            self.request.user, 'event_reported', 'high' if event.severity in ('high', 'critical') else 'medium',
            f'Event Reported: {event.get_category_display()} – {event.title}',
            f'{self.request.user.full_name} reported a {event.get_severity_display()} severity event: {event.title}',
            f'/events/{event.id}'
        )

    @action(detail=True, methods=['post'])
    def resolve(self, request, pk=None):
        event = self.get_object()
        event.event_status = 'resolved'
        event.resolved_by = request.user
        event.resolved_at = timezone.now()
        event.action_taken = request.data.get('action_taken', event.action_taken)
        event.save()
        log_audit(request, 'update', 'EventRecord', event.id, str(event), extra_info='Resolved')
        return Response({'message': 'Event marked as resolved.', 'status': event.event_status})

    @action(detail=False, methods=['get'])
    def statistics(self, request):
        """Return event statistics for dashboard."""
        date_from = request.query_params.get('date_from')
        date_to = request.query_params.get('date_to')
        qs = EventRecord.objects.all()
        if date_from:
            qs = qs.filter(date__gte=date_from)
        if date_to:
            qs = qs.filter(date__lte=date_to)

        return Response({
            'total': qs.count(),
            'by_category': list(qs.values('category').annotate(count=Count('id')).order_by('-count')),
            'by_severity': list(qs.values('severity').annotate(count=Count('id')).order_by('-count')),
            'by_status': list(qs.values('event_status').annotate(count=Count('id'))),
            'by_department': list(qs.values('department').annotate(count=Count('id'))),
            'open_count': qs.filter(event_status__in=['open', 'in_progress']).count(),
            'resolved_count': qs.filter(event_status__in=['resolved', 'closed']).count(),
        })


# ─── SHIFT HANDOVER ─────────────────────────────────────────────────────────

class ShiftHandoverViewSet(viewsets.ModelViewSet):
    """CRUD for Shift Handover records."""
    queryset = ShiftHandover.objects.select_related(
        'outgoing_person', 'incoming_person'
    ).all()
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['date', 'outgoing_shift', 'incoming_shift', 'is_acknowledged']
    search_fields = ['summary', 'pending_items', 'critical_observations']
    ordering_fields = ['date', 'created_at']
    ordering = ['-date', '-created_at']

    def get_serializer_class(self):
        if self.action == 'list':
            return ShiftHandoverListSerializer
        return ShiftHandoverSerializer

    def get_permissions(self):
        return [IsOperatorOrHigher()]

    def perform_create(self, serializer):
        handover = serializer.save(outgoing_person=self.request.user)
        log_audit(self.request, 'handover', 'ShiftHandover', handover.id, str(handover))
        # Notify if incoming person is set
        if handover.incoming_person:
            notify_user(
                handover.incoming_person, self.request.user, 'shift_handover', 'high',
                f'Shift Handover – {handover.get_outgoing_shift_display()} → {handover.get_incoming_shift_display()}',
                f'{self.request.user.full_name} has created a shift handover for you on {handover.date}. Please review and acknowledge.',
                f'/handover/{handover.id}'
            )

    @action(detail=True, methods=['post'])
    def acknowledge(self, request, pk=None):
        handover = self.get_object()
        if handover.is_acknowledged:
            return Response({'error': 'Already acknowledged.'}, status=status.HTTP_400_BAD_REQUEST)
        handover.is_acknowledged = True
        handover.acknowledged_at = timezone.now()
        handover.incoming_person = request.user
        handover.save()
        log_audit(request, 'update', 'ShiftHandover', handover.id, str(handover), extra_info='Acknowledged')
        return Response({'message': 'Handover acknowledged.', 'is_acknowledged': True})


# ─── DOCUMENT ARCHIVE ───────────────────────────────────────────────────────

class ArchivedLogbookViewSet(viewsets.ReadOnlyModelViewSet):
    """Read-only access to archived logbooks."""
    queryset = ArchivedLogbook.objects.select_related('archived_by').all()
    serializer_class = ArchivedLogbookSerializer
    permission_classes = [IsOperatorOrHigher]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['log_type', 'entry_date', 'entry_shift']
    ordering_fields = ['entry_date', 'archived_at']
    ordering = ['-entry_date']


# ─── ADVANCED SEARCH ────────────────────────────────────────────────────────

class AdvancedSearchView(viewsets.ViewSet):
    """Advanced search across all logbook entries and events."""
    permission_classes = [IsOperatorOrHigher]

    def list(self, request):
        q = request.query_params.get('q', '')
        date_from = request.query_params.get('date_from')
        date_to = request.query_params.get('date_to')
        unit = request.query_params.get('unit')
        department = request.query_params.get('department')
        category = request.query_params.get('category')
        equipment_tag = request.query_params.get('equipment_tag')
        user_id = request.query_params.get('user')
        entry_type = request.query_params.get('type')  # dry / wet / event / all

        results = {'dry': [], 'wet': [], 'events': []}

        # Dry logs
        if entry_type in (None, 'all', 'dry'):
            dry_qs = AHPDryLogEntry.objects.select_related('prepared_by').all()
            if q:
                dry_qs = dry_qs.filter(
                    Q(observations__icontains=q) | Q(remarks__icontains=q) |
                    Q(document_no__icontains=q)
                )
            if date_from:
                dry_qs = dry_qs.filter(date__gte=date_from)
            if date_to:
                dry_qs = dry_qs.filter(date__lte=date_to)
            if user_id:
                dry_qs = dry_qs.filter(prepared_by_id=user_id)
            results['dry'] = AHPDryLogListSerializer(dry_qs[:50], many=True).data

        # Wet logs
        if entry_type in (None, 'all', 'wet'):
            wet_qs = AHPWetLogEntry.objects.select_related('prepared_by', 'approved_by').all()
            if q:
                wet_qs = wet_qs.filter(
                    Q(events_remarks__icontains=q) | Q(observations__icontains=q) |
                    Q(follow_up__icontains=q) | Q(document_no__icontains=q)
                )
            if date_from:
                wet_qs = wet_qs.filter(date__gte=date_from)
            if date_to:
                wet_qs = wet_qs.filter(date__lte=date_to)
            if user_id:
                wet_qs = wet_qs.filter(prepared_by_id=user_id)
            results['wet'] = AHPWetLogListSerializer(wet_qs[:50], many=True).data

        # Events
        if entry_type in (None, 'all', 'event'):
            event_qs = EventRecord.objects.select_related('reported_by').all()
            if q:
                event_qs = event_qs.filter(
                    Q(title__icontains=q) | Q(description__icontains=q) |
                    Q(equipment_tag__icontains=q) | Q(action_taken__icontains=q)
                )
            if date_from:
                event_qs = event_qs.filter(date__gte=date_from)
            if date_to:
                event_qs = event_qs.filter(date__lte=date_to)
            if unit:
                event_qs = event_qs.filter(unit=unit)
            if department:
                event_qs = event_qs.filter(department=department)
            if category:
                event_qs = event_qs.filter(category=category)
            if equipment_tag:
                event_qs = event_qs.filter(equipment_tag__icontains=equipment_tag)
            if user_id:
                event_qs = event_qs.filter(reported_by_id=user_id)
            results['events'] = EventRecordListSerializer(event_qs[:50], many=True).data

        results['total_count'] = len(results['dry']) + len(results['wet']) + len(results['events'])
        return Response(results)


# ─── DASHBOARD STATS ─────────────────────────────────────────────────────────

class DashboardStatsView(viewsets.ViewSet):
    """Enhanced dashboard statistics."""
    permission_classes = [IsOperatorOrHigher]

    def list(self, request):
        from datetime import date, timedelta

        today = date.today()
        thirty_days_ago = today - timedelta(days=30)

        # Total counts
        dry_total = AHPDryLogEntry.objects.count()
        wet_total = AHPWetLogEntry.objects.count()

        # Status breakdown
        dry_status = dict(AHPDryLogEntry.objects.values_list('status').annotate(c=Count('id')).values_list('status', 'c'))
        wet_status = dict(AHPWetLogEntry.objects.values_list('status').annotate(c=Count('id')).values_list('status', 'c'))

        # Events summary
        event_total = EventRecord.objects.count()
        events_open = EventRecord.objects.filter(event_status__in=['open', 'in_progress']).count()
        events_by_severity = list(EventRecord.objects.values('severity').annotate(count=Count('id')))

        # Pending approvals
        pending_dry = AHPDryLogEntry.objects.filter(status='submitted').count()
        pending_wet = AHPWetLogEntry.objects.filter(status='submitted').count()

        # Recent activity (last 30 days)
        recent_dry = AHPDryLogEntry.objects.filter(date__gte=thirty_days_ago).count()
        recent_wet = AHPWetLogEntry.objects.filter(date__gte=thirty_days_ago).count()

        # User activity (top 5 contributors)
        user_activity = list(
            AHPDryLogEntry.objects.values('prepared_by__first_name', 'prepared_by__last_name')
            .annotate(count=Count('id'))
            .order_by('-count')[:5]
        )

        # Shift breakdown for last 30 days
        shift_data = []
        for shift_code, shift_label in [('A', 'A Shift'), ('B', 'B Shift'), ('C', 'C Shift'), ('G', 'General')]:
            shift_data.append({
                'shift': shift_label,
                'dry': AHPDryLogEntry.objects.filter(shift=shift_code, date__gte=thirty_days_ago).count(),
                'wet': AHPWetLogEntry.objects.filter(shift=shift_code, date__gte=thirty_days_ago).count(),
            })

        # Pending handovers
        pending_handovers = ShiftHandover.objects.filter(is_acknowledged=False).count()

        return Response({
            'totals': {
                'dry': dry_total, 'wet': wet_total,
                'events': event_total, 'combined': dry_total + wet_total,
            },
            'status': {
                'dry': dry_status,
                'wet': wet_status,
            },
            'pending': {
                'dry': pending_dry, 'wet': pending_wet,
                'total': pending_dry + pending_wet,
                'handovers': pending_handovers,
            },
            'events': {
                'open': events_open,
                'total': event_total,
                'by_severity': events_by_severity,
            },
            'recent_30d': {
                'dry': recent_dry, 'wet': recent_wet,
            },
            'shift_breakdown': shift_data,
            'user_activity': user_activity,
        })
