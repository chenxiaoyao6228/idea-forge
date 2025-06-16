import request from "supertest";
import { Test, TestingModule } from "@nestjs/testing";
import { NestExpressApplication } from "@nestjs/platform-express";
import { ModuleMetadata } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_FILTER, APP_INTERCEPTOR } from "@nestjs/core";
import { AllExceptionsFilter } from "@shared/filters/all-exception.filter";
import { HttpExceptionFilter } from "@shared/filters/http-exception.filter";

export class E2ETestBuilder {
  private moduleMetadata: ModuleMetadata = {
    imports: [],
    providers: [],
    controllers: [],
  };

  withModule(module: any) {
    this.moduleMetadata.imports!.push(module);
    return this;
  }

  withController(controller: any) {
    this.moduleMetadata.controllers!.push(controller);
    return this;
  }

  withProvider(provider: any) {
    this.moduleMetadata.providers!.push(provider);
    return this;
  }

  async build(): Promise<E2ETestContext> {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: [".env.test", ".env"],
        }),
        // DatabaseModule,
        ...this.moduleMetadata.imports!,
      ],
      controllers: this.moduleMetadata.controllers,
      providers: [
        {
          provide: APP_FILTER,
          useClass: AllExceptionsFilter,
        },
        {
          provide: APP_FILTER,
          useClass: HttpExceptionFilter,
        },
        ...this.moduleMetadata.providers!,
      ],
    }).compile();

    const app = moduleFixture.createNestApplication<NestExpressApplication>();
    await app.init();

    return new E2ETestContext(app, moduleFixture);
  }
}

export class E2ETestContext {
  constructor(
    public app: NestExpressApplication,
    public module: TestingModule
  ) {}

  request() {
    return request(this.app.getHttpServer());
  }

  async close() {
    await this.app.close();
  }
}
