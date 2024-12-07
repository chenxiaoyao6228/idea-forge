import { Router, Query, Mutation } from 'nestjs-trpc';
import { z } from 'zod';

const dogsSchema = z.object({
  name: z.string(),
  breed: z.enum(['Labrador', 'Corgi', 'Beagle', 'Golden Retriver']),
});

@Router()
export class DogsRouter {
  @Query({ output: z.string() })
  async hello(): Promise<string> {
    return 'Hello World';
  }
  @Query({ output: z.array(dogsSchema) })
  async findAll(): Promise<string[]> {
    // const dogs = await this.databaseService.dogs.findMany();
    return ['dog1', 'dog2'];
  }

  @Mutation({ input: z.object({ name: z.string() }), output: z.object({ message: z.string() }) })
  async createDog(input: { name: string }): Promise<{ message: string }> {
    return { message: `Dog created: ${input.name}` };
  }

  @Mutation({ input: z.object({ name: z.string() }), output: z.object({ message: z.string() }) })
  async updateDog(input: { name: string }): Promise<{ message: string }> {
    return { message: `Dog updated: ${input.name}` };
  }
}
