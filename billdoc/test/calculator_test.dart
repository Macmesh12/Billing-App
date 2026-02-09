import 'package:flutter_test/flutter_test.dart';
import 'package:billdoc/services/calculator.dart';
import 'package:billdoc/models/tax_settings.dart';
import 'package:decimal/decimal.dart';

void main() {
  group('Calculator Tests', () {
    final taxSettings = TaxSettings.defaultSettings;

    test('toDecimal converts values correctly', () {
      expect(Calculator.toDecimal(10).toDouble(), 10.00);
      expect(Calculator.toDecimal(10.5).toDouble(), 10.50);
      expect(Calculator.toDecimal('10.5').toDouble(), 10.50);
      expect(Calculator.toDecimal(null).toDouble(), 0.00);
      expect(Calculator.toDecimal(Decimal.parse('10.5')).toDouble(), 10.50);
    });

    test('toDecimal rounds to 2 decimal places', () {
      expect(Calculator.toDecimal(10.555).toDouble(), 10.56);
      expect(Calculator.toDecimal(10.554).toDouble(), 10.55);
      expect(Calculator.toDecimal(10.999).toDouble(), 11.00);
    });

    test('calculateTotals with single item', () {
      final items = [
        {'quantity': 2, 'unit_price': 10.0, 'description': 'Item 1'},
      ];

      final totals = Calculator.calculateTotals(items, taxSettings);

      expect(totals.subtotal.toDouble(), 20.00);
      expect(totals.levies['NHIL']?.toDouble(), 0.50); // 2.5% of 20
      expect(totals.levies['GETFUND']?.toDouble(), 0.50); // 2.5% of 20
      expect(totals.levies['VAT']?.toDouble(), 3.00); // 15% of 20
      expect(totals.grandTotal.toDouble(), 24.00); // 20 + 0.5 + 0.5 + 3
    });

    test('calculateTotals with multiple items', () {
      final items = [
        {'quantity': 2, 'unit_price': 10.0, 'description': 'Item 1'},
        {'quantity': 3, 'unit_price': 5.0, 'description': 'Item 2'},
      ];

      final totals = Calculator.calculateTotals(items, taxSettings);

      expect(totals.subtotal.toDouble(), 35.00); // 20 + 15
      expect(totals.levies['NHIL']?.toDouble(), 0.88); // 2.5% of 35 = 0.875 -> 0.88
      expect(totals.levies['GETFUND']?.toDouble(), 0.88); // 2.5% of 35 = 0.875 -> 0.88
      expect(totals.levies['VAT']?.toDouble(), 5.25); // 15% of 35
      expect(totals.grandTotal.toDouble(), 42.01); // 35 + 0.88 + 0.88 + 5.25
    });

    test('calculateTotals with decimal quantities', () {
      final items = [
        {'quantity': 2.5, 'unit_price': 10.0, 'description': 'Item 1'},
      ];

      final totals = Calculator.calculateTotals(items, taxSettings);

      expect(totals.subtotal.toDouble(), 25.00);
      expect(totals.grandTotal.toDouble(), 30.00); // 25 + (25 * 0.2)
    });

    test('calculateTotals with empty items', () {
      final items = <Map<String, dynamic>>[];

      final totals = Calculator.calculateTotals(items, taxSettings);

      expect(totals.subtotal.toDouble(), 0.00);
      expect(totals.levies['NHIL']?.toDouble(), 0.00);
      expect(totals.levies['GETFUND']?.toDouble(), 0.00);
      expect(totals.levies['VAT']?.toDouble(), 0.00);
      expect(totals.grandTotal.toDouble(), 0.00);
    });

    test('calculateTotals with missing values defaults to zero', () {
      final items = [
        {'description': 'Item 1'}, // Missing quantity and unit_price
      ];

      final totals = Calculator.calculateTotals(items, taxSettings);

      expect(totals.subtotal.toDouble(), 0.00);
      expect(totals.grandTotal.toDouble(), 0.00);
    });

    test('calculateTotals precision matches backend', () {
      // Test case matching backend test: 3 items with specific pricing
      final items = [
        {'quantity': 1, 'unit_price': 10.333, 'description': 'Item 1'},
        {'quantity': 2, 'unit_price': 5.667, 'description': 'Item 2'},
        {'quantity': 1.5, 'unit_price': 7.777, 'description': 'Item 3'},
      ];

      final totals = Calculator.calculateTotals(items, taxSettings);

      // Subtotal: 10.33 + 11.33 + 11.67 = 33.33
      expect(totals.subtotal.toDouble(), 33.33);
      
      // NHIL: 33.33 * 0.025 = 0.83325 -> 0.83
      expect(totals.levies['NHIL']?.toDouble(), 0.83);
      
      // GETFUND: 33.33 * 0.025 = 0.83325 -> 0.83
      expect(totals.levies['GETFUND']?.toDouble(), 0.83);
      
      // VAT: 33.33 * 0.15 = 4.9995 -> 5.00
      expect(totals.levies['VAT']?.toDouble(), 5.00);
      
      // Grand total: 33.33 + 0.83 + 0.83 + 5.00 = 39.99
      expect(totals.grandTotal.toDouble(), 39.99);
    });

    test('calculateItemTotal matches backend rounding', () {
      expect(Calculator.calculateItemTotal(2, 10.0), 20.00);
      expect(Calculator.calculateItemTotal(2.5, 10.333), 25.83);
      expect(Calculator.calculateItemTotal(1.5, 7.777), 11.67);
    });

    test('toJson converts correctly', () {
      final items = [
        {'quantity': 2, 'unit_price': 10.0, 'description': 'Item 1'},
      ];

      final totals = Calculator.calculateTotals(items, taxSettings);
      final json = totals.toJson();

      expect(json['subtotal'], 20.00);
      expect(json['levies']['NHIL'], 0.50);
      expect(json['levies']['GETFUND'], 0.50);
      expect(json['levies']['VAT'], 3.00);
      expect(json['grand_total'], 24.00);
    });

    test('custom tax settings', () {
      final customTax = TaxSettings(nhil: 0.03, getfund: 0.03, vat: 0.12);
      final items = [
        {'quantity': 10, 'unit_price': 10.0, 'description': 'Item 1'},
      ];

      final totals = Calculator.calculateTotals(items, customTax);

      expect(totals.subtotal.toDouble(), 100.00);
      expect(totals.levies['NHIL']?.toDouble(), 3.00); // 3% of 100
      expect(totals.levies['GETFUND']?.toDouble(), 3.00); // 3% of 100
      expect(totals.levies['VAT']?.toDouble(), 12.00); // 12% of 100
      expect(totals.grandTotal.toDouble(), 118.00);
    });
  });
}
