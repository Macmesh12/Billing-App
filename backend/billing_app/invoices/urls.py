from django.urls import path

from . import views

urlpatterns = [
    path("", views.InvoiceView.as_view(), name="invoice-form"),
    path("<int:pk>/", views.InvoiceDetailView.as_view(), name="invoice-detail"),
    path("<int:pk>/pdf/", views.invoice_pdf, name="invoice-pdf"),
    path("preview/calculations/", views.invoice_calculate_preview, name="invoice-preview"),
]
