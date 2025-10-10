from django.urls import path, include

from . import views
from . import api

urlpatterns = [
    path("", views.WaybillView.as_view(), name="waybill-form"),
    path("<int:pk>/", views.WaybillDetailView.as_view(), name="waybill-detail"),
    path("<int:pk>/pdf/", views.waybill_pdf, name="waybill-pdf"),
    path("api/", include([
        path("create/", api.create_waybill, name="api-waybill-create"),
        path("<int:pk>/", api.get_waybill, name="api-waybill-get"),
    ])),
]
