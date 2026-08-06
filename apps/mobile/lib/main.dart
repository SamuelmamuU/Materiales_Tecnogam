import 'package:flutter/material.dart';
import 'presentation/screens/login_screen.dart';

void main() {
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Control de Materiales Tecnogam',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF0C447C),
          primary: const Color(0xFF1C1C1A),
        ),
        useMaterial3: true,
      ),
      home: const LoginScreen(),
    );
  }
}
