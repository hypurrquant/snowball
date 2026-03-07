import "dotenv/config";
import "reflect-metadata";

// BigInt JSON serialization support
(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { AllExceptionsFilter } from "./common/filters/http-exception.filter";
import { WinstonModule } from "nest-winston";
import { winstonConfig } from "./common/logger/winston.config";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: WinstonModule.createLogger(winstonConfig),
  });
  app.setGlobalPrefix("api");
  app.useGlobalFilters(new AllExceptionsFilter());
  const port = process.env.AGENT_SERVER_PORT || 3001;
  await app.listen(port);
  console.log(`[AgentServer] Listening on port ${port}`);
}

bootstrap();
