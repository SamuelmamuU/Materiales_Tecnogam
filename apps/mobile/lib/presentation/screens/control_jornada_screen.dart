import 'dart:async';
import 'package:flutter/material.dart';
import '../../data/repositories/jornada_service.dart';
import '../../data/sources/api_config.dart';
import '../widgets/project_header_banner.dart';

class ControlJornadaScreen extends StatefulWidget {
  final String? projectId;
  final JornadaLaboral? initialJornada;

  const ControlJornadaScreen({super.key, this.projectId, this.initialJornada});

  @override
  State<ControlJornadaScreen> createState() => _ControlJornadaScreenState();
}

class _ControlJornadaScreenState extends State<ControlJornadaScreen> {
  JornadaLaboral? _jornada;
  bool _loading = true;
  bool _actionLoading = false;
  Timer? _timer;

  int _workedSec = 0;
  int _deadSec = 0;
  late String _activeProjectId;

  @override
  void initState() {
    super.initState();
    _activeProjectId = widget.projectId ?? ApiConfig.defaultProjectId;
    if (widget.initialJornada != null) {
      _jornada = widget.initialJornada;
      _loading = false;
      final times = JornadaLaboral.computeLiveSeconds(widget.initialJornada);
      _workedSec = times['workedSec'] ?? 0;
      _deadSec = times['deadSec'] ?? 0;
      _startLiveTimer();
    } else {
      _initData();
    }
  }

