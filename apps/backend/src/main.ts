import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Habilitar CORS para permitir llamadas del frontend web (Vite)
  app.enableCors();

  // Configuración de Swagger/OpenAPI
  const config = new DocumentBuilder()
    .setTitle('Sistema de Control de Materiales - Tecnogam')
    .setDescription(
      'API para la gestión y seguimiento de materiales, avances diarios, incidentes e hitos en proyectos de instalación.',
    )
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Ingrese su token JWT de acceso',
        in: 'header',
      },
      'JWT-auth', // Nombre de la referencia
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
