import { z } from 'zod';

export const DocScalarFieldEnumSchema = z.enum(['id','type','title','content','contentBinary','isArchived','isStarred','isPrivate','parentId','position','updatedAt','createdAt','icon','coverImageId','visibility','authorId','workspaceId','subspaceId']);

export default DocScalarFieldEnumSchema;
