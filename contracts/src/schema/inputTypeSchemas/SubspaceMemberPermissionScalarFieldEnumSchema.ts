import { z } from 'zod';

export const SubspaceMemberPermissionScalarFieldEnumSchema = z.enum(['id','permission','createdAt','updatedAt','subspaceId','userId','isEditable']);

export default SubspaceMemberPermissionScalarFieldEnumSchema;
