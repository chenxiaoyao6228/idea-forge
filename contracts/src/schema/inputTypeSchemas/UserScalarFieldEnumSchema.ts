import { z } from 'zod';

export const UserScalarFieldEnumSchema = z.enum(['id','email','displayName','imageUrl','emailVerified','status','created_time','updated_time','hashedRefreshToken','currentWorkspaceId']);

export default UserScalarFieldEnumSchema;
