import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:printing/printing.dart';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import '../providers/app_state.dart';
import '../widgets/custom_button.dart';
import '../utils/pdf_generator.dart';

class InvoiceScreen extends StatefulWidget {
  const InvoiceScreen({super.key});

  @override
  State<InvoiceScreen> createState() => _InvoiceScreenState();
}

class _InvoiceScreenState extends State<InvoiceScreen> {
  bool isEditMode = true;

  @override
  Widget build(BuildContext context) {
    final appState = Provider.of<AppState>(context);
    final invoice = appState.invoiceData;

    return Scaffold(
      appBar: AppBar(
        title: Text(isEditMode ? 'Create Invoice' : 'Invoice Preview'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => appState.setActiveView('home'),
        ),
        actions: [
          if (isEditMode)
            TextButton.icon(
              icon: const Icon(Icons.visibility),
              label: const Text('Preview'),
              onPressed: () => setState(() => isEditMode = false),
            )
          else
            TextButton.icon(
              icon: const Icon(Icons.edit),
              label: const Text('Edit'),
              onPressed: () => setState(() => isEditMode = true),
            ),
          if (!isEditMode)
            TextButton.icon(
              icon: const Icon(Icons.print),
              label: const Text('Export PDF'),
              onPressed: () => _exportPDF(context, invoice),
            ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Center(
          child: Container(
            constraints: const BoxConstraints(maxWidth: 800),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(12),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.1),
                  blurRadius: 20,
                  offset: const Offset(0, 4),
                ),
              ],
            ),
            padding: const EdgeInsets.all(48),
            child: isEditMode
                ? _buildEditView(context, appState)
                : _buildPreviewView(context, invoice),
          ),
        ),
      ),
    );
  }

  Widget _buildEditView(BuildContext context, AppState appState) {
    final invoice = appState.invoiceData;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'INVOICE',
          style: TextStyle(
            fontSize: 40,
            fontWeight: FontWeight.bold,
            color: Color(0xFFEAB308),
          ),
        ),
        const SizedBox(height: 32),

        // Invoice Details
        Row(
          children: [
            Expanded(
              child: _buildTextField(
                label: 'Invoice Number',
                value: invoice.invoiceNumber,
                onChanged: (v) => appState.updateInvoiceData(
                  invoice.copyWith(invoiceNumber: v),
                ),
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: _buildTextField(
                label: 'Date',
                value: invoice.date,
                onChanged: (v) => appState.updateInvoiceData(
                  invoice.copyWith(date: v),
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 16),

        _buildTextField(
          label: 'Classification',
          value: invoice.classification,
          onChanged: (v) => appState.updateInvoiceData(
            invoice.copyWith(classification: v),
          ),
        ),
        const SizedBox(height: 24),

        // Customer Details
        const Text(
          'Customer Details',
          style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 16),

        _buildTextField(
          label: 'Customer Name',
          value: invoice.customerName,
          onChanged: (v) => appState.updateInvoiceData(
            invoice.copyWith(customerName: v),
          ),
        ),
        const SizedBox(height: 16),

        _buildTextField(
          label: 'Address',
          value: invoice.customerAddress,
          onChanged: (v) => appState.updateInvoiceData(
            invoice.copyWith(customerAddress: v),
          ),
        ),
        const SizedBox(height: 16),

        _buildTextField(
          label: 'City',
          value: invoice.customerCity,
          onChanged: (v) => appState.updateInvoiceData(
            invoice.copyWith(customerCity: v),
          ),
        ),
        const SizedBox(height: 24),

        // Notes
        _buildTextField(
          label: 'Notes',
          value: invoice.notes,
          maxLines: 3,
          onChanged: (v) => appState.updateInvoiceData(
            invoice.copyWith(notes: v),
          ),
        ),
        const SizedBox(height: 32),

        CustomButton(
          text: 'Preview Invoice',
          icon: Icons.visibility,
          onPressed: () => setState(() => isEditMode = false),
        ),
      ],
    );
  }

  Widget _buildPreviewView(BuildContext context, invoice) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Header
        const Text(
          'INVOICE',
          style: TextStyle(
            fontSize: 48,
            fontWeight: FontWeight.bold,
            color: Color(0xFFEAB308),
          ),
        ),
        const Divider(height: 32, thickness: 2),

        // Invoice Info
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Invoice Number', style: TextStyle(color: Colors.grey)),
                Text(invoice.invoiceNumber, style: const TextStyle(fontWeight: FontWeight.bold)),
              ],
            ),
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                const Text('Date', style: TextStyle(color: Colors.grey)),
                Text(invoice.date, style: const TextStyle(fontWeight: FontWeight.bold)),
              ],
            ),
          ],
        ),
        const SizedBox(height: 24),

        // Customer
        const Text('Bill To:', style: TextStyle(color: Colors.grey, fontSize: 12)),
        const SizedBox(height: 8),
        Text(
          invoice.customerName,
          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
        ),
        Text(invoice.customerAddress),
        Text(invoice.customerCity),
        const SizedBox(height: 32),

        // Items Table
        Container(
          decoration: BoxDecoration(
            border: Border.all(color: Colors.grey.shade300),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Column(
            children: [
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.grey.shade100,
                  borderRadius: const BorderRadius.vertical(top: Radius.circular(8)),
                ),
                child: const Row(
                  children: [
                    Expanded(flex: 3, child: Text('Description', style: TextStyle(fontWeight: FontWeight.bold))),
                    Expanded(child: Text('Qty', textAlign: TextAlign.right, style: TextStyle(fontWeight: FontWeight.bold))),
                    Expanded(child: Text('Price', textAlign: TextAlign.right, style: TextStyle(fontWeight: FontWeight.bold))),
                    Expanded(child: Text('Amount', textAlign: TextAlign.right, style: TextStyle(fontWeight: FontWeight.bold))),
                  ],
                ),
              ),
              ...invoice.lineItems.map((item) => Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      border: Border(top: BorderSide(color: Colors.grey.shade200)),
                    ),
                    child: Row(
                      children: [
                        Expanded(flex: 3, child: Text(item.description)),
                        Expanded(child: Text('${item.qty}', textAlign: TextAlign.right)),
                        Expanded(child: Text('₵${item.unitPrice.toStringAsFixed(2)}', textAlign: TextAlign.right)),
                        Expanded(child: Text('₵${item.amount.toStringAsFixed(2)}', textAlign: TextAlign.right, style: const TextStyle(fontWeight: FontWeight.bold))),
                      ],
                    ),
                  )),
            ],
          ),
        ),
        const SizedBox(height: 24),

        // Totals
        Column(
          children: [
            _buildTotalRow('Subtotal', invoice.subtotal),
            _buildTotalRow('NHIL (2.5%)', invoice.nhil),
            _buildTotalRow('GETFUND (2.5%)', invoice.getFund),
            _buildTotalRow('VAT (15%)', invoice.vat),
            const Divider(),
            _buildTotalRow('TOTAL', invoice.total, isTotal: true),
          ],
        ),
        const SizedBox(height: 24),

        // Notes
        if (invoice.notes.isNotEmpty) ...[
          const Text('Notes:', style: TextStyle(fontWeight: FontWeight.bold)),
          const SizedBox(height: 8),
          Text(invoice.notes, style: const TextStyle(color: Colors.grey)),
        ],
      ],
    );
  }

  Widget _buildTotalRow(String label, double amount, {bool isTotal = false}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.end,
        children: [
          SizedBox(
            width: 120,
            child: Text(
              label,
              style: TextStyle(
                fontWeight: isTotal ? FontWeight.bold : FontWeight.normal,
                fontSize: isTotal ? 16 : 14,
              ),
            ),
          ),
          const SizedBox(width: 24),
          SizedBox(
            width: 100,
            child: Text(
              '₵${amount.toStringAsFixed(2)}',
              textAlign: TextAlign.right,
              style: TextStyle(
                fontWeight: isTotal ? FontWeight.bold : FontWeight.normal,
                fontSize: isTotal ? 18 : 14,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTextField({
    required String label,
    required String value,
    required Function(String) onChanged,
    int maxLines = 1,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: const TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w600,
            color: Color(0xFF374151),
          ),
        ),
        const SizedBox(height: 6),
        TextFormField(
          initialValue: value,
          maxLines: maxLines,
          onChanged: onChanged,
          decoration: InputDecoration(
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(8),
            ),
            contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
          ),
        ),
      ],
    );
  }

  Future<void> _exportPDF(BuildContext context, invoice) async {
    final pdf = await PDFGenerator.generateInvoicePDF(invoice);
    await Printing.layoutPdf(onLayout: (format) => pdf.save());
  }
}
