import 'package:flutter/material.dart';

class LeftNav extends StatelessWidget {
  final String activeView;
  final Function(String) onNavigate;

  const LeftNav({
    super.key,
    required this.activeView,
    required this.onNavigate,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 280,
      color: Colors.white,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Brand
          Container(
            padding: const EdgeInsets.all(24),
            decoration: const BoxDecoration(
              border: Border(bottom: BorderSide(color: Color(0xFFE5E7EB))),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'BillingDoc',
                  style: TextStyle(
                    fontSize: 24,
                    fontWeight: FontWeight.bold,
                    color: Theme.of(context).primaryColor,
                  ),
                ),
                const SizedBox(height: 4),
                const Text(
                  'Document Management',
                  style: TextStyle(
                    fontSize: 12,
                    color: Color(0xFF6B7280),
                  ),
                ),
              ],
            ),
          ),

          // Navigation
          Expanded(
            child: ListView(
              padding: const EdgeInsets.symmetric(vertical: 16),
              children: [
                NavLink(
                  icon: Icons.home_outlined,
                  label: 'Home',
                  active: activeView == 'home',
                  onTap: () => onNavigate('home'),
                ),
                NavLink(
                  icon: Icons.description_outlined,
                  label: 'Create Invoice',
                  active: activeView == 'invoice',
                  onTap: () => onNavigate('invoice'),
                ),
                NavLink(
                  icon: Icons.receipt_outlined,
                  label: 'Create Receipt',
                  active: activeView == 'receipt',
                  onTap: () => onNavigate('receipt'),
                ),
                NavLink(
                  icon: Icons.local_shipping_outlined,
                  label: 'Create Waybill',
                  active: activeView == 'waybill',
                  onTap: () => onNavigate('waybill'),
                ),
                NavLink(
                  icon: Icons.save_outlined,
                  label: 'Saved Drafts',
                  active: activeView == 'drafts',
                  onTap: () => onNavigate('drafts'),
                ),
              ],
            ),
          ),

          // Settings
          Container(
            decoration: const BoxDecoration(
              border: Border(top: BorderSide(color: Color(0xFFE5E7EB))),
            ),
            child: NavLink(
              icon: Icons.settings_outlined,
              label: 'Settings',
              active: activeView == 'settings',
              onTap: () => onNavigate('settings'),
            ),
          ),
        ],
      ),
    );
  }
}

class NavLink extends StatelessWidget {
  final IconData icon;
  final String label;
  final bool active;
  final VoidCallback onTap;

  const NavLink({
    super.key,
    required this.icon,
    required this.label,
    required this.active,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
        margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 2),
        decoration: BoxDecoration(
          color: active ? const Color(0xFFFEF3C7) : Colors.transparent,
          borderRadius: BorderRadius.circular(8),
        ),
        child: Row(
          children: [
            Icon(
              icon,
              size: 20,
              color: active ? const Color(0xFFCA8A04) : const Color(0xFF6B7280),
            ),
            const SizedBox(width: 12),
            Text(
              label,
              style: TextStyle(
                fontSize: 14,
                fontWeight: active ? FontWeight.w600 : FontWeight.normal,
                color: active ? const Color(0xFF78350F) : const Color(0xFF374151),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
