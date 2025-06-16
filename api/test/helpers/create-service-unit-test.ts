import { Test, TestingModule } from "@nestjs/testing";
import { ConfigModule } from "@nestjs/config";
import { PRISMA_CLIENT } from "@shared/database/prisma/prisma.extension";

export class ServiceTestBuilder<T> {
  private providers: any[] = [];
  private imports: any[] = [];

  constructor(private ServiceClass: new (...args: any[]) => T) {}

  withProvider(provider: any) {
    this.providers.push(provider);
    return this;
  }

  withMockPrisma(mockPrisma: any) {
    this.providers.push({
      provide: PRISMA_CLIENT,
      useValue: mockPrisma,
    });
    return this;
  }

  withModule(module: any) {
    this.imports.push(module);
    return this;
  }

  async build(): Promise<ServiceTestContext<T>> {
    const module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: [".env.test", ".env"],
        }),
        ...this.imports,
      ],
      providers: [this.ServiceClass, ...this.providers],
    }).compile();

    const service = module.get<T>(this.ServiceClass);
    return new ServiceTestContext(service, module);
  }
}

export class ServiceTestContext<T> {
  constructor(public service: T, public module: TestingModule) {}

  async close() {
    await this.module.close();
  }
}
