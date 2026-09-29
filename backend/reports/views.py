"""
Report generation views for PDF and Excel export.
Generates: Shift reports, Daily reports, Monthly reports,
Department-wise reports, Approval status reports, Exception reports.
"""
import io
import json
from datetime import datetime, timedelta

from django.http import HttpResponse
from django.db.models import Count, Q
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions

from ahp_logbook.models import AHPDryLogEntry, AHPWetLogEntry
from ahp_logbook.serializers import AHPDryLogListSerializer, AHPWetLogListSerializer
from users.permissions import IsOperatorOrHigher

try:
    import openpyxl
    HAS_OPENPYXL = True
except ImportError:
    HAS_OPENPYXL = False


class ReportSummaryView(APIView):
    """Get summary statistics for reports dashboard."""
    permission_classes = [IsOperatorOrHigher]

    def get(self, request):
        date_from = request.query_params.get('date_from')
        date_to = request.query_params.get('date_to')
        department = request.query_params.get('department', 'ahp')

        dry_qs = AHPDryLogEntry.objects.all()
        wet_qs = AHPWetLogEntry.objects.all()

        if date_from:
            dry_qs = dry_qs.filter(date__gte=date_from)
            wet_qs = wet_qs.filter(date__gte=date_from)
        if date_to:
            dry_qs = dry_qs.filter(date__lte=date_to)
            wet_qs = wet_qs.filter(date__lte=date_to)

        dry_stats = dry_qs.aggregate(
            total=Count('id'),
            draft=Count('id', filter=Q(status='draft')),
            submitted=Count('id', filter=Q(status='submitted')),
            approved=Count('id', filter=Q(status='approved')),
            rejected=Count('id', filter=Q(status='rejected')),
        )
        wet_stats = wet_qs.aggregate(
            total=Count('id'),
            draft=Count('id', filter=Q(status='draft')),
            submitted=Count('id', filter=Q(status='submitted')),
            approved=Count('id', filter=Q(status='approved')),
            rejected=Count('id', filter=Q(status='rejected')),
        )

        # Shift-wise breakdown
        shift_breakdown = {
            'dry': list(dry_qs.values('shift').annotate(count=Count('id')).order_by('shift')),
            'wet': list(wet_qs.values('shift').annotate(count=Count('id')).order_by('shift')),
        }

        # Daily trend (last 30 days)
        daily_trend = list(
            dry_qs.values('date').annotate(
                dry_count=Count('id')
            ).order_by('date')[:30]
        )

        return Response({
            'dry': dry_stats,
            'wet': wet_stats,
            'combined': {
                'total': dry_stats['total'] + wet_stats['total'],
                'draft': dry_stats['draft'] + wet_stats['draft'],
                'submitted': dry_stats['submitted'] + wet_stats['submitted'],
                'approved': dry_stats['approved'] + wet_stats['approved'],
                'rejected': dry_stats['rejected'] + wet_stats['rejected'],
            },
            'shift_breakdown': shift_breakdown,
            'daily_trend': daily_trend,
        })


class ShiftReportView(APIView):
    """Generate shift-level report data."""
    permission_classes = [IsOperatorOrHigher]

    def get(self, request):
        date = request.query_params.get('date')
        shift = request.query_params.get('shift')

        if not date:
            return Response({'error': 'date parameter is required.'}, status=400)

        dry_qs = AHPDryLogEntry.objects.filter(date=date)
        wet_qs = AHPWetLogEntry.objects.filter(date=date)

        if shift:
            dry_qs = dry_qs.filter(shift=shift)
            wet_qs = wet_qs.filter(shift=shift)

        return Response({
            'date': date,
            'shift': shift,
            'dry_entries': AHPDryLogListSerializer(dry_qs, many=True).data,
            'wet_entries': AHPWetLogListSerializer(wet_qs, many=True).data,
        })


