import 'package:shared_preferences/shared_preferences.dart';
import 'dart:convert';
import '../models/tax_settings.dart';

/// Service for managing tax settings — fully local, no backend API.
/// Uses SharedPreferences for persistence, with in-memory cache.
class SettingsService {
  static const String _taxSettingsKey = 'tax_settings';

  static TaxSettings? _cachedSettings;

  /// Get tax settings — cache → local storage → defaults
  static Future<TaxSettings> getTaxSettings({bool forceRefresh = false}) async {
    if (!forceRefresh && _cachedSettings != null) {
      return _cachedSettings!;
    }

    // Try local storage
    final stored = await _loadFromLocalStorage();
    if (stored != null) {
      _cachedSettings = stored;
      return stored;
    }

    // Fallback to defaults
    _cachedSettings = TaxSettings.defaultSettings;
    return TaxSettings.defaultSettings;
  }

  /// Save custom tax settings
  static Future<void> saveTaxSettings(TaxSettings settings) async {
    _cachedSettings = settings;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_taxSettingsKey, jsonEncode(settings.toJson()));
  }

  /// Load settings from local storage
  static Future<TaxSettings?> _loadFromLocalStorage() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final json = prefs.getString(_taxSettingsKey);
      if (json != null) {
        return TaxSettings.fromJson(jsonDecode(json));
      }
    } catch (e) {
      // ignore — will use defaults
    }
    return null;
  }

  /// Force refresh (just reloads from storage)
  static Future<TaxSettings> refreshSettings() async {
    return getTaxSettings(forceRefresh: true);
  }

  /// Clear cached settings
  static Future<void> clearCache() async {
    _cachedSettings = null;
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_taxSettingsKey);
  }
}
