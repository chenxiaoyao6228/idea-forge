import { z } from 'zod';

export const SubspaceMemberScalarFieldEnumSchema = z.enum(['id','role','createdAt','updatedAt','subspaceId','userId']);

export default SubspaceMemberScalarFieldEnumSchema;
