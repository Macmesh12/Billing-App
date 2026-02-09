/// Tax settings model matching backend TAX_SETTINGS
class TaxSettings {
  final double nhil;
  final double getfund;
  final double vat;

  const TaxSettings({
    required this.nhil,
    required this.getfund,
    required this.vat,
  });

  /// Default tax settings matching backend defaults
  static const TaxSettings defaultSettings = TaxSettings(
    nhil: 0.025,    // 2.5%
    getfund: 0.025, // 2.5%
    vat: 0.15,      // 15%
  );

  factory TaxSettings.fromJson(Map<String, dynamic> json) {
    return TaxSettings(
      nhil: (json['NHIL'] as num?)?.toDouble() ?? defaultSettings.nhil,
      getfund: (json['GETFUND'] as num?)?.toDouble() ?? defaultSettings.getfund,
      vat: (json['VAT'] as num?)?.toDouble() ?? defaultSettings.vat,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'NHIL': nhil,
      'GETFUND': getfund,
      'VAT': vat,
    };
  }

  Map<String, double> get asMap => {
    'NHIL': nhil,
    'GETFUND': getfund,
    'VAT': vat,
  };
}
