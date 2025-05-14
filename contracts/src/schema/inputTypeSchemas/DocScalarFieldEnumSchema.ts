import { z } from 'zod';

export const DocScalarFieldEnumSchema = z.enum(['id','title','content','contentBinary','isArchived','isStarred','isPrivate','createdAt','updatedAt','ownerId','parentId','icon','coverImageId','position','subspaceId']);

export default DocScalarFieldEnumSchema;
