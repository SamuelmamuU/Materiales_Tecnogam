import '../sources/api_service.dart';

class JornadaLaboral {
  final String id;
  final String proyectoId;
  final String supervisorId;
  final String fecha;
  final String estado; // TRABAJANDO | TIEMPO_MUERTO | COMIDA | FINALIZADA | INACTIVA
  final DateTime horaInicio;
  final DateTime? horaFin;
  final double horasTrabajadas;
  final double horasTiempoMuerto;
  final double horasComida;
  final DateTime ultimoCambioEstado;
  final String? notas;

  JornadaLaboral({
    required this.id,
    required this.proyectoId,
    required this.supervisorId,
    required this.fecha,
    required this.estado,
    required this.horaInicio,
    this.horaFin,
    required this.horasTrabajadas,
    required this.horasTiempoMuerto,
    required this.horasComida,
    required this.ultimoCambioEstado,
    this.notas,
  });

  factory JornadaLaboral.fromJson(Map<String, dynamic> json) {
    return JornadaLaboral(
      id: json['id'] ?? '',
      proyectoId: json['proyectoId'] ?? '',
      supervisorId: json['supervisorId'] ?? '',
      fecha: json['fecha'] ?? '',
      estado: json['estado'] ?? 'INACTIVA',
      horaInicio: json['horaInicio'] != null
          ? DateTime.tryParse(json['horaInicio']) ?? DateTime.now()
          : DateTime.now(),
      horaFin: json['horaFin'] != null ? DateTime.tryParse(json['horaFin']) : null,
      horasTrabajadas: (json['horasTrabajadas'] as num?)?.toDouble() ?? 0.0,
      horasTiempoMuerto: (json['horasTiempoMuerto'] as num?)?.toDouble() ?? 0.0,
      horasComida: (json['horasComida'] as num?)?.toDouble() ?? 0.0,
      ultimoCambioEstado: json['ultimoCambioEstado'] != null
          ? DateTime.tryParse(json['ultimoCambioEstado']) ?? DateTime.now()
          : DateTime.now(),
      notas: json['notas'],
    );
  }

  static String formatSecondsToHMS(int totalSeconds) {
    final s = totalSeconds < 0 ? 0 : totalSeconds;
    final hrs = s ~/ 3600;
    final mins = (s % 3600) ~/ 60;
    final secs = s % 60;
    final hStr = hrs.toString().padLeft(2, '0');
    final mStr = mins.toString().padLeft(2, '0');
    final sStr = secs.toString().padLeft(2, '0');
    return '$hStr:$mStr:$sStr';
  }

  static Map<String, int> computeLiveSeconds(JornadaLaboral? jornada, [DateTime? simulatedNow]) {
    if (jornada == null) {
      return {'workedSec': 0, 'deadSec': 0};
    }

    final now = simulatedNow ?? DateTime.now();
    final deltaMs = now.difference(jornada.ultimoCambioEstado).inMilliseconds;
    final deltaSec = deltaMs > 0 ? deltaMs ~/ 1000 : 0;

    final baseWorked = (jornada.horasTrabajadas * 3600).round();
    final baseDead = (jornada.horasTiempoMuerto * 3600).round();

    if (jornada.estado == 'TRABAJANDO') {
      return {
        'workedSec': baseWorked + deltaSec,
        'deadSec': baseDead,
      };
    } else if (jornada.estado == 'TIEMPO_MUERTO') {
      return {
        'workedSec': baseWorked,
        'deadSec': baseDead + deltaSec,
      };
    } else {
      // En COMIDA, FINALIZADA o INACTIVA, ambos relojes se mantienen detenidos
      return {
        'workedSec': baseWorked,
        'deadSec': baseDead,
      };
    }
  }
}

class JornadaService {
  static final JornadaService instance = JornadaService._init();
  JornadaService._init();

  Future<JornadaLaboral?> getJornadaHoy(String projectId) async {
    final res = await ApiService.instance.get('/projects/$projectId/jornadas/hoy');
    if (res.success && res.data is Map<String, dynamic>) {
      return JornadaLaboral.fromJson(res.data);
    }
    return null;
  }

  Future<JornadaLaboral> iniciarJornada(String projectId, {String? notas}) async {
    final res = await ApiService.instance.post(
      '/projects/$projectId/jornadas/iniciar',
      notas != null ? {'notas': notas} : {},
    );
    if (res.success && res.data is Map<String, dynamic>) {
      return JornadaLaboral.fromJson(res.data);
    }
    throw Exception(res.errorMessage ?? 'Error al iniciar la jornada');
  }

  Future<JornadaLaboral> cambiarEstado(
    String projectId,
    String nuevoEstado, {
    String? motivo,
  }) async {
    final res = await ApiService.instance.post(
      '/projects/$projectId/jornadas/cambiar-estado',
      {
        'nuevoEstado': nuevoEstado,
        if (motivo != null && motivo.isNotEmpty) 'motivo': motivo,
      },
    );
    if (res.success && res.data is Map<String, dynamic>) {
      return JornadaLaboral.fromJson(res.data);
    }
    throw Exception(res.errorMessage ?? 'Error al cambiar estado de jornada');
  }

  Future<JornadaLaboral> finalizarJornada(String projectId, {String? notas}) async {
    final res = await ApiService.instance.post(
      '/projects/$projectId/jornadas/finalizar',
      {
        if (notas != null && notas.isNotEmpty) 'notas': notas,
      },
    );
    if (res.success && res.data is Map<String, dynamic>) {
      return JornadaLaboral.fromJson(res.data);
    }
    throw Exception(res.errorMessage ?? 'Error al finalizar la jornada');
  }
}
