import { z } from 'zod';

export const DocRevisionScalarFieldEnumSchema = z.enum(['id','title','content','contentBinary','createdAt','docId','authorId']);

export default DocRevisionScalarFieldEnumSchema;
