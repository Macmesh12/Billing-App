import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:file_picker/file_picker.dart';
import '../providers/app_state.dart';
import '../widgets/custom_button.dart';

class SetupScreen extends StatefulWidget {
  const SetupScreen({super.key});

  @override
  State<SetupScreen> createState() => _SetupScreenState();
}

class _SetupScreenState extends State<SetupScreen> {
  String draftPath = '';
  String pdfPath = '';

  @override 
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [
              const Color(0xFFEAB308).withAlpha(26),
              Colors.white,
            ],
          ),
        ),
        child: Center(
          child: Container(
            constraints: const BoxConstraints(maxWidth: 600),
            padding: const EdgeInsets.all(48),
            margin: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withAlpha(26),
                  blurRadius: 30,
                  offset: const Offset(0, 10),
                ),
              ],
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Icon(
                  Icons.settings_suggest,
                  size: 60,
                  color: Color(0xFFEAB308),
                ),
                const SizedBox(height: 24),
                const Text(
                  'Welcome to Billing App',
                  style: TextStyle(
                    fontSize: 28,
                    fontWeight: FontWeight.bold,
                    color: Color(0xFF1F2937),
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  'Let\'s set up your document storage folders',
                  style: TextStyle(
                    fontSize: 16,
                    color: Colors.grey.shade600,
                  ),
                ),
                const SizedBox(height: 40),
                _buildFolderPicker(
                  label: 'Draft Save Path',
                  hint: 'Where to save draft documents',
                  value: draftPath,
                  onChanged: (v) => setState(() => draftPath = v),
                ),
                const SizedBox(height: 24),
                _buildFolderPicker(
                  label: 'PDF Export Path',
                  hint: 'Where to export PDF files',
                  value: pdfPath,
                  onChanged: (v) => setState(() => pdfPath = v),
                ),
                const SizedBox(height: 40),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    TextButton(
                      onPressed: () {
                        // Skip setup and use default paths
                        final appState = Provider.of<AppState>(context, listen: false);
                        appState.completeSetup();
                      },
                      child: const Text('Skip for now'),
                    ),
                    CustomButton(
                      text: 'Continue',
                      icon: Icons.arrow_forward,
                      onPressed: () {
                        if (draftPath.isEmpty || pdfPath.isEmpty) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(
                              content: Text('Please select both folders or skip setup'),
                            ),
                          );
                          return;
                        }
                        final appState = Provider.of<AppState>(context, listen: false);
                        appState.updateSettings(
                          appState.settings.copyWith(
                            draftSavePath: draftPath,
                            pdfExportPath: pdfPath,
                          ),
                        );
                        appState.completeSetup();
                      },
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildFolderPicker({
    required String label,
    required String hint,
    required String value,
    required Function(String) onChanged,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: const TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w600,
            color: Color(0xFF374151),
          ),
        ),
        const SizedBox(height: 4),
        Text(
          hint,
          style: TextStyle(
            fontSize: 12,
            color: Colors.grey.shade600,
          ),
        ),
        const SizedBox(height: 8),
        InkWell(
          onTap: () async {
            String? selectedDirectory = await FilePicker.platform.getDirectoryPath();
            if (selectedDirectory != null) {
              onChanged(selectedDirectory);
            }
          },
          child: Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              border: Border.all(color: Colors.grey.shade300),
              borderRadius: BorderRadius.circular(8),
              color: value.isEmpty ? Colors.white : Colors.grey.shade50,
            ),
            child: Row(
              children: [
                Icon(
                  value.isEmpty ? Icons.folder_outlined : Icons.folder,
                  color: value.isEmpty ? Colors.grey : const Color(0xFFEAB308),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    value.isEmpty ? 'Click to select folder' : value,
                    style: TextStyle(
                      color: value.isEmpty ? Colors.grey : Colors.black87,
                      fontSize: 14,
                    ),
                  ),
                ),
                Icon(
                  Icons.arrow_forward_ios,
                  size: 16,
                  color: Colors.grey.shade400,
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}
