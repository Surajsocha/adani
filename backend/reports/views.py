"""
Report generation views for PDF and Excel export.
Generates: Shift reports, Daily reports, Monthly reports,
Department-wise reports, Approval status reports, Exception reports.
"""
import io
import json
from datetime import datetime, timedelta, date
from calendar import monthrange

from django.http import HttpResponse
from django.db.models import Count, Q, F
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions

from ahp_logbook.models import AHPDryLogEntry, AHPWetLogEntry, EventRecord, ShiftHandover
from ahp_logbook.serializers import AHPDryLogListSerializer, AHPWetLogListSerializer
from users.permissions import IsOperatorOrHigher

try:
    import openpyxl
    HAS_OPENPYXL = True
except ImportError:
    HAS_OPENPYXL = False

try:
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4, landscape
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import inch, mm
    from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, PageBreak
    from reportlab.lib.enums import TA_CENTER, TA_LEFT
    HAS_REPORTLAB = True
except ImportError:
    HAS_REPORTLAB = False


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


# ─── DAILY REPORT (SOW Section G) ────────────────────────────────────────────

class DailyReportView(APIView):
    """Generate daily aggregated report for a given date."""
    permission_classes = [IsOperatorOrHigher]

    def get(self, request):
        report_date = request.query_params.get('date')
        if not report_date:
            report_date = str(date.today())

        dry_entries = AHPDryLogEntry.objects.filter(date=report_date).select_related(
            'prepared_by', 'approved_by'
        )
        wet_entries = AHPWetLogEntry.objects.filter(date=report_date).select_related(
            'prepared_by', 'approved_by'
        )
        events = EventRecord.objects.filter(date=report_date).select_related('reported_by')
        handovers = ShiftHandover.objects.filter(date=report_date).select_related(
            'outgoing_person', 'incoming_person'
        )

        # Shift-wise breakdown for the day
        shift_summary = []
        for shift_code, shift_label in [('A', 'A Shift'), ('B', 'B Shift'), ('C', 'C Shift'), ('G', 'General')]:
            shift_summary.append({
                'shift': shift_label,
                'shift_code': shift_code,
                'dry_count': dry_entries.filter(shift=shift_code).count(),
                'wet_count': wet_entries.filter(shift=shift_code).count(),
                'dry_status': list(dry_entries.filter(shift=shift_code).values('status').annotate(count=Count('id'))),
                'wet_status': list(wet_entries.filter(shift=shift_code).values('status').annotate(count=Count('id'))),
            })

        return Response({
            'date': report_date,
            'dry_entries': AHPDryLogListSerializer(dry_entries, many=True).data,
            'wet_entries': AHPWetLogListSerializer(wet_entries, many=True).data,
            'shift_summary': shift_summary,
            'events': {
                'total': events.count(),
                'by_category': list(events.values('category').annotate(count=Count('id'))),
                'by_severity': list(events.values('severity').annotate(count=Count('id'))),
            },
            'handovers': {
                'total': handovers.count(),
                'acknowledged': handovers.filter(is_acknowledged=True).count(),
                'pending': handovers.filter(is_acknowledged=False).count(),
            },
            'totals': {
                'dry': dry_entries.count(),
                'wet': wet_entries.count(),
                'events': events.count(),
                'handovers': handovers.count(),
            },
        })


# ─── MONTHLY REPORT (SOW Section G) ──────────────────────────────────────────

