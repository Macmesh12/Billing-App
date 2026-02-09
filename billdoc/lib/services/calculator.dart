import 'package:decimal/decimal.dart';
import '../models/tax_settings.dart';

/// Invoice totals result matching backend InvoiceTotals dataclass
class InvoiceTotals {
  final Decimal subtotal;
  final Map<String, Decimal> levies;
  final Decimal grandTotal;

  const InvoiceTotals({
    required this.subtotal,
    required this.levies,
    required this.grandTotal,
  });

  /// Convert to JSON for API compatibility
  Map<String, dynamic> toJson() {
    return {
      'subtotal': subtotal.toDouble(),
      'levies': levies.map((key, value) => MapEntry(key, value.toDouble())),
      'grand_total': grandTotal.toDouble(),
    };
  }
}

/// Calculator service matching backend calculator.py logic
class Calculator {
  /// Helper to round Decimal to 2 decimal places (ROUND_HALF_UP)
  static Decimal _roundToTwoDecimals(Decimal value) {
    // Multiply by 100, round, then divide by 100
    // Convert from Rational back to Decimal
    final shifted = value * Decimal.fromInt(100);
    final rounded = shifted.round();
    final result = rounded / Decimal.fromInt(100);
    // Convert Rational to Decimal by going through string
    return Decimal.parse(result.toDouble().toStringAsFixed(2));
  }

  /// Convert value to Decimal with proper rounding (ROUND_HALF_UP)
  /// Matches backend _to_decimal function
  static Decimal toDecimal(dynamic value) {
    if (value is Decimal) {
      return _roundToTwoDecimals(value);
    }
    final numValue = value is num ? value : (double.tryParse(value.toString()) ?? 0.0);
    final decimal = Decimal.parse(numValue.toString());
    return _roundToTwoDecimals(decimal);
  }

  /// Calculate invoice totals matching backend calculate_totals function
  /// Uses Decimal arithmetic with ROUND_HALF_UP (default in Decimal package)
  static InvoiceTotals calculateTotals(
    List<Map<String, dynamic>> items,
    TaxSettings taxSettings,
  ) {
    // Calculate subtotal: sum of (quantity * unit_price) for all items
    Decimal subtotal = Decimal.zero;
    for (final item in items) {
      final quantity = toDecimal(item['quantity'] ?? 0);
      final unitPrice = toDecimal(item['unit_price'] ?? 0);
      final itemTotal = quantity * unitPrice;
      subtotal += _roundToTwoDecimals(itemTotal);
    }
    subtotal = _roundToTwoDecimals(subtotal);

    // Calculate levies (taxes) based on tax settings
    final levies = <String, Decimal>{};
    Decimal levyTotal = Decimal.zero;

    for (final entry in taxSettings.asMap.entries) {
      final levyName = entry.key;
      final rate = toDecimal(entry.value);
      final levyAmount = subtotal * rate;
      final roundedLevy = _roundToTwoDecimals(levyAmount);
      levies[levyName] = roundedLevy;
      levyTotal += roundedLevy;
    }

    // Calculate grand total
    final grandTotal = subtotal + levyTotal;
    final roundedGrandTotal = _roundToTwoDecimals(grandTotal);

    return InvoiceTotals(
      subtotal: subtotal,
      levies: levies,
      grandTotal: roundedGrandTotal,
    );
  }

  /// Calculate total for a single item
  static double calculateItemTotal(double quantity, double unitPrice) {
    final result = toDecimal(quantity) * toDecimal(unitPrice);
    return result.toDouble();
  }
}