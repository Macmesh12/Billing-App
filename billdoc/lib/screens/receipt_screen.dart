import 'dart:io';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:printing/printing.dart';
import '../providers/app_state.dart';
import '../widgets/custom_button.dart';
import '../utils/pdf_generator.dart';
import '../models/receipt.dart';
import '../services/api_service.dart';
import 'package:path/path.dart' as path;

class ReceiptScreen extends StatefulWidget {
  const ReceiptScreen({super.key});

  @override
  State<ReceiptScreen> createState() => _ReceiptScreenState();
}

class _ReceiptScreenState extends State<ReceiptScreen> {
  bool isEditMode = true;
  int? savedReceiptId;

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
                  color: Colors.black.withAlpha(25),
                  blurRadius: 20,
                  offset: const Offset(0, 4),
                ),
              ],
            ),
            padding: const EdgeInsets.all(48),
            child: isEditMode ? _buildEditView(context, appState) : _buildPreviewView(context, receipt),
          ),
        ),
      ),
    );
  }

  Widget _buildPreviewView(BuildContext context, receipt) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Header with logo
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Always show logo.png from assets
                Image.asset(
                  'assets/images/logo.png',
                  height: 80,
                  fit: BoxFit.contain,
                  errorBuilder: (context, error, stackTrace) {
                    return const Icon(
                      Icons.business,
                      size: 60,
                      color: Color(0xFFEAB308),
                    );
                  },
                ),
              ],
            ),
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                const Text(
                  'RECEIPT',
                  style: TextStyle(
                    fontSize: 36,
                    fontWeight: FontWeight.bold,
                    color: Color(0xFFEAB308),
                  ),
                ),
                const Text(
                  'Official Payment Receipt',
                  style: TextStyle(color: Colors.grey, fontSize: 12),
                ),
              ],
            ),
          ],
        ),
        const Divider(height: 32, thickness: 2),

        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Receipt Number',
                  style: TextStyle(color: Colors.grey),
                ),
                Text(
                  receipt.receiptNumber,
                  style: const TextStyle(fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 12),
                const Text('Date', style: TextStyle(color: Colors.grey)),
                Text(
                  receipt.date,
                  style: const TextStyle(fontWeight: FontWeight.bold),
                ),
              ],
            ),
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                const Text(
                  'Received From:',
                  style: TextStyle(color: Colors.grey),
                ),
                Text(
                  receipt.customerName,
                  style: const TextStyle(fontWeight: FontWeight.bold),
                ),
                  // customer address/phone/city removed per request
              ],
            ),
          ],
        ),
        const SizedBox(height: 32),

        // Line Items Table
        if (receipt.items.isNotEmpty) ...[
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
                    borderRadius: const BorderRadius.vertical(
                      top: Radius.circular(8),
                    ),
                  ),
                  child: const Row(
                    children: [
                      Expanded(
                        flex: 3,
                        child: Text(
                          'Description',
                          style: TextStyle(fontWeight: FontWeight.bold),
                        ),
                      ),
                      Expanded(
                        child: Text(
                          'Qty',
                          textAlign: TextAlign.center,
                          style: TextStyle(fontWeight: FontWeight.bold),
                        ),
                      ),
                      Expanded(
                        child: Text(
                          'Unit Price',
                          textAlign: TextAlign.right,
                          style: TextStyle(fontWeight: FontWeight.bold),
                        ),
                      ),
                      Expanded(
                        child: Text(
                          'Amount',
                          textAlign: TextAlign.right,
                          style: TextStyle(fontWeight: FontWeight.bold),
                        ),
                      ),
                    ],
                  ),
                ),
                ...receipt.items.map(
                  (item) => Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      border: Border(
                        top: BorderSide(color: Colors.grey.shade300),
                      ),
                    ),
                    child: Row(
                      children: [
                        Expanded(flex: 3, child: Text(item.description)),
                        Expanded(
                          child: Text(
                            '${item.quantity}',
                            textAlign: TextAlign.center,
                          ),
                        ),
                        Expanded(
                          child: Text(
                            'GHS ${item.unitPrice.toStringAsFixed(2)}',
                            textAlign: TextAlign.right,
                          ),
                        ),
                        Expanded(
                          child: Text(
                            'GHS ${item.amount.toStringAsFixed(2)}',
                            textAlign: TextAlign.right,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.grey.shade50,
                    border: Border(
                      top: BorderSide(color: Colors.grey.shade300, width: 2),
                    ),
                    borderRadius: const BorderRadius.vertical(
                      bottom: Radius.circular(8),
                    ),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        'TOTAL',
                        style: TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: 16,
                        ),
                      ),
                      Text(
                        'GHS ${receipt.totalAmount.toStringAsFixed(2)}',
                        style: const TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: 18,
                          color: Color(0xFFEAB308),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),
        ],

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
                      const Text(
                        'Amount Received',
                        style: TextStyle(color: Colors.grey),
                      ),
                      Text(
                        'GHS ${receipt.amountReceived.toStringAsFixed(2)}',
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
                      const Text(
                        'Payment Method',
                        style: TextStyle(color: Colors.grey),
                      ),
                      Text(
                        receipt.paymentMethod,
                        style: const TextStyle(fontWeight: FontWeight.bold),
                      ),
                    ],
                  ),
                ],
              ),
              if (receipt.balance != 0) ...[
                const SizedBox(height: 16),
                const Divider(),
                const SizedBox(height: 8),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text(
                      'Balance',
                      style: TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 14,
                      ),
                    ),
                    Text(
                      'GHS ${receipt.balance.toStringAsFixed(2)}',
                      style: TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 16,
                        color: receipt.balance > 0 ? Colors.red : Colors.green,
                      ),
                    ),
                  ],
                ),
              ],
            ],
          ),
        ),
        const SizedBox(height: 24),

        if (receipt.issuer.isNotEmpty) ...[
          Row(
            children: [
              const Text(
                'Issued By: ',
                style: TextStyle(color: Colors.grey),
              ),
              Text(
                receipt.issuer,
                style: const TextStyle(fontWeight: FontWeight.bold),
              ),
            ],
          ),
          const SizedBox(height: 16),
        ],

      ],
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
                readOnly: true,
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: _buildTextField(
                label: 'Received From',
                value: receipt.customerName,
                onChanged: (v) => appState.updateReceiptData(
                  receipt.copyWith(customerName: v),
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 16),
        Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Date',
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                      color: Color(0xFF374151),
                    ),
                  ),
                  const SizedBox(height: 6),
                  InkWell(
                    onTap: () async {
                      final DateTime? picked = await showDatePicker(
                        context: context,
                        initialDate: DateTime.now(),
                        firstDate: DateTime(2000),
                        lastDate: DateTime(2100),
                      );
                      if (picked != null) {
                        final formattedDate = '${picked.year}-${picked.month.toString().padLeft(2, '0')}-${picked.day.toString().padLeft(2, '0')}';
                        appState.updateReceiptData(
                          receipt.copyWith(date: formattedDate),
                        );
                      }
                    },
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 12,
                        vertical: 16,
                      ),
                      decoration: BoxDecoration(
                        border: Border.all(color: Colors.grey.shade400),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            receipt.date.isEmpty
                                ? 'Select Date'
                                : receipt.date,
                            style: TextStyle(
                              color: receipt.date.isEmpty
                                  ? Colors.grey
                                  : Colors.black,
                            ),
                          ),
                          const Icon(Icons.calendar_today, size: 20),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
        const SizedBox(height: 16),
        _buildTextField(
          label: 'Issued By',
          value: receipt.issuer,
          onChanged: (v) =>
              appState.updateReceiptData(receipt.copyWith(issuer: v)),
        ),
        const SizedBox(height: 16),
        const Text(
          'Line Items',
          style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 16),
        // Items Table
        ...List.generate(receipt.items.length, (index) {
          final item = receipt.items[index];
          return Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: Card(
              child: Padding(
                padding: const EdgeInsets.all(12),
                child: Row(
                  children: [
                    Expanded(
                      flex: 3,
                      child: _buildTextField(
                        label: 'Description',
                        value: item.description,
                        onChanged: (v) {
                          final newItems = List<ReceiptItem>.from(
                            receipt.items,
                          );
                          newItems[index] = item.copyWith(description: v);
                          appState.updateReceiptData(
                            receipt.copyWith(items: newItems),
                          );
                        },
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: _buildTextField(
                        label: 'Qty',
                        value: item.quantity.toString(),
                        keyboardType: TextInputType.number,
                        onChanged: (v) {
                          final newItems = List<ReceiptItem>.from(
                            receipt.items,
                          );
                          newItems[index] = item.copyWith(
                            quantity: int.tryParse(v) ?? 1,
                          );
                          appState.updateReceiptData(
                            receipt.copyWith(items: newItems),
                          );
                        },
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: _buildTextField(
                        label: 'Unit Price',
                        value: item.unitPrice.toString(),
                        keyboardType: TextInputType.number,
                        onChanged: (v) {
                          final newItems = List<ReceiptItem>.from(
                            receipt.items,
                          );
                          newItems[index] = item.copyWith(
                            unitPrice: double.tryParse(v) ?? 0,
                          );
                          appState.updateReceiptData(
                            receipt.copyWith(items: newItems),
                          );
                        },
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Amount',
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                          const SizedBox(height: 6),
                          Container(
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              border: Border.all(color: Colors.grey),
                              borderRadius: BorderRadius.circular(8),
                              color: Colors.grey.shade50,
                            ),
                            child: Text(
                              'GHS ${item.amount.toStringAsFixed(2)}',
                            ),
                          ),
                        ],
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.delete, color: Colors.red),
                      onPressed: () {
                        if (receipt.items.length > 1) {
                          final newItems = List<ReceiptItem>.from(
                            receipt.items,
                          );
                          newItems.removeAt(index);
                          appState.updateReceiptData(
                            receipt.copyWith(items: newItems),
                          );
                        }
                      },
                    ),
                  ],
                ),
              ),
            ),
          );
        }),
        OutlinedButton.icon(
          icon: const Icon(Icons.add),
          label: const Text('Add Line Item'),
          onPressed: () {
            final newItems = List<ReceiptItem>.from(receipt.items)
              ..add(ReceiptItem());
            appState.updateReceiptData(receipt.copyWith(items: newItems));
          },
        ),
        const SizedBox(height: 24),
        // Totals Summary
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.grey.shade50,
            borderRadius: BorderRadius.circular(8),
            border: Border.all(color: Colors.grey.shade300),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'TOTAL',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
              ),
              Text(
                'GHS ${receipt.totalAmount.toStringAsFixed(2)}',
                style: const TextStyle(
                  fontSize: 24,
                  fontWeight: FontWeight.bold,
                  color: Color(0xFFEAB308),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 24),
        Row(
          children: [
            Expanded(
              child: _buildTextField(
                label: 'Amount Received',
                value: receipt.amountReceived.toString(),
                keyboardType: TextInputType.number,
                onChanged: (v) => appState.updateReceiptData(
                  receipt.copyWith(amountReceived: double.tryParse(v) ?? 0),
                ),
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Payment Method',
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                      color: Color(0xFF374151),
                    ),
                  ),
                  const SizedBox(height: 6),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12),
                    decoration: BoxDecoration(
                      border: Border.all(color: Colors.grey.shade400),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: DropdownButtonHideUnderline(
                      child: DropdownButton<String>(
                        value: receipt.paymentMethod,
                        isExpanded: true,
                        items: const [
                          DropdownMenuItem(
                            value: 'Cash',
                            child: Text('Cash'),
                          ),
                          DropdownMenuItem(
                            value: 'Mobile Money',
                            child: Text('Mobile Money'),
                          ),
                          DropdownMenuItem(
                            value: 'Bank Transfer',
                            child: Text('Bank Transfer'),
                          ),
                        ],
                        onChanged: (v) => appState.updateReceiptData(
                          receipt.copyWith(paymentMethod: v ?? 'Cash'),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
        const SizedBox(height: 32),
        Row(
          mainAxisAlignment: MainAxisAlignment.end,
          children: [
            OutlinedButton.icon(
              icon: const Icon(Icons.save_outlined),
              label: const Text('Save as Draft'),
              onPressed: () {
                appState.saveReceiptAsDraft(receipt);
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Receipt saved as draft')),
                );
              },
            ),
            const SizedBox(width: 16),
            CustomButton(
              text: 'Finalize & Preview',
              icon: Icons.check_circle,
              onPressed: () {
                appState.saveReceiptToRecents(receipt);
                setState(() => isEditMode = false);
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Receipt finalized')),
                );
              },
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildTextField({
    required String label,
    required String value,
    required Function(String) onChanged,
    int maxLines = 1,
    TextInputType? keyboardType,
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
          keyboardType: keyboardType,
          onChanged: onChanged,
          decoration: InputDecoration(
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
            contentPadding: const EdgeInsets.symmetric(
              horizontal: 12,
              vertical: 12,
            ),
          ),
        ),
      ],
    );
  }

  Future<void> _exportPDF(BuildContext context, receipt) async {
    final appState = Provider.of<AppState>(context, listen: false);
    final pdfExportPath = appState.settings.pdfExportPath;

    if (pdfExportPath.isEmpty) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Please set PDF export path in Settings'),
            backgroundColor: Colors.orange,
          ),
        );
      }
      return;
    }

    // Show loading dialog
    if (context.mounted) {
      showDialog(
        context: context,
        barrierDismissible: false,
        builder: (context) => const Center(
          child: Card(
            child: Padding(
              padding: EdgeInsets.all(24),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  CircularProgressIndicator(),
                  SizedBox(width: 24),
                  Text('Generating PDF...'),
                ],
              ),
            ),
          ),
        ),
      );
    }

    try {
      // First save the receipt to Django if not already saved
      if (savedReceiptId == null) {
        final result = await ApiService.createReceipt({
          'received_from': receipt.receivedFrom,
          'issue_date': receipt.date,
          'amount': receipt.amount,
          'payment_method': receipt.paymentMethod,
          'description': receipt.description,
          'approved_by': receipt.approvedBy,
        });
        savedReceiptId = result['id'];
      }

      // Download PDF from Django backend
      final response = await ApiService.downloadReceiptPDF(savedReceiptId!);

      // Create receipts subfolder in pdfExportPath
      final receiptsDir = Directory(path.join(pdfExportPath, 'receipts'));
      if (!await receiptsDir.exists()) {
        await receiptsDir.create(recursive: true);
      }

      // Save PDF file with receipt number and customer name
      final sanitizedCustomer = receipt.customerName.replaceAll(RegExp(r'[^a-zA-Z0-9]'), '_');
      final fileName = '${receipt.receiptNumber}_$sanitizedCustomer.pdf';
      final file = File(path.join(receiptsDir.path, fileName));
      await file.writeAsBytes(response.bodyBytes);

      if (context.mounted) {
        Navigator.pop(context); // Close loading dialog
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('PDF exported successfully to ${file.path}'),
            backgroundColor: Colors.green,
            duration: const Duration(seconds: 4),
          ),
        );
      }
    } catch (e) {
      if (context.mounted) {
        Navigator.pop(context); // Close loading dialog
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to export PDF: $e'),
            backgroundColor: Colors.red,
            duration: const Duration(seconds: 4),
          ),
        );
      }
    }
  }
}
