import { z } from 'zod';

export const PermissionSchema = z.enum(['MANAGE','SHARE','EDIT','READ','COMMENT','NONE']);

export type PermissionType = `${z.infer<typeof PermissionSchema>}`

export default PermissionSchema;