class MonthlyReportView(APIView):
    """Generate monthly aggregated report for a given month/year."""
    permission_classes = [IsOperatorOrHigher]

    def get(self, request):
        year = int(request.query_params.get('year', date.today().year))
        month = int(request.query_params.get('month', date.today().month))

        first_day = date(year, month, 1)
        last_day = date(year, month, monthrange(year, month)[1])

        dry_qs = AHPDryLogEntry.objects.filter(date__gte=first_day, date__lte=last_day)
        wet_qs = AHPWetLogEntry.objects.filter(date__gte=first_day, date__lte=last_day)
        event_qs = EventRecord.objects.filter(date__gte=first_day, date__lte=last_day)

        # Daily breakdown for the month
        daily_breakdown = []
        for day_num in range(1, last_day.day + 1):
            d = date(year, month, day_num)
            daily_breakdown.append({
                'date': str(d),
                'dry': dry_qs.filter(date=d).count(),
                'wet': wet_qs.filter(date=d).count(),
                'events': event_qs.filter(date=d).count(),
            })

        # Status breakdown
        dry_status = dry_qs.aggregate(
            total=Count('id'),
            draft=Count('id', filter=Q(status='draft')),
            submitted=Count('id', filter=Q(status='submitted')),
            approved=Count('id', filter=Q(status='approved')),
            rejected=Count('id', filter=Q(status='rejected')),
        )
        wet_status = wet_qs.aggregate(
            total=Count('id'),
            draft=Count('id', filter=Q(status='draft')),
            submitted=Count('id', filter=Q(status='submitted')),
            approved=Count('id', filter=Q(status='approved')),
            rejected=Count('id', filter=Q(status='rejected')),
        )

        # Shift-wise
        shift_breakdown = []
        for shift_code, shift_label in [('A', 'A Shift'), ('B', 'B Shift'), ('C', 'C Shift'), ('G', 'General')]:
            shift_breakdown.append({
                'shift': shift_label,
                'dry': dry_qs.filter(shift=shift_code).count(),
                'wet': wet_qs.filter(shift=shift_code).count(),
            })

        return Response({
            'year': year,
            'month': month,
            'month_name': first_day.strftime('%B'),
            'date_range': {'from': str(first_day), 'to': str(last_day)},
            'dry': dry_status,
            'wet': wet_status,
            'combined': {
                'total': dry_status['total'] + wet_status['total'],
                'approved': dry_status['approved'] + wet_status['approved'],
                'rejected': dry_status['rejected'] + wet_status['rejected'],
            },
            'events': {
                'total': event_qs.count(),
                'by_category': list(event_qs.values('category').annotate(count=Count('id')).order_by('-count')),
                'by_severity': list(event_qs.values('severity').annotate(count=Count('id'))),
                'open': event_qs.filter(event_status__in=['open', 'in_progress']).count(),
                'resolved': event_qs.filter(event_status__in=['resolved', 'closed']).count(),
            },
            'shift_breakdown': shift_breakdown,
            'daily_breakdown': daily_breakdown,
        })


# ─── DEPARTMENT-WISE REPORT (SOW Section G) ──────────────────────────────────

class DepartmentReportView(APIView):
    """Generate department-wise aggregated report."""
    permission_classes = [IsOperatorOrHigher]

    def get(self, request):
        date_from = request.query_params.get('date_from')
        date_to = request.query_params.get('date_to')
        department = request.query_params.get('department')

        event_qs = EventRecord.objects.all()
        if date_from:
            event_qs = event_qs.filter(date__gte=date_from)
        if date_to:
            event_qs = event_qs.filter(date__lte=date_to)
        if department:
            event_qs = event_qs.filter(department=department)

        # Department-wise event summary
        dept_summary = list(
            event_qs.values('department').annotate(
                total=Count('id'),
                open=Count('id', filter=Q(event_status__in=['open', 'in_progress'])),
                resolved=Count('id', filter=Q(event_status__in=['resolved', 'closed'])),
                critical=Count('id', filter=Q(severity='critical')),
                high=Count('id', filter=Q(severity='high')),
                medium=Count('id', filter=Q(severity='medium')),
                low=Count('id', filter=Q(severity='low')),
            ).order_by('-total')
        )

        # Category breakdown per department
        dept_category = list(
            event_qs.values('department', 'category').annotate(
                count=Count('id')
            ).order_by('department', '-count')
        )

        # AHP-specific logbook stats (Dry & Wet always belong to AHP)
        dry_qs = AHPDryLogEntry.objects.all()
        wet_qs = AHPWetLogEntry.objects.all()
        if date_from:
            dry_qs = dry_qs.filter(date__gte=date_from)
            wet_qs = wet_qs.filter(date__gte=date_from)
        if date_to:
            dry_qs = dry_qs.filter(date__lte=date_to)
            wet_qs = wet_qs.filter(date__lte=date_to)

        return Response({
            'department_summary': dept_summary,
            'department_category_breakdown': dept_category,
            'ahp_logbook_stats': {
                'dry_total': dry_qs.count(),
                'wet_total': wet_qs.count(),
                'dry_approved': dry_qs.filter(status='approved').count(),
                'wet_approved': wet_qs.filter(status='approved').count(),
            },
            'filters': {
                'date_from': date_from,
                'date_to': date_to,
                'department': department,
            },
        })


# ─── EXCEPTION REPORT (SOW Section G) ────────────────────────────────────────

