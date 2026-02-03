from django.http import HttpRequest, HttpResponse
from django.shortcuts import redirect, render
from django.urls import reverse
from django.views.generic import FormView, TemplateView

from .forms import ReceiptForm
from .models import Receipt
from .services import numbering


class ReceiptView(FormView):
    template_name = "receipt.html"
    form_class = ReceiptForm

    def form_valid(self, form: ReceiptForm):
        receipt = form.save()
        self.receipt = receipt
        return redirect(self.get_success_url())

    def get_success_url(self):
        return reverse("receipt-detail", kwargs={"pk": self.receipt.pk})


class ReceiptDetailView(TemplateView):
    template_name = "receipt.html"

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        receipt = Receipt.objects.get(pk=self.kwargs["pk"])
        context["receipt"] = receipt
        context["preview"] = True
        context["form"] = ReceiptForm(instance=receipt)
        return context


def receipt_pdf(request: HttpRequest, pk: int) -> HttpResponse:
    from billing_app.pdf_generator import generate_receipt_pdf
    
    receipt = Receipt.objects.get(pk=pk)
    
    # Generate PDF using ReportLab
    pdf_buffer = generate_receipt_pdf(receipt)
    
    response = HttpResponse(pdf_buffer.read(), content_type="application/pdf")
    response["Content-Disposition"] = f"attachment; filename={numbering.format_receipt_number(receipt.pk)}.pdf"
    return response
