from django.urls import path

from . import views

urlpatterns = [
    path("", views.WaybillView.as_view(), name="waybill-form"),
    path("<int:pk>/", views.WaybillDetailView.as_view(), name="waybill-detail"),
    path("<int:pk>/pdf/", views.waybill_pdf, name="waybill-pdf"),
]
