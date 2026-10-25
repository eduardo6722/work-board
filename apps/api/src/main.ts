import "reflect-metadata";

import { Logger, RequestMethod } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";

import { AppModule } from "./app.module";
import { type Env } from "./config/env.schema";
import { GlobalExceptionFilter } from "./shared/errors/global-exception.filter";
import { createValidationPipe } from "./shared/validation/create-validation-pipe";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService<Env, true>);
  const port = config.get("PORT", { infer: true });
  const corsOrigin = config.get("CORS_ORIGIN", { infer: true });

  app.enableShutdownHooks();
  app.enableCors({ origin: corsOrigin });
  app.setGlobalPrefix("api/v1", {
    exclude: [
      { path: "health", method: RequestMethod.ALL },
      { path: "docs", method: RequestMethod.ALL },
      { path: "docs-json", method: RequestMethod.ALL },
      { path: "docs-yaml", method: RequestMethod.ALL },
    ],
  });
  app.useGlobalPipes(createValidationPipe());
  app.useGlobalFilters(new GlobalExceptionFilter());

  const swaggerConfig = new DocumentBuilder()
    .setTitle("Work Board API")
    .setDescription(
      "Phase 1 reference API. Mutation endpoints are unrestricted and must not be exposed in production without authentication.",
    )
    .setVersion("0.1.0")
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup("docs", app, document);

  await app.listen(port);
  Logger.log(`API listening on http://localhost:${port}`, "Bootstrap");
}

void bootstrap();
