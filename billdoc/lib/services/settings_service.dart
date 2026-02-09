import 'package:shared_preferences/shared_preferences.dart';
import 'dart:convert';
import '../models/tax_settings.dart';
import 'api_service.dart';

/// Service for managing tax settings with caching and sync
class SettingsService {
  static const String _taxSettingsKey = 'tax_settings';
  static const String _lastSyncKey = 'tax_settings_last_sync';
  static const Duration _syncInterval = Duration(hours: 24);

  static TaxSettings? _cachedSettings;
  static DateTime? _lastSync;

  /// Get tax settings - uses cache, then local storage, then API, fallback to defaults
  static Future<TaxSettings> getTaxSettings({bool forceRefresh = false}) async {
    // Return cached if available and not forcing refresh
    if (!forceRefresh && _cachedSettings != null && _isSyncRecent()) {
      return _cachedSettings!;
    }

    // Try to sync from API
    if (forceRefresh || !_isSyncRecent()) {
      try {
        final settings = await _syncFromApi();
        await _saveToLocalStorage(settings);
        _cachedSettings = settings;
        _lastSync = DateTime.now();
        return settings;
      } catch (e) {
        // API failed - fall through to local storage/defaults
        print('Failed to sync tax settings from API: $e');
      }
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

  /// Sync settings from API
  static Future<TaxSettings> _syncFromApi() async {
    final config = await ApiService.getInvoiceConfig();
    final taxData = config['tax_settings'] as Map<String, dynamic>;
    return TaxSettings.fromJson(taxData);
  }

  /// Save settings to local storage
  static Future<void> _saveToLocalStorage(TaxSettings settings) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_taxSettingsKey, jsonEncode(settings.toJson()));
    await prefs.setInt(_lastSyncKey, DateTime.now().millisecondsSinceEpoch);
  }

  /// Load settings from local storage
  static Future<TaxSettings?> _loadFromLocalStorage() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final json = prefs.getString(_taxSettingsKey);
      final lastSyncMs = prefs.getInt(_lastSyncKey);
      
      if (json != null) {
        if (lastSyncMs != null) {
          _lastSync = DateTime.fromMillisecondsSinceEpoch(lastSyncMs);
        }
        return TaxSettings.fromJson(jsonDecode(json));
      }
    } catch (e) {
      print('Failed to load tax settings from storage: $e');
    }
    return null;
  }

  /// Check if sync is recent (within sync interval)
  static bool _isSyncRecent() {
    if (_lastSync == null) return false;
    return DateTime.now().difference(_lastSync!) < _syncInterval;
  }

  /// Force refresh settings from API
  static Future<TaxSettings> refreshSettings() async {
    return getTaxSettings(forceRefresh: true);
  }

  /// Clear cached settings (for testing/debugging)
  static Future<void> clearCache() async {
    _cachedSettings = null;
    _lastSync = null;
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_taxSettingsKey);
    await prefs.remove(_lastSyncKey);
  }
}
