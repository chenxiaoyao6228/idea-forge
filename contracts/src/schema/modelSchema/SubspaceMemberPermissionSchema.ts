import { z } from 'zod';
import { PermissionSchema } from '../inputTypeSchemas/PermissionSchema'

/////////////////////////////////////////
// SUBSPACE MEMBER PERMISSION SCHEMA
/////////////////////////////////////////

export const SubspaceMemberPermissionSchema = z.object({
  permission: PermissionSchema,
  id: z.string().cuid(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  subspaceId: z.string(),
  userId: z.number().int(),
  isEditable: z.boolean(),
})

export type SubspaceMemberPermission = z.infer<typeof SubspaceMemberPermissionSchema>

/////////////////////////////////////////
// SUBSPACE MEMBER PERMISSION OPTIONAL DEFAULTS SCHEMA
/////////////////////////////////////////

export const SubspaceMemberPermissionOptionalDefaultsSchema = SubspaceMemberPermissionSchema.merge(z.object({
  permission: PermissionSchema.optional(),
  id: z.string().cuid().optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  isEditable: z.boolean().optional(),
}))

export type SubspaceMemberPermissionOptionalDefaults = z.infer<typeof SubspaceMemberPermissionOptionalDefaultsSchema>

export default SubspaceMemberPermissionSchema;
