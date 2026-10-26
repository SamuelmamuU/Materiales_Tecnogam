import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/data/repositories/jornada_service.dart';
import 'package:mobile/presentation/screens/control_jornada_screen.dart';

void main() {
  testWidgets('ControlJornadaScreen renders chronometer cards and hides lunch timer', (WidgetTester tester) async {
    tester.view.physicalSize = const Size(1080, 1920);
    tester.view.devicePixelRatio = 1.0;

    addTearDown(() {
      tester.view.resetPhysicalSize();
      tester.view.resetDevicePixelRatio();
    });

    final testJornada = JornadaLaboral(
      id: 'j-test-1',
      proyectoId: 'test-project-123',
      supervisorId: 'sup-123',
      fecha: '2026-10-26',
      estado: 'TRABAJANDO',
      horaInicio: DateTime.now().subtract(const Duration(hours: 2)),
      horasTrabajadas: 2.0,
      horasTiempoMuerto: 0.25,
      horasComida: 0.5,
      ultimoCambioEstado: DateTime.now().subtract(const Duration(minutes: 10)),
      notas: 'Prueba unitaria widget',
    );

    await tester.pumpWidget(
      MaterialApp(
        home: ControlJornadaScreen(
          projectId: 'test-project-123',
          initialJornada: testJornada,
        ),
      ),
    );

    await tester.pump();

    // Verify AppBar title
    expect(find.text('Control de Jornada Laboral'), findsOneWidget);

    // Verify Trabajado and Tiempo Muerto cards exist
    expect(find.text('Trabajado'), findsOneWidget);
    expect(find.text('Tiempo Muerto'), findsOneWidget);

    // Verify active working badge exists
    expect(find.text('JORNADA ACTIVA: TRABAJANDO'), findsOneWidget);

    // Verify action buttons exist
    expect(find.text('Pausar Trabajo (Reportar Tiempo Muerto)'), findsOneWidget);
    expect(find.text('Hora de Comida (Pausar Relojes)'), findsOneWidget);
    expect(find.text('Finalizar Jornada de Hoy'), findsOneWidget);

    // Crucial requirement: Verify that no "horas de receso" or lunch timer is displayed
    expect(find.text('horas de receso'), findsNothing);
  });
}
