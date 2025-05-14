import { z } from 'zod';

export const UserLoginHistoryScalarFieldEnumSchema = z.enum(['id','userId','ip','location','loginTime']);

export default UserLoginHistoryScalarFieldEnumSchema;
