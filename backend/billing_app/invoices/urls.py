from django.urls import path, include

from . import views

from . import api

urlpatterns = [
    path("", views.InvoiceView.as_view(), name="invoice-form"),
    path("<int:pk>/", views.InvoiceDetailView.as_view(), name="invoice-detail"),
    path("<int:pk>/pdf/", views.invoice_pdf, name="invoice-pdf"),
    path("preview/calculations/", views.invoice_calculate_preview, name="invoice-preview"),
    path("api/", include([
        path("calculate-preview/", api.calculate_preview, name="api-invoice-calc"),
        path("create/", api.create_invoice, name="api-invoice-create"),
        path("config/", api.get_config, name="api-invoice-config"),
        path("<int:pk>/", api.get_invoice, name="api-invoice-get"),
    ])),
]
