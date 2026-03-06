import "dotenv/config";
import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { AllExceptionsFilter } from "./common/filters/http-exception.filter";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalFilters(new AllExceptionsFilter());
  const port = process.env.AGENT_SERVER_PORT || 3001;
  await app.listen(port);
  console.log(`[AgentServer] Listening on port ${port}`);
}

bootstrap();
