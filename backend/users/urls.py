from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import UserViewSet, DepartmentViewSet

router = DefaultRouter()
router.register('departments', DepartmentViewSet, basename='department')
router.register('', UserViewSet, basename='user')

urlpatterns = [
    path('', include(router.urls)),
]