class ExceptionReportView(APIView):
    """
    Exception report: identifies missed entries, overdue approvals,
    rejected entries, and other anomalies.
    """
    permission_classes = [IsOperatorOrHigher]

    def get(self, request):
        date_from = request.query_params.get('date_from')
        date_to = request.query_params.get('date_to')

        if not date_from:
            date_from = str(date.today() - timedelta(days=30))
        if not date_to:
            date_to = str(date.today())

        # 1. Overdue approvals: entries submitted > 24 hours ago still not approved
        overdue_threshold = timezone.now() - timedelta(hours=24)
        overdue_dry = AHPDryLogEntry.objects.filter(
            status='submitted', updated_at__lt=overdue_threshold
        ).select_related('prepared_by')
        overdue_wet = AHPWetLogEntry.objects.filter(
            status='submitted', updated_at__lt=overdue_threshold
        ).select_related('prepared_by')

        # 2. Rejected entries (need re-submission)
        rejected_dry = AHPDryLogEntry.objects.filter(
            status='rejected', date__gte=date_from, date__lte=date_to
        ).select_related('prepared_by', 'approved_by')
        rejected_wet = AHPWetLogEntry.objects.filter(
            status='rejected', date__gte=date_from, date__lte=date_to
        ).select_related('prepared_by', 'approved_by')

        # 3. Missing entries: dates within range that have no logbook entry
        start_date = datetime.strptime(date_from, '%Y-%m-%d').date()
        end_date = datetime.strptime(date_to, '%Y-%m-%d').date()
        all_dates = set()
        current = start_date
        while current <= end_date:
            all_dates.add(current)
            current += timedelta(days=1)

        dry_dates = set(AHPDryLogEntry.objects.filter(
            date__gte=date_from, date__lte=date_to
        ).values_list('date', flat=True).distinct())
        wet_dates = set(AHPWetLogEntry.objects.filter(
            date__gte=date_from, date__lte=date_to
        ).values_list('date', flat=True).distinct())

        missing_dry_dates = sorted(all_dates - dry_dates)
        missing_wet_dates = sorted(all_dates - wet_dates)

        # 4. Unacknowledged handovers
        unack_handovers = ShiftHandover.objects.filter(
            is_acknowledged=False, date__gte=date_from, date__lte=date_to
        ).select_related('outgoing_person')

        # 5. Open critical/high severity events
        critical_events = EventRecord.objects.filter(
            severity__in=['critical', 'high'],
            event_status__in=['open', 'in_progress'],
        ).select_related('reported_by')

        return Response({
            'date_range': {'from': date_from, 'to': date_to},
            'overdue_approvals': {
                'dry_count': overdue_dry.count(),
                'wet_count': overdue_wet.count(),
                'dry_entries': AHPDryLogListSerializer(overdue_dry, many=True).data,
                'wet_entries': AHPWetLogListSerializer(overdue_wet, many=True).data,
            },
            'rejected_entries': {
                'dry_count': rejected_dry.count(),
                'wet_count': rejected_wet.count(),
                'dry_entries': AHPDryLogListSerializer(rejected_dry, many=True).data,
                'wet_entries': AHPWetLogListSerializer(rejected_wet, many=True).data,
            },
            'missing_entries': {
                'dry_missing_dates': [str(d) for d in missing_dry_dates[:30]],
                'wet_missing_dates': [str(d) for d in missing_wet_dates[:30]],
                'dry_missing_count': len(missing_dry_dates),
                'wet_missing_count': len(missing_wet_dates),
            },
            'unacknowledged_handovers': {
                'count': unack_handovers.count(),
                'entries': [
                    {
                        'id': h.id, 'date': str(h.date),
                        'outgoing_shift': h.get_outgoing_shift_display(),
                        'outgoing_person': h.outgoing_person.full_name if h.outgoing_person else '',
                    }
                    for h in unack_handovers[:20]
                ],
            },
            'critical_open_events': {
                'count': critical_events.count(),
                'entries': [
                    {
                        'id': e.id, 'date': str(e.date), 'title': e.title,
                        'severity': e.get_severity_display(),
                        'category': e.get_category_display(),
                        'reported_by': e.reported_by.full_name if e.reported_by else '',
                    }
                    for e in critical_events[:20]
                ],
            },
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


# ─── PDF EXPORT (SOW Section G) ──────────────────────────────────────────────

class ExportPDFView(APIView):
    """Export logbook data as PDF file."""
    permission_classes = [IsOperatorOrHigher]

    def get(self, request):
        if not HAS_REPORTLAB:
            return Response({'error': 'reportlab not installed. Run: pip install reportlab'}, status=500)

        date_from = request.query_params.get('date_from')
        date_to = request.query_params.get('date_to')
        log_type = request.query_params.get('log_type', 'dry')  # dry / wet / all

        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer, pagesize=landscape(A4),
            rightMargin=20*mm, leftMargin=20*mm,
            topMargin=20*mm, bottomMargin=20*mm,
        )

        styles = getSampleStyleSheet()
        title_style = ParagraphStyle(
            'CustomTitle', parent=styles['Title'],
            fontSize=16, spaceAfter=12, alignment=TA_CENTER,
            textColor=colors.HexColor('#0D3B6E'),
        )
        subtitle_style = ParagraphStyle(
            'CustomSubtitle', parent=styles['Normal'],
            fontSize=10, spaceAfter=8, alignment=TA_CENTER,
            textColor=colors.HexColor('#666666'),
        )
        section_style = ParagraphStyle(
            'SectionHeader', parent=styles['Heading2'],
            fontSize=13, spaceAfter=6, spaceBefore=12,
            textColor=colors.HexColor('#0D3B6E'),
        )

        elements = []

        # Title
        elements.append(Paragraph('ADTPS – AHP Digital Logbook Report', title_style))
        date_label = f"Period: {date_from or 'All'} to {date_to or 'All'}"
        elements.append(Paragraph(date_label, subtitle_style))
        elements.append(Paragraph(
            f"Generated: {datetime.now().strftime('%d-%m-%Y %H:%M')} | Document: ADTPS/AHP/OPN/F/01 & F/02",
            subtitle_style
        ))
        elements.append(Spacer(1, 12))

        # Dry System Table
        if log_type in ('dry', 'all'):
            dry_qs = AHPDryLogEntry.objects.select_related('prepared_by', 'approved_by').all()
            if date_from:
                dry_qs = dry_qs.filter(date__gte=date_from)
            if date_to:
                dry_qs = dry_qs.filter(date__lte=date_to)

            elements.append(Paragraph('Dry System Log Entries', section_style))
            table_data = [['Date', 'Shift', 'Status', 'Prepared By', 'Approved By',
                           'Fine Ash Silo %', 'Coarse Ash Silo %', 'Fly Ash MT', 'Observations']]
            for entry in dry_qs[:100]:
                obs = (entry.observations or '')[:60]
                table_data.append([
                    str(entry.date), entry.get_shift_display(), entry.get_status_display(),
                    (entry.prepared_by.full_name if entry.prepared_by else '')[:20],
                    (entry.approved_by.full_name if entry.approved_by else '')[:20],
                    str(entry.fine_ash_silo_level or '-'),
                    str(entry.coarse_ash_silo_level or '-'),
                    str(entry.fly_ash_quantity or '-'),
                    obs + ('...' if len(entry.observations or '') > 60 else ''),
                ])

            if len(table_data) > 1:
                tbl = Table(table_data, repeatRows=1)
                tbl.setStyle(TableStyle([
                    ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#0D3B6E')),
                    ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
                    ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                    ('FONTSIZE', (0, 0), (-1, -1), 7),
                    ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
                    ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#CCCCCC')),
                    ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#F5F7FA')]),
                    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                    ('TOPPADDING', (0, 0), (-1, -1), 3),
                    ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
                ]))
                elements.append(tbl)
            else:
                elements.append(Paragraph('No dry system entries found.', styles['Normal']))
            elements.append(Spacer(1, 12))

        # Wet System Table
        if log_type in ('wet', 'all'):
            if log_type == 'all':
                elements.append(PageBreak())
            wet_qs = AHPWetLogEntry.objects.select_related('prepared_by', 'approved_by').all()
            if date_from:
                wet_qs = wet_qs.filter(date__gte=date_from)
            if date_to:
                wet_qs = wet_qs.filter(date__lte=date_to)

            elements.append(Paragraph('Wet System Log Entries', section_style))
            table_data = [['Date', 'Shift', 'Status', 'Prepared By', 'Approved By',
                           'U1 Load MW', 'U2 Load MW', 'Events/Remarks']]
            for entry in wet_qs[:100]:
                remarks = (entry.events_remarks or '')[:80]
                table_data.append([
                    str(entry.date), entry.get_shift_display(), entry.get_status_display(),
                    (entry.prepared_by.full_name if entry.prepared_by else '')[:20],
                    (entry.approved_by.full_name if entry.approved_by else '')[:20],
                    str(entry.unit1_load or '-'),
                    str(entry.unit2_load or '-'),
                    remarks + ('...' if len(entry.events_remarks or '') > 80 else ''),
                ])

            if len(table_data) > 1:
                tbl = Table(table_data, repeatRows=1)
                tbl.setStyle(TableStyle([
                    ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#0D3B6E')),
                    ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
                    ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                    ('FONTSIZE', (0, 0), (-1, -1), 7),
                    ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
                    ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#CCCCCC')),
                    ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#F5F7FA')]),
                    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                    ('TOPPADDING', (0, 0), (-1, -1), 3),
                    ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
                ]))
                elements.append(tbl)
            else:
                elements.append(Paragraph('No wet system entries found.', styles['Normal']))

        doc.build(elements)
        buffer.seek(0)

        filename = f'AHP_Logbook_{log_type}_{date_from or "all"}_{date_to or "all"}.pdf'
        response = HttpResponse(buffer.read(), content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="{filename}"'

        try:
            from audit.utils import log_audit
            log_audit(request, 'export', 'Report', '', filename, extra_info=f'PDF export: {log_type}')
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

