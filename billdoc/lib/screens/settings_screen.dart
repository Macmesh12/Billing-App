import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:file_picker/file_picker.dart';
import '../providers/app_state.dart';
import '../widgets/custom_button.dart';
import '../models/customer.dart';
import '../models/tax_entry.dart';

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  final _formKey = GlobalKey<FormState>();
  // File? _logoFile;
  // final ImagePicker _picker = ImagePicker();

  @override
  Widget build(BuildContext context) {
    final appState = Provider.of<AppState>(context);
    final settings = appState.settings;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Settings'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => appState.setActiveView('home'),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Center(
          child: Container(
            constraints: const BoxConstraints(maxWidth: 800),
            child: Form(
              key: _formKey,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _buildSection('Document Settings', [
                    _buildTextField(
                      label: 'Invoice Note',
                      value: settings.invoiceNote,
                      maxLines: 3,
                      onChanged: (v) => appState.updateSettings(
                        settings.copyWith(invoiceNote: v),
                      ),
                    ),
                  ]),
                  const SizedBox(height: 32),
                  _buildSection('File Paths', [
                    _buildFolderPicker(
                      label: 'Draft Save Path',
                      value: settings.draftSavePath,
                      onChanged: (v) => appState.updateSettings(
                        settings.copyWith(draftSavePath: v),
                      ),
                    ),
                    const SizedBox(height: 16),
                    _buildFolderPicker(
                      label: 'PDF Export Path',
                      value: settings.pdfExportPath,
                      onChanged: (v) => appState.updateSettings(
                        settings.copyWith(pdfExportPath: v),
                      ),
                    ),
                  ]),
                  const SizedBox(height: 32),
                  _buildSection('Tax Settings', [
                    SwitchListTile(
                      title: const Text('Apply Taxes'),
                      subtitle: const Text(
                        'Enable to include taxes/levies on invoices',
                      ),
                      value: settings.applyTax,
                      onChanged: (v) => appState.updateSettings(
                        settings.copyWith(applyTax: v),
                      ),
                    ),
                    if (settings.applyTax) ...[
                      const SizedBox(height: 16),
                      _buildTaxList(appState),
                    ],
                  ]),
                  const SizedBox(height: 32),
                  // Document Settings (prefixes) removed per request
                  const SizedBox(height: 32),
                  // Payment Settings removed per request
                  const SizedBox(height: 32),
                  _buildSection('Customer Management', [
                    SwitchListTile(
                      title: const Text('Enable Customer Management'),
                      subtitle: const Text(
                        'Add and manage customers for quick selection',
                      ),
                      value: settings.enableCustomerManagement,
                      onChanged: (v) => appState.updateSettings(
                        settings.copyWith(enableCustomerManagement: v),
                      ),
                    ),
                    if (settings.enableCustomerManagement) ...[
                      const SizedBox(height: 16),
                      _buildCustomersList(appState),
                    ],
                  ]),
                  const SizedBox(height: 32),
                  CustomButton(
                    text: 'Save Settings',
                    icon: Icons.save,
                    onPressed: () async {
                      if (_formKey.currentState!.validate()) {
                        // Refresh documents from the new paths
                        await appState.refreshDocuments();

                        if (context.mounted) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(
                              content: Text('Settings saved successfully'),
                            ),
                          );
                          appState.setActiveView('home');
                        }
                      }
                    },
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildSection(String title, List<Widget> children) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          title,
          style: const TextStyle(
            fontSize: 20,
            fontWeight: FontWeight.bold,
            color: Color(0xFF1F2937),
          ),
        ),
        const SizedBox(height: 16),
        ...children.map(
          (child) =>
              Padding(padding: const EdgeInsets.only(bottom: 16), child: child),
        ),
      ],
    );
  }

  Widget _buildTextField({
    required String label,
    required String value,
    required Function(String) onChanged,
    int maxLines = 1,
    String? Function(String?)? validator,
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
          onChanged: onChanged,
          validator: validator,
          keyboardType: keyboardType,
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

  Widget _buildFolderPicker({
    required String label,
    required String value,
    required Function(String) onChanged,
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
        Row(
          children: [
            Expanded(
              child: Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 12,
                  vertical: 16,
                ),
                decoration: BoxDecoration(
                  border: Border.all(color: Colors.grey.shade400),
                  borderRadius: BorderRadius.circular(8),
                  color: Colors.grey.shade50,
                ),
                child: Text(
                  value.isEmpty ? 'No folder selected' : value,
                  style: TextStyle(
                    color: value.isEmpty ? Colors.grey : Colors.black,
                  ),
                ),
              ),
            ),
            const SizedBox(width: 12),
            ElevatedButton.icon(
              icon: const Icon(Icons.folder_open),
              label: const Text('Browse'),
              onPressed: () async {
                String? selectedDirectory = await FilePicker.platform
                    .getDirectoryPath();
                if (selectedDirectory != null) {
                  onChanged(selectedDirectory);
                }
              },
            ),
          ],
        ),
      ],
    );
  }

  // --------------- Tax Management ---------------

  Widget _buildTaxList(AppState appState) {
    final taxes = appState.settings.taxes;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              'Taxes / Levies (${taxes.length})',
              style: const TextStyle(fontWeight: FontWeight.w500),
            ),
            ElevatedButton.icon(
              icon: const Icon(Icons.add),
              label: const Text('Add Tax'),
              onPressed: () => _showTaxDialog(appState, null, null),
            ),
          ],
        ),
        const SizedBox(height: 12),
        if (taxes.isEmpty)
          Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: Colors.grey.shade100,
              borderRadius: BorderRadius.circular(8),
            ),
            child: const Center(
              child: Text(
                'No taxes added yet',
                style: TextStyle(color: Colors.grey),
              ),
            ),
          )
        else
          ReorderableListView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: taxes.length,
            onReorder: (oldIndex, newIndex) {
              if (newIndex > oldIndex) newIndex--;
              final updated = List<TaxEntry>.from(taxes);
              final item = updated.removeAt(oldIndex);
              updated.insert(newIndex, item);
              appState.updateSettings(
                appState.settings.copyWith(taxes: updated),
              );
            },
            itemBuilder: (context, index) {
              final tax = taxes[index];
              final isBuiltIn = tax.isDefault;
              return Card(
                key: ValueKey('tax_$index'),
                child: ListTile(
                  leading: Switch(
                    value: tax.enabled,
                    activeColor: const Color(0xFFEAB308),
                    onChanged: (v) {
                      final updated = List<TaxEntry>.from(taxes);
                      updated[index] = tax.copyWith(enabled: v);
                      appState.updateSettings(
                        appState.settings.copyWith(taxes: updated),
                      );
                    },
                  ),
                  title: Row(
                    children: [
                      Text(tax.name),
                      if (isBuiltIn) ...[
                        const SizedBox(width: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 6,
                            vertical: 2,
                          ),
                          decoration: BoxDecoration(
                            color: Colors.amber.shade100,
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: const Text(
                            'Default',
                            style: TextStyle(fontSize: 10, color: Colors.brown),
                          ),
                        ),
                      ],
                    ],
                  ),
                  subtitle: Text('${tax.rate}%'),
                  trailing: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      IconButton(
                        icon: const Icon(Icons.edit, color: Colors.blue),
                        onPressed: () => _showTaxDialog(appState, tax, index),
                      ),
                      if (!isBuiltIn)
                        IconButton(
                          icon: const Icon(Icons.delete, color: Colors.red),
                          onPressed: () => _confirmDeleteTax(appState, index),
                        ),
                    ],
                  ),
                ),
              );
            },
          ),
      ],
    );
  }

  void _showTaxDialog(AppState appState, TaxEntry? existing, int? index) {
    final isEditing = existing != null;
    final isBuiltIn = existing?.isDefault ?? false;
    final nameController = TextEditingController(text: existing?.name ?? '');
    final rateController = TextEditingController(
      text: existing != null ? existing.rate.toString() : '',
    );

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(
          isBuiltIn
              ? 'Edit ${existing!.name} Rate'
              : (isEditing ? 'Edit Tax / Levy' : 'Add Tax / Levy'),
        ),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              if (!isBuiltIn)
                TextField(
                  controller: nameController,
                  textCapitalization: TextCapitalization.characters,
                  decoration: const InputDecoration(
                    labelText: 'Tax Name *',
                    hintText: 'e.g. COVID LEVY',
                    border: OutlineInputBorder(),
                  ),
                ),
              if (!isBuiltIn) const SizedBox(height: 12),
              TextField(
                controller: rateController,
                keyboardType: const TextInputType.numberWithOptions(
                  decimal: true,
                ),
                decoration: InputDecoration(
                  labelText: isBuiltIn
                      ? '${existing!.name} Rate (%)'
                      : 'Rate (%) *',
                  hintText: 'e.g. 1.0',
                  border: const OutlineInputBorder(),
                ),
              ),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () {
              final name = isBuiltIn
                  ? existing!.name
                  : nameController.text.trim();
              final rate = double.tryParse(rateController.text.trim());

              if (name.isEmpty) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Tax name is required')),
                );
                return;
              }
              if (rate == null || rate < 0) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Please enter a valid rate')),
                );
                return;
              }

              final taxes = List<TaxEntry>.from(appState.settings.taxes);
              if (isEditing && index != null) {
                taxes[index] = TaxEntry(
                  name: name,
                  rate: rate,
                  enabled: existing!.enabled,
                  isDefault: existing.isDefault,
                );
              } else {
                taxes.add(TaxEntry(name: name, rate: rate));
              }
              appState.updateSettings(appState.settings.copyWith(taxes: taxes));
              Navigator.pop(context);
            },
            child: Text(isEditing ? 'Update' : 'Add'),
          ),
        ],
      ),
    );
  }

  void _confirmDeleteTax(AppState appState, int index) {
    final tax = appState.settings.taxes[index];
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete Tax'),
        content: Text('Are you sure you want to delete "${tax.name}"?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
            onPressed: () {
              final taxes = List<TaxEntry>.from(appState.settings.taxes);
              taxes.removeAt(index);
              appState.updateSettings(appState.settings.copyWith(taxes: taxes));
              Navigator.pop(context);
            },
            child: const Text('Delete'),
          ),
        ],
      ),
    );
  }

  // --------------- Customer Management ---------------

  Widget _buildCustomersList(AppState appState) {
    final customers = appState.settings.customers;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              'Customers (${customers.length})',
              style: const TextStyle(fontWeight: FontWeight.w500),
            ),
            ElevatedButton.icon(
              icon: const Icon(Icons.add),
              label: const Text('Add Customer'),
              onPressed: () => _showCustomerDialog(appState, null),
            ),
          ],
        ),
        const SizedBox(height: 12),
        if (customers.isEmpty)
          Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: Colors.grey.shade100,
              borderRadius: BorderRadius.circular(8),
            ),
            child: const Center(
              child: Text(
                'No customers added yet',
                style: TextStyle(color: Colors.grey),
              ),
            ),
          )
        else
          ListView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: customers.length,
            itemBuilder: (context, index) {
              final customer = customers[index];
              return Card(
                child: ListTile(
                  leading: const CircleAvatar(
                    backgroundColor: Color(0xFFEAB308),
                    child: Icon(Icons.person, color: Colors.white),
                  ),
                  title: Text(customer.name),
                  subtitle: customer.email.isNotEmpty
                      ? Text(
                          customer.email,
                          style: const TextStyle(fontSize: 12),
                        )
                      : null,
                  trailing: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      IconButton(
                        icon: const Icon(Icons.edit, color: Colors.blue),
                        onPressed: () =>
                            _showCustomerDialog(appState, customer),
                      ),
                      IconButton(
                        icon: const Icon(Icons.delete, color: Colors.red),
                        onPressed: () =>
                            _confirmDeleteCustomer(appState, customer),
                      ),
                    ],
                  ),
                ),
              );
            },
          ),
      ],
    );
  }

  void _showCustomerDialog(AppState appState, Customer? existingCustomer) {
    final isEditing = existingCustomer != null;
    final nameController = TextEditingController(
      text: existingCustomer?.name ?? '',
    );
    final emailController = TextEditingController(
      text: existingCustomer?.email ?? '',
    );

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(isEditing ? 'Edit Customer' : 'Add Customer'),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: nameController,
                decoration: const InputDecoration(
                  labelText: 'Customer Name *',
                  border: OutlineInputBorder(),
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: emailController,
                decoration: const InputDecoration(
                  labelText: 'Email',
                  border: OutlineInputBorder(),
                ),
              ),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () {
              if (nameController.text.isEmpty) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Customer name is required')),
                );
                return;
              }

              final customer = Customer(
                id: existingCustomer?.id,
                name: nameController.text,
                email: emailController.text,
              );

              if (isEditing) {
                appState.updateCustomer(customer);
              } else {
                appState.addCustomer(customer);
              }

              Navigator.pop(context);
            },
            child: Text(isEditing ? 'Update' : 'Add'),
          ),
        ],
      ),
    );
  }

  void _confirmDeleteCustomer(AppState appState, Customer customer) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete Customer'),
        content: Text('Are you sure you want to delete "${customer.name}"?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
            onPressed: () {
              appState.deleteCustomer(customer.id);
              Navigator.pop(context);
            },
            child: const Text('Delete'),
          ),
        ],
      ),
    );
  }
}
