import 'reflect-metadata';
import { NestFactory, Reflector } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { RolesGuard } from './common/guards/roles.guard';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // ── CORS ─────────────────────────────────────────────────────────────────────
  app.enableCors({
    origin: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });

  // ── Global prefix ─────────────────────────────────────────────────────────────
  app.setGlobalPrefix('api/v1');

  // ── Validation pipe ───────────────────────────────────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // ── Global roles guard (requires reflector from DI) ───────────────────────────
  const reflector = app.get(Reflector);
  app.useGlobalGuards(new RolesGuard(reflector));

  // ── Swagger (non-production only) ─────────────────────────────────────────────
  if (process.env['NODE_ENV'] !== 'production') {
    const { SwaggerModule, DocumentBuilder } = await import('@nestjs/swagger');
    const config = new DocumentBuilder()
      .setTitle('MCRS API')
      .setDescription('Mobile Compliance Reporting System – NestJS Backend')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }

  // ── Start server ──────────────────────────────────────────────────────────────
  const port = parseInt(process.env['PORT'] ?? '3000', 10);
  await app.listen(port);
  console.log(`🚀  MCRS backend listening on http://localhost:${port}/api/v1`);
}

void bootstrap();
