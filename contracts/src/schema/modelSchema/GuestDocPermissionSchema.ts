import { z } from 'zod';
import { PermissionSchema } from '../inputTypeSchemas/PermissionSchema'

/////////////////////////////////////////
// GUEST DOC PERMISSION SCHEMA
/////////////////////////////////////////

export const GuestDocPermissionSchema = z.object({
  permission: PermissionSchema,
  id: z.string().cuid(),
  expireAt: z.coerce.date(),
  createdAt: z.coerce.date(),
  guestId: z.string(),
  docId: z.string(),
})

export type GuestDocPermission = z.infer<typeof GuestDocPermissionSchema>

/////////////////////////////////////////
// GUEST DOC PERMISSION OPTIONAL DEFAULTS SCHEMA
/////////////////////////////////////////

export const GuestDocPermissionOptionalDefaultsSchema = GuestDocPermissionSchema.merge(z.object({
  permission: PermissionSchema.optional(),
  id: z.string().cuid().optional(),
  createdAt: z.coerce.date().optional(),
}))

export type GuestDocPermissionOptionalDefaults = z.infer<typeof GuestDocPermissionOptionalDefaultsSchema>

export default GuestDocPermissionSchema;
