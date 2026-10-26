import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import '../../data/sources/api_config.dart';
import 'dashboard_screen.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  String _selectedRole = 'trabajador';
  bool _obscurePassword = true;
  bool _isLoading = false;
  String? _errorMessage;
  String? _successMessage;
  String _currentServerUrl = ApiConfig.defaultRenderUrl;

  final List<Map<String, String>> _roles = [
    {'value': 'trabajador', 'label': 'Trabajador'},
    {'value': 'supervisor', 'label': 'Supervisor'},
    {'value': 'administrador', 'label': 'Administrador'},
    {'value': 'cliente', 'label': 'Cliente'},
  ];

  @override
  void initState() {
    super.initState();
    _loadServerUrl();
  }

  Future<void> _loadServerUrl() async {
    final url = await ApiConfig.instance.getBaseUrl();
    if (mounted) {
      setState(() {
        _currentServerUrl = url;
      });
    }
  }

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _handleLogin() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() {
      _isLoading = true;
      _errorMessage = null;
      _successMessage = null;
    });

    final email = _emailController.text.trim();
    final password = _passwordController.text.trim();

    try {
      final baseUrl = await ApiConfig.instance.getBaseUrl();
      final url = Uri.parse('$baseUrl/auth/login');

      final response = await http
          .post(
            url,
            headers: {'Content-Type': 'application/json'},
            body: jsonEncode({
              'email': email,
              'password': password,
              'rol': _selectedRole,
            }),
          )
          .timeout(const Duration(seconds: 15));

      final responseData = jsonDecode(response.body);

      if (response.statusCode != 200) {
        throw Exception(responseData['message'] ?? 'Error de inicio de sesión');
      }

      // Guardar tokens y usuario en configuración persistente
      await ApiConfig.instance.setTokens(
        responseData['accessToken'],
        responseData['refreshToken'],
      );

      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('accessToken', responseData['accessToken']);
      await prefs.setString('refreshToken', responseData['refreshToken']);
      await prefs.setString('user', jsonEncode(responseData['user']));

      setState(() {
        _successMessage = '¡Bienvenido ${responseData['user']['nombre']}!';
      });

      // Redireccionar al Dashboard
      Future.delayed(const Duration(milliseconds: 600), () {
        if (mounted) {
          Navigator.of(context).pushReplacement(
            MaterialPageRoute(builder: (_) => const DashboardScreen()),
          );
        }
      });
    } catch (e) {
      setState(() {
        _errorMessage = e.toString().replaceAll('Exception: ', '');
      });
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  Future<void> _showServerConfigDialog() async {
    final controller = TextEditingController(text: _currentServerUrl);
    await showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Row(
          children: [
            Icon(Icons.dns, color: Color(0xFF0C447C), size: 20),
            SizedBox(width: 8),
            Text('Servidor Backend', style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold)),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Text(
              'Selecciona o ingresa la URL base del backend:',
              style: TextStyle(fontSize: 12, color: Color(0xFF5F5E5A)),
            ),
            const SizedBox(height: 12),
            Wrap(
              spacing: 6,
              runSpacing: 6,
              children: [
                ActionChip(
                  label: const Text('☁️ Render Nube', style: TextStyle(fontSize: 11)),
                  onPressed: () => controller.text = ApiConfig.defaultRenderUrl,
                ),
                ActionChip(
                  label: const Text('📱 Emulador (10.0.2.2)', style: TextStyle(fontSize: 11)),
                  onPressed: () => controller.text = ApiConfig.defaultLocalhostUrl,
                ),
                ActionChip(
                  label: const Text('💻 Red Local (192.168.x)', style: TextStyle(fontSize: 11)),
                  onPressed: () => controller.text = ApiConfig.defaultLanUrl,
                ),
              ],
            ),
            const SizedBox(height: 12),
            TextField(
              controller: controller,
              decoration: const InputDecoration(
                labelText: 'URL del Backend',
                border: OutlineInputBorder(),
                contentPadding: EdgeInsets.symmetric(horizontal: 10, vertical: 8),
              ),
              style: const TextStyle(fontSize: 13),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: const Text('Cancelar'),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF1C1C1A)),
            onPressed: () async {
              final newUrl = controller.text.trim();
              if (newUrl.isNotEmpty) {
                await ApiConfig.instance.setBaseUrl(newUrl);
                if (!mounted) return;
                setState(() {
                  _currentServerUrl = newUrl;
                });
                if (ctx.mounted) {
                  Navigator.of(ctx).pop();
                }
                if (mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text('Servidor configurado: $newUrl')),
                  );
                }
              }
            },
            child: const Text('Guardar', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    const surface0 = Color(0xFFF7F7F5);
    const surface1 = Color(0xFFF1EFE8);
    const textPrimary = Color(0xFF1C1C1A);
    const textSecondary = Color(0xFF5F5E5A);
    const fillPrimary = Color(0xFF1C1C1A);
    const accentColor = Color(0xFF0C447C);

    return Scaffold(
      backgroundColor: surface0,
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 20),
          child: Container(
            constraints: const BoxConstraints(maxWidth: 380),
            padding: const EdgeInsets.all(22.0),
            decoration: BoxDecoration(
              color: surface1,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: const Color(0xFFE3E1D9), width: 0.5),
            ),
            child: Form(
              key: _formKey,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // Icono y Título
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(Icons.business, color: accentColor, size: 24),
                      const SizedBox(width: 8),
                      Text(
                        'Control de Materiales',
                        style: Theme.of(context).textTheme.titleMedium?.copyWith(
                              color: textPrimary,
                              fontWeight: FontWeight.bold,
                            ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  const Text(
                    'Inicia sesión para continuar',
                    textAlign: TextAlign.center,
                    style: TextStyle(color: textSecondary, fontSize: 12),
                  ),
                  const SizedBox(height: 16),

                  // Mensajes de Alerta
                  if (_errorMessage != null)
                    Container(
                      padding: const EdgeInsets.all(10),
                      margin: const EdgeInsets.only(bottom: 14),
                      decoration: BoxDecoration(
                        color: Colors.red.shade50,
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: Colors.red.shade200, width: 0.5),
                      ),
                      child: Text(
                        _errorMessage!,
                        style: TextStyle(color: Colors.red.shade800, fontSize: 11),
                      ),
                    ),

                  if (_successMessage != null)
                    Container(
                      padding: const EdgeInsets.all(10),
                      margin: const EdgeInsets.only(bottom: 14),
                      decoration: BoxDecoration(
                        color: Colors.green.shade50,
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: Colors.green.shade200, width: 0.5),
                      ),
                      child: Text(
                        _successMessage!,
                        style: TextStyle(color: Colors.green.shade800, fontSize: 11),
                      ),
                    ),

                  // Campo Correo
                  const Text(
                    'Correo electrónico',
                    style: TextStyle(color: textSecondary, fontSize: 12, fontWeight: FontWeight.w500),
                  ),
                  const SizedBox(height: 4),
                  TextFormField(
                    controller: _emailController,
                    keyboardType: TextInputType.emailAddress,
                    enabled: !_isLoading,
                    style: const TextStyle(color: textPrimary, fontSize: 14),
                    decoration: InputDecoration(
                      hintText: 'nombre@empresa.com',
                      hintStyle: const TextStyle(color: Colors.grey, fontSize: 13),
                      filled: true,
                      fillColor: Colors.white,
                      contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(8),
                        borderSide: const BorderSide(color: Color(0xFFE3E1D9), width: 0.5),
                      ),
                      focusedBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(8),
                        borderSide: const BorderSide(color: accentColor, width: 1.0),
                      ),
                    ),
                    validator: (value) {
                      if (value == null || value.isEmpty) return 'El correo es obligatorio';
                      if (!value.contains('@')) return 'Ingrese un correo válido';
                      return null;
                    },
                  ),
                  const SizedBox(height: 14),

                  // Campo Contraseña
                  const Text(
                    'Contraseña',
                    style: TextStyle(color: textSecondary, fontSize: 12, fontWeight: FontWeight.w500),
                  ),
                  const SizedBox(height: 4),
                  TextFormField(
                    controller: _passwordController,
                    obscureText: _obscurePassword,
                    enabled: !_isLoading,
                    style: const TextStyle(color: textPrimary, fontSize: 14),
                    decoration: InputDecoration(
                      hintText: '••••••••',
                      hintStyle: const TextStyle(color: Colors.grey, fontSize: 13),
                      filled: true,
                      fillColor: Colors.white,
                      contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                      suffixIcon: IconButton(
                        icon: Icon(
                          _obscurePassword ? Icons.visibility_off : Icons.visibility,
                          color: Colors.grey,
                          size: 18,
                        ),
                        onPressed: () {
                          setState(() {
                            _obscurePassword = !_obscurePassword;
                          });
                        },
                      ),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(8),
                        borderSide: const BorderSide(color: Color(0xFFE3E1D9), width: 0.5),
                      ),
                      focusedBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(8),
                        borderSide: const BorderSide(color: accentColor, width: 1.0),
                      ),
                    ),
                    validator: (value) {
                      if (value == null || value.isEmpty) return 'La contraseña es obligatoria';
                      return null;
                    },
                  ),
                  const SizedBox(height: 14),

                  // Selector de Perfil/Rol
                  const Text(
                    'Perfil',
                    style: TextStyle(color: textSecondary, fontSize: 12, fontWeight: FontWeight.w500),
                  ),
                  const SizedBox(height: 4),
                  DropdownButtonFormField<String>(
                    initialValue: _selectedRole,
                    decoration: InputDecoration(
                      filled: true,
                      fillColor: Colors.white,
                      contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(8),
                        borderSide: const BorderSide(color: Color(0xFFE3E1D9), width: 0.5),
                      ),
                    ),
                    items: _roles
                        .map((role) => DropdownMenuItem<String>(
                              value: role['value'],
                              child: Text(
                                role['label']!,
                                style: const TextStyle(fontSize: 14, color: textPrimary),
                              ),
                            ))
                        .toList(),
                    onChanged: _isLoading
                        ? null
                        : (val) {
                            if (val != null) {
                              setState(() {
                                _selectedRole = val;
                              });
                            }
                          },
                  ),
                  const SizedBox(height: 20),

                  // Botón Enviar
                  ElevatedButton(
                    onPressed: _isLoading ? null : _handleLogin,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: fillPrimary,
                      foregroundColor: Colors.white,
                      elevation: 0,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(8),
                      ),
                      padding: const EdgeInsets.symmetric(vertical: 12),
                    ),
                    child: _isLoading
                        ? const SizedBox(
                            width: 20,
                            height: 20,
                            child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                          )
                        : const Text(
                            'Entrar',
                            style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600),
                          ),
                  ),
                  const SizedBox(height: 14),

                  // Botón de Configuración de Servidor
                  InkWell(
                    onTap: _showServerConfigDialog,
                    borderRadius: BorderRadius.circular(8),
                    child: Padding(
                      padding: const EdgeInsets.symmetric(vertical: 6),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const Icon(Icons.dns, size: 13, color: Color(0xFF5F5E5A)),
                          const SizedBox(width: 5),
                          Flexible(
                            child: Text(
                              _currentServerUrl.contains('render')
                                  ? 'Servidor: Nube (Render)'
                                  : 'Servidor: $_currentServerUrl',
                              style: const TextStyle(
                                fontSize: 11,
                                color: Color(0xFF5F5E5A),
                                decoration: TextDecoration.underline,
                              ),
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),

                  // Indicador Offline
                  const SizedBox(height: 6),
                  const Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.wifi_off, color: Colors.grey, size: 13),
                      SizedBox(width: 5),
                      Text(
                        'Funciona también sin conexión',
                        style: TextStyle(color: Colors.grey, fontSize: 11),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
