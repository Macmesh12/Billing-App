import 'dart:io';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:path/path.dart' as path;
import '../providers/app_state.dart';
import '../models/document_item.dart';
import '../models/invoice.dart';
import '../models/receipt.dart';
import '../models/waybill.dart';
import '../services/api_service.dart';
import '../services/pdf_service.dart';
import '../widgets/left_nav.dart';
import '../widgets/top_bar.dart';
import '../widgets/custom_card.dart';
import '../widgets/custom_button.dart';
import '../widgets/document_list.dart';
import 'invoice_screen.dart';
import 'receipt_screen.dart';
import 'waybill_screen.dart';
import 'settings_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  @override
  Widget build(BuildContext context) {
    return Consumer<AppState>(
      builder: (context, appState, child) {
        final isDesktop = MediaQuery.of(context).size.width >= 1024;

        return Scaffold(
          body: Row(
            children: [
              // Left Navigation
              if (isDesktop) 
                LeftNav(
                  activeView: appState.activeView,
                  onNavigate: (view) {
                    appState.setActiveView(view);
                  },
                ),

              // Main Content
              Expanded(
                child: _buildMainContent(context, appState),
              ),
            ],
          ),
          drawer: !isDesktop
              ? Drawer(
                  child: LeftNav(
                    activeView: appState.activeView,
                    onNavigate: (view) {
                      Navigator.pop(context);
                      appState.setActiveView(view);
                    },
                  ),
                )
              : null,
        );
      },
    );
  }

  Widget _buildMainContent(BuildContext context, AppState appState) {
    switch (appState.activeView) {
      case 'invoice':
        return const InvoiceScreen();
      case 'receipt':
        return const ReceiptScreen();
      case 'waybill':
        return const WaybillScreen();
      case 'drafts':
        return _buildDraftsView(context, appState);
      case 'settings':
        return const SettingsScreen();
      case 'home':
      default:
        return _buildHomeView(context, appState);
    }
  }

  Widget _buildHomeView(BuildContext context, AppState appState) {
    return Column(
      children: [
        TopBar(
          tabs: [
            TabItem(label: 'Invoices', value: 'invoices'),
            TabItem(label: 'Receipts', value: 'receipts'),
            TabItem(label: 'Waybills', value: 'waybills'),
          ],
          activeTab: appState.activeTab,
          onTabChange: (tab) => appState.setActiveTab(tab),
        ),
        Expanded(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Hero
                const Text(
                  'Billing & Document Management',
                  style: TextStyle(
                    fontSize: 28,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 8),
                const Text(
                  'Create invoices, receipts, and waybills - manage all your business documents in one place',
                  style: TextStyle(
                    fontSize: 14,
                    color: Color(0xFF6B7280),
                  ),
                ),
                const SizedBox(height: 32),

                // Stats Cards
                _buildStatsCards(appState),

                const SizedBox(height: 24),

                // Create Button
                CustomButton(
                  text: _getCreateButtonText(appState.activeTab),
                  icon: Icons.add,
                  onPressed: () {
                    if (appState.activeTab == 'invoices') {
                      // Generate new invoice number and create fresh invoice
                      final newInvoice = Invoice(
                        invoiceNumber: Invoice.generateInvoiceNumber(),
                        date: DateTime.now().toString().split(' ')[0],
                      );
                      appState.updateInvoiceData(newInvoice);
                      appState.setActiveView('invoice');
                    } else if (appState.activeTab == 'receipts') {
                      // Generate new receipt number and create fresh receipt
                      final newReceipt = Receipt(
                        receiptNumber: Receipt.generateReceiptNumber(),
                        date: DateTime.now().toString().split(' ')[0],
                      );
                      appState.updateReceiptData(newReceipt);
                      appState.setActiveView('receipt');
                    } else {
                      // Generate new waybill number and create fresh waybill
                      final newWaybill = Waybill(
                        waybillNumber: Waybill.generateWaybillNumber(),
                        date: DateTime.now().toString().split(' ')[0],
                      );
                      appState.updateWaybillData(newWaybill);
                      appState.setActiveView('waybill');
                    }
                  },
                ),

                const SizedBox(height: 24),

                // Document List
                Text(
                  _getListTitle(appState.activeTab),
                  style: const TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 16),
                DocumentList(
                  documents: _getDocuments(appState).map((doc) {
                    if (doc is Invoice) return doc.toDocumentItem();
                    if (doc is Receipt) return doc.toDocumentItem();
                    if (doc is Waybill) return doc.toDocumentItem();
                    return doc as DocumentItem;
                  }).toList(),
                  onView: (id) {
                    // Load the selected document and navigate to edit
                    if (appState.activeTab == 'invoices') {
                      final invoice = appState.recentInvoices.firstWhere(
                        (i) => i.invoiceNumber == id,
                        orElse: () => Invoice(),
                      );
                      appState.updateInvoiceData(invoice);
                      appState.setActiveView('invoice');
                    } else if (appState.activeTab == 'receipts') {
                      final receipt = appState.recentReceipts.firstWhere(
                        (r) => r.receiptNumber == id,
                        orElse: () => Receipt(),
                      );
                      appState.updateReceiptData(receipt);
                      appState.setActiveView('receipt');
                    } else {
                      final waybill = appState.recentWaybills.firstWhere(
                        (w) => w.waybillNumber == id,
                        orElse: () => Waybill(),
                      );
                      appState.updateWaybillData(waybill);
                      appState.setActiveView('waybill');
                    }
                  },
                  onDownload: (id) async {
                    await _downloadRecentPdf(context, appState, id);
                  },
                  onDelete: (id) async {
                    await _deleteRecent(context, appState, id);
                  },
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildDraftsView(BuildContext context, AppState appState) {
    return Column(
      children: [
        TopBar(
          tabs: [
            TabItem(label: 'Invoices', value: 'invoices'),
            TabItem(label: 'Receipts', value: 'receipts'),
            TabItem(label: 'Waybills', value: 'waybills'),
          ],
          activeTab: appState.activeTab,
          onTabChange: (tab) => appState.setActiveTab(tab),
          searchPlaceholder: 'Search drafts...',
        ),
        Expanded(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Saved Drafts',
                  style: TextStyle(
                    fontSize: 28,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  'Continue working on your draft ${_getDraftType(appState.activeTab)}',
                  style: const TextStyle(
                    fontSize: 14,
                    color: Color(0xFF6B7280),
                  ),
                ),
                const SizedBox(height: 24),

                CustomButton(
                  text: _getCreateButtonText(appState.activeTab),
                  icon: Icons.add,
                  onPressed: () async {
                    if (appState.activeTab == 'invoices') {
                      // Get next invoice number from backend
                      try {
                        final nextNumber = await ApiService.getNextInvoiceNumber(increment: false);
                        final newInvoice = Invoice(
                          invoiceNumber: nextNumber,
                          date: DateTime.now().toString().split(' ')[0],
                        );
                        appState.updateInvoiceData(newInvoice);
                        appState.setActiveView('invoice');
                      } catch (e) {
                        if (context.mounted) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(
                              content: Text('Failed to generate invoice number: $e'),
                              backgroundColor: Colors.orange,
                            ),
                          );
                        }
                      }
                    } else if (appState.activeTab == 'receipts') {
                      // Get next receipt number from backend
                      try {
                        final nextNumber = await ApiService.getNextReceiptNumber(increment: false);
                        final newReceipt = Receipt(
                          receiptNumber: nextNumber,
                          date: DateTime.now().toString().split(' ')[0],
                        );
                        appState.updateReceiptData(newReceipt);
                        appState.setActiveView('receipt');
                      } catch (e) {
                        if (context.mounted) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(
                              content: Text('Failed to generate receipt number: $e'),
                              backgroundColor: Colors.orange,
                            ),
                          );
                        }
                      }
                    } else {
                      // Get next waybill number from backend
                      try {
                        final nextNumber = await ApiService.getNextWaybillNumber(increment: false);
                        final newWaybill = Waybill(
                          waybillNumber: nextNumber,
                          date: DateTime.now().toString().split(' ')[0],
                        );
                        appState.updateWaybillData(newWaybill);
                        appState.setActiveView('waybill');
                      } catch (e) {
                        if (context.mounted) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(
                              content: Text('Failed to generate waybill number: $e'),
                              backgroundColor: Colors.orange,
                            ),
                          );
                        }
                      }
                    }
                  },
                ),

                const SizedBox(height: 24),

                DocumentList(
                  documents: _getDraftDocuments(appState).map((doc) {
                    if (doc is Invoice) return doc.toDocumentItem();
                    if (doc is Receipt) return doc.toDocumentItem();
                    if (doc is Waybill) return doc.toDocumentItem();
                    return doc as DocumentItem;
                  }).toList(),
                  onView: (id) {
                    // Load the selected draft and navigate to edit
                    if (appState.activeTab == 'invoices') {
                      final invoice = appState.draftInvoices.firstWhere(
                        (i) => i.invoiceNumber == id,
                        orElse: () => Invoice(),
                      );
                      appState.updateInvoiceData(invoice);
                      appState.setActiveView('invoice');
                    } else if (appState.activeTab == 'receipts') {
                      final receipt = appState.draftReceipts.firstWhere(
                        (r) => r.receiptNumber == id,
                        orElse: () => Receipt(),
                      );
                      appState.updateReceiptData(receipt);
                      appState.setActiveView('receipt');
                    } else {
                      final waybill = appState.draftWaybills.firstWhere(
                        (w) => w.waybillNumber == id,
                        orElse: () => Waybill(),
                      );
                      appState.updateWaybillData(waybill);
                      appState.setActiveView('waybill');
                    }
                  },
                  onDownload: (id) async {
                    await _downloadDraftPdf(context, appState, id);
                  },
                  onDelete: (id) async {
                    await _deleteDraft(context, appState, id);
                  },
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildStatsCards(AppState appState) {
    if (appState.activeTab == 'invoices') {
      return LayoutBuilder(
        builder: (context, constraints) {
          final crossAxisCount = constraints.maxWidth > 900 ? 3 : constraints.maxWidth > 600 ? 2 : 1;
          return GridView.count(
            crossAxisCount: crossAxisCount,
            crossAxisSpacing: 24,
            mainAxisSpacing: 24,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            childAspectRatio: 3,
            children: [
              _buildStatCard(
                icon: Icons.trending_up,
                iconColor: const Color(0xFFEAB308),
                iconBg: const Color(0xFFFEF3C7),
                label: 'Total Estimated Revenue',
                value: 'GHS ${_calculateInvoiceRevenue(appState)}',
              ),
              _buildStatCard(
                icon: Icons.description,
                iconColor: const Color(0xFF3B82F6),
                iconBg: const Color(0xFFDBEAFE),
                label: 'Total Invoices',
                value: '${appState.recentInvoices.length}',
              ),
              _buildStatCard(
                icon: Icons.schedule,
                iconColor: const Color(0xFFF97316),
                iconBg: const Color(0xFFFFEDD5),
                label: 'Draft Invoices',
                value: '${appState.draftInvoices.length}',
              ),
            ],
          );
        },
      );
    } else if (appState.activeTab == 'receipts') {
      return LayoutBuilder(
        builder: (context, constraints) {
          final crossAxisCount = constraints.maxWidth > 900 ? 3 : constraints.maxWidth > 600 ? 2 : 1;
          return GridView.count(
            crossAxisCount: crossAxisCount,
            crossAxisSpacing: 24,
            mainAxisSpacing: 24,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            childAspectRatio: 3,
            children: [
              _buildStatCard(
                icon: Icons.trending_up,
                iconColor: const Color(0xFF10B981),
                iconBg: const Color(0xFFD1FAE5),
                label: 'Total Received',
                value: 'GHS ${_calculateReceiptTotal(appState)}',
              ),
              _buildStatCard(
                icon: Icons.receipt,
                iconColor: const Color(0xFF8B5CF6),
                iconBg: const Color(0xFFEDE9FE),
                label: 'Total Receipts',
                value: '${appState.recentReceipts.length}',
              ),
              _buildStatCard(
                icon: Icons.schedule,
                iconColor: const Color(0xFFF97316),
                iconBg: const Color(0xFFFFEDD5),
                label: 'Draft Receipts',
                value: '${appState.draftReceipts.length}',
              ),
            ],
          );
        },
      );
    } else {
      return LayoutBuilder(
        builder: (context, constraints) {
          final crossAxisCount = constraints.maxWidth > 900 ? 3 : constraints.maxWidth > 600 ? 2 : 1;
          return GridView.count(
            crossAxisCount: crossAxisCount,
            crossAxisSpacing: 24,
            mainAxisSpacing: 24,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            childAspectRatio: 3,
            children: [
              _buildStatCard(
                icon: Icons.local_shipping,
                iconColor: const Color(0xFF6366F1),
                iconBg: const Color(0xFFE0E7FF),
                label: 'Active Shipments',
                value: '2',
              ),
              _buildStatCard(
                icon: Icons.description,
                iconColor: const Color(0xFF06B6D4),
                iconBg: const Color(0xFFCFFAFE),
                label: 'Total Waybills',
                value: '${appState.recentWaybills.length}',
              ),
              _buildStatCard(
                icon: Icons.schedule,
                iconColor: const Color(0xFFF97316),
                iconBg: const Color(0xFFFFEDD5),
                label: 'Draft Waybills',
                value: '${appState.draftWaybills.length}',
              ),
            ],
          );
        },
      );
    }
  }

  Widget _buildStatCard({
    required IconData icon,
    required Color iconColor,
    required Color iconBg,
    required String label,
    required String value,
  }) {
    return CustomCard(
      child: Row(
        children: [
          Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(
              color: iconBg,
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(icon, color: iconColor, size: 24),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(
                  label,
                  style: const TextStyle(
                    fontSize: 12,
                    color: Color(0xFF6B7280),
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  value,
                  style: const TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  String _getCreateButtonText(String tab) {
    if (tab == 'invoices') return 'Create New Invoice';
    if (tab == 'receipts') return 'Create New Receipt';
    return 'Create New Waybill';
  }

  String _getListTitle(String tab) {
    if (tab == 'invoices') return 'Recent Invoices';
    if (tab == 'receipts') return 'Recent Receipts';
    return 'Recent Waybills';
  }

  String _getDraftType(String tab) {
    if (tab == 'invoices') return 'invoices';
    if (tab == 'receipts') return 'receipts';
    return 'waybills';
  }

  List<dynamic> _getDocuments(AppState appState) {
    if (appState.activeTab == 'invoices') return appState.recentInvoices;
    if (appState.activeTab == 'receipts') return appState.recentReceipts;
    return appState.recentWaybills;
  }

  List<dynamic> _getDraftDocuments(AppState appState) {
    if (appState.activeTab == 'invoices') return appState.draftInvoices;
    if (appState.activeTab == 'receipts') return appState.draftReceipts;
    return appState.draftWaybills;
  }

  // Download PDF for draft documents
  Future<void> _downloadDraftPdf(BuildContext context, AppState appState, String id) async {
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

    // Show loading
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
      if (appState.activeTab == 'invoices') {
        final invoice = appState.draftInvoices.firstWhere((i) => i.invoiceNumber == id);
        await _generateInvoicePdf(context, invoice, pdfExportPath);
      } else if (appState.activeTab == 'receipts') {
        final receipt = appState.draftReceipts.firstWhere((r) => r.receiptNumber == id);
        await _generateReceiptPdf(context, receipt, pdfExportPath);
      } else {
        final waybill = appState.draftWaybills.firstWhere((w) => w.waybillNumber == id);
        await _generateWaybillPdf(context, waybill, pdfExportPath);
      }
    } catch (e) {
      if (context.mounted) {
        Navigator.pop(context);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to generate PDF: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  // Download PDF for recent documents
  Future<void> _downloadRecentPdf(BuildContext context, AppState appState, String id) async {
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

    // Show loading
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
      if (appState.activeTab == 'invoices') {
        final invoice = appState.recentInvoices.firstWhere((i) => i.invoiceNumber == id);
        await _generateInvoicePdf(context, invoice, pdfExportPath);
      } else if (appState.activeTab == 'receipts') {
        final receipt = appState.recentReceipts.firstWhere((r) => r.receiptNumber == id);
        await _generateReceiptPdf(context, receipt, pdfExportPath);
      } else {
        final waybill = appState.recentWaybills.firstWhere((w) => w.waybillNumber == id);
        await _generateWaybillPdf(context, waybill, pdfExportPath);
      }
    } catch (e) {
      if (context.mounted) {
        Navigator.pop(context);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to generate PDF: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  Future<void> _generateInvoicePdf(BuildContext context, Invoice invoice, String pdfExportPath) async {
    try {
      // Generate PDF locally
      final pdfBytes = await PdfService.generateInvoicePdfData(invoice);

      // Create invoices subfolder
      final invoicesDir = Directory(path.join(pdfExportPath, 'invoices'));
      if (!await invoicesDir.exists()) {
        await invoicesDir.create(recursive: true);
      }

      // Save PDF file
      final sanitizedCustomer = invoice.customerName.replaceAll(RegExp(r'[^a-zA-Z0-9]'), '_');
      final fileName = '${invoice.invoiceNumber}_$sanitizedCustomer.pdf';
      final file = File(path.join(invoicesDir.path, fileName));
      await file.writeAsBytes(pdfBytes);

      if (context.mounted) {
        Navigator.pop(context);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('PDF saved to ${file.path}'),
            backgroundColor: Colors.green,
            duration: const Duration(seconds: 4),
          ),
        );
      }
    } catch (e) {
      rethrow;
    }
  }

  Future<void> _generateReceiptPdf(BuildContext context, Receipt receipt, String pdfExportPath) async {
    try {
      // Generate PDF locally
      final pdfBytes = await PdfService.generateReceiptPdfData(receipt);

      // Create receipts subfolder
      final receiptsDir = Directory(path.join(pdfExportPath, 'receipts'));
      if (!await receiptsDir.exists()) {
        await receiptsDir.create(recursive: true);
      }

      // Save PDF file
      final sanitizedCustomer = receipt.customerName.replaceAll(RegExp(r'[^a-zA-Z0-9]'), '_');
      final fileName = '${receipt.receiptNumber}_$sanitizedCustomer.pdf';
      final file = File(path.join(receiptsDir.path, fileName));
      await file.writeAsBytes(pdfBytes);

      if (context.mounted) {
        Navigator.pop(context);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('PDF saved to ${file.path}'),
            backgroundColor: Colors.green,
            duration: const Duration(seconds: 4),
          ),
        );
      }
    } catch (e) {
      rethrow;
    }
  }

  Future<void> _generateWaybillPdf(BuildContext context, Waybill waybill, String pdfExportPath) async {
    try {
      // Generate PDF locally
      final pdfBytes = await PdfService.generateWaybillPdfData(waybill);

      // Create waybills subfolder
      final waybillsDir = Directory(path.join(pdfExportPath, 'waybills'));
      if (!await waybillsDir.exists()) {
        await waybillsDir.create(recursive: true);
      }

      // Save PDF file
      final sanitizedCustomer = waybill.consigneeName.replaceAll(RegExp(r'[^a-zA-Z0-9]'), '_');
      final fileName = '${waybill.waybillNumber}_$sanitizedCustomer.pdf';
      final file = File(path.join(waybillsDir.path, fileName));
      await file.writeAsBytes(pdfBytes);

      if (context.mounted) {
        Navigator.pop(context);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('PDF saved to ${file.path}'),
            backgroundColor: Colors.green,
            duration: const Duration(seconds: 4),
          ),
        );
      }
    } catch (e) {
      rethrow;
    }
  }

  // Delete draft document
  Future<void> _deleteDraft(BuildContext context, AppState appState, String id) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete Draft'),
        content: const Text('Are you sure you want to delete this draft?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            child: const Text('Delete'),
          ),
        ],
      ),
    );

    if (confirmed == true) {
      try {
        if (appState.activeTab == 'invoices') {
          final invoice = appState.draftInvoices.firstWhere((i) => i.invoiceNumber == id);
          await appState.deleteInvoiceDraft(invoice);
        } else if (appState.activeTab == 'receipts') {
          final receipt = appState.draftReceipts.firstWhere((r) => r.receiptNumber == id);
          await appState.deleteReceiptDraft(receipt);
        } else {
          final waybill = appState.draftWaybills.firstWhere((w) => w.waybillNumber == id);
          await appState.deleteWaybillDraft(waybill);
        }
        
        if (context.mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Draft deleted successfully'),
              backgroundColor: Colors.green,
            ),
          );
        }
      } catch (e) {
        if (context.mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Failed to delete draft: $e'),
              backgroundColor: Colors.red,
            ),
          );
        }
      }
    }
  }

  // Delete recent document
  Future<void> _deleteRecent(BuildContext context, AppState appState, String id) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete Document'),
        content: const Text('Are you sure you want to delete this document?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            child: const Text('Delete'),
          ),
        ],
      ),
    );

    if (confirmed == true) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Document deleted'),
            backgroundColor: Colors.green,
          ),
        );
      }
    }
  }

  // ── Local stats helpers ───────────────────────────────────────────────

  String _calculateInvoiceRevenue(AppState appState) {
    double total = 0;
    for (final inv in appState.recentInvoices) {
      total += inv.grandTotal;
    }
    return total.toStringAsFixed(2);
  }

  String _calculateReceiptTotal(AppState appState) {
    double total = 0;
    for (final r in appState.recentReceipts) {
      total += r.totalAmount;
    }
    return total.toStringAsFixed(2);
  }
}
