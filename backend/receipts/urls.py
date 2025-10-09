from django.urls import path

from . import views

urlpatterns = [
    path("", views.ReceiptView.as_view(), name="receipt-form"),
    path("<int:pk>/", views.ReceiptDetailView.as_view(), name="receipt-detail"),
    path("<int:pk>/pdf/", views.receipt_pdf, name="receipt-pdf"),
]
