from django.urls import path
from .views import MeView, RootOnlyView, AdminOnlyView, AdminCreateView

urlpatterns = [
    path('me/', MeView.as_view(), name='me'),
    path('admin/create/', AdminCreateView.as_view(), name='admin-create'),
    path('root-test/', RootOnlyView.as_view(), name='root-test'),
    path('admin-test/', AdminOnlyView.as_view(), name='admin-test'),
]
