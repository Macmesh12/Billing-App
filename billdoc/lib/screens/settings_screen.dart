import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:file_picker/file_picker.dart';
import '../providers/app_state.dart';
import '../widgets/custom_button.dart';
import '../models/customer.dart';

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
                        'Enable to include NHIL, GETFund, and VAT',
                      ),
                      value: settings.applyTax,
                      onChanged: (v) => appState.updateSettings(
                        settings.copyWith(applyTax: v),
                      ),
                    ),
                    if (settings.applyTax) ...[
                      const SizedBox(height: 16),
                      Row(
                        children: [
                          Expanded(
                            child: _buildTextField(
                              label: 'NHIL Rate (%)',
                              value: settings.nhilRate.toString(),
                              keyboardType: TextInputType.number,
                              onChanged: (v) => appState.updateSettings(
                                settings.copyWith(
                                  nhilRate:
                                      double.tryParse(v) ?? settings.nhilRate,
                                ),
                              ),
                            ),
                          ),
                          const SizedBox(width: 16),
                          Expanded(
                            child: _buildTextField(
                              label: 'GETFund Levy (%)',
                              value: settings.getfundRate.toString(),
                              keyboardType: TextInputType.number,
                              onChanged: (v) => appState.updateSettings(
                                settings.copyWith(
                                  getfundRate:
                                      double.tryParse(v) ??
                                      settings.getfundRate,
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      Row(
                        children: [
                          Expanded(
                            child: _buildTextField(
                              label: 'VAT Rate (%)',
                              value: settings.vatRate.toString(),
                              keyboardType: TextInputType.number,
                              onChanged: (v) => appState.updateSettings(
                                settings.copyWith(
                                  vatRate:
                                      double.tryParse(v) ?? settings.vatRate,
                                ),
                              ),
                            ),
                          ),
                          const Expanded(child: SizedBox()),
                        ],
                      ),
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
                String? selectedDirectory = await FilePicker.platform.getDirectoryPath();
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
