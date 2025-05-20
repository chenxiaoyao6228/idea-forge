import { z } from 'zod';

export const PublicEditHistoryScalarFieldEnumSchema = z.enum(['id','createdAt','shareId','editorId','editorName','editorIp','operation']);

export default PublicEditHistoryScalarFieldEnumSchema;
