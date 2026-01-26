import 'package:flutter/material.dart';

class TopBar extends StatelessWidget {
  final List<TabItem> tabs;
  final String activeTab;
  final Function(String) onTabChange;
  final String searchPlaceholder;

  const TopBar({
    super.key,
    required this.tabs,
    required this.activeTab,
    required this.onTabChange,
    this.searchPlaceholder = 'Search documents...',
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      color: Colors.white,
      padding: const EdgeInsets.all(20),
      child: Column(
        children: [
          // Search Bar
          Container(
            decoration: BoxDecoration(
              color: const Color(0xFFF3F4F6),
              borderRadius: BorderRadius.circular(12),
            ),
            child: TextField(
              decoration: InputDecoration(
                hintText: searchPlaceholder,
                prefixIcon: const Icon(Icons.search, color: Color(0xFF9CA3AF)),
                border: InputBorder.none,
                contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              ),
            ),
          ),

          const SizedBox(height: 16),

          // Tabs
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: tabs
                  .map((tab) => Padding(
                        padding: const EdgeInsets.only(right: 8),
                        child: InkWell(
                          onTap: () => onTabChange(tab.value),
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
                            decoration: BoxDecoration(
                              color: activeTab == tab.value
                                  ? const Color(0xFFEAB308)
                                  : const Color(0xFFF3F4F6),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Text(
                              tab.label,
                              style: TextStyle(
                                fontSize: 14,
                                fontWeight: FontWeight.w600,
                                color: activeTab == tab.value ? Colors.white : const Color(0xFF6B7280),
                              ),
                            ),
                          ),
                        ),
                      ))
                  .toList(),
            ),
          ),
        ],
      ),
    );
  }
}

class TabItem {
  final String label;
  final String value;

  TabItem({required this.label, required this.value});
}
