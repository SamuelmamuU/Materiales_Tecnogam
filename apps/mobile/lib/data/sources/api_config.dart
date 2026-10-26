import 'package:shared_preferences/shared_preferences.dart';

class ApiConfig {
  static final ApiConfig instance = ApiConfig._init();
  ApiConfig._init();

  static const String defaultRenderUrl = 'https://control-materiales-backend.onrender.com';
  static const String defaultLocalhostUrl = 'http://10.0.2.2:3000';
  static const String defaultLanUrl = 'http://192.168.1.100:3000';

  static const String _keyBaseUrl = 'api_base_url';
  static const String _keyAccessToken = 'accessToken';
  static const String _keyRefreshToken = 'refreshToken';
  static const String _keyUser = 'user';
  static const String _keyActiveProjectId = 'active_project_id';
  static const String _keyActiveProjectName = 'active_project_name';
  static const String _keyActiveProjectClient = 'active_project_client';
  static const String _keyActiveProjectLogo = 'active_project_logo';

  // Default fallback project ID if none selected
  static const String defaultProjectId = 'e5911ce8-c7ff-44f6-9f6a-48472f25e77f';

  Future<String> getBaseUrl() async {
    final prefs = await SharedPreferences.getInstance();
    final saved = prefs.getString(_keyBaseUrl);
    if (saved == null || saved.contains('materiales-tecnogam.onrender.com')) {
      await prefs.setString(_keyBaseUrl, defaultRenderUrl);
      return defaultRenderUrl;
    }
    return saved;
  }

  Future<void> setBaseUrl(String url) async {
    final prefs = await SharedPreferences.getInstance();
    final cleanUrl = url.trim().endsWith('/') ? url.trim().substring(0, url.trim().length - 1) : url.trim();
    await prefs.setString(_keyBaseUrl, cleanUrl);
  }

  Future<String?> getAccessToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_keyAccessToken);
  }

  Future<void> setTokens(String accessToken, String refreshToken) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_keyAccessToken, accessToken);
    await prefs.setString(_keyRefreshToken, refreshToken);
  }

  Future<String?> getActiveProjectId() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_keyActiveProjectId) ?? defaultProjectId;
  }

  Future<void> setActiveProjectId(String projectId) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_keyActiveProjectId, projectId);
  }

  Future<void> setActiveProjectInfo({
    required String id,
    required String nombre,
    required String cliente,
    String? logoCliente,
  }) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_keyActiveProjectId, id);
    await prefs.setString(_keyActiveProjectName, nombre);
    await prefs.setString(_keyActiveProjectClient, cliente);
    if (logoCliente != null && logoCliente.isNotEmpty) {
      await prefs.setString(_keyActiveProjectLogo, logoCliente);
    } else {
      await prefs.remove(_keyActiveProjectLogo);
    }
  }

  Future<Map<String, String?>> getActiveProjectInfo() async {
    final prefs = await SharedPreferences.getInstance();
    final id = prefs.getString(_keyActiveProjectId);
    final name = prefs.getString(_keyActiveProjectName);
    final client = prefs.getString(_keyActiveProjectClient);
    final logo = prefs.getString(_keyActiveProjectLogo);
    return {
      'id': id,
      'nombre': name,
      'cliente': client,
      'logoCliente': logo,
    };
  }

  Future<void> clearAuth() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_keyAccessToken);
    await prefs.remove(_keyRefreshToken);
    await prefs.remove(_keyUser);
  }
}
