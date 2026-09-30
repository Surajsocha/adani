from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    AHPDryLogViewSet, AHPWetLogViewSet,
    EventRecordViewSet, ShiftHandoverViewSet,
    ArchivedLogbookViewSet, AdvancedSearchView,
    DashboardStatsView, AutoSaveView, EscalationView,
)

router = DefaultRouter()
router.register('dry', AHPDryLogViewSet, basename='ahp-dry')
router.register('wet', AHPWetLogViewSet, basename='ahp-wet')
router.register('events', EventRecordViewSet, basename='event-record')
router.register('handover', ShiftHandoverViewSet, basename='shift-handover')
router.register('archive', ArchivedLogbookViewSet, basename='archived-logbook')
router.register('search', AdvancedSearchView, basename='advanced-search')
router.register('dashboard-stats', DashboardStatsView, basename='dashboard-stats')
router.register('auto-save', AutoSaveView, basename='auto-save')
router.register('escalation', EscalationView, basename='escalation')

urlpatterns = [
    path('', include(router.urls)),
]
