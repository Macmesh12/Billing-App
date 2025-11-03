from django import forms

from .models import Receipt


class ReceiptForm(forms.ModelForm):
    document_number = forms.CharField(widget=forms.HiddenInput(), required=False)

    class Meta:
        model = Receipt
        fields = [
            "received_from",
            "issue_date",
            "amount",
            "description",
            "payment_method",
            "approved_by",
            "document_number",
        ]
        widgets = {
            "issue_date": forms.DateInput(attrs={"type": "date"}),
            "amount": forms.NumberInput(attrs={"step": "0.01"}),
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        if self.instance and self.instance.pk:
            self.fields["document_number"].initial = self.instance.document_number

    def save(self, commit=True):
        instance: Receipt = super().save(commit=False)
        document_number = self.cleaned_data.get("document_number")
        if document_number:
            instance.document_number = document_number
        if commit:
            instance.save()
        return instance
