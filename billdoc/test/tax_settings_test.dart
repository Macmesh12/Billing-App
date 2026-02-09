import 'package:flutter_test/flutter_test.dart';
import 'package:billdoc/models/tax_settings.dart';

void main() {
  group('TaxSettings Tests', () {
    test('defaultSettings has correct values', () {
      expect(TaxSettings.defaultSettings.nhil, 0.025);
      expect(TaxSettings.defaultSettings.getfund, 0.025);
      expect(TaxSettings.defaultSettings.vat, 0.15);
    });

    test('fromJson converts correctly', () {
      final json = {
        'NHIL': 0.03,
        'GETFUND': 0.03,
        'VAT': 0.12,
      };

      final settings = TaxSettings.fromJson(json);

      expect(settings.nhil, 0.03);
      expect(settings.getfund, 0.03);
      expect(settings.vat, 0.12);
    });

    test('fromJson uses defaults for missing values', () {
      final json = <String, dynamic>{};

      final settings = TaxSettings.fromJson(json);

      expect(settings.nhil, TaxSettings.defaultSettings.nhil);
      expect(settings.getfund, TaxSettings.defaultSettings.getfund);
      expect(settings.vat, TaxSettings.defaultSettings.vat);
    });

    test('toJson converts correctly', () {
      final settings = TaxSettings(nhil: 0.03, getfund: 0.03, vat: 0.12);
      final json = settings.toJson();

      expect(json['NHIL'], 0.03);
      expect(json['GETFUND'], 0.03);
      expect(json['VAT'], 0.12);
    });

    test('asMap returns correct map', () {
      final settings = TaxSettings(nhil: 0.03, getfund: 0.03, vat: 0.12);
      final map = settings.asMap;

      expect(map['NHIL'], 0.03);
      expect(map['GETFUND'], 0.03);
      expect(map['VAT'], 0.12);
      expect(map.length, 3);
    });

    test('fromJson handles int values', () {
      final json = {
        'NHIL': 1, // Int value
        'GETFUND': 2, // Int value
        'VAT': 3, // Int value
      };

      final settings = TaxSettings.fromJson(json);

      expect(settings.nhil, 1.0);
      expect(settings.getfund, 2.0);
      expect(settings.vat, 3.0);
    });
  });
}
