import 'package:flutter/material.dart';
import '../models/document_item.dart';
import 'custom_card.dart';

class DocumentList extends StatelessWidget {
  final List<DocumentItem> documents;
  final Function(String) onView;
  final Function(String) onDownload;
  final Function(String) onDelete;

  const DocumentList({
    super.key,
    required this.documents,
    required this.onView,
    required this.onDownload,
    required this.onDelete,
  });

  String formatCurrency(double amount) {
    return '₵${amount.toStringAsFixed(2)}';
  }

  Color _getTypeColor(String type) {
    switch (type.toLowerCase()) {
      case 'invoice':
        return const Color(0xFFEAB308);
      case 'receipt':
        return const Color(0xFF10B981);
      case 'waybill':
        return const Color(0xFF3B82F6);
      default:
        return const Color(0xFF6B7280);
    }
  }

  Color _getTypeBgColor(String type) {
    switch (type.toLowerCase()) {
      case 'invoice':
        return const Color(0xFFFEF3C7);
      case 'receipt':
        return const Color(0xFFD1FAE5);
      case 'waybill':
        return const Color(0xFFDBEAFE);
      default:
        return const Color(0xFFF3F4F6);
    }
  }

  IconData _getTypeIcon(String type) {
    switch (type.toLowerCase()) {
      case 'invoice':
        return Icons.description_outlined;
      case 'receipt':
        return Icons.receipt_outlined;
      case 'waybill':
        return Icons.local_shipping_outlined;
      default:
        return Icons.article_outlined;
    }
  }

  @override
  Widget build(BuildContext context) {
    if (documents.isEmpty) {
      return CustomCard(
        padding: const EdgeInsets.all(32),
        child: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(Icons.folder_open_outlined, size: 48, color: Colors.grey.shade400),
              const SizedBox(height: 16),
              Text(
                'No documents found',
                style: TextStyle(
                  fontSize: 16,
                  color: Colors.grey.shade600,
                ),
              ),
            ],
          ),
        ),
      );
    }

    return CustomCard(
      padding: EdgeInsets.zero,
      child: Column(
        children: documents.asMap().entries.map((entry) {
          final index = entry.key;
          final doc = entry.value;
          final isLast = index == documents.length - 1;
          final typeColor = _getTypeColor(doc.type);
          final typeBgColor = _getTypeBgColor(doc.type);

          return Container(
            decoration: BoxDecoration(
              border: isLast ? null : const Border(
                bottom: BorderSide(color: Color(0xFFE5E7EB), width: 1),
              ),
            ),
            child: InkWell(
              onTap: () => onView(doc.id),
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Type Icon
                    Container(
                      width: 48,
                      height: 48,
                      decoration: BoxDecoration(
                        color: typeBgColor,
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Icon(
                        _getTypeIcon(doc.type),
                        color: typeColor,
                        size: 24,
                      ),
                    ),
                    const SizedBox(width: 16),
                    
                    // Document Info
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          // Document Number (prominent)
                          Row(
                            children: [
                              Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 8,
                                  vertical: 3,
                                ),
                                decoration: BoxDecoration(
                                  color: typeBgColor,
                                  borderRadius: BorderRadius.circular(4),
                                ),
                                child: Text(
                                  doc.type.toUpperCase(),
                                  style: TextStyle(
                                    fontSize: 10,
                                    color: typeColor,
                                    fontWeight: FontWeight.w700,
                                    letterSpacing: 0.5,
                                  ),
                                ),
                              ),
                              const SizedBox(width: 8),
                              Text(
                                doc.number,
                                style: const TextStyle(
                                  fontWeight: FontWeight.bold,
                                  fontSize: 15,
                                  color: Color(0xFF111827),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 8),
                          
                          // Customer Name
                          Row(
                            children: [
                              const Icon(
                                Icons.person_outline,
                                size: 16,
                                color: Color(0xFF6B7280),
                              ),
                              const SizedBox(width: 4),
                              Expanded(
                                child: Text(
                                  doc.customer.isNotEmpty ? doc.customer : 'No customer',
                                  style: const TextStyle(
                                    fontSize: 14,
                                    fontWeight: FontWeight.w500,
                                    color: Color(0xFF374151),
                                  ),
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 4),
                          
                          // Date
                          Row(
                            children: [
                              const Icon(
                                Icons.calendar_today_outlined,
                                size: 14,
                                color: Color(0xFF9CA3AF),
                              ),
                              const SizedBox(width: 4),
                              Text(
                                doc.date.isNotEmpty ? doc.date : 'No date',
                                style: const TextStyle(
                                  fontSize: 13,
                                  color: Color(0xFF6B7280),
                                ),
                              ),
                              if (doc.location.isNotEmpty && doc.location != 'Local') ...[
                                const SizedBox(width: 12),
                                const Icon(
                                  Icons.location_on_outlined,
                                  size: 14,
                                  color: Color(0xFF9CA3AF),
                                ),
                                const SizedBox(width: 4),
                                Text(
                                  doc.location,
                                  style: const TextStyle(
                                    fontSize: 13,
                                    color: Color(0xFF6B7280),
                                  ),
                                ),
                              ],
                            ],
                          ),
                        ],
                      ),
                    ),

                    // Amount and Actions
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        // Amount
                        Text(
                          formatCurrency(doc.amount),
                          style: const TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                            color: Color(0xFF111827),
                          ),
                        ),
                        const SizedBox(height: 12),
                        // Action buttons in a row
                        Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            _CompactActionButton(
                              icon: Icons.edit_outlined,
                              tooltip: 'Edit',
                              color: const Color(0xFF3B82F6),
                              onPressed: () => onView(doc.id),
                            ),
                            const SizedBox(width: 6),
                            _CompactActionButton(
                              icon: Icons.download_outlined,
                              tooltip: 'Download PDF',
                              color: const Color(0xFF10B981),
                              onPressed: () => onDownload(doc.id),
                            ),
                            const SizedBox(width: 6),
                            _CompactActionButton(
                              icon: Icons.delete_outline,
                              tooltip: 'Delete',
                              color: const Color(0xFFEF4444),
                              onPressed: () => onDelete(doc.id),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          );
        }).toList(),
      ),
    );
  }
}

// Compact action button for the list
class _CompactActionButton extends StatelessWidget {
  final IconData icon;
  final String tooltip;
  final Color color;
  final VoidCallback onPressed;

  const _CompactActionButton({
    required this.icon,
    required this.tooltip,
    required this.color,
    required this.onPressed,
  });

  @override
  Widget build(BuildContext context) {
    return Tooltip(
      message: tooltip,
      child: InkWell(
        onTap: onPressed,
        borderRadius: BorderRadius.circular(6),
        child: Container(
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            color: color.withOpacity(0.1),
            borderRadius: BorderRadius.circular(6),
          ),
          child: Icon(icon, size: 18, color: color),
        ),
      ),
    );
  }
}

// Helper widget for action buttons with labels (for larger displays)
class _ActionButton extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color color;
  final VoidCallback onPressed;

  const _ActionButton({
    required this.icon,
    required this.label,
    required this.color,
    required this.onPressed,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onPressed,
      borderRadius: BorderRadius.circular(8),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: color.withOpacity(0.1),
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: color.withOpacity(0.3)),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 20, color: color),
            const SizedBox(height: 4),
            Text(
              label,
              style: TextStyle(
                fontSize: 10,
                fontWeight: FontWeight.w600,
                color: color,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
