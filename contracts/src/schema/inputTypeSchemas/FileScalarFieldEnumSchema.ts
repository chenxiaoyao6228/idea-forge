import { z } from 'zod';

export const FileScalarFieldEnumSchema = z.enum(['id','key','url','status','size','userId','contentType','createdAt','updatedAt']);

export default FileScalarFieldEnumSchema;
