from django.urls import path
from .views import (
    ReportSummaryView, ShiftReportView,
    ExportExcelView, ApprovalStatusReportView,
)

urlpatterns = [
    path('summary/', ReportSummaryView.as_view(), name='report-summary'),
    path('shift/', ShiftReportView.as_view(), name='report-shift'),
    path('export/excel/', ExportExcelView.as_view(), name='report-export-excel'),
    path('approval-status/', ApprovalStatusReportView.as_view(), name='report-approval-status'),
]
