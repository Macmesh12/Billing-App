import 'dart:convert';

/// Item parser service matching backend InvoiceForm._parse_items logic
class ItemParser {
  /// Parse and sanitize items from JSON payload
  /// Matches backend InvoiceForm._parse_items function
  static List<Map<String, dynamic>> parseItems(String payload) {
    try {
      final dynamic decoded = jsonDecode(payload);
      
      if (decoded is! List) {
        return [];
      }

      final List<Map<String, dynamic>> sanitized = [];
      
      for (final item in decoded) {
        if (item is! Map) continue;

        final quantity = _toDouble(item['quantity']);
        final unitPrice = _toDouble(item['unit_price']);
        
        sanitized.add({
          'description': item['description']?.toString() ?? '',
          'quantity': quantity,
          'unit_price': unitPrice,
          'total': _round(quantity * unitPrice, 2),
        });
      }

      return sanitized;
    } catch (e) {
      // JSON decode error - return empty list like backend
      return [];
    }
  }

  /// Parse items from a List directly (already decoded JSON)
  static List<Map<String, dynamic>> parseItemsList(List<dynamic> items) {
    final List<Map<String, dynamic>> sanitized = [];
    
    for (final item in items) {
      if (item is! Map) continue;

      final quantity = _toDouble(item['quantity']);
      final unitPrice = _toDouble(item['unit_price']);
      
      sanitized.add({
        'description': item['description']?.toString() ?? '',
        'quantity': quantity,
        'unit_price': unitPrice,
        'total': _round(quantity * unitPrice, 2),
      });
    }

    return sanitized;
  }

  /// Convert value to double, matching backend float() conversion
  static double _toDouble(dynamic value) {
    if (value == null) return 0.0;
    if (value is double) return value;
    if (value is int) return value.toDouble();
    if (value is String) return double.tryParse(value) ?? 0.0;
    return 0.0;
  }

  /// Round to specified decimal places
  static double _round(double value, int decimals) {
    final factor = _pow(10, decimals);
    return (value * factor).roundToDouble() / factor;
  }

  static double _pow(int base, int exp) {
    double result = 1.0;
    for (int i = 0; i < exp; i++) {
      result *= base;
    }
    return result;
  }

  /// Validate items payload
  static bool isValidItemsPayload(String payload) {
    try {
      final decoded = jsonDecode(payload);
      return decoded is List;
    } catch (e) {
      return false;
    }
  }
}
