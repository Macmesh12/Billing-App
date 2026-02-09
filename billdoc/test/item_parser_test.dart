import 'package:flutter_test/flutter_test.dart';
import 'package:billdoc/services/item_parser.dart';
import 'dart:convert';

void main() {
  group('ItemParser Tests', () {
    test('parseItems with valid JSON string', () {
      final payload = jsonEncode([
        {'description': 'Item 1', 'quantity': 2, 'unit_price': 10.0},
        {'description': 'Item 2', 'quantity': 3, 'unit_price': 5.5},
      ]);

      final items = ItemParser.parseItems(payload);

      expect(items.length, 2);
      expect(items[0]['description'], 'Item 1');
      expect(items[0]['quantity'], 2.0);
      expect(items[0]['unit_price'], 10.0);
      expect(items[0]['total'], 20.0);
      
      expect(items[1]['description'], 'Item 2');
      expect(items[1]['quantity'], 3.0);
      expect(items[1]['unit_price'], 5.5);
      expect(items[1]['total'], 16.5);
    });

    test('parseItems with missing fields defaults to zero', () {
      final payload = jsonEncode([
        {'description': 'Item 1'}, // Missing quantity and unit_price
      ]);

      final items = ItemParser.parseItems(payload);

      expect(items.length, 1);
      expect(items[0]['description'], 'Item 1');
      expect(items[0]['quantity'], 0.0);
      expect(items[0]['unit_price'], 0.0);
      expect(items[0]['total'], 0.0);
    });

    test('parseItems with null values defaults to zero', () {
      final payload = jsonEncode([
        {'description': 'Item 1', 'quantity': null, 'unit_price': null},
      ]);

      final items = ItemParser.parseItems(payload);

      expect(items.length, 1);
      expect(items[0]['quantity'], 0.0);
      expect(items[0]['unit_price'], 0.0);
      expect(items[0]['total'], 0.0);
    });

    test('parseItems rounds total to 2 decimal places', () {
      final payload = jsonEncode([
        {'description': 'Item 1', 'quantity': 2.5, 'unit_price': 10.333},
      ]);

      final items = ItemParser.parseItems(payload);

      expect(items[0]['total'], 25.83); // 2.5 * 10.333 = 25.8325 -> 25.83
    });

    test('parseItems with invalid JSON returns empty list', () {
      final items = ItemParser.parseItems('invalid json');
      expect(items, isEmpty);
    });

    test('parseItems with non-list JSON returns empty list', () {
      final payload = jsonEncode({'key': 'value'});
      final items = ItemParser.parseItems(payload);
      expect(items, isEmpty);
    });

    test('parseItems with empty array', () {
      final payload = jsonEncode([]);
      final items = ItemParser.parseItems(payload);
      expect(items, isEmpty);
    });

    test('parseItems filters out non-map items', () {
      final payload = jsonEncode([
        {'description': 'Valid Item', 'quantity': 2, 'unit_price': 10.0},
        'invalid item',
        123,
        null,
        {'description': 'Another Valid', 'quantity': 1, 'unit_price': 5.0},
      ]);

      final items = ItemParser.parseItems(payload);

      expect(items.length, 2);
      expect(items[0]['description'], 'Valid Item');
      expect(items[1]['description'], 'Another Valid');
    });

    test('parseItemsList with already decoded list', () {
      final list = [
        {'description': 'Item 1', 'quantity': 2, 'unit_price': 10.0},
        {'description': 'Item 2', 'quantity': 3, 'unit_price': 5.5},
      ];

      final items = ItemParser.parseItemsList(list);

      expect(items.length, 2);
      expect(items[0]['description'], 'Item 1');
      expect(items[0]['total'], 20.0);
      expect(items[1]['description'], 'Item 2');
      expect(items[1]['total'], 16.5);
    });

    test('isValidItemsPayload validates correctly', () {
      expect(ItemParser.isValidItemsPayload('[]'), true);
      expect(ItemParser.isValidItemsPayload('[{"key": "value"}]'), true);
      expect(ItemParser.isValidItemsPayload('invalid'), false);
      expect(ItemParser.isValidItemsPayload('{"key": "value"}'), false); // Object, not array
    });

    test('parseItems handles string quantities and prices', () {
      final payload = jsonEncode([
        {'description': 'Item 1', 'quantity': '2.5', 'unit_price': '10.0'},
      ]);

      final items = ItemParser.parseItems(payload);

      expect(items[0]['quantity'], 2.5);
      expect(items[0]['unit_price'], 10.0);
      expect(items[0]['total'], 25.0);
    });

    test('parseItems handles int quantities and prices', () {
      final payload = jsonEncode([
        {'description': 'Item 1', 'quantity': 2, 'unit_price': 10},
      ]);

      final items = ItemParser.parseItems(payload);

      expect(items[0]['quantity'], 2.0);
      expect(items[0]['unit_price'], 10.0);
      expect(items[0]['total'], 20.0);
    });

    test('parseItems matches backend behavior for complex case', () {
      // This should match the backend test case exactly
      final payload = jsonEncode([
        {'description': 'Widget A', 'quantity': 1, 'unit_price': 10.333},
        {'description': 'Widget B', 'quantity': 2, 'unit_price': 5.667},
        {'description': 'Widget C', 'quantity': 1.5, 'unit_price': 7.777},
      ]);

      final items = ItemParser.parseItems(payload);

      expect(items.length, 3);
      expect(items[0]['total'], 10.33);
      expect(items[1]['total'], 11.33);
      expect(items[2]['total'], 11.67);
    });
  });
}
