import { Test, TestingModule } from "@nestjs/testing";
import { ConfigModule } from "@nestjs/config";
import { SharedClsModule } from "@/_shared/utils/cls.module";
import { PrismaService } from "@/_shared/database/prisma/prisma.service";
import { PrismaModule } from "@/_shared/database/prisma/prisma.module";


export class ServiceTestBuilder<T> {
  private providers: any[] = [];
  private imports: any[] = [];

  constructor(private ServiceClass: new (...args: any[]) => T) {
    // Always include SharedClsModule with transaction support
    this.imports.push(SharedClsModule.forRoot());
    this.imports.push(PrismaModule);
  }

  /**
   * @param mockPrisma - A mock Prisma client to use in the test.
   * If not provided, a new real test Prisma client will be created, connected to the test database.
   * @returns The ServiceTestBuilder instance.
   */
  // FIXME:  remote this?
  withPrisma(mockPrisma?: any) {
    const testPrisma = mockPrisma || new PrismaService();

    this.providers.push({
      provide: PrismaService,
      useValue: testPrisma,
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

  async compile(): Promise<ServiceTestContext<T>> {
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
