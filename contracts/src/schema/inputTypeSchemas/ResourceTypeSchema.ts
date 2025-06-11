import { z } from 'zod';

export const ResourceTypeSchema = z.enum(['WORKSPACE','SUBSPACE','DOCUMENT']);

export type ResourceTypeType = `${z.infer<typeof ResourceTypeSchema>}`

export default ResourceTypeSchema;
