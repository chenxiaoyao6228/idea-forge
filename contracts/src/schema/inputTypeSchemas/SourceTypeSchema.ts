import { z } from 'zod';

export const SourceTypeSchema = z.enum(['DIRECT','GROUP','SUBSPACE_ADMIN','SUBSPACE_MEMBER','WORKSPACE_ADMIN','WORKSPACE_MEMBER','GUEST']);

export type SourceTypeType = `${z.infer<typeof SourceTypeSchema>}`

export default SourceTypeSchema;
