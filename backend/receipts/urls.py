from django.urls import path, include

from . import views
from . import api

urlpatterns = [
    path("", views.ReceiptView.as_view(), name="receipt-form"),
    path("<int:pk>/", views.ReceiptDetailView.as_view(), name="receipt-detail"),
    path("<int:pk>/pdf/", views.receipt_pdf, name="receipt-pdf"),
    path("api/", include([
        path("create/", api.create_receipt, name="api-receipt-create"),
        path("<int:pk>/", api.get_receipt, name="api-receipt-get"),
    ])),
]
