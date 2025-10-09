from django import forms

from .models import Receipt


class ReceiptForm(forms.ModelForm):
    class Meta:
        model = Receipt
        fields = [
            "received_from",
            "issue_date",
            "amount",
            "description",
            "payment_method",
            "approved_by",
        ]
        widgets = {
            "issue_date": forms.DateInput(attrs={"type": "date"}),
            "amount": forms.NumberInput(attrs={"step": "0.01"}),
        }
