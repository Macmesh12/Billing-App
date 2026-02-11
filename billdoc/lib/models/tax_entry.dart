/// A single tax/levy entry (e.g. NHIL 2.5%, VAT 15%).
class TaxEntry {
  final String name;
  final double rate; // percentage, e.g. 2.5 means 2.5%
  final bool enabled;

  /// If true this is a built-in tax whose name cannot be changed or deleted.
  final bool isDefault;

  const TaxEntry({
    required this.name,
    required this.rate,
    this.enabled = true,
    this.isDefault = false,
  });

  TaxEntry copyWith({
    String? name,
    double? rate,
    bool? enabled,
    bool? isDefault,
  }) {
    return TaxEntry(
      name: name ?? this.name,
      rate: rate ?? this.rate,
      enabled: enabled ?? this.enabled,
      isDefault: isDefault ?? this.isDefault,
    );
  }

  Map<String, dynamic> toJson() => {
    'name': name,
    'rate': rate,
    'enabled': enabled,
    'isDefault': isDefault,
  };

  factory TaxEntry.fromJson(Map<String, dynamic> json) {
    final name = json['name'] as String? ?? '';
    // Auto-detect built-in taxes by name for backward compat
    final builtIn = _defaultNames.contains(name.toUpperCase());
    return TaxEntry(
      name: name,
      rate: (json['rate'] as num?)?.toDouble() ?? 0.0,
      enabled: json['enabled'] as bool? ?? true,
      isDefault: json['isDefault'] as bool? ?? builtIn,
    );
  }

  /// Names that are always treated as built-in defaults.
  static const Set<String> _defaultNames = {'NHIL', 'GETFUND', 'VAT'};

  /// The default taxes shipped with the app.
  static const List<TaxEntry> defaults = [
    TaxEntry(name: 'NHIL', rate: 2.5, isDefault: true),
    TaxEntry(name: 'GETFund', rate: 2.5, isDefault: true),
    TaxEntry(name: 'VAT', rate: 15.0, isDefault: true),
  ];
}
