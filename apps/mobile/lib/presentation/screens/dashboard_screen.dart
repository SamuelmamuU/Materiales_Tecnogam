import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../data/sources/local_database.dart';
import '../../data/repositories/sync_service.dart';
import 'capture_avance_screen.dart';
import 'capture_tiempo_muerto_screen.dart';
import 'capture_incidente_screen.dart';
import 'login_screen.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  String _userName = 'Cargando...';
  String _userRole = 'trabajador';
  int _pendingCount = 0;
  bool _syncing = false;

  @override
  void initState() {
    super.initState();
    _loadUserProfile();
    _refreshPendingCount();
  }

  Future<void> _loadUserProfile() async {
    final prefs = await SharedPreferences.getInstance();
    final userJson = prefs.getString('user');
    if (userJson != null) {
      try {
        final Map<String, dynamic> parsed = jsonDecode(userJson);
        setState(() {
          _userName = parsed['nombre'] ?? 'Usuario Tecnogam';
          _userRole = parsed['rol'] ?? 'trabajador';
        });
      } catch (_) {
        setState(() {
          _userName = 'Ana Torres';
          _userRole = 'supervisor';
        });
      }
    }
  }

  Future<void> _refreshPendingCount() async {
    final db = LocalDatabase.instance;
    final advances = await db.getPendingAvances();
    final times = await db.getPendingTiemposMuertos();
    final incidents = await db.getPendingIncidentes();
    if (mounted) {
      setState(() {
        _pendingCount = advances.length + times.length + incidents.length;
      });
    }
  }

  Future<void> _handleSync() async {
    setState(() {
      _syncing = true;
    });

    final stats = await SyncService.instance.syncPendingData();
    await _refreshPendingCount();

    if (mounted) {
      setState(() {
        _syncing = false;
      });

      final total = stats['avances']! + stats['tiemposMuertos']! + stats['incidentes']!;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            total > 0
                ? '¡Sincronización exitosa! Se subieron $total registros.'
                : 'No se subieron registros (verifique conexión o cola vacía).',
          ),
          backgroundColor: total > 0 ? Colors.green.shade700 : Colors.grey.shade800,
        ),
      );
    }
  }

  Future<void> _handleLogout() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.clear();
    if (mounted) {
      Navigator.of(context).pushReplacement(
        MaterialPageRoute(builder: (_) => const LoginScreen()),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    const surface0 = Color(0xFFF7F7F5);
    const surface1 = Color(0xFFF1EFE8);
    const textPrimary = Color(0xFF1C1C1A);
    const textSecondary = Color(0xFF5F5E5A);
    const fillPrimary = Color(0xFF1C1C1A);

    return Scaffold(
      backgroundColor: surface0,
      appBar: AppBar(
        backgroundColor: surface1,
        title: const Text(
          'Tecnogam Móvil',
          style: TextStyle(color: textPrimary, fontSize: 16, fontWeight: FontWeight.bold),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout, color: textSecondary, size: 20),
            onPressed: _handleLogout,
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Panel de Perfil
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: surface1,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: const Color(0xFFE3E1D9), width: 0.5),
              ),
              child: Row(
                children: [
                  const CircleAvatar(
                    backgroundColor: Color(0xFFE6F1FB),
                    child: Icon(Icons.person, color: Color(0xFF0C447C)),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          _userName,
                          style: const TextStyle(color: textPrimary, fontSize: 15, fontWeight: FontWeight.bold),
                        ),
                        Text(
                          'Rol: ${_userRole.toUpperCase()}',
                          style: const TextStyle(color: textSecondary, fontSize: 11),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),

            // Panel de Sincronización
            Card(
              elevation: 0,
              color: Colors.white,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
                side: const BorderSide(color: Color(0xFFE3E1D9), width: 0.5),
              ),
              child: Padding(
                padding: const EdgeInsets.all(16.0),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Cola de Sincronización',
                          style: TextStyle(color: textPrimary, fontSize: 14, fontWeight: FontWeight.bold),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          '$_pendingCount registros pendientes offline',
                          style: TextStyle(
                            color: _pendingCount > 0 ? Colors.amber.shade900 : textSecondary,
                            fontSize: 12,
                          ),
                        ),
                      ],
                    ),
                    ElevatedButton.icon(
                      onPressed: (_syncing || _pendingCount == 0) ? null : _handleSync,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: fillPrimary,
                        foregroundColor: Colors.white,
                        elevation: 0,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                      ),
                      icon: _syncing
                          ? const SizedBox(
                              width: 14,
                              height: 14,
                              child: CircularProgressIndicator(color: Colors.white, strokeWidth: 1.5),
                            )
                          : const Icon(Icons.sync, size: 16),
                      label: Text(_syncing ? 'Subiendo' : 'Sincronizar'),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 24),

            const Text(
              'Captura en Campo',
              style: TextStyle(color: textPrimary, fontSize: 13, fontWeight: FontWeight.w600),
            ),
            const SizedBox(height: 8),

            // Opciones de Captura
            _buildMenuButton(
              context: context,
              icon: Icons.add_chart,
              title: 'Capturar Avance Diario',
              subtitle: 'Reportar avance físico e instalación',
              color: const Color(0xFF27500A),
              bgColor: const Color(0xFFEAF3DE),
              screen: const CaptureAvanceScreen(),
            ),
            const SizedBox(height: 12),
            _buildMenuButton(
              context: context,
              icon: Icons.timer_off,
              title: 'Reportar Tiempo Muerto',
              subtitle: 'Paros y retrasos operacionales',
              color: const Color(0xFFBA7517),
              bgColor: const Color(0xFFFCF4E6),
              screen: const CaptureTiempoMuertoScreen(),
            ),
            const SizedBox(height: 12),
            _buildMenuButton(
              context: context,
              icon: Icons.warning_amber_rounded,
              title: 'Reportar Incidente',
              subtitle: 'Eventos de seguridad y calidad',
              color: const Color(0xFFC23939),
              bgColor: const Color(0xFFFDE8E8),
              screen: const CaptureIncidenteScreen(),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildMenuButton({
    required BuildContext context,
    required IconData icon,
    required String title,
    required String subtitle,
    required Color color,
    required Color bgColor,
    required Widget screen,
  }) {
    return InkWell(
      onTap: () async {
        await Navigator.of(context).push(
          MaterialPageRoute(builder: (_) => screen),
        );
        _refreshPendingCount();
      },
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: const Color(0xFFE3E1D9), width: 0.5),
        ),
        child: Row(
          children: [
            Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(
                color: bgColor,
                borderRadius: BorderRadius.circular(8),
              ),
              child: Icon(icon, color: color, size: 22),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: const TextStyle(color: Color(0xFF1C1C1A), fontSize: 13, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    subtitle,
                    style: const TextStyle(color: Color(0xFF5F5E5A), fontSize: 11),
                  ),
                ],
              ),
            ),
            const Icon(Icons.chevron_right, color: Color(0xFF8B8A84), size: 18),
          ],
        ),
      ),
    );
  }
}
