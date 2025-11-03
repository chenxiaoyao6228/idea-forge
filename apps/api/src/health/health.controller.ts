import { Controller, Get } from "@nestjs/common";
import { HealthCheck, HealthCheckService, HealthCheckResult, HttpHealthIndicator, MemoryHealthIndicator, DiskHealthIndicator } from "@nestjs/terminus";

@Controller("/api/health")
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private http: HttpHealthIndicator,
    private memory: MemoryHealthIndicator,
    private disk: DiskHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  check(): Promise<HealthCheckResult> {
    return this.health.check([
      // Basic health check
      () => this.http.pingCheck("nestjs-docs", "https://docs.nestjs.com"),

      // Memory health check - warn if memory usage is above 150MB
      () => this.memory.checkHeap("memory_heap", 150 * 1024 * 1024),

      // Disk health check - warn if disk usage is above 90%
      () => this.disk.checkStorage("storage", { thresholdPercent: 0.9, path: "/" }),
    ]);
  }

  @Get("liveness")
  @HealthCheck()
  liveness(): Promise<HealthCheckResult> {
    return this.health.check([() => this.http.pingCheck("nestjs-docs", "https://docs.nestjs.com")]);
  }

  @Get("readiness")
  @HealthCheck()
  readiness(): Promise<HealthCheckResult> {
    return this.health.check([
      () => this.http.pingCheck("nestjs-docs", "https://docs.nestjs.com"),
      () => this.memory.checkHeap("memory_heap", 150 * 1024 * 1024),
    ]);
  }
}
