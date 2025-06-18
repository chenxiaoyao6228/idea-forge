import { Test, TestingModule } from "@nestjs/testing";
import { ConfigModule } from "@nestjs/config";
import { PRISMA_CLIENT } from "@shared/database/prisma/prisma.extension";
import { getTestPrisma } from "@test/setup/database-setup";

export class ServiceTestBuilder<T> {
  private providers: any[] = [];
  private imports: any[] = [];

  constructor(private ServiceClass: new (...args: any[]) => T) {}

  /**
   * @param mockPrisma - A mock Prisma client to use in the test.
   * If not provided, a new real test Prisma client will be created, connected to the test database.
   * @returns The ServiceTestBuilder instance.
   */
  withPrisma(mockPrisma?: any) {
    this.providers.push({
      provide: PRISMA_CLIENT,
      useValue: mockPrisma || getTestPrisma(),
    });
    return this;
  }

  withProvider(provider: any) {
    this.providers.push(provider);
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
