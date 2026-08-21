import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/main.dart';

void main() {
  testWidgets('Login screen smoke test', (WidgetTester tester) async {
    // Ignore overflow warnings caused by Ahem test font
    final onError = FlutterError.onError;
    FlutterError.onError = (FlutterErrorDetails details) {
      if (details.exception.toString().contains('overflowed')) {
        return;
      }
      onError?.call(details);
    };

    // Set screen size to a standard phone size to prevent overflows during testing
    tester.view.physicalSize = const Size(1080, 1920);
    tester.view.devicePixelRatio = 1.0;

    addTearDown(() {
      tester.view.resetPhysicalSize();
      tester.view.resetDevicePixelRatio();
      FlutterError.onError = onError;
    });

    await tester.pumpWidget(const MyApp());

    // Verify login button or form elements exist
    expect(find.text('Entrar'), findsOneWidget);
  });
}
