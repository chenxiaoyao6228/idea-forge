import { z } from 'zod';

export const PublicShareScalarFieldEnumSchema = z.enum(['id','createdAt','updatedAt','docId','expiresAt','allowEdit','allowComment','allowCopy','showTemplate','showSidebar','viewCount','creatorId','accessCode']);

export default PublicShareScalarFieldEnumSchema;