class ExportExcelView(APIView):
    """Export logbook data as Excel file."""
    permission_classes = [IsOperatorOrHigher]

    def get(self, request):
        if not HAS_OPENPYXL:
            return Response({'error': 'openpyxl not installed'}, status=500)

        report_type = request.query_params.get('type', 'shift')  # shift / daily / monthly
        date_from = request.query_params.get('date_from')
        date_to = request.query_params.get('date_to')
        log_type = request.query_params.get('log_type', 'dry')  # dry / wet / all

        wb = openpyxl.Workbook()

        if log_type in ('dry', 'all'):
            ws_dry = wb.active if log_type == 'dry' else wb.create_sheet('Dry System')
            ws_dry.title = 'Dry System'
            dry_qs = AHPDryLogEntry.objects.select_related('prepared_by', 'approved_by').all()
            if date_from:
                dry_qs = dry_qs.filter(date__gte=date_from)
            if date_to:
                dry_qs = dry_qs.filter(date__lte=date_to)

            headers = ['Date', 'Shift', 'Status', 'Prepared By', 'Approved By',
                       'IC-1 Initial', 'IC-1 Final', 'IC-2 Initial', 'IC-2 Final',
                       'Fine Ash Silo (%)', 'Coarse Ash Silo (%)', '300MT Silo (%)',
                       'Fly Ash (MT)', 'Observations', 'Remarks', 'Created At']
            ws_dry.append(headers)
            for entry in dry_qs:
                ws_dry.append([
                    str(entry.date), entry.get_shift_display(), entry.get_status_display(),
                    entry.prepared_by.full_name if entry.prepared_by else '',
                    entry.approved_by.full_name if entry.approved_by else '',
                    entry.ic1_initial, entry.ic1_final, entry.ic2_initial, entry.ic2_final,
                    entry.fine_ash_silo_level, entry.coarse_ash_silo_level,
                    entry.mt300_ash_silo_level, entry.fly_ash_quantity,
                    entry.observations, entry.remarks,
                    str(entry.created_at),
                ])

        if log_type in ('wet', 'all'):
            ws_wet = wb.active if log_type == 'wet' else wb.create_sheet('Wet System')
            if log_type == 'wet':
                ws_wet.title = 'Wet System'
            wet_qs = AHPWetLogEntry.objects.select_related('prepared_by', 'approved_by').all()
            if date_from:
                wet_qs = wet_qs.filter(date__gte=date_from)
            if date_to:
                wet_qs = wet_qs.filter(date__lte=date_to)

            headers = ['Date', 'Shift', 'Status', 'Prepared By', 'Approved By',
                       'Unit-1 Load (MW)', 'Unit-1 Coal Flow', 'Unit-2 Load (MW)', 'Unit-2 Coal Flow',
                       'Events/Remarks', 'Follow-up', 'Observations', 'Created At']
            ws_wet.append(headers)
            for entry in wet_qs:
                ws_wet.append([
                    str(entry.date), entry.get_shift_display(), entry.get_status_display(),
                    entry.prepared_by.full_name if entry.prepared_by else '',
                    entry.approved_by.full_name if entry.approved_by else '',
                    entry.unit1_load, entry.unit1_coal_flow, entry.unit2_load, entry.unit2_coal_flow,
                    entry.events_remarks, entry.follow_up, entry.observations,
                    str(entry.created_at),
                ])

        # Remove default empty sheet if 'all'
        if log_type == 'all' and 'Sheet' in wb.sheetnames:
            del wb['Sheet']

        # Style headers
        from openpyxl.styles import Font, PatternFill, Alignment
        header_font = Font(bold=True, color='FFFFFF')
        header_fill = PatternFill(start_color='0D3B6E', end_color='0D3B6E', fill_type='solid')
        for ws in wb.worksheets:
            for cell in ws[1]:
                cell.font = header_font
                cell.fill = header_fill
                cell.alignment = Alignment(horizontal='center')
            # Auto-width columns
            for col in ws.columns:
                max_len = max(len(str(cell.value or '')) for cell in col)
                ws.column_dimensions[col[0].column_letter].width = min(max_len + 3, 40)

        output = io.BytesIO()
        wb.save(output)
        output.seek(0)

        filename = f'AHP_Logbook_{log_type}_{date_from or "all"}_{date_to or "all"}.xlsx'
        response = HttpResponse(
            output.read(),
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        response['Content-Disposition'] = f'attachment; filename="{filename}"'

        # Audit log
        try:
            from audit.utils import log_audit
            log_audit(request, 'export', 'Report', '', filename, extra_info=f'Excel export: {log_type}')
        except Exception:
            pass

        return response


class ApprovalStatusReportView(APIView):
    """Report showing approval status breakdown."""
    permission_classes = [IsOperatorOrHigher]

    def get(self, request):
        date_from = request.query_params.get('date_from')
        date_to = request.query_params.get('date_to')

        dry_qs = AHPDryLogEntry.objects.select_related('prepared_by', 'approved_by')
        wet_qs = AHPWetLogEntry.objects.select_related('prepared_by', 'approved_by')

        if date_from:
            dry_qs = dry_qs.filter(date__gte=date_from)
            wet_qs = wet_qs.filter(date__gte=date_from)
        if date_to:
            dry_qs = dry_qs.filter(date__lte=date_to)
            wet_qs = wet_qs.filter(date__lte=date_to)

        pending_dry = dry_qs.filter(status='submitted')
        pending_wet = wet_qs.filter(status='submitted')

        return Response({
            'pending_approvals': {
                'dry': AHPDryLogListSerializer(pending_dry, many=True).data,
                'wet': AHPWetLogListSerializer(pending_wet, many=True).data,
                'dry_count': pending_dry.count(),
                'wet_count': pending_wet.count(),
            },
            'approval_summary': {
                'dry': list(dry_qs.values('status').annotate(count=Count('id'))),
                'wet': list(wet_qs.values('status').annotate(count=Count('id'))),
            }
        })
