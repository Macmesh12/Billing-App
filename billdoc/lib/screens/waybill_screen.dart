import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:printing/printing.dart';
import '../providers/app_state.dart';
import '../widgets/custom_button.dart';
import '../utils/pdf_generator.dart';
import '../models/waybill.dart';

class WaybillScreen extends StatefulWidget {
  const WaybillScreen({super.key});

  @override
  State<WaybillScreen> createState() => _WaybillScreenState();
}

class _WaybillScreenState extends State<WaybillScreen> {
  bool isEditMode = true;

  @override
  Widget build(BuildContext context) {
    final appState = Provider.of<AppState>(context);
    final waybill = appState.waybillData;

    return Scaffold(
      appBar: AppBar(
        title: Text(isEditMode ? 'Create Waybill' : 'Waybill Preview'),
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
              onPressed: () => _exportPDF(context, waybill),
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
                  color: Colors.black.withValues(alpha: 0.1),
                  blurRadius: 20,
                  offset: const Offset(0, 4),
                ),
              ],
            ),
            padding: const EdgeInsets.all(48),
            child: isEditMode
                ? _buildEditView(context, appState)
                : _buildPreviewView(context, waybill),
          ),
        ),
      ),
    );
  }

  Widget _buildEditView(BuildContext context, AppState appState) {
    final waybill = appState.waybillData;
    final settings = appState.settings;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'WAYBILL',
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
                label: 'Waybill Number',
                value: waybill.waybillNumber,
                onChanged: (v) => appState.updateWaybillData(
                  waybill.copyWith(waybillNumber: v),
                ),
              ),
            ),
            const SizedBox(width: 16),
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
                        appState.updateWaybillData(
                          waybill.copyWith(date: formattedDate),
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
                            waybill.date.isEmpty
                                ? 'Select Date'
                                : waybill.date,
                            style: TextStyle(
                              color: waybill.date.isEmpty
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
          value: waybill.issuer,
          onChanged: (v) =>
              appState.updateWaybillData(waybill.copyWith(issuer: v)),
        ),
        const SizedBox(height: 24),

        // Shipper Details with Customer Dropdown
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const Text(
              'Shipper Details',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            if (settings.enableCustomerManagement &&
                settings.customers.isNotEmpty)
              _buildShipperDropdown(appState, waybill),
          ],
        ),
        const SizedBox(height: 16),

        _buildTextField(
          label: 'Shipper Name',
          value: waybill.shipperName,
          onChanged: (v) =>
              appState.updateWaybillData(waybill.copyWith(shipperName: v)),
        ),
        const SizedBox(height: 16),

        Row(
          children: [
            Expanded(
              child: _buildTextField(
                label: 'Shipper Phone',
                value: waybill.shipperPhone,
                onChanged: (v) => appState.updateWaybillData(
                  waybill.copyWith(shipperPhone: v),
                ),
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: _buildTextField(
                label: 'Origin',
                value: waybill.originLocation,
                onChanged: (v) => appState.updateWaybillData(
                  waybill.copyWith(originLocation: v),
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 24),

        // Consignee Details with Customer Dropdown
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const Text(
              'Consignee Details',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            if (settings.enableCustomerManagement &&
                settings.customers.isNotEmpty)
              _buildConsigneeDropdown(appState, waybill),
          ],
        ),
        const SizedBox(height: 16),

        _buildTextField(
          label: 'Consignee Name',
          value: waybill.consigneeName,
          onChanged: (v) =>
              appState.updateWaybillData(waybill.copyWith(consigneeName: v)),
        ),
        const SizedBox(height: 16),

        Row(
          children: [
            Expanded(
              child: _buildTextField(
                label: 'Consignee Phone',
                value: waybill.consigneePhone,
                onChanged: (v) => appState.updateWaybillData(
                  waybill.copyWith(consigneePhone: v),
                ),
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: _buildTextField(
                label: 'Destination',
                value: waybill.destinationLocation,
                onChanged: (v) => appState.updateWaybillData(
                  waybill.copyWith(destinationLocation: v),
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 24),

        const Text(
          'Carrier Details',
          style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 16),

        Row(
          children: [
            Expanded(
              child: _buildTextField(
                label: 'Carrier Name',
                value: waybill.carrierName,
                onChanged: (v) => appState.updateWaybillData(
                  waybill.copyWith(carrierName: v),
                ),
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: _buildTextField(
                label: 'Vehicle Number',
                value: waybill.vehicleNumber,
                onChanged: (v) => appState.updateWaybillData(
                  waybill.copyWith(vehicleNumber: v),
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 16),

        _buildTextField(
          label: 'Special Instructions',
          value: waybill.specialInstructions,
          maxLines: 3,
          onChanged: (v) => appState.updateWaybillData(
            waybill.copyWith(specialInstructions: v),
          ),
        ),
        const SizedBox(height: 32),

        Row(
          mainAxisAlignment: MainAxisAlignment.end,
          children: [
            OutlinedButton.icon(
              icon: const Icon(Icons.save_outlined),
              label: const Text('Save as Draft'),
              onPressed: () {
                final appState = Provider.of<AppState>(context, listen: false);
                appState.saveWaybillAsDraft(waybill);
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Waybill saved as draft')),
                );
              },
            ),
            const SizedBox(width: 16),
            CustomButton(
              text: 'Finalize & Preview',
              icon: Icons.check_circle,
              onPressed: () {
                final appState = Provider.of<AppState>(context, listen: false);
                appState.saveWaybillToRecents(waybill);
                setState(() => isEditMode = false);
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Waybill finalized')),
                );
              },
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildPreviewView(BuildContext context, waybill) {
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
                  'WAYBILL',
                  style: TextStyle(
                    fontSize: 40,
                    fontWeight: FontWeight.bold,
                    color: Color(0xFFEAB308),
                  ),
                ),
                const Text(
                  'Goods in Transit Document',
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
                  'Waybill Number',
                  style: TextStyle(color: Colors.grey),
                ),
                Text(
                  waybill.waybillNumber,
                  style: const TextStyle(fontWeight: FontWeight.bold),
                ),
              ],
            ),
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                const Text('Date', style: TextStyle(color: Colors.grey)),
                Text(
                  waybill.date,
                  style: const TextStyle(fontWeight: FontWeight.bold),
                ),
              ],
            ),
          ],
        ),
        if (waybill.issuer.isNotEmpty) ...[
          const SizedBox(height: 12),
          Row(
            children: [
              const Text(
                'Issued By: ',
                style: TextStyle(color: Colors.grey),
              ),
              Text(
                waybill.issuer,
                style: const TextStyle(fontWeight: FontWeight.bold),
              ),
            ],
          ),
        ],
        const SizedBox(height: 24),

        Row(
          children: [
            Expanded(
              child: Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.blue.shade50,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'SHIPPER (From)',
                      style: TextStyle(
                        fontWeight: FontWeight.bold,
                        color: Colors.blue,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      waybill.shipperName,
                      style: const TextStyle(fontWeight: FontWeight.bold),
                    ),
                    Text(
                      '${waybill.shipperAddress}, ${waybill.shipperCity}',
                      style: const TextStyle(fontSize: 12),
                    ),
                    Text(
                      'Tel: ${waybill.shipperPhone}',
                      style: const TextStyle(fontSize: 12),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.green.shade50,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'CONSIGNEE (To)',
                      style: TextStyle(
                        fontWeight: FontWeight.bold,
                        color: Colors.green,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      waybill.consigneeName,
                      style: const TextStyle(fontWeight: FontWeight.bold),
                    ),
                    Text(
                      '${waybill.consigneeAddress}, ${waybill.consigneeCity}',
                      style: const TextStyle(fontSize: 12),
                    ),
                    Text(
                      'Tel: ${waybill.consigneePhone}',
                      style: const TextStyle(fontSize: 12),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 24),

        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: const Color(0xFFFEF3C7),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: [
              Column(
                children: [
                  const Text('Origin', style: TextStyle(color: Colors.grey)),
                  Text(
                    waybill.originLocation,
                    style: const TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 16,
                    ),
                  ),
                ],
              ),
              const Icon(Icons.arrow_forward, color: Color(0xFFEAB308)),
              Column(
                children: [
                  const Text(
                    'Destination',
                    style: TextStyle(color: Colors.grey),
                  ),
                  Text(
                    waybill.destinationLocation,
                    style: const TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 16,
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
        const SizedBox(height: 24),

        const Text(
          'Carrier Information',
          style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 12),

        Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Carrier:', style: TextStyle(color: Colors.grey)),
                  Text(
                    waybill.carrierName,
                    style: const TextStyle(fontWeight: FontWeight.bold),
                  ),
                ],
              ),
            ),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Vehicle:', style: TextStyle(color: Colors.grey)),
                  Text(
                    waybill.vehicleNumber,
                    style: const TextStyle(fontWeight: FontWeight.bold),
                  ),
                ],
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),

        Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Driver:', style: TextStyle(color: Colors.grey)),
                  Text(
                    waybill.driverName,
                    style: const TextStyle(fontWeight: FontWeight.bold),
                  ),
                ],
              ),
            ),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Phone:', style: TextStyle(color: Colors.grey)),
                  Text(
                    waybill.driverPhone,
                    style: const TextStyle(fontWeight: FontWeight.bold),
                  ),
                ],
              ),
            ),
          ],
        ),
        const SizedBox(height: 24),

        const Text(
          'Items',
          style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 12),

        ...waybill.items.map(
          (item) => Container(
            padding: const EdgeInsets.all(12),
            margin: const EdgeInsets.only(bottom: 8),
            decoration: BoxDecoration(
              border: Border.all(color: Colors.grey.shade300),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Row(
              children: [
                Expanded(flex: 2, child: Text(item.description)),
                Expanded(
                  child: Text(
                    'Qty: ${item.quantity}',
                    textAlign: TextAlign.right,
                  ),
                ),
                Expanded(
                  child: Text(
                    '${item.weight} ${item.unit}',
                    textAlign: TextAlign.right,
                  ),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 16),

        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: Colors.grey.shade100,
            borderRadius: BorderRadius.circular(8),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'TOTALS',
                style: TextStyle(fontWeight: FontWeight.bold),
              ),
              Text(
                'Qty: ${waybill.totalQuantity}',
                style: const TextStyle(fontWeight: FontWeight.bold),
              ),
              Text(
                'Weight: ${waybill.totalWeight.toStringAsFixed(2)} kg',
                style: const TextStyle(fontWeight: FontWeight.bold),
              ),
            ],
          ),
        ),
        const SizedBox(height: 24),

        if (waybill.specialInstructions.isNotEmpty) ...[
          const Text(
            'Special Instructions:',
            style: TextStyle(fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 8),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.grey.shade50,
              borderRadius: BorderRadius.circular(8),
            ),
            child: Text(waybill.specialInstructions),
          ),
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

  Widget _buildShipperDropdown(AppState appState, Waybill waybill) {
    final customers = appState.settings.customers;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12),
      decoration: BoxDecoration(
        border: Border.all(color: Colors.grey.shade300),
        borderRadius: BorderRadius.circular(8),
      ),
      child: DropdownButtonHideUnderline(
        child: DropdownButton<String>(
          hint: const Text('Select Shipper'),
          value: null,
          items: customers.map((customer) {
            return DropdownMenuItem(
              value: customer.id,
              child: Text(customer.name),
            );
          }).toList(),
          onChanged: (customerId) {
            if (customerId != null) {
              final customer = customers.firstWhere((c) => c.id == customerId);
              appState.updateWaybillData(
                waybill.copyWith(
                  shipperName: customer.name,
                ),
              );
            }
          },
        ),
      ),
    );
  }

  Widget _buildConsigneeDropdown(AppState appState, Waybill waybill) {
    final customers = appState.settings.customers;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12),
      decoration: BoxDecoration(
        border: Border.all(color: Colors.grey.shade300),
        borderRadius: BorderRadius.circular(8),
      ),
      child: DropdownButtonHideUnderline(
        child: DropdownButton<String>(
          hint: const Text('Select Consignee'),
          value: null,
          items: customers.map((customer) {
            return DropdownMenuItem(
              value: customer.id,
              child: Text(customer.name),
            );
          }).toList(),
          onChanged: (customerId) {
            if (customerId != null) {
              final customer = customers.firstWhere((c) => c.id == customerId);
              appState.updateWaybillData(
                waybill.copyWith(
                  consigneeName: customer.name,
                ),
              );
            }
          },
        ),
      ),
    );
  }

  Future<void> _exportPDF(BuildContext context, waybill) async {
    final pdf = await PDFGenerator.generateWaybillPDF(waybill);
    await Printing.layoutPdf(onLayout: (format) => pdf.save());
  }
}
