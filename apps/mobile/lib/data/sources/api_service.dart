import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;
import 'api_config.dart';

class ApiResponse {
  final bool success;
  final int statusCode;
  final dynamic data;
  final String? errorMessage;

  ApiResponse({
    required this.success,
    required this.statusCode,
    this.data,
    this.errorMessage,
  });
}

class ApiService {
  static final ApiService instance = ApiService._init();
  ApiService._init();

  Future<Map<String, String>> _getHeaders() async {
    final token = await ApiConfig.instance.getAccessToken();
    final headers = <String, String>{
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    if (token != null && token.isNotEmpty) {
      headers['Authorization'] = 'Bearer $token';
    }
    return headers;
  }

  Future<ApiResponse> get(String endpoint) async {
    try {
      final baseUrl = await ApiConfig.instance.getBaseUrl();
      final url = Uri.parse('$baseUrl$endpoint');
      final headers = await _getHeaders();

      final response = await http.get(url, headers: headers).timeout(
            const Duration(seconds: 60),
          );

      return _handleResponse(response);
    } on TimeoutException {
      return ApiResponse(
        success: false,
        statusCode: 408,
        errorMessage: 'Tiempo de espera agotado. El servidor en la nube tardó en responder.',
      );
    } on SocketException {
      return ApiResponse(
        success: false,
        statusCode: 0,
        errorMessage: 'Sin conexión al servidor o red inaccesible.',
      );
    } catch (e) {
      return ApiResponse(
        success: false,
        statusCode: -1,
        errorMessage: e.toString(),
      );
    }
  }

  Future<ApiResponse> post(String endpoint, Map<String, dynamic> body) async {
    try {
      final baseUrl = await ApiConfig.instance.getBaseUrl();
      final url = Uri.parse('$baseUrl$endpoint');
      final headers = await _getHeaders();

      final response = await http
          .post(
            url,
            headers: headers,
            body: jsonEncode(body),
          )
          .timeout(const Duration(seconds: 60));

      return _handleResponse(response);
    } on TimeoutException {
      return ApiResponse(
        success: false,
        statusCode: 408,
        errorMessage: 'Tiempo de espera agotado. El servidor en la nube tardó en responder.',
      );
    } on SocketException {
      return ApiResponse(
        success: false,
        statusCode: 0,
        errorMessage: 'Sin conexión al servidor o red inaccesible.',
      );
    } catch (e) {
      return ApiResponse(
        success: false,
        statusCode: -1,
        errorMessage: e.toString(),
      );
    }
  }

  Future<ApiResponse> put(String endpoint, Map<String, dynamic> body) async {
    try {
      final baseUrl = await ApiConfig.instance.getBaseUrl();
      final url = Uri.parse('$baseUrl$endpoint');
      final headers = await _getHeaders();

      final response = await http
          .put(
            url,
            headers: headers,
            body: jsonEncode(body),
          )
          .timeout(const Duration(seconds: 60));

      return _handleResponse(response);
    } on TimeoutException {
      return ApiResponse(
        success: false,
        statusCode: 408,
        errorMessage: 'Tiempo de espera agotado. El servidor en la nube tardó en responder.',
      );
    } on SocketException {
      return ApiResponse(
        success: false,
        statusCode: 0,
        errorMessage: 'Sin conexión al servidor o red inaccesible.',
      );
    } catch (e) {
      return ApiResponse(
        success: false,
        statusCode: -1,
        errorMessage: e.toString(),
      );
    }
  }

  ApiResponse _handleResponse(http.Response response) {
    dynamic parsed;
    try {
      parsed = jsonDecode(response.body);
    } catch (_) {
      parsed = response.body;
    }

    if (response.statusCode >= 200 && response.statusCode < 300) {
      return ApiResponse(
        success: true,
        statusCode: response.statusCode,
        data: parsed,
      );
    } else {
      String msg = 'Error en el servidor (${response.statusCode})';
      if (parsed is Map && parsed['message'] != null) {
        msg = parsed['message'].toString();
      }
      return ApiResponse(
        success: false,
        statusCode: response.statusCode,
        data: parsed,
        errorMessage: msg,
      );
    }
  }
}
