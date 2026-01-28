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

  @override
  Widget build(BuildContext context) {
    return CustomCard(
      padding: EdgeInsets.zero,
      child: Column(
        children: documents.asMap().entries.map((entry) {
          final index = entry.key;
          final doc = entry.value;
          final isLast = index == documents.length - 1;

          return Container(
            decoration: BoxDecoration(
              border: isLast ? null : const Border(
                bottom: BorderSide(color: Color(0xFFF3F4F6)),
              ),
            ),
            child: InkWell(
              onTap: () => onView(doc.id),
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Row(
                  children: [
                    // Document Info
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            doc.customer,
                            style: const TextStyle(
                              fontWeight: FontWeight.w600,
                              fontSize: 14,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Row(
                            children: [
                              Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 8,
                                  vertical: 2,
                                ),
                                decoration: BoxDecoration(
                                  color: const Color(0xFFFEF3C7),
                                  borderRadius: BorderRadius.circular(4),
                                ),
                                child: Text(
                                  doc.type,
                                  style: const TextStyle(
                                    fontSize: 11,
                                    color: Color(0xFFCA8A04),
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                              ),
                              const SizedBox(width: 8),
                              Text(
                                '${doc.number} • ${doc.date}',
                                style: const TextStyle(
                                  fontSize: 12,
                                  color: Color(0xFF6B7280),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 4),
                          Text(
                            doc.location,
                            style: const TextStyle(
                              fontSize: 12,
                              color: Color(0xFF9CA3AF),
                            ),
                          ),
                        ],
                      ),
                    ),

                    // Amount
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        Text(
                          formatCurrency(doc.amount),
                          style: const TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                            color: Color(0xFF111827),
                          ),
                        ),
                        const SizedBox(height: 8),
                        Row(
                          children: [
                            IconButton(
                              icon: const Icon(Icons.visibility_outlined, size: 18),
                              color: const Color(0xFF6B7280),
                              padding: EdgeInsets.zero,
                              constraints: const BoxConstraints(),
                              onPressed: () => onView(doc.id),
                            ),
                            const SizedBox(width: 12),
                            IconButton(
                              icon: const Icon(Icons.download_outlined, size: 18),
                              color: const Color(0xFF6B7280),
                              padding: EdgeInsets.zero,
                              constraints: const BoxConstraints(),
                              onPressed: () => onDownload(doc.id),
                            ),
                            const SizedBox(width: 12),
                            IconButton(
                              icon: const Icon(Icons.delete_outline, size: 18),
                              color: const Color(0xFFEF4444),
                              padding: EdgeInsets.zero,
                              constraints: const BoxConstraints(),
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