  Future<void> _initData() async {
    final pid = widget.projectId ?? await ApiConfig.instance.getActiveProjectId();
    if (mounted) {
      setState(() {
        _activeProjectId = pid ?? ApiConfig.defaultProjectId;
      });
      await _loadJornada();
      _startLiveTimer();
    }
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  void _startLiveTimer() {
    _timer?.cancel();
    _timer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (_jornada != null && mounted) {
        final times = JornadaLaboral.computeLiveSeconds(_jornada);
        setState(() {
          _workedSec = times['workedSec'] ?? 0;
          _deadSec = times['deadSec'] ?? 0;
        });
      }
    });
  }

  Future<void> _loadJornada() async {
    setState(() => _loading = true);
    try {
      final j = await JornadaService.instance.getJornadaHoy(_activeProjectId);
      if (mounted) {
        setState(() {
          _jornada = j;
          if (j != null) {
            final times = JornadaLaboral.computeLiveSeconds(j);
            _workedSec = times['workedSec'] ?? 0;
            _deadSec = times['deadSec'] ?? 0;
          } else {
            _workedSec = 0;
            _deadSec = 0;
          }
        });
      }
    } catch (_) {
      // Ignorar errores menores de consulta
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _iniciarJornada() async {
    setState(() => _actionLoading = true);
    try {
      final j = await JornadaService.instance.iniciarJornada(_activeProjectId);
      if (mounted) {
        setState(() => _jornada = j);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('¡Jornada iniciada! El cronómetro de trabajo está activo.'),
            backgroundColor: Color(0xFF27500A),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e'), backgroundColor: Colors.red),
        );
      }
    } finally {
      if (mounted) setState(() => _actionLoading = false);
    }
  }

  Future<void> _cambiarEstado(String nuevoEstado, {String? motivo}) async {
    setState(() => _actionLoading = true);
    try {
      final j = await JornadaService.instance.cambiarEstado(
        _activeProjectId,
        nuevoEstado,
        motivo: motivo,
      );
      if (mounted) {
        setState(() => _jornada = j);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              nuevoEstado == 'TRABAJANDO'
                  ? 'Labores reanudadas. Cronómetro de trabajo activo.'
                  : nuevoEstado == 'TIEMPO_MUERTO'
                      ? 'Trabajo pausado. Se inició el conteo de tiempo muerto.'
                      : 'En receso de comida (relojes pausados).',
            ),
            backgroundColor: const Color(0xFF1C1C1A),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e'), backgroundColor: Colors.red),
        );
      }
    } finally {
      if (mounted) setState(() => _actionLoading = false);
    }
  }

  Future<void> _mostrarDialogoTiempoMuerto() async {
    final controller = TextEditingController();
    final motivo = await showDialog<String>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Row(
          children: [
            Icon(Icons.pause_circle_outline, color: Color(0xFFC55A11)),
            SizedBox(width: 8),
            Text('Pausar Trabajo', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Se detendrá el reloj de trabajo y se contabilizará tiempo muerto por paro.',
              style: TextStyle(fontSize: 12, color: Color(0xFF5F5E5A)),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: controller,
              maxLines: 2,
              decoration: const InputDecoration(
                hintText: 'Motivo (ej. Lluvia, falta de andamio, permiso)',
                border: OutlineInputBorder(),
                contentPadding: EdgeInsets.all(10),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(null),
            child: const Text('Cancelar'),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFFC55A11)),
            onPressed: () => Navigator.of(ctx).pop(controller.text.trim()),
            child: const Text('Confirmar Paro', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );

    if (motivo != null) {
      await _cambiarEstado('TIEMPO_MUERTO', motivo: motivo.isEmpty ? 'Paro en obra' : motivo);
    }
  }

  Future<void> _finalizarJornada() async {
    final controller = TextEditingController();
    final confirmar = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Finalizar Jornada de Hoy', style: TextStyle(fontWeight: FontWeight.bold)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              '¿Estás seguro de cerrar la jornada laboral? Se congelarán todos los contadores de horas.',
              style: TextStyle(fontSize: 12, color: Color(0xFF5F5E5A)),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: controller,
              decoration: const InputDecoration(
                hintText: 'Notas u observaciones de cierre (opcional)',
                border: OutlineInputBorder(),
                contentPadding: EdgeInsets.all(10),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(false),
            child: const Text('Volver'),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF1C1C1A)),
            onPressed: () => Navigator.of(ctx).pop(true),
            child: const Text('Finalizar Día', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );

    if (confirmar == true) {
      setState(() => _actionLoading = true);
      try {
        final j = await JornadaService.instance.finalizarJornada(
          _activeProjectId,
          notas: controller.text.trim(),
        );
        if (mounted) {
          setState(() => _jornada = j);
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Jornada finalizada exitosamente.'),
              backgroundColor: Colors.green,
            ),
          );
        }
      } catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Error: $e'), backgroundColor: Colors.red),
          );
        }
      } finally {
        if (mounted) setState(() => _actionLoading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    const surface0 = Color(0xFFF7F7F5);
    const surface1 = Color(0xFFF1EFE8);
    const textPrimary = Color(0xFF1C1C1A);
    const textSecondary = Color(0xFF5F5E5A);

    final estado = _jornada?.estado ?? 'INACTIVA';

    return Scaffold(
      backgroundColor: surface0,
      appBar: AppBar(
        backgroundColor: surface1,
        title: const Text(
          'Control de Jornada Laboral',
          style: TextStyle(color: textPrimary, fontSize: 16, fontWeight: FontWeight.bold),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh, color: textSecondary),
            onPressed: _actionLoading ? null : _loadJornada,
          ),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : SingleChildScrollView(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // Banner de Proyecto Activo con Logos Tecnogam y Cliente
                  ProjectHeaderBanner(
                    compact: true,
                    onProjectChanged: (p) {
                      setState(() {
                        _activeProjectId = p.id;
                      });
                      _loadJornada();
                    },
                  ),
                  const SizedBox(height: 14),

                  // Badge de Estado Actual
                  _buildStatusHeader(estado),
                  const SizedBox(height: 16),

                  // Tarjetas de Cronómetro en Vivo (2 Relojes)
                  Row(
                    children: [
                      // Reloj Tiempo Trabajado
                      Expanded(
                        child: Container(
                          padding: const EdgeInsets.all(14),
                          decoration: BoxDecoration(
                            color: estado == 'TRABAJANDO' ? const Color(0xFFEAF3DE) : Colors.white,
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(
                              color: estado == 'TRABAJANDO'
                                  ? const Color(0xFFC0DD9D)
                                  : const Color(0xFFE3E1D9),
                              width: estado == 'TRABAJANDO' ? 1.5 : 1,
                            ),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  Icon(
                                    Icons.play_circle_fill,
                                    size: 16,
                                    color: estado == 'TRABAJANDO'
                                        ? const Color(0xFF27500A)
                                        : textSecondary,
                                  ),
                                  const SizedBox(width: 4),
                                  const Expanded(
                                    child: Text(
                                      'Trabajado',
                                      style: TextStyle(
                                        fontSize: 12,
                                        fontWeight: FontWeight.bold,
                                        color: textPrimary,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 8),
                              Text(
                                JornadaLaboral.formatSecondsToHMS(_workedSec),
                                style: const TextStyle(
                                  fontSize: 20,
                                  fontWeight: FontWeight.w900,
                                  fontFamily: 'monospace',
                                  color: Color(0xFF1C1C1A),
                                ),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                '${(_workedSec / 3600).toStringAsFixed(2)} hrs efectivas',
                                style: const TextStyle(fontSize: 10, color: textSecondary),
                              ),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      // Reloj Tiempo Muerto
                      Expanded(
                        child: Container(
                          padding: const EdgeInsets.all(14),
                          decoration: BoxDecoration(
                            color: estado == 'TIEMPO_MUERTO' ? const Color(0xFFFFF3E0) : Colors.white,
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(
                              color: estado == 'TIEMPO_MUERTO'
                                  ? const Color(0xFFFFCC80)
                                  : const Color(0xFFE3E1D9),
                              width: estado == 'TIEMPO_MUERTO' ? 1.5 : 1,
                            ),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  Icon(
                                    Icons.warning_amber_rounded,
                                    size: 16,
                                    color: estado == 'TIEMPO_MUERTO'
                                        ? const Color(0xFFC55A11)
                                        : textSecondary,
                                  ),
                                  const SizedBox(width: 4),
                                  const Expanded(
                                    child: Text(
                                      'Tiempo Muerto',
                                      style: TextStyle(
                                        fontSize: 12,
                                        fontWeight: FontWeight.bold,
                                        color: textPrimary,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 8),
                              Text(
                                JornadaLaboral.formatSecondsToHMS(_deadSec),
                                style: const TextStyle(
                                  fontSize: 20,
                                  fontWeight: FontWeight.w900,
                                  fontFamily: 'monospace',
                                  color: Color(0xFFC55A11),
                                ),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                '${(_deadSec / 3600).toStringAsFixed(2)} hrs perdidas',
                                style: const TextStyle(fontSize: 10, color: textSecondary),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 24),

                  // Botonera de Control de Campo
                  const Text(
                    'Acciones Operativas',
                    style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: textPrimary),
                  ),
                  const SizedBox(height: 12),

                  if (estado == 'INACTIVA')
                    _buildActionButton(
                      label: 'Iniciar Jornada de Hoy',
                      icon: Icons.play_arrow,
                      color: const Color(0xFF27500A),
                      textColor: Colors.white,
                      onPressed: _actionLoading ? null : _iniciarJornada,
                    ),

                  if (estado == 'TRABAJANDO') ...[
                    _buildActionButton(
                      label: 'Pausar Trabajo (Reportar Tiempo Muerto)',
                      icon: Icons.pause_circle_outline,
                      color: const Color(0xFFFFF3E0),
                      textColor: const Color(0xFF8C3B00),
                      borderColor: const Color(0xFFFFCC80),
                      onPressed: _actionLoading ? null : _mostrarDialogoTiempoMuerto,
                    ),
                    const SizedBox(height: 10),
                    _buildActionButton(
                      label: 'Hora de Comida (Pausar Relojes)',
                      icon: Icons.restaurant,
                      color: const Color(0xFFE6F1FB),
                      textColor: const Color(0xFF0C447C),
                      borderColor: const Color(0xFFB5D8F6),
                      onPressed: _actionLoading ? null : () => _cambiarEstado('COMIDA'),
                    ),
                    const SizedBox(height: 10),
                    _buildActionButton(
                      label: 'Finalizar Jornada de Hoy',
                      icon: Icons.check_circle_outline,
                      color: Colors.white,
                      textColor: const Color(0xFF1C1C1A),
                      borderColor: const Color(0xFFC9C7BD),
                      onPressed: _actionLoading ? null : _finalizarJornada,
                    ),
                  ],

                  if (estado == 'TIEMPO_MUERTO') ...[
                    _buildActionButton(
                      label: 'Reanudar Trabajo de Obra',
                      icon: Icons.play_arrow,
                      color: const Color(0xFF27500A),
                      textColor: Colors.white,
                      onPressed: _actionLoading ? null : () => _cambiarEstado('TRABAJANDO'),
                    ),
                    const SizedBox(height: 10),
                    _buildActionButton(
                      label: 'Hora de Comida (Pausar Relojes)',
                      icon: Icons.restaurant,
                      color: const Color(0xFFE6F1FB),
                      textColor: const Color(0xFF0C447C),
                      borderColor: const Color(0xFFB5D8F6),
                      onPressed: _actionLoading ? null : () => _cambiarEstado('COMIDA'),
                    ),
                    const SizedBox(height: 10),
                    _buildActionButton(
                      label: 'Finalizar Jornada de Hoy',
                      icon: Icons.check_circle_outline,
                      color: Colors.white,
                      textColor: const Color(0xFF1C1C1A),
                      borderColor: const Color(0xFFC9C7BD),
                      onPressed: _actionLoading ? null : _finalizarJornada,
                    ),
                  ],

                  if (estado == 'COMIDA') ...[
                    _buildActionButton(
                      label: 'Regresar de Comida (Reanudar Trabajo)',
                      icon: Icons.play_arrow,
                      color: const Color(0xFF27500A),
                      textColor: Colors.white,
                      onPressed: _actionLoading ? null : () => _cambiarEstado('TRABAJANDO'),
                    ),
                    const SizedBox(height: 10),
                    _buildActionButton(
                      label: 'Finalizar Jornada de Hoy',
                      icon: Icons.check_circle_outline,
                      color: Colors.white,
                      textColor: const Color(0xFF1C1C1A),
                      borderColor: const Color(0xFFC9C7BD),
                      onPressed: _actionLoading ? null : _finalizarJornada,
                    ),
                  ],

                  if (estado == 'FINALIZADA')
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: const Color(0xFFE3E1D9)),
                      ),
                      child: const Row(
                        children: [
                          Icon(Icons.check_circle, color: Colors.green, size: 28),
                          SizedBox(width: 12),
                          Expanded(
                            child: Text(
                              'La jornada del día ha sido concluida. ¡Buen descanso!',
                              style: TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.bold,
                                color: Color(0xFF1C1C1A),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                ],
              ),
            ),
    );
  }

  Widget _buildStatusHeader(String estado) {
    Color bg;
    Color fg;
    String label;
    IconData icon;

    switch (estado) {
      case 'TRABAJANDO':
        bg = const Color(0xFFEAF3DE);
        fg = const Color(0xFF27500A);
        label = 'JORNADA ACTIVA: TRABAJANDO';
        icon = Icons.bolt;
        break;
      case 'TIEMPO_MUERTO':
        bg = const Color(0xFFFFF3E0);
        fg = const Color(0xFF8C3B00);
        label = 'PARO: TIEMPO MUERTO';
        icon = Icons.pause_circle_filled;
        break;
      case 'COMIDA':
        bg = const Color(0xFFE6F1FB);
        fg = const Color(0xFF0C447C);
        label = 'RECESO: HORA DE COMIDA';
        icon = Icons.restaurant;
        break;
      case 'FINALIZADA':
        bg = Colors.grey.shade100;
        fg = Colors.grey.shade800;
        label = 'JORNADA CONCLUIDA';
        icon = Icons.check_circle;
        break;
      default:
        bg = Colors.grey.shade100;
        fg = Colors.grey.shade600;
        label = 'SIN INICIAR HOY';
        icon = Icons.access_time;
        break;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(10),
      ),
      child: Row(
        children: [
          Icon(icon, color: fg, size: 20),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              label,
              style: TextStyle(color: fg, fontSize: 12, fontWeight: FontWeight.bold),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildActionButton({
    required String label,
    required IconData icon,
    required Color color,
    required Color textColor,
    Color? borderColor,
    VoidCallback? onPressed,
  }) {
    return SizedBox(
      height: 48,
      child: ElevatedButton.icon(
        style: ElevatedButton.styleFrom(
          backgroundColor: color,
          foregroundColor: textColor,
          elevation: 0,
          side: borderColor != null ? BorderSide(color: borderColor) : BorderSide.none,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
        ),
        onPressed: onPressed,
        icon: Icon(icon, size: 18),
        label: Text(label, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold)),
      ),
    );
  }
}
