import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:printing/printing.dart';
import '../providers/app_state.dart';
import '../widgets/custom_button.dart';
import '../utils/pdf_generator.dart';

class ReceiptScreen extends StatefulWidget {
  const ReceiptScreen({super.key});

  @override
  State<ReceiptScreen> createState() => _ReceiptScreenState();
}

class _ReceiptScreenState extends State<ReceiptScreen> {
  bool isEditMode = true;

  @override
  Widget build(BuildContext context) {
    final appState = Provider.of<AppState>(context);
    final receipt = appState.receiptData;

    return Scaffold(
      appBar: AppBar(
        title: Text(isEditMode ? 'Create Receipt' : 'Receipt Preview'),
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
              onPressed: () => _exportPDF(context, receipt),
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
                : _buildPreviewView(context, receipt),
          ),
        ),
      ),
    );
  }

  Widget _buildEditView(BuildContext context, AppState appState) {
    final receipt = appState.receiptData;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'RECEIPT',
          style: TextStyle(
            fontSize: 40,
            fontWeight: FontWeight.bold,
            color: Color(0xFFEAB308),
          ),
        ),
        const SizedBox(height: 32),

        Row(
          children: [
            Expanded(
              child: _buildTextField(
                label: 'Receipt Number',
                value: receipt.receiptNumber,
                onChanged: (v) => appState.updateReceiptData(
                  receipt.copyWith(receiptNumber: v),
                ),
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: _buildTextField(
                label: 'Date',
                value: receipt.date,
                onChanged: (v) => appState.updateReceiptData(
                  receipt.copyWith(date: v),
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 24),

        const Text(
          'Customer Details',
          style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 16),

        _buildTextField(
          label: 'Received From',
          value: receipt.customerName,
          onChanged: (v) => appState.updateReceiptData(
            receipt.copyWith(customerName: v),
          ),
        ),
        const SizedBox(height: 16),

        _buildTextField(
          label: 'Address',
          value: receipt.customerAddress,
          onChanged: (v) => appState.updateReceiptData(
            receipt.copyWith(customerAddress: v),
          ),
        ),
        const SizedBox(height: 16),

        _buildTextField(
          label: 'City',
          value: receipt.customerCity,
          onChanged: (v) => appState.updateReceiptData(
            receipt.copyWith(customerCity: v),
          ),
        ),
        const SizedBox(height: 24),

        Row(
          children: [
            Expanded(
              child: _buildTextField(
                label: 'Amount Received',
                value: receipt.amountReceived.toString(),
                onChanged: (v) => appState.updateReceiptData(
                  receipt.copyWith(amountReceived: double.tryParse(v) ?? 0),
                ),
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: _buildTextField(
                label: 'Payment Method',
                value: receipt.paymentMethod,
                onChanged: (v) => appState.updateReceiptData(
                  receipt.copyWith(paymentMethod: v),
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 16),

        _buildTextField(
          label: 'Payment For',
          value: receipt.paymentFor,
          onChanged: (v) => appState.updateReceiptData(
            receipt.copyWith(paymentFor: v),
          ),
        ),
        const SizedBox(height: 16),

        _buildTextField(
          label: 'Reference Number',
          value: receipt.referenceNumber,
          onChanged: (v) => appState.updateReceiptData(
            receipt.copyWith(referenceNumber: v),
          ),
        ),
        const SizedBox(height: 16),

        _buildTextField(
          label: 'Notes',
          value: receipt.notes,
          maxLines: 3,
          onChanged: (v) => appState.updateReceiptData(
            receipt.copyWith(notes: v),
          ),
        ),
        const SizedBox(height: 32),

        CustomButton(
          text: 'Preview Receipt',
          icon: Icons.visibility,
          onPressed: () => setState(() => isEditMode = false),
        ),
      ],
    );
  }

  Widget _buildPreviewView(BuildContext context, receipt) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Center(
          child: Text(
            'RECEIPT',
            style: TextStyle(
              fontSize: 48,
              fontWeight: FontWeight.bold,
              color: Color(0xFFEAB308),
            ),
          ),
        ),
        const Center(
          child: Text(
            'Official Payment Receipt',
            style: TextStyle(color: Colors.grey),
          ),
        ),
        const Divider(height: 32, thickness: 2),

        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Receipt Number', style: TextStyle(color: Colors.grey)),
                Text(receipt.receiptNumber, style: const TextStyle(fontWeight: FontWeight.bold)),
                const SizedBox(height: 12),
                const Text('Date', style: TextStyle(color: Colors.grey)),
                Text(receipt.date, style: const TextStyle(fontWeight: FontWeight.bold)),
              ],
            ),
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                const Text('Received From:', style: TextStyle(color: Colors.grey)),
                Text(receipt.customerName, style: const TextStyle(fontWeight: FontWeight.bold)),
                Text(receipt.customerAddress),
                Text(receipt.customerCity),
              ],
            ),
          ],
        ),
        const SizedBox(height: 32),

        Container(
          padding: const EdgeInsets.all(24),
          decoration: BoxDecoration(
            color: const Color(0xFFFEF3C7),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Column(
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('Amount Received', style: TextStyle(color: Colors.grey)),
                      Text(
                        '₵${receipt.amountReceived.toStringAsFixed(2)}',
                        style: const TextStyle(
                          fontSize: 32,
                          fontWeight: FontWeight.bold,
                          color: Color(0xFFCA8A04),
                        ),
                      ),
                    ],
                  ),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      const Text('Payment Method', style: TextStyle(color: Colors.grey)),
                      Text(receipt.paymentMethod, style: const TextStyle(fontWeight: FontWeight.bold)),
                    ],
                  ),
                ],
              ),
            ],
          ),
        ),
        const SizedBox(height: 24),

        const Text('Payment For:', style: TextStyle(color: Colors.grey)),
        Text(receipt.paymentFor, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
        const SizedBox(height: 12),

        const Text('Reference Number:', style: TextStyle(color: Colors.grey)),
        Text(receipt.referenceNumber, style: const TextStyle(fontWeight: FontWeight.bold)),
        const SizedBox(height: 24),

        if (receipt.notes.isNotEmpty) ...[
          const Text('Notes:', style: TextStyle(fontWeight: FontWeight.bold)),
          const SizedBox(height: 8),
          Text(receipt.notes, style: const TextStyle(color: Colors.grey)),
        ],
      ],
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

  Future<void> _exportPDF(BuildContext context, receipt) async {
    final pdf = await PDFGenerator.generateReceiptPDF(receipt);
    await Printing.layoutPdf(onLayout: (format) => pdf.save());
  }
}
