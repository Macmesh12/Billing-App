import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/app_state.dart';
import '../models/document_item.dart';
import '../models/invoice.dart';
import '../models/receipt.dart';
import '../models/waybill.dart';
import '../services/api_service.dart';
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
                    if (appState.activeTab == 'invoices') {
                      appState.setActiveView('invoice');
                    } else if (appState.activeTab == 'receipts') {
                      appState.setActiveView('receipt');
                    } else {
                      appState.setActiveView('waybill');
                    }
                  },
                  onDownload: (id) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(content: Text('Downloading document $id')),
                    );
                  },
                  onDelete: (id) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(content: Text('Deleting document $id')),
                    );
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

                DocumentList(
                  documents: _getDraftDocuments(appState).map((doc) {
                    if (doc is Invoice) return doc.toDocumentItem();
                    if (doc is Receipt) return doc.toDocumentItem();
                    if (doc is Waybill) return doc.toDocumentItem();
                    return doc as DocumentItem;
                  }).toList(),
                  onView: (id) {
                    if (appState.activeTab == 'invoices') {
                      appState.setActiveView('invoice');
                    } else if (appState.activeTab == 'receipts') {
                      appState.setActiveView('receipt');
                    } else {
                      appState.setActiveView('waybill');
                    }
                  },
                  onDownload: (id) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(content: Text('Downloading draft $id')),
                    );
                  },
                  onDelete: (id) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(content: Text('Deleting draft $id')),
                    );
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
              FutureBuilder<Map<String, dynamic>>(
                future: ApiService.getInvoiceStats(),
                builder: (context, snapshot) {
                  final revenue = snapshot.data?['total_estimated_revenue']?.toString() ?? '0.00';
                  return _buildStatCard(
                    icon: Icons.trending_up,
                    iconColor: const Color(0xFFEAB308),
                    iconBg: const Color(0xFFFEF3C7),
                    label: 'Total Estimated Revenue',
                    value: snapshot.hasData ? '₵$revenue' : 'Loading...',
                  );
                },
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
              FutureBuilder<Map<String, dynamic>>(
                future: ApiService.getReceiptStats(),
                builder: (context, snapshot) {
                  final received = snapshot.data?['total_money_received']?.toString() ?? '0.00';
                  return _buildStatCard(
                    icon: Icons.trending_up,
                    iconColor: const Color(0xFF10B981),
                    iconBg: const Color(0xFFD1FAE5),
                    label: 'Total Received',
                    value: snapshot.hasData ? '₵$received' : 'Loading...',
                  );
                },
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
}
