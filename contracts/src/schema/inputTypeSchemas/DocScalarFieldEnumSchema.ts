import { z } from 'zod';

export const DocScalarFieldEnumSchema = z.enum(['id','type','title','content','contentBinary','archivedAt','publishedAt','deletedAt','parentId','position','updatedAt','createdAt','icon','coverImageId','visibility','authorId','workspaceId','subspaceId']);

export default DocScalarFieldEnumSchema;
