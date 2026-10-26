import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/data/repositories/jornada_service.dart';

void main() {
  group('JornadaLaboral Logic & Chronometer Tests', () {
    test('formatSecondsToHMS formats durations correctly', () {
      expect(JornadaLaboral.formatSecondsToHMS(0), '00:00:00');
      expect(JornadaLaboral.formatSecondsToHMS(5), '00:00:05');
      expect(JornadaLaboral.formatSecondsToHMS(65), '00:01:05');
      expect(JornadaLaboral.formatSecondsToHMS(3600), '01:00:00');
      expect(JornadaLaboral.formatSecondsToHMS(7325), '02:02:05');
      expect(JornadaLaboral.formatSecondsToHMS(-10), '00:00:00');
    });

    test('computeLiveSeconds returns zeros when jornada is null', () {
      final res = JornadaLaboral.computeLiveSeconds(null);
      expect(res['workedSec'], 0);
      expect(res['deadSec'], 0);
    });

    test('computeLiveSeconds advances workedSec when TRABAJANDO', () {
      final baseDate = DateTime(2026, 10, 26, 8, 0, 0);
      final simulatedNow = DateTime(2026, 10, 26, 8, 0, 45); // +45s

      final jornada = JornadaLaboral(
        id: 'j-1',
        proyectoId: 'proj-1',
        supervisorId: 'sup-1',
        fecha: '2026-10-26',
        estado: 'TRABAJANDO',
        horaInicio: baseDate,
        horasTrabajadas: 1.0, // 3600s
        horasTiempoMuerto: 0.5, // 1800s
        horasComida: 0.0,
        ultimoCambioEstado: baseDate,
      );

      final res = JornadaLaboral.computeLiveSeconds(jornada, simulatedNow);
      expect(res['workedSec'], 3600 + 45);
      expect(res['deadSec'], 1800); // Dead time does not advance
    });

    test('computeLiveSeconds advances deadSec when TIEMPO_MUERTO', () {
      final baseDate = DateTime(2026, 10, 26, 9, 0, 0);
      final simulatedNow = DateTime(2026, 10, 26, 9, 1, 30); // +90s

      final jornada = JornadaLaboral(
        id: 'j-2',
        proyectoId: 'proj-1',
        supervisorId: 'sup-1',
        fecha: '2026-10-26',
        estado: 'TIEMPO_MUERTO',
        horaInicio: baseDate,
        horasTrabajadas: 2.0, // 7200s
        horasTiempoMuerto: 0.25, // 900s
        horasComida: 0.0,
        ultimoCambioEstado: baseDate,
      );

      final res = JornadaLaboral.computeLiveSeconds(jornada, simulatedNow);
      expect(res['workedSec'], 7200); // Work time is frozen
      expect(res['deadSec'], 900 + 90); // Dead time advances
    });

    test('computeLiveSeconds freezes both clocks during COMIDA', () {
      final baseDate = DateTime(2026, 10, 26, 13, 0, 0);
      final simulatedNow = DateTime(2026, 10, 26, 13, 30, 0); // +30 mins

      final jornada = JornadaLaboral(
        id: 'j-3',
        proyectoId: 'proj-1',
        supervisorId: 'sup-1',
        fecha: '2026-10-26',
        estado: 'COMIDA',
        horaInicio: baseDate,
        horasTrabajadas: 4.5, // 16200s
        horasTiempoMuerto: 0.5, // 1800s
        horasComida: 0.0,
        ultimoCambioEstado: baseDate,
      );

      final res = JornadaLaboral.computeLiveSeconds(jornada, simulatedNow);
      // Both workedSec and deadSec MUST remain frozen!
      expect(res['workedSec'], 16200);
      expect(res['deadSec'], 1800);
    });

    test('JornadaLaboral.fromJson parses json correctly', () {
      final json = {
        'id': 'j-test-123',
        'proyectoId': 'proj-abc',
        'supervisorId': 'user-xyz',
        'fecha': '2026-10-26T00:00:00.000Z',
        'estado': 'TRABAJANDO',
        'horaInicio': '2026-10-26T08:00:00.000Z',
        'horasTrabajadas': 3.75,
        'horasTiempoMuerto': 0.85,
        'horasComida': 1.0,
        'ultimoCambioEstado': '2026-10-26T11:45:00.000Z',
        'notas': 'Jornada normal sin incidentes',
      };

      final jornada = JornadaLaboral.fromJson(json);
      expect(jornada.id, 'j-test-123');
      expect(jornada.proyectoId, 'proj-abc');
      expect(jornada.estado, 'TRABAJANDO');
      expect(jornada.horasTrabajadas, 3.75);
      expect(jornada.horasTiempoMuerto, 0.85);
      expect(jornada.horasComida, 1.0);
      expect(jornada.notas, 'Jornada normal sin incidentes');
    });
  });
}
