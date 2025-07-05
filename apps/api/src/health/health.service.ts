import { Injectable } from "@nestjs/common";
import { HealthIndicatorResult } from "@nestjs/terminus";

@Injectable()
export class HealthService {
  /**
   * Custom health check for database connection
   */
  async checkDatabase(): Promise<HealthIndicatorResult> {
    try {
      // You can add your database health check logic here
      // For example, using Prisma client to check connection
      return {
        database: {
          status: "up",
        },
      };
    } catch (error) {
      return {
        database: {
          status: "down",
          message: error instanceof Error ? error.message : "Unknown error",
        },
      };
    }
  }

  /**
   * Custom health check for Redis connection
   */
  async checkRedis(): Promise<HealthIndicatorResult> {
    try {
      // You can add your Redis health check logic here
      return {
        redis: {
          status: "up",
        },
      };
    } catch (error) {
      return {
        redis: {
          status: "down",
          message: error instanceof Error ? error.message : "Unknown error",
        },
      };
    }
  }

  /**
   * Custom health check for external services
   */
  // async checkExternalServices(): Promise<HealthIndicatorResult> {
  //   try {
  //     // Add checks for external services like email, file storage, etc.
  //     return {
  //       externalServices: {
  //         status: "up",
  //       },
  //     };
  //   } catch (error) {
  //     return {
  //       externalServices: {
  //         status: "down",
  //         message: error instanceof Error ? error.message : "Unknown error",
  //       },
  //     };
  //   }
  // }
}
