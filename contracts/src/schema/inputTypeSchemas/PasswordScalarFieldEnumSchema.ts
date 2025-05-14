import { z } from 'zod';

export const PasswordScalarFieldEnumSchema = z.enum(['hash','userId']);

export default PasswordScalarFieldEnumSchema;
