import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/presentation/screens/capture_avance_screen.dart';

void main() {
  testWidgets('CaptureAvanceScreen renders Apartado A (Planeado) and Apartado B (No Planeado)', (WidgetTester tester) async {
    tester.view.physicalSize = const Size(1080, 1920);
    tester.view.devicePixelRatio = 1.0;

    addTearDown(() {
      tester.view.resetPhysicalSize();
      tester.view.resetDevicePixelRatio();
    });

    await tester.pumpWidget(
      const MaterialApp(
        home: CaptureAvanceScreen(projectId: 'test-proj-001'),
      ),
    );

    await tester.pump();

    // Verify title matches Bitácora Diaria
    expect(find.text('Bitácora Diaria de Avances'), findsOneWidget);

    // Verify basic fields
    expect(find.text('Frente de Trabajo *'), findsOneWidget);
    expect(find.text('Fecha *'), findsOneWidget);

    // Verify Apartado A: Planeado exists
    expect(find.text('Apartado A: Avance Planeado'), findsOneWidget);

    // Verify Apartado B: No Planeado exists
    expect(find.text('Apartado B: Avance No Planeado'), findsOneWidget);

    // Verify subtypes exist (Retrabajo default)
    expect(find.text('Retrabajo'), findsOneWidget);

    // Verify Detail table/section exists
    expect(find.textContaining('Detalle de Avances a Reportar'), findsOneWidget);

    // Verify final submit button exists
    expect(find.text('Guardar Reporte de Avance Diario'), findsOneWidget);
  });
}
