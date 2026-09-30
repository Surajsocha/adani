from django.urls import path
from .views import (
    ReportSummaryView, ShiftReportView,
    ExportExcelView, ExportPDFView,
    ApprovalStatusReportView,
    DailyReportView, MonthlyReportView,
    DepartmentReportView, ExceptionReportView,
)

urlpatterns = [
    path('summary/', ReportSummaryView.as_view(), name='report-summary'),
    path('shift/', ShiftReportView.as_view(), name='report-shift'),
    path('daily/', DailyReportView.as_view(), name='report-daily'),
    path('monthly/', MonthlyReportView.as_view(), name='report-monthly'),
    path('department/', DepartmentReportView.as_view(), name='report-department'),
    path('exceptions/', ExceptionReportView.as_view(), name='report-exceptions'),
    path('export/excel/', ExportExcelView.as_view(), name='report-export-excel'),
    path('export/pdf/', ExportPDFView.as_view(), name='report-export-pdf'),
    path('approval-status/', ApprovalStatusReportView.as_view(), name='report-approval-status'),
]
