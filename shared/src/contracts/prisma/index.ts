import { z } from "zod";
import type { Prisma } from "@prisma/client";

/////////////////////////////////////////
// HELPER FUNCTIONS
/////////////////////////////////////////

/////////////////////////////////////////
// ENUMS
/////////////////////////////////////////

export const TransactionIsolationLevelSchema = z.enum(["ReadUncommitted", "ReadCommitted", "RepeatableRead", "Serializable"]);

export const UserScalarFieldEnumSchema = z.enum([
  "id",
  "email",
  "displayName",
  "imageUrl",
  "emailVerified",
  "status",
  "created_time",
  "updated_time",
  "hashedRefreshToken",
]);

export const PasswordScalarFieldEnumSchema = z.enum(["hash", "userId"]);

export const ConnectionScalarFieldEnumSchema = z.enum(["id", "providerName", "providerId", "createdAt", "updatedAt", "userId"]);

export const DocScalarFieldEnumSchema = z.enum([
  "id",
  "title",
  "content",
  "contentBinary",
  "isArchived",
  "isStarred",
  "createdAt",
  "updatedAt",
  "ownerId",
  "parentId",
  "coverImageId",
  "position",
]);

export const CoverImageScalarFieldEnumSchema = z.enum(["id", "url", "scrollY", "docId"]);

export const DocShareScalarFieldEnumSchema = z.enum(["id", "docId", "authorId", "userId", "permission", "noticeType", "createdAt", "updatedAt"]);

export const SortOrderSchema = z.enum(["asc", "desc"]);

export const QueryModeSchema = z.enum(["default", "insensitive"]);

export const NullsOrderSchema = z.enum(["first", "last"]);
/////////////////////////////////////////
// MODELS
/////////////////////////////////////////

/////////////////////////////////////////
// USER SCHEMA
/////////////////////////////////////////

export const UserSchema = z.object({
  id: z.number().int(),
  email: z.string(),
  displayName: z.string().nullable(),
  imageUrl: z.string().nullable(),
  emailVerified: z.coerce.date().nullable(),
  status: z.string(),
  created_time: z.coerce.date(),
  updated_time: z.coerce.date(),
  hashedRefreshToken: z.string().nullable(),
});

export type User = z.infer<typeof UserSchema>;

/////////////////////////////////////////
// PASSWORD SCHEMA
/////////////////////////////////////////

export const PasswordSchema = z.object({
  hash: z.string(),
  userId: z.number().int(),
});

export type Password = z.infer<typeof PasswordSchema>;

/////////////////////////////////////////
// CONNECTION SCHEMA
/////////////////////////////////////////

export const ConnectionSchema = z.object({
  id: z.string().cuid(),
  providerName: z.string(),
  providerId: z.string(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  userId: z.number().int(),
});

export type Connection = z.infer<typeof ConnectionSchema>;

/////////////////////////////////////////
// DOC SCHEMA
/////////////////////////////////////////

export const DocSchema = z.object({
  id: z.string().cuid(),
  title: z.string(),
  content: z.string(),
  contentBinary: z.instanceof(Buffer).nullable(),
  isArchived: z.boolean(),
  isStarred: z.boolean(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  ownerId: z.number().int(),
  parentId: z.string().nullable(),
  coverImageId: z.string().nullable(),
  position: z.number().int(),
});

export type Doc = z.infer<typeof DocSchema>;

/////////////////////////////////////////
// COVER IMAGE SCHEMA
/////////////////////////////////////////

export const CoverImageSchema = z.object({
  id: z.string().cuid(),
  url: z.string(),
  scrollY: z.number(),
  docId: z.string(),
});

export type CoverImage = z.infer<typeof CoverImageSchema>;

/////////////////////////////////////////
// DOC SHARE SCHEMA
/////////////////////////////////////////

export const DocShareSchema = z.object({
  id: z.string().cuid(),
  docId: z.string(),
  authorId: z.number().int(),
  userId: z.number().int(),
  permission: z.string(),
  noticeType: z.string(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type DocShare = z.infer<typeof DocShareSchema>;

/////////////////////////////////////////
// SELECT & INCLUDE
/////////////////////////////////////////

// USER
//------------------------------------------------------

export const UserIncludeSchema: z.ZodType<Prisma.UserInclude> = z
  .object({
    password: z.union([z.boolean(), z.lazy(() => PasswordArgsSchema)]).optional(),
    connections: z.union([z.boolean(), z.lazy(() => ConnectionFindManyArgsSchema)]).optional(),
    docs: z.union([z.boolean(), z.lazy(() => DocFindManyArgsSchema)]).optional(),
    sharedDocs: z.union([z.boolean(), z.lazy(() => DocShareFindManyArgsSchema)]).optional(),
    DocShare: z.union([z.boolean(), z.lazy(() => DocShareFindManyArgsSchema)]).optional(),
    _count: z.union([z.boolean(), z.lazy(() => UserCountOutputTypeArgsSchema)]).optional(),
  })
  .strict();

export const UserArgsSchema: z.ZodType<Prisma.UserDefaultArgs> = z
  .object({
    select: z.lazy(() => UserSelectSchema).optional(),
    include: z.lazy(() => UserIncludeSchema).optional(),
  })
  .strict();

export const UserCountOutputTypeArgsSchema: z.ZodType<Prisma.UserCountOutputTypeDefaultArgs> = z
  .object({
    select: z.lazy(() => UserCountOutputTypeSelectSchema).nullish(),
  })
  .strict();

export const UserCountOutputTypeSelectSchema: z.ZodType<Prisma.UserCountOutputTypeSelect> = z
  .object({
    connections: z.boolean().optional(),
    docs: z.boolean().optional(),
    sharedDocs: z.boolean().optional(),
    DocShare: z.boolean().optional(),
  })
  .strict();

export const UserSelectSchema: z.ZodType<Prisma.UserSelect> = z
  .object({
    id: z.boolean().optional(),
    email: z.boolean().optional(),
    displayName: z.boolean().optional(),
    imageUrl: z.boolean().optional(),
    emailVerified: z.boolean().optional(),
    status: z.boolean().optional(),
    created_time: z.boolean().optional(),
    updated_time: z.boolean().optional(),
    hashedRefreshToken: z.boolean().optional(),
    password: z.union([z.boolean(), z.lazy(() => PasswordArgsSchema)]).optional(),
    connections: z.union([z.boolean(), z.lazy(() => ConnectionFindManyArgsSchema)]).optional(),
    docs: z.union([z.boolean(), z.lazy(() => DocFindManyArgsSchema)]).optional(),
    sharedDocs: z.union([z.boolean(), z.lazy(() => DocShareFindManyArgsSchema)]).optional(),
    DocShare: z.union([z.boolean(), z.lazy(() => DocShareFindManyArgsSchema)]).optional(),
    _count: z.union([z.boolean(), z.lazy(() => UserCountOutputTypeArgsSchema)]).optional(),
  })
  .strict();

// PASSWORD
//------------------------------------------------------

export const PasswordIncludeSchema: z.ZodType<Prisma.PasswordInclude> = z
  .object({
    user: z.union([z.boolean(), z.lazy(() => UserArgsSchema)]).optional(),
  })
  .strict();

export const PasswordArgsSchema: z.ZodType<Prisma.PasswordDefaultArgs> = z
  .object({
    select: z.lazy(() => PasswordSelectSchema).optional(),
    include: z.lazy(() => PasswordIncludeSchema).optional(),
  })
  .strict();

export const PasswordSelectSchema: z.ZodType<Prisma.PasswordSelect> = z
  .object({
    hash: z.boolean().optional(),
    userId: z.boolean().optional(),
    user: z.union([z.boolean(), z.lazy(() => UserArgsSchema)]).optional(),
  })
  .strict();

// CONNECTION
//------------------------------------------------------

export const ConnectionIncludeSchema: z.ZodType<Prisma.ConnectionInclude> = z
  .object({
    user: z.union([z.boolean(), z.lazy(() => UserArgsSchema)]).optional(),
  })
  .strict();

export const ConnectionArgsSchema: z.ZodType<Prisma.ConnectionDefaultArgs> = z
  .object({
    select: z.lazy(() => ConnectionSelectSchema).optional(),
    include: z.lazy(() => ConnectionIncludeSchema).optional(),
  })
  .strict();

export const ConnectionSelectSchema: z.ZodType<Prisma.ConnectionSelect> = z
  .object({
    id: z.boolean().optional(),
    providerName: z.boolean().optional(),
    providerId: z.boolean().optional(),
    createdAt: z.boolean().optional(),
    updatedAt: z.boolean().optional(),
    userId: z.boolean().optional(),
    user: z.union([z.boolean(), z.lazy(() => UserArgsSchema)]).optional(),
  })
  .strict();

// DOC
//------------------------------------------------------

export const DocIncludeSchema: z.ZodType<Prisma.DocInclude> = z
  .object({
    owner: z.union([z.boolean(), z.lazy(() => UserArgsSchema)]).optional(),
    parent: z.union([z.boolean(), z.lazy(() => DocArgsSchema)]).optional(),
    children: z.union([z.boolean(), z.lazy(() => DocFindManyArgsSchema)]).optional(),
    coverImage: z.union([z.boolean(), z.lazy(() => CoverImageArgsSchema)]).optional(),
    sharedWith: z.union([z.boolean(), z.lazy(() => DocShareFindManyArgsSchema)]).optional(),
    _count: z.union([z.boolean(), z.lazy(() => DocCountOutputTypeArgsSchema)]).optional(),
  })
  .strict();

export const DocArgsSchema: z.ZodType<Prisma.DocDefaultArgs> = z
  .object({
    select: z.lazy(() => DocSelectSchema).optional(),
    include: z.lazy(() => DocIncludeSchema).optional(),
  })
  .strict();

export const DocCountOutputTypeArgsSchema: z.ZodType<Prisma.DocCountOutputTypeDefaultArgs> = z
  .object({
    select: z.lazy(() => DocCountOutputTypeSelectSchema).nullish(),
  })
  .strict();

export const DocCountOutputTypeSelectSchema: z.ZodType<Prisma.DocCountOutputTypeSelect> = z
  .object({
    children: z.boolean().optional(),
    sharedWith: z.boolean().optional(),
  })
  .strict();

export const DocSelectSchema: z.ZodType<Prisma.DocSelect> = z
  .object({
    id: z.boolean().optional(),
    title: z.boolean().optional(),
    content: z.boolean().optional(),
    contentBinary: z.boolean().optional(),
    isArchived: z.boolean().optional(),
    isStarred: z.boolean().optional(),
    createdAt: z.boolean().optional(),
    updatedAt: z.boolean().optional(),
    ownerId: z.boolean().optional(),
    parentId: z.boolean().optional(),
    coverImageId: z.boolean().optional(),
    position: z.boolean().optional(),
    owner: z.union([z.boolean(), z.lazy(() => UserArgsSchema)]).optional(),
    parent: z.union([z.boolean(), z.lazy(() => DocArgsSchema)]).optional(),
    children: z.union([z.boolean(), z.lazy(() => DocFindManyArgsSchema)]).optional(),
    coverImage: z.union([z.boolean(), z.lazy(() => CoverImageArgsSchema)]).optional(),
    sharedWith: z.union([z.boolean(), z.lazy(() => DocShareFindManyArgsSchema)]).optional(),
    _count: z.union([z.boolean(), z.lazy(() => DocCountOutputTypeArgsSchema)]).optional(),
  })
  .strict();

// COVER IMAGE
//------------------------------------------------------

export const CoverImageIncludeSchema: z.ZodType<Prisma.CoverImageInclude> = z
  .object({
    doc: z.union([z.boolean(), z.lazy(() => DocArgsSchema)]).optional(),
  })
  .strict();

export const CoverImageArgsSchema: z.ZodType<Prisma.CoverImageDefaultArgs> = z
  .object({
    select: z.lazy(() => CoverImageSelectSchema).optional(),
    include: z.lazy(() => CoverImageIncludeSchema).optional(),
  })
  .strict();

export const CoverImageSelectSchema: z.ZodType<Prisma.CoverImageSelect> = z
  .object({
    id: z.boolean().optional(),
    url: z.boolean().optional(),
    scrollY: z.boolean().optional(),
    docId: z.boolean().optional(),
    doc: z.union([z.boolean(), z.lazy(() => DocArgsSchema)]).optional(),
  })
  .strict();

// DOC SHARE
//------------------------------------------------------

export const DocShareIncludeSchema: z.ZodType<Prisma.DocShareInclude> = z
  .object({
    doc: z.union([z.boolean(), z.lazy(() => DocArgsSchema)]).optional(),
    author: z.union([z.boolean(), z.lazy(() => UserArgsSchema)]).optional(),
    sharedTo: z.union([z.boolean(), z.lazy(() => UserArgsSchema)]).optional(),
  })
  .strict();

export const DocShareArgsSchema: z.ZodType<Prisma.DocShareDefaultArgs> = z
  .object({
    select: z.lazy(() => DocShareSelectSchema).optional(),
    include: z.lazy(() => DocShareIncludeSchema).optional(),
  })
  .strict();

export const DocShareSelectSchema: z.ZodType<Prisma.DocShareSelect> = z
  .object({
    id: z.boolean().optional(),
    docId: z.boolean().optional(),
    authorId: z.boolean().optional(),
    userId: z.boolean().optional(),
    permission: z.boolean().optional(),
    noticeType: z.boolean().optional(),
    createdAt: z.boolean().optional(),
    updatedAt: z.boolean().optional(),
    doc: z.union([z.boolean(), z.lazy(() => DocArgsSchema)]).optional(),
    author: z.union([z.boolean(), z.lazy(() => UserArgsSchema)]).optional(),
    sharedTo: z.union([z.boolean(), z.lazy(() => UserArgsSchema)]).optional(),
  })
  .strict();

/////////////////////////////////////////
// INPUT TYPES
/////////////////////////////////////////

export const UserWhereInputSchema: z.ZodType<Prisma.UserWhereInput> = z
  .object({
    AND: z.union([z.lazy(() => UserWhereInputSchema), z.lazy(() => UserWhereInputSchema).array()]).optional(),
    OR: z
      .lazy(() => UserWhereInputSchema)
      .array()
      .optional(),
    NOT: z.union([z.lazy(() => UserWhereInputSchema), z.lazy(() => UserWhereInputSchema).array()]).optional(),
    id: z.union([z.lazy(() => IntFilterSchema), z.number()]).optional(),
    email: z.union([z.lazy(() => StringFilterSchema), z.string()]).optional(),
    displayName: z
      .union([z.lazy(() => StringNullableFilterSchema), z.string()])
      .optional()
      .nullable(),
    imageUrl: z
      .union([z.lazy(() => StringNullableFilterSchema), z.string()])
      .optional()
      .nullable(),
    emailVerified: z
      .union([z.lazy(() => DateTimeNullableFilterSchema), z.coerce.date()])
      .optional()
      .nullable(),
    status: z.union([z.lazy(() => StringFilterSchema), z.string()]).optional(),
    created_time: z.union([z.lazy(() => DateTimeFilterSchema), z.coerce.date()]).optional(),
    updated_time: z.union([z.lazy(() => DateTimeFilterSchema), z.coerce.date()]).optional(),
    hashedRefreshToken: z
      .union([z.lazy(() => StringNullableFilterSchema), z.string()])
      .optional()
      .nullable(),
    password: z
      .union([z.lazy(() => PasswordNullableRelationFilterSchema), z.lazy(() => PasswordWhereInputSchema)])
      .optional()
      .nullable(),
    connections: z.lazy(() => ConnectionListRelationFilterSchema).optional(),
    docs: z.lazy(() => DocListRelationFilterSchema).optional(),
    sharedDocs: z.lazy(() => DocShareListRelationFilterSchema).optional(),
    DocShare: z.lazy(() => DocShareListRelationFilterSchema).optional(),
  })
  .strict();

export const UserOrderByWithRelationInputSchema: z.ZodType<Prisma.UserOrderByWithRelationInput> = z
  .object({
    id: z.lazy(() => SortOrderSchema).optional(),
    email: z.lazy(() => SortOrderSchema).optional(),
    displayName: z.union([z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema)]).optional(),
    imageUrl: z.union([z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema)]).optional(),
    emailVerified: z.union([z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema)]).optional(),
    status: z.lazy(() => SortOrderSchema).optional(),
    created_time: z.lazy(() => SortOrderSchema).optional(),
    updated_time: z.lazy(() => SortOrderSchema).optional(),
    hashedRefreshToken: z.union([z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema)]).optional(),
    password: z.lazy(() => PasswordOrderByWithRelationInputSchema).optional(),
    connections: z.lazy(() => ConnectionOrderByRelationAggregateInputSchema).optional(),
    docs: z.lazy(() => DocOrderByRelationAggregateInputSchema).optional(),
    sharedDocs: z.lazy(() => DocShareOrderByRelationAggregateInputSchema).optional(),
    DocShare: z.lazy(() => DocShareOrderByRelationAggregateInputSchema).optional(),
  })
  .strict();

export const UserWhereUniqueInputSchema: z.ZodType<Prisma.UserWhereUniqueInput> = z
  .union([
    z.object({
      id: z.number().int(),
      email: z.string(),
    }),
    z.object({
      id: z.number().int(),
    }),
    z.object({
      email: z.string(),
    }),
  ])
  .and(
    z
      .object({
        id: z.number().int().optional(),
        email: z.string().optional(),
        AND: z.union([z.lazy(() => UserWhereInputSchema), z.lazy(() => UserWhereInputSchema).array()]).optional(),
        OR: z
          .lazy(() => UserWhereInputSchema)
          .array()
          .optional(),
        NOT: z.union([z.lazy(() => UserWhereInputSchema), z.lazy(() => UserWhereInputSchema).array()]).optional(),
        displayName: z
          .union([z.lazy(() => StringNullableFilterSchema), z.string()])
          .optional()
          .nullable(),
        imageUrl: z
          .union([z.lazy(() => StringNullableFilterSchema), z.string()])
          .optional()
          .nullable(),
        emailVerified: z
          .union([z.lazy(() => DateTimeNullableFilterSchema), z.coerce.date()])
          .optional()
          .nullable(),
        status: z.union([z.lazy(() => StringFilterSchema), z.string()]).optional(),
        created_time: z.union([z.lazy(() => DateTimeFilterSchema), z.coerce.date()]).optional(),
        updated_time: z.union([z.lazy(() => DateTimeFilterSchema), z.coerce.date()]).optional(),
        hashedRefreshToken: z
          .union([z.lazy(() => StringNullableFilterSchema), z.string()])
          .optional()
          .nullable(),
        password: z
          .union([z.lazy(() => PasswordNullableRelationFilterSchema), z.lazy(() => PasswordWhereInputSchema)])
          .optional()
          .nullable(),
        connections: z.lazy(() => ConnectionListRelationFilterSchema).optional(),
        docs: z.lazy(() => DocListRelationFilterSchema).optional(),
        sharedDocs: z.lazy(() => DocShareListRelationFilterSchema).optional(),
        DocShare: z.lazy(() => DocShareListRelationFilterSchema).optional(),
      })
      .strict(),
  );

export const UserOrderByWithAggregationInputSchema: z.ZodType<Prisma.UserOrderByWithAggregationInput> = z
  .object({
    id: z.lazy(() => SortOrderSchema).optional(),
    email: z.lazy(() => SortOrderSchema).optional(),
    displayName: z.union([z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema)]).optional(),
    imageUrl: z.union([z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema)]).optional(),
    emailVerified: z.union([z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema)]).optional(),
    status: z.lazy(() => SortOrderSchema).optional(),
    created_time: z.lazy(() => SortOrderSchema).optional(),
    updated_time: z.lazy(() => SortOrderSchema).optional(),
    hashedRefreshToken: z.union([z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema)]).optional(),
    _count: z.lazy(() => UserCountOrderByAggregateInputSchema).optional(),
    _avg: z.lazy(() => UserAvgOrderByAggregateInputSchema).optional(),
    _max: z.lazy(() => UserMaxOrderByAggregateInputSchema).optional(),
    _min: z.lazy(() => UserMinOrderByAggregateInputSchema).optional(),
    _sum: z.lazy(() => UserSumOrderByAggregateInputSchema).optional(),
  })
  .strict();

export const UserScalarWhereWithAggregatesInputSchema: z.ZodType<Prisma.UserScalarWhereWithAggregatesInput> = z
  .object({
    AND: z.union([z.lazy(() => UserScalarWhereWithAggregatesInputSchema), z.lazy(() => UserScalarWhereWithAggregatesInputSchema).array()]).optional(),
    OR: z
      .lazy(() => UserScalarWhereWithAggregatesInputSchema)
      .array()
      .optional(),
    NOT: z.union([z.lazy(() => UserScalarWhereWithAggregatesInputSchema), z.lazy(() => UserScalarWhereWithAggregatesInputSchema).array()]).optional(),
    id: z.union([z.lazy(() => IntWithAggregatesFilterSchema), z.number()]).optional(),
    email: z.union([z.lazy(() => StringWithAggregatesFilterSchema), z.string()]).optional(),
    displayName: z
      .union([z.lazy(() => StringNullableWithAggregatesFilterSchema), z.string()])
      .optional()
      .nullable(),
    imageUrl: z
      .union([z.lazy(() => StringNullableWithAggregatesFilterSchema), z.string()])
      .optional()
      .nullable(),
    emailVerified: z
      .union([z.lazy(() => DateTimeNullableWithAggregatesFilterSchema), z.coerce.date()])
      .optional()
      .nullable(),
    status: z.union([z.lazy(() => StringWithAggregatesFilterSchema), z.string()]).optional(),
    created_time: z.union([z.lazy(() => DateTimeWithAggregatesFilterSchema), z.coerce.date()]).optional(),
    updated_time: z.union([z.lazy(() => DateTimeWithAggregatesFilterSchema), z.coerce.date()]).optional(),
    hashedRefreshToken: z
      .union([z.lazy(() => StringNullableWithAggregatesFilterSchema), z.string()])
      .optional()
      .nullable(),
  })
  .strict();

export const PasswordWhereInputSchema: z.ZodType<Prisma.PasswordWhereInput> = z
  .object({
    AND: z.union([z.lazy(() => PasswordWhereInputSchema), z.lazy(() => PasswordWhereInputSchema).array()]).optional(),
    OR: z
      .lazy(() => PasswordWhereInputSchema)
      .array()
      .optional(),
    NOT: z.union([z.lazy(() => PasswordWhereInputSchema), z.lazy(() => PasswordWhereInputSchema).array()]).optional(),
    hash: z.union([z.lazy(() => StringFilterSchema), z.string()]).optional(),
    userId: z.union([z.lazy(() => IntFilterSchema), z.number()]).optional(),
    user: z.union([z.lazy(() => UserRelationFilterSchema), z.lazy(() => UserWhereInputSchema)]).optional(),
  })
  .strict();

export const PasswordOrderByWithRelationInputSchema: z.ZodType<Prisma.PasswordOrderByWithRelationInput> = z
  .object({
    hash: z.lazy(() => SortOrderSchema).optional(),
    userId: z.lazy(() => SortOrderSchema).optional(),
    user: z.lazy(() => UserOrderByWithRelationInputSchema).optional(),
  })
  .strict();

export const PasswordWhereUniqueInputSchema: z.ZodType<Prisma.PasswordWhereUniqueInput> = z
  .object({
    userId: z.number().int(),
  })
  .and(
    z
      .object({
        userId: z.number().int().optional(),
        AND: z.union([z.lazy(() => PasswordWhereInputSchema), z.lazy(() => PasswordWhereInputSchema).array()]).optional(),
        OR: z
          .lazy(() => PasswordWhereInputSchema)
          .array()
          .optional(),
        NOT: z.union([z.lazy(() => PasswordWhereInputSchema), z.lazy(() => PasswordWhereInputSchema).array()]).optional(),
        hash: z.union([z.lazy(() => StringFilterSchema), z.string()]).optional(),
        user: z.union([z.lazy(() => UserRelationFilterSchema), z.lazy(() => UserWhereInputSchema)]).optional(),
      })
      .strict(),
  );

export const PasswordOrderByWithAggregationInputSchema: z.ZodType<Prisma.PasswordOrderByWithAggregationInput> = z
  .object({
    hash: z.lazy(() => SortOrderSchema).optional(),
    userId: z.lazy(() => SortOrderSchema).optional(),
    _count: z.lazy(() => PasswordCountOrderByAggregateInputSchema).optional(),
    _avg: z.lazy(() => PasswordAvgOrderByAggregateInputSchema).optional(),
    _max: z.lazy(() => PasswordMaxOrderByAggregateInputSchema).optional(),
    _min: z.lazy(() => PasswordMinOrderByAggregateInputSchema).optional(),
    _sum: z.lazy(() => PasswordSumOrderByAggregateInputSchema).optional(),
  })
  .strict();

export const PasswordScalarWhereWithAggregatesInputSchema: z.ZodType<Prisma.PasswordScalarWhereWithAggregatesInput> = z
  .object({
    AND: z.union([z.lazy(() => PasswordScalarWhereWithAggregatesInputSchema), z.lazy(() => PasswordScalarWhereWithAggregatesInputSchema).array()]).optional(),
    OR: z
      .lazy(() => PasswordScalarWhereWithAggregatesInputSchema)
      .array()
      .optional(),
    NOT: z.union([z.lazy(() => PasswordScalarWhereWithAggregatesInputSchema), z.lazy(() => PasswordScalarWhereWithAggregatesInputSchema).array()]).optional(),
    hash: z.union([z.lazy(() => StringWithAggregatesFilterSchema), z.string()]).optional(),
    userId: z.union([z.lazy(() => IntWithAggregatesFilterSchema), z.number()]).optional(),
  })
  .strict();

export const ConnectionWhereInputSchema: z.ZodType<Prisma.ConnectionWhereInput> = z
  .object({
    AND: z.union([z.lazy(() => ConnectionWhereInputSchema), z.lazy(() => ConnectionWhereInputSchema).array()]).optional(),
    OR: z
      .lazy(() => ConnectionWhereInputSchema)
      .array()
      .optional(),
    NOT: z.union([z.lazy(() => ConnectionWhereInputSchema), z.lazy(() => ConnectionWhereInputSchema).array()]).optional(),
    id: z.union([z.lazy(() => StringFilterSchema), z.string()]).optional(),
    providerName: z.union([z.lazy(() => StringFilterSchema), z.string()]).optional(),
    providerId: z.union([z.lazy(() => StringFilterSchema), z.string()]).optional(),
    createdAt: z.union([z.lazy(() => DateTimeFilterSchema), z.coerce.date()]).optional(),
    updatedAt: z.union([z.lazy(() => DateTimeFilterSchema), z.coerce.date()]).optional(),
    userId: z.union([z.lazy(() => IntFilterSchema), z.number()]).optional(),
    user: z.union([z.lazy(() => UserRelationFilterSchema), z.lazy(() => UserWhereInputSchema)]).optional(),
  })
  .strict();

export const ConnectionOrderByWithRelationInputSchema: z.ZodType<Prisma.ConnectionOrderByWithRelationInput> = z
  .object({
    id: z.lazy(() => SortOrderSchema).optional(),
    providerName: z.lazy(() => SortOrderSchema).optional(),
    providerId: z.lazy(() => SortOrderSchema).optional(),
    createdAt: z.lazy(() => SortOrderSchema).optional(),
    updatedAt: z.lazy(() => SortOrderSchema).optional(),
    userId: z.lazy(() => SortOrderSchema).optional(),
    user: z.lazy(() => UserOrderByWithRelationInputSchema).optional(),
  })
  .strict();

export const ConnectionWhereUniqueInputSchema: z.ZodType<Prisma.ConnectionWhereUniqueInput> = z
  .union([
    z.object({
      id: z.string().cuid(),
      providerName_providerId: z.lazy(() => ConnectionProviderNameProviderIdCompoundUniqueInputSchema),
    }),
    z.object({
      id: z.string().cuid(),
    }),
    z.object({
      providerName_providerId: z.lazy(() => ConnectionProviderNameProviderIdCompoundUniqueInputSchema),
    }),
  ])
  .and(
    z
      .object({
        id: z.string().cuid().optional(),
        providerName_providerId: z.lazy(() => ConnectionProviderNameProviderIdCompoundUniqueInputSchema).optional(),
        AND: z.union([z.lazy(() => ConnectionWhereInputSchema), z.lazy(() => ConnectionWhereInputSchema).array()]).optional(),
        OR: z
          .lazy(() => ConnectionWhereInputSchema)
          .array()
          .optional(),
        NOT: z.union([z.lazy(() => ConnectionWhereInputSchema), z.lazy(() => ConnectionWhereInputSchema).array()]).optional(),
        providerName: z.union([z.lazy(() => StringFilterSchema), z.string()]).optional(),
        providerId: z.union([z.lazy(() => StringFilterSchema), z.string()]).optional(),
        createdAt: z.union([z.lazy(() => DateTimeFilterSchema), z.coerce.date()]).optional(),
        updatedAt: z.union([z.lazy(() => DateTimeFilterSchema), z.coerce.date()]).optional(),
        userId: z.union([z.lazy(() => IntFilterSchema), z.number().int()]).optional(),
        user: z.union([z.lazy(() => UserRelationFilterSchema), z.lazy(() => UserWhereInputSchema)]).optional(),
      })
      .strict(),
  );

export const ConnectionOrderByWithAggregationInputSchema: z.ZodType<Prisma.ConnectionOrderByWithAggregationInput> = z
  .object({
    id: z.lazy(() => SortOrderSchema).optional(),
    providerName: z.lazy(() => SortOrderSchema).optional(),
    providerId: z.lazy(() => SortOrderSchema).optional(),
    createdAt: z.lazy(() => SortOrderSchema).optional(),
    updatedAt: z.lazy(() => SortOrderSchema).optional(),
    userId: z.lazy(() => SortOrderSchema).optional(),
    _count: z.lazy(() => ConnectionCountOrderByAggregateInputSchema).optional(),
    _avg: z.lazy(() => ConnectionAvgOrderByAggregateInputSchema).optional(),
    _max: z.lazy(() => ConnectionMaxOrderByAggregateInputSchema).optional(),
    _min: z.lazy(() => ConnectionMinOrderByAggregateInputSchema).optional(),
    _sum: z.lazy(() => ConnectionSumOrderByAggregateInputSchema).optional(),
  })
  .strict();

export const ConnectionScalarWhereWithAggregatesInputSchema: z.ZodType<Prisma.ConnectionScalarWhereWithAggregatesInput> = z
  .object({
    AND: z
      .union([z.lazy(() => ConnectionScalarWhereWithAggregatesInputSchema), z.lazy(() => ConnectionScalarWhereWithAggregatesInputSchema).array()])
      .optional(),
    OR: z
      .lazy(() => ConnectionScalarWhereWithAggregatesInputSchema)
      .array()
      .optional(),
    NOT: z
      .union([z.lazy(() => ConnectionScalarWhereWithAggregatesInputSchema), z.lazy(() => ConnectionScalarWhereWithAggregatesInputSchema).array()])
      .optional(),
    id: z.union([z.lazy(() => StringWithAggregatesFilterSchema), z.string()]).optional(),
    providerName: z.union([z.lazy(() => StringWithAggregatesFilterSchema), z.string()]).optional(),
    providerId: z.union([z.lazy(() => StringWithAggregatesFilterSchema), z.string()]).optional(),
    createdAt: z.union([z.lazy(() => DateTimeWithAggregatesFilterSchema), z.coerce.date()]).optional(),
    updatedAt: z.union([z.lazy(() => DateTimeWithAggregatesFilterSchema), z.coerce.date()]).optional(),
    userId: z.union([z.lazy(() => IntWithAggregatesFilterSchema), z.number()]).optional(),
  })
  .strict();

export const DocWhereInputSchema: z.ZodType<Prisma.DocWhereInput> = z
  .object({
    AND: z.union([z.lazy(() => DocWhereInputSchema), z.lazy(() => DocWhereInputSchema).array()]).optional(),
    OR: z
      .lazy(() => DocWhereInputSchema)
      .array()
      .optional(),
    NOT: z.union([z.lazy(() => DocWhereInputSchema), z.lazy(() => DocWhereInputSchema).array()]).optional(),
    id: z.union([z.lazy(() => StringFilterSchema), z.string()]).optional(),
    title: z.union([z.lazy(() => StringFilterSchema), z.string()]).optional(),
    content: z.union([z.lazy(() => StringFilterSchema), z.string()]).optional(),
    contentBinary: z
      .union([z.lazy(() => BytesNullableFilterSchema), z.instanceof(Buffer)])
      .optional()
      .nullable(),
    isArchived: z.union([z.lazy(() => BoolFilterSchema), z.boolean()]).optional(),
    isStarred: z.union([z.lazy(() => BoolFilterSchema), z.boolean()]).optional(),
    createdAt: z.union([z.lazy(() => DateTimeFilterSchema), z.coerce.date()]).optional(),
    updatedAt: z.union([z.lazy(() => DateTimeFilterSchema), z.coerce.date()]).optional(),
    ownerId: z.union([z.lazy(() => IntFilterSchema), z.number()]).optional(),
    parentId: z
      .union([z.lazy(() => StringNullableFilterSchema), z.string()])
      .optional()
      .nullable(),
    coverImageId: z
      .union([z.lazy(() => StringNullableFilterSchema), z.string()])
      .optional()
      .nullable(),
    position: z.union([z.lazy(() => IntFilterSchema), z.number()]).optional(),
    owner: z.union([z.lazy(() => UserRelationFilterSchema), z.lazy(() => UserWhereInputSchema)]).optional(),
    parent: z
      .union([z.lazy(() => DocNullableRelationFilterSchema), z.lazy(() => DocWhereInputSchema)])
      .optional()
      .nullable(),
    children: z.lazy(() => DocListRelationFilterSchema).optional(),
    coverImage: z
      .union([z.lazy(() => CoverImageNullableRelationFilterSchema), z.lazy(() => CoverImageWhereInputSchema)])
      .optional()
      .nullable(),
    sharedWith: z.lazy(() => DocShareListRelationFilterSchema).optional(),
  })
  .strict();

export const DocOrderByWithRelationInputSchema: z.ZodType<Prisma.DocOrderByWithRelationInput> = z
  .object({
    id: z.lazy(() => SortOrderSchema).optional(),
    title: z.lazy(() => SortOrderSchema).optional(),
    content: z.lazy(() => SortOrderSchema).optional(),
    contentBinary: z.union([z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema)]).optional(),
    isArchived: z.lazy(() => SortOrderSchema).optional(),
    isStarred: z.lazy(() => SortOrderSchema).optional(),
    createdAt: z.lazy(() => SortOrderSchema).optional(),
    updatedAt: z.lazy(() => SortOrderSchema).optional(),
    ownerId: z.lazy(() => SortOrderSchema).optional(),
    parentId: z.union([z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema)]).optional(),
    coverImageId: z.union([z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema)]).optional(),
    position: z.lazy(() => SortOrderSchema).optional(),
    owner: z.lazy(() => UserOrderByWithRelationInputSchema).optional(),
    parent: z.lazy(() => DocOrderByWithRelationInputSchema).optional(),
    children: z.lazy(() => DocOrderByRelationAggregateInputSchema).optional(),
    coverImage: z.lazy(() => CoverImageOrderByWithRelationInputSchema).optional(),
    sharedWith: z.lazy(() => DocShareOrderByRelationAggregateInputSchema).optional(),
  })
  .strict();

export const DocWhereUniqueInputSchema: z.ZodType<Prisma.DocWhereUniqueInput> = z
  .union([
    z.object({
      id: z.string().cuid(),
      coverImageId: z.string(),
    }),
    z.object({
      id: z.string().cuid(),
    }),
    z.object({
      coverImageId: z.string(),
    }),
  ])
  .and(
    z
      .object({
        id: z.string().cuid().optional(),
        coverImageId: z.string().optional(),
        AND: z.union([z.lazy(() => DocWhereInputSchema), z.lazy(() => DocWhereInputSchema).array()]).optional(),
        OR: z
          .lazy(() => DocWhereInputSchema)
          .array()
          .optional(),
        NOT: z.union([z.lazy(() => DocWhereInputSchema), z.lazy(() => DocWhereInputSchema).array()]).optional(),
        title: z.union([z.lazy(() => StringFilterSchema), z.string()]).optional(),
        content: z.union([z.lazy(() => StringFilterSchema), z.string()]).optional(),
        contentBinary: z
          .union([z.lazy(() => BytesNullableFilterSchema), z.instanceof(Buffer)])
          .optional()
          .nullable(),
        isArchived: z.union([z.lazy(() => BoolFilterSchema), z.boolean()]).optional(),
        isStarred: z.union([z.lazy(() => BoolFilterSchema), z.boolean()]).optional(),
        createdAt: z.union([z.lazy(() => DateTimeFilterSchema), z.coerce.date()]).optional(),
        updatedAt: z.union([z.lazy(() => DateTimeFilterSchema), z.coerce.date()]).optional(),
        ownerId: z.union([z.lazy(() => IntFilterSchema), z.number().int()]).optional(),
        parentId: z
          .union([z.lazy(() => StringNullableFilterSchema), z.string()])
          .optional()
          .nullable(),
        position: z.union([z.lazy(() => IntFilterSchema), z.number().int()]).optional(),
        owner: z.union([z.lazy(() => UserRelationFilterSchema), z.lazy(() => UserWhereInputSchema)]).optional(),
        parent: z
          .union([z.lazy(() => DocNullableRelationFilterSchema), z.lazy(() => DocWhereInputSchema)])
          .optional()
          .nullable(),
        children: z.lazy(() => DocListRelationFilterSchema).optional(),
        coverImage: z
          .union([z.lazy(() => CoverImageNullableRelationFilterSchema), z.lazy(() => CoverImageWhereInputSchema)])
          .optional()
          .nullable(),
        sharedWith: z.lazy(() => DocShareListRelationFilterSchema).optional(),
      })
      .strict(),
  );

export const DocOrderByWithAggregationInputSchema: z.ZodType<Prisma.DocOrderByWithAggregationInput> = z
  .object({
    id: z.lazy(() => SortOrderSchema).optional(),
    title: z.lazy(() => SortOrderSchema).optional(),
    content: z.lazy(() => SortOrderSchema).optional(),
    contentBinary: z.union([z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema)]).optional(),
    isArchived: z.lazy(() => SortOrderSchema).optional(),
    isStarred: z.lazy(() => SortOrderSchema).optional(),
    createdAt: z.lazy(() => SortOrderSchema).optional(),
    updatedAt: z.lazy(() => SortOrderSchema).optional(),
    ownerId: z.lazy(() => SortOrderSchema).optional(),
    parentId: z.union([z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema)]).optional(),
    coverImageId: z.union([z.lazy(() => SortOrderSchema), z.lazy(() => SortOrderInputSchema)]).optional(),
    position: z.lazy(() => SortOrderSchema).optional(),
    _count: z.lazy(() => DocCountOrderByAggregateInputSchema).optional(),
    _avg: z.lazy(() => DocAvgOrderByAggregateInputSchema).optional(),
    _max: z.lazy(() => DocMaxOrderByAggregateInputSchema).optional(),
    _min: z.lazy(() => DocMinOrderByAggregateInputSchema).optional(),
    _sum: z.lazy(() => DocSumOrderByAggregateInputSchema).optional(),
  })
  .strict();

export const DocScalarWhereWithAggregatesInputSchema: z.ZodType<Prisma.DocScalarWhereWithAggregatesInput> = z
  .object({
    AND: z.union([z.lazy(() => DocScalarWhereWithAggregatesInputSchema), z.lazy(() => DocScalarWhereWithAggregatesInputSchema).array()]).optional(),
    OR: z
      .lazy(() => DocScalarWhereWithAggregatesInputSchema)
      .array()
      .optional(),
    NOT: z.union([z.lazy(() => DocScalarWhereWithAggregatesInputSchema), z.lazy(() => DocScalarWhereWithAggregatesInputSchema).array()]).optional(),
    id: z.union([z.lazy(() => StringWithAggregatesFilterSchema), z.string()]).optional(),
    title: z.union([z.lazy(() => StringWithAggregatesFilterSchema), z.string()]).optional(),
    content: z.union([z.lazy(() => StringWithAggregatesFilterSchema), z.string()]).optional(),
    contentBinary: z
      .union([z.lazy(() => BytesNullableWithAggregatesFilterSchema), z.instanceof(Buffer)])
      .optional()
      .nullable(),
    isArchived: z.union([z.lazy(() => BoolWithAggregatesFilterSchema), z.boolean()]).optional(),
    isStarred: z.union([z.lazy(() => BoolWithAggregatesFilterSchema), z.boolean()]).optional(),
    createdAt: z.union([z.lazy(() => DateTimeWithAggregatesFilterSchema), z.coerce.date()]).optional(),
    updatedAt: z.union([z.lazy(() => DateTimeWithAggregatesFilterSchema), z.coerce.date()]).optional(),
    ownerId: z.union([z.lazy(() => IntWithAggregatesFilterSchema), z.number()]).optional(),
    parentId: z
      .union([z.lazy(() => StringNullableWithAggregatesFilterSchema), z.string()])
      .optional()
      .nullable(),
    coverImageId: z
      .union([z.lazy(() => StringNullableWithAggregatesFilterSchema), z.string()])
      .optional()
      .nullable(),
    position: z.union([z.lazy(() => IntWithAggregatesFilterSchema), z.number()]).optional(),
  })
  .strict();

export const CoverImageWhereInputSchema: z.ZodType<Prisma.CoverImageWhereInput> = z
  .object({
    AND: z.union([z.lazy(() => CoverImageWhereInputSchema), z.lazy(() => CoverImageWhereInputSchema).array()]).optional(),
    OR: z
      .lazy(() => CoverImageWhereInputSchema)
      .array()
      .optional(),
    NOT: z.union([z.lazy(() => CoverImageWhereInputSchema), z.lazy(() => CoverImageWhereInputSchema).array()]).optional(),
    id: z.union([z.lazy(() => StringFilterSchema), z.string()]).optional(),
    url: z.union([z.lazy(() => StringFilterSchema), z.string()]).optional(),
    scrollY: z.union([z.lazy(() => FloatFilterSchema), z.number()]).optional(),
    docId: z.union([z.lazy(() => StringFilterSchema), z.string()]).optional(),
    doc: z.union([z.lazy(() => DocRelationFilterSchema), z.lazy(() => DocWhereInputSchema)]).optional(),
  })
  .strict();

export const CoverImageOrderByWithRelationInputSchema: z.ZodType<Prisma.CoverImageOrderByWithRelationInput> = z
  .object({
    id: z.lazy(() => SortOrderSchema).optional(),
    url: z.lazy(() => SortOrderSchema).optional(),
    scrollY: z.lazy(() => SortOrderSchema).optional(),
    docId: z.lazy(() => SortOrderSchema).optional(),
    doc: z.lazy(() => DocOrderByWithRelationInputSchema).optional(),
  })
  .strict();

export const CoverImageWhereUniqueInputSchema: z.ZodType<Prisma.CoverImageWhereUniqueInput> = z
  .union([
    z.object({
      id: z.string().cuid(),
      docId: z.string(),
    }),
    z.object({
      id: z.string().cuid(),
    }),
    z.object({
      docId: z.string(),
    }),
  ])
  .and(
    z
      .object({
        id: z.string().cuid().optional(),
        docId: z.string().optional(),
        AND: z.union([z.lazy(() => CoverImageWhereInputSchema), z.lazy(() => CoverImageWhereInputSchema).array()]).optional(),
        OR: z
          .lazy(() => CoverImageWhereInputSchema)
          .array()
          .optional(),
        NOT: z.union([z.lazy(() => CoverImageWhereInputSchema), z.lazy(() => CoverImageWhereInputSchema).array()]).optional(),
        url: z.union([z.lazy(() => StringFilterSchema), z.string()]).optional(),
        scrollY: z.union([z.lazy(() => FloatFilterSchema), z.number()]).optional(),
        doc: z.union([z.lazy(() => DocRelationFilterSchema), z.lazy(() => DocWhereInputSchema)]).optional(),
      })
      .strict(),
  );

export const CoverImageOrderByWithAggregationInputSchema: z.ZodType<Prisma.CoverImageOrderByWithAggregationInput> = z
  .object({
    id: z.lazy(() => SortOrderSchema).optional(),
    url: z.lazy(() => SortOrderSchema).optional(),
    scrollY: z.lazy(() => SortOrderSchema).optional(),
    docId: z.lazy(() => SortOrderSchema).optional(),
    _count: z.lazy(() => CoverImageCountOrderByAggregateInputSchema).optional(),
    _avg: z.lazy(() => CoverImageAvgOrderByAggregateInputSchema).optional(),
    _max: z.lazy(() => CoverImageMaxOrderByAggregateInputSchema).optional(),
    _min: z.lazy(() => CoverImageMinOrderByAggregateInputSchema).optional(),
    _sum: z.lazy(() => CoverImageSumOrderByAggregateInputSchema).optional(),
  })
  .strict();

export const CoverImageScalarWhereWithAggregatesInputSchema: z.ZodType<Prisma.CoverImageScalarWhereWithAggregatesInput> = z
  .object({
    AND: z
      .union([z.lazy(() => CoverImageScalarWhereWithAggregatesInputSchema), z.lazy(() => CoverImageScalarWhereWithAggregatesInputSchema).array()])
      .optional(),
    OR: z
      .lazy(() => CoverImageScalarWhereWithAggregatesInputSchema)
      .array()
      .optional(),
    NOT: z
      .union([z.lazy(() => CoverImageScalarWhereWithAggregatesInputSchema), z.lazy(() => CoverImageScalarWhereWithAggregatesInputSchema).array()])
      .optional(),
    id: z.union([z.lazy(() => StringWithAggregatesFilterSchema), z.string()]).optional(),
    url: z.union([z.lazy(() => StringWithAggregatesFilterSchema), z.string()]).optional(),
    scrollY: z.union([z.lazy(() => FloatWithAggregatesFilterSchema), z.number()]).optional(),
    docId: z.union([z.lazy(() => StringWithAggregatesFilterSchema), z.string()]).optional(),
  })
  .strict();

export const DocShareWhereInputSchema: z.ZodType<Prisma.DocShareWhereInput> = z
  .object({
    AND: z.union([z.lazy(() => DocShareWhereInputSchema), z.lazy(() => DocShareWhereInputSchema).array()]).optional(),
    OR: z
      .lazy(() => DocShareWhereInputSchema)
      .array()
      .optional(),
    NOT: z.union([z.lazy(() => DocShareWhereInputSchema), z.lazy(() => DocShareWhereInputSchema).array()]).optional(),
    id: z.union([z.lazy(() => StringFilterSchema), z.string()]).optional(),
    docId: z.union([z.lazy(() => StringFilterSchema), z.string()]).optional(),
    authorId: z.union([z.lazy(() => IntFilterSchema), z.number()]).optional(),
    userId: z.union([z.lazy(() => IntFilterSchema), z.number()]).optional(),
    permission: z.union([z.lazy(() => StringFilterSchema), z.string()]).optional(),
    noticeType: z.union([z.lazy(() => StringFilterSchema), z.string()]).optional(),
    createdAt: z.union([z.lazy(() => DateTimeFilterSchema), z.coerce.date()]).optional(),
    updatedAt: z.union([z.lazy(() => DateTimeFilterSchema), z.coerce.date()]).optional(),
    doc: z.union([z.lazy(() => DocRelationFilterSchema), z.lazy(() => DocWhereInputSchema)]).optional(),
    author: z.union([z.lazy(() => UserRelationFilterSchema), z.lazy(() => UserWhereInputSchema)]).optional(),
    sharedTo: z.union([z.lazy(() => UserRelationFilterSchema), z.lazy(() => UserWhereInputSchema)]).optional(),
  })
  .strict();

export const DocShareOrderByWithRelationInputSchema: z.ZodType<Prisma.DocShareOrderByWithRelationInput> = z
  .object({
    id: z.lazy(() => SortOrderSchema).optional(),
    docId: z.lazy(() => SortOrderSchema).optional(),
    authorId: z.lazy(() => SortOrderSchema).optional(),
    userId: z.lazy(() => SortOrderSchema).optional(),
    permission: z.lazy(() => SortOrderSchema).optional(),
    noticeType: z.lazy(() => SortOrderSchema).optional(),
    createdAt: z.lazy(() => SortOrderSchema).optional(),
    updatedAt: z.lazy(() => SortOrderSchema).optional(),
    doc: z.lazy(() => DocOrderByWithRelationInputSchema).optional(),
    author: z.lazy(() => UserOrderByWithRelationInputSchema).optional(),
    sharedTo: z.lazy(() => UserOrderByWithRelationInputSchema).optional(),
  })
  .strict();

export const DocShareWhereUniqueInputSchema: z.ZodType<Prisma.DocShareWhereUniqueInput> = z
  .union([
    z.object({
      id: z.string().cuid(),
      docId_userId: z.lazy(() => DocShareDocIdUserIdCompoundUniqueInputSchema),
    }),
    z.object({
      id: z.string().cuid(),
    }),
    z.object({
      docId_userId: z.lazy(() => DocShareDocIdUserIdCompoundUniqueInputSchema),
    }),
  ])
  .and(
    z
      .object({
        id: z.string().cuid().optional(),
        docId_userId: z.lazy(() => DocShareDocIdUserIdCompoundUniqueInputSchema).optional(),
        AND: z.union([z.lazy(() => DocShareWhereInputSchema), z.lazy(() => DocShareWhereInputSchema).array()]).optional(),
        OR: z
          .lazy(() => DocShareWhereInputSchema)
          .array()
          .optional(),
        NOT: z.union([z.lazy(() => DocShareWhereInputSchema), z.lazy(() => DocShareWhereInputSchema).array()]).optional(),
        docId: z.union([z.lazy(() => StringFilterSchema), z.string()]).optional(),
        authorId: z.union([z.lazy(() => IntFilterSchema), z.number().int()]).optional(),
        userId: z.union([z.lazy(() => IntFilterSchema), z.number().int()]).optional(),
        permission: z.union([z.lazy(() => StringFilterSchema), z.string()]).optional(),
        noticeType: z.union([z.lazy(() => StringFilterSchema), z.string()]).optional(),
        createdAt: z.union([z.lazy(() => DateTimeFilterSchema), z.coerce.date()]).optional(),
        updatedAt: z.union([z.lazy(() => DateTimeFilterSchema), z.coerce.date()]).optional(),
        doc: z.union([z.lazy(() => DocRelationFilterSchema), z.lazy(() => DocWhereInputSchema)]).optional(),
        author: z.union([z.lazy(() => UserRelationFilterSchema), z.lazy(() => UserWhereInputSchema)]).optional(),
        sharedTo: z.union([z.lazy(() => UserRelationFilterSchema), z.lazy(() => UserWhereInputSchema)]).optional(),
      })
      .strict(),
  );

export const DocShareOrderByWithAggregationInputSchema: z.ZodType<Prisma.DocShareOrderByWithAggregationInput> = z
  .object({
    id: z.lazy(() => SortOrderSchema).optional(),
    docId: z.lazy(() => SortOrderSchema).optional(),
    authorId: z.lazy(() => SortOrderSchema).optional(),
    userId: z.lazy(() => SortOrderSchema).optional(),
    permission: z.lazy(() => SortOrderSchema).optional(),
    noticeType: z.lazy(() => SortOrderSchema).optional(),
    createdAt: z.lazy(() => SortOrderSchema).optional(),
    updatedAt: z.lazy(() => SortOrderSchema).optional(),
    _count: z.lazy(() => DocShareCountOrderByAggregateInputSchema).optional(),
    _avg: z.lazy(() => DocShareAvgOrderByAggregateInputSchema).optional(),
    _max: z.lazy(() => DocShareMaxOrderByAggregateInputSchema).optional(),
    _min: z.lazy(() => DocShareMinOrderByAggregateInputSchema).optional(),
    _sum: z.lazy(() => DocShareSumOrderByAggregateInputSchema).optional(),
  })
  .strict();

export const DocShareScalarWhereWithAggregatesInputSchema: z.ZodType<Prisma.DocShareScalarWhereWithAggregatesInput> = z
  .object({
    AND: z.union([z.lazy(() => DocShareScalarWhereWithAggregatesInputSchema), z.lazy(() => DocShareScalarWhereWithAggregatesInputSchema).array()]).optional(),
    OR: z
      .lazy(() => DocShareScalarWhereWithAggregatesInputSchema)
      .array()
      .optional(),
    NOT: z.union([z.lazy(() => DocShareScalarWhereWithAggregatesInputSchema), z.lazy(() => DocShareScalarWhereWithAggregatesInputSchema).array()]).optional(),
    id: z.union([z.lazy(() => StringWithAggregatesFilterSchema), z.string()]).optional(),
    docId: z.union([z.lazy(() => StringWithAggregatesFilterSchema), z.string()]).optional(),
    authorId: z.union([z.lazy(() => IntWithAggregatesFilterSchema), z.number()]).optional(),
    userId: z.union([z.lazy(() => IntWithAggregatesFilterSchema), z.number()]).optional(),
    permission: z.union([z.lazy(() => StringWithAggregatesFilterSchema), z.string()]).optional(),
    noticeType: z.union([z.lazy(() => StringWithAggregatesFilterSchema), z.string()]).optional(),
    createdAt: z.union([z.lazy(() => DateTimeWithAggregatesFilterSchema), z.coerce.date()]).optional(),
    updatedAt: z.union([z.lazy(() => DateTimeWithAggregatesFilterSchema), z.coerce.date()]).optional(),
  })
  .strict();

export const UserCreateInputSchema: z.ZodType<Prisma.UserCreateInput> = z
  .object({
    email: z.string(),
    displayName: z.string().optional().nullable(),
    imageUrl: z.string().optional().nullable(),
    emailVerified: z.coerce.date().optional().nullable(),
    status: z.string(),
    created_time: z.coerce.date().optional(),
    updated_time: z.coerce.date().optional(),
    hashedRefreshToken: z.string().optional().nullable(),
    password: z.lazy(() => PasswordCreateNestedOneWithoutUserInputSchema).optional(),
    connections: z.lazy(() => ConnectionCreateNestedManyWithoutUserInputSchema).optional(),
    docs: z.lazy(() => DocCreateNestedManyWithoutOwnerInputSchema).optional(),
    sharedDocs: z.lazy(() => DocShareCreateNestedManyWithoutSharedToInputSchema).optional(),
    DocShare: z.lazy(() => DocShareCreateNestedManyWithoutAuthorInputSchema).optional(),
  })
  .strict();

export const UserUncheckedCreateInputSchema: z.ZodType<Prisma.UserUncheckedCreateInput> = z
  .object({
    id: z.number().int().optional(),
    email: z.string(),
    displayName: z.string().optional().nullable(),
    imageUrl: z.string().optional().nullable(),
    emailVerified: z.coerce.date().optional().nullable(),
    status: z.string(),
    created_time: z.coerce.date().optional(),
    updated_time: z.coerce.date().optional(),
    hashedRefreshToken: z.string().optional().nullable(),
    password: z.lazy(() => PasswordUncheckedCreateNestedOneWithoutUserInputSchema).optional(),
    connections: z.lazy(() => ConnectionUncheckedCreateNestedManyWithoutUserInputSchema).optional(),
    docs: z.lazy(() => DocUncheckedCreateNestedManyWithoutOwnerInputSchema).optional(),
    sharedDocs: z.lazy(() => DocShareUncheckedCreateNestedManyWithoutSharedToInputSchema).optional(),
    DocShare: z.lazy(() => DocShareUncheckedCreateNestedManyWithoutAuthorInputSchema).optional(),
  })
  .strict();

export const UserUpdateInputSchema: z.ZodType<Prisma.UserUpdateInput> = z
  .object({
    email: z.union([z.string(), z.lazy(() => StringFieldUpdateOperationsInputSchema)]).optional(),
    displayName: z
      .union([z.string(), z.lazy(() => NullableStringFieldUpdateOperationsInputSchema)])
      .optional()
      .nullable(),
    imageUrl: z
      .union([z.string(), z.lazy(() => NullableStringFieldUpdateOperationsInputSchema)])
      .optional()
      .nullable(),
    emailVerified: z
      .union([z.coerce.date(), z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema)])
      .optional()
      .nullable(),
    status: z.union([z.string(), z.lazy(() => StringFieldUpdateOperationsInputSchema)]).optional(),
    created_time: z.union([z.coerce.date(), z.lazy(() => DateTimeFieldUpdateOperationsInputSchema)]).optional(),
    updated_time: z.union([z.coerce.date(), z.lazy(() => DateTimeFieldUpdateOperationsInputSchema)]).optional(),
    hashedRefreshToken: z
      .union([z.string(), z.lazy(() => NullableStringFieldUpdateOperationsInputSchema)])
      .optional()
      .nullable(),
    password: z.lazy(() => PasswordUpdateOneWithoutUserNestedInputSchema).optional(),
    connections: z.lazy(() => ConnectionUpdateManyWithoutUserNestedInputSchema).optional(),
    docs: z.lazy(() => DocUpdateManyWithoutOwnerNestedInputSchema).optional(),
    sharedDocs: z.lazy(() => DocShareUpdateManyWithoutSharedToNestedInputSchema).optional(),
    DocShare: z.lazy(() => DocShareUpdateManyWithoutAuthorNestedInputSchema).optional(),
  })
  .strict();

export const UserUncheckedUpdateInputSchema: z.ZodType<Prisma.UserUncheckedUpdateInput> = z
  .object({
    id: z.union([z.number().int(), z.lazy(() => IntFieldUpdateOperationsInputSchema)]).optional(),
    email: z.union([z.string(), z.lazy(() => StringFieldUpdateOperationsInputSchema)]).optional(),
    displayName: z
      .union([z.string(), z.lazy(() => NullableStringFieldUpdateOperationsInputSchema)])
      .optional()
      .nullable(),
    imageUrl: z
      .union([z.string(), z.lazy(() => NullableStringFieldUpdateOperationsInputSchema)])
      .optional()
      .nullable(),
    emailVerified: z
      .union([z.coerce.date(), z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema)])
      .optional()
      .nullable(),
    status: z.union([z.string(), z.lazy(() => StringFieldUpdateOperationsInputSchema)]).optional(),
    created_time: z.union([z.coerce.date(), z.lazy(() => DateTimeFieldUpdateOperationsInputSchema)]).optional(),
    updated_time: z.union([z.coerce.date(), z.lazy(() => DateTimeFieldUpdateOperationsInputSchema)]).optional(),
    hashedRefreshToken: z
      .union([z.string(), z.lazy(() => NullableStringFieldUpdateOperationsInputSchema)])
      .optional()
      .nullable(),
    password: z.lazy(() => PasswordUncheckedUpdateOneWithoutUserNestedInputSchema).optional(),
    connections: z.lazy(() => ConnectionUncheckedUpdateManyWithoutUserNestedInputSchema).optional(),
    docs: z.lazy(() => DocUncheckedUpdateManyWithoutOwnerNestedInputSchema).optional(),
    sharedDocs: z.lazy(() => DocShareUncheckedUpdateManyWithoutSharedToNestedInputSchema).optional(),
    DocShare: z.lazy(() => DocShareUncheckedUpdateManyWithoutAuthorNestedInputSchema).optional(),
  })
  .strict();

export const UserCreateManyInputSchema: z.ZodType<Prisma.UserCreateManyInput> = z
  .object({
    id: z.number().int().optional(),
    email: z.string(),
    displayName: z.string().optional().nullable(),
    imageUrl: z.string().optional().nullable(),
    emailVerified: z.coerce.date().optional().nullable(),
    status: z.string(),
    created_time: z.coerce.date().optional(),
    updated_time: z.coerce.date().optional(),
    hashedRefreshToken: z.string().optional().nullable(),
  })
  .strict();

export const UserUpdateManyMutationInputSchema: z.ZodType<Prisma.UserUpdateManyMutationInput> = z
  .object({
    email: z.union([z.string(), z.lazy(() => StringFieldUpdateOperationsInputSchema)]).optional(),
    displayName: z
      .union([z.string(), z.lazy(() => NullableStringFieldUpdateOperationsInputSchema)])
      .optional()
      .nullable(),
    imageUrl: z
      .union([z.string(), z.lazy(() => NullableStringFieldUpdateOperationsInputSchema)])
      .optional()
      .nullable(),
    emailVerified: z
      .union([z.coerce.date(), z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema)])
      .optional()
      .nullable(),
    status: z.union([z.string(), z.lazy(() => StringFieldUpdateOperationsInputSchema)]).optional(),
    created_time: z.union([z.coerce.date(), z.lazy(() => DateTimeFieldUpdateOperationsInputSchema)]).optional(),
    updated_time: z.union([z.coerce.date(), z.lazy(() => DateTimeFieldUpdateOperationsInputSchema)]).optional(),
    hashedRefreshToken: z
      .union([z.string(), z.lazy(() => NullableStringFieldUpdateOperationsInputSchema)])
      .optional()
      .nullable(),
  })
  .strict();

export const UserUncheckedUpdateManyInputSchema: z.ZodType<Prisma.UserUncheckedUpdateManyInput> = z
  .object({
    id: z.union([z.number().int(), z.lazy(() => IntFieldUpdateOperationsInputSchema)]).optional(),
    email: z.union([z.string(), z.lazy(() => StringFieldUpdateOperationsInputSchema)]).optional(),
    displayName: z
      .union([z.string(), z.lazy(() => NullableStringFieldUpdateOperationsInputSchema)])
      .optional()
      .nullable(),
    imageUrl: z
      .union([z.string(), z.lazy(() => NullableStringFieldUpdateOperationsInputSchema)])
      .optional()
      .nullable(),
    emailVerified: z
      .union([z.coerce.date(), z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema)])
      .optional()
      .nullable(),
    status: z.union([z.string(), z.lazy(() => StringFieldUpdateOperationsInputSchema)]).optional(),
    created_time: z.union([z.coerce.date(), z.lazy(() => DateTimeFieldUpdateOperationsInputSchema)]).optional(),
    updated_time: z.union([z.coerce.date(), z.lazy(() => DateTimeFieldUpdateOperationsInputSchema)]).optional(),
    hashedRefreshToken: z
      .union([z.string(), z.lazy(() => NullableStringFieldUpdateOperationsInputSchema)])
      .optional()
      .nullable(),
  })
  .strict();

export const PasswordCreateInputSchema: z.ZodType<Prisma.PasswordCreateInput> = z
  .object({
    hash: z.string(),
    user: z.lazy(() => UserCreateNestedOneWithoutPasswordInputSchema),
  })
  .strict();

export const PasswordUncheckedCreateInputSchema: z.ZodType<Prisma.PasswordUncheckedCreateInput> = z
  .object({
    hash: z.string(),
    userId: z.number().int(),
  })
  .strict();

export const PasswordUpdateInputSchema: z.ZodType<Prisma.PasswordUpdateInput> = z
  .object({
    hash: z.union([z.string(), z.lazy(() => StringFieldUpdateOperationsInputSchema)]).optional(),
    user: z.lazy(() => UserUpdateOneRequiredWithoutPasswordNestedInputSchema).optional(),
  })
  .strict();

export const PasswordUncheckedUpdateInputSchema: z.ZodType<Prisma.PasswordUncheckedUpdateInput> = z
  .object({
    hash: z.union([z.string(), z.lazy(() => StringFieldUpdateOperationsInputSchema)]).optional(),
    userId: z.union([z.number().int(), z.lazy(() => IntFieldUpdateOperationsInputSchema)]).optional(),
  })
  .strict();

export const PasswordCreateManyInputSchema: z.ZodType<Prisma.PasswordCreateManyInput> = z
  .object({
    hash: z.string(),
    userId: z.number().int(),
  })
  .strict();

export const PasswordUpdateManyMutationInputSchema: z.ZodType<Prisma.PasswordUpdateManyMutationInput> = z
  .object({
    hash: z.union([z.string(), z.lazy(() => StringFieldUpdateOperationsInputSchema)]).optional(),
  })
  .strict();

export const PasswordUncheckedUpdateManyInputSchema: z.ZodType<Prisma.PasswordUncheckedUpdateManyInput> = z
  .object({
    hash: z.union([z.string(), z.lazy(() => StringFieldUpdateOperationsInputSchema)]).optional(),
    userId: z.union([z.number().int(), z.lazy(() => IntFieldUpdateOperationsInputSchema)]).optional(),
  })
  .strict();

export const ConnectionCreateInputSchema: z.ZodType<Prisma.ConnectionCreateInput> = z
  .object({
    id: z.string().cuid().optional(),
    providerName: z.string(),
    providerId: z.string(),
    createdAt: z.coerce.date().optional(),
    updatedAt: z.coerce.date().optional(),
    user: z.lazy(() => UserCreateNestedOneWithoutConnectionsInputSchema),
  })
  .strict();

export const ConnectionUncheckedCreateInputSchema: z.ZodType<Prisma.ConnectionUncheckedCreateInput> = z
  .object({
    id: z.string().cuid().optional(),
    providerName: z.string(),
    providerId: z.string(),
    createdAt: z.coerce.date().optional(),
    updatedAt: z.coerce.date().optional(),
    userId: z.number().int(),
  })
  .strict();

export const ConnectionUpdateInputSchema: z.ZodType<Prisma.ConnectionUpdateInput> = z
  .object({
    id: z.union([z.string().cuid(), z.lazy(() => StringFieldUpdateOperationsInputSchema)]).optional(),
    providerName: z.union([z.string(), z.lazy(() => StringFieldUpdateOperationsInputSchema)]).optional(),
    providerId: z.union([z.string(), z.lazy(() => StringFieldUpdateOperationsInputSchema)]).optional(),
    createdAt: z.union([z.coerce.date(), z.lazy(() => DateTimeFieldUpdateOperationsInputSchema)]).optional(),
    updatedAt: z.union([z.coerce.date(), z.lazy(() => DateTimeFieldUpdateOperationsInputSchema)]).optional(),
    user: z.lazy(() => UserUpdateOneRequiredWithoutConnectionsNestedInputSchema).optional(),
  })
  .strict();

export const ConnectionUncheckedUpdateInputSchema: z.ZodType<Prisma.ConnectionUncheckedUpdateInput> = z
  .object({
    id: z.union([z.string().cuid(), z.lazy(() => StringFieldUpdateOperationsInputSchema)]).optional(),
    providerName: z.union([z.string(), z.lazy(() => StringFieldUpdateOperationsInputSchema)]).optional(),
    providerId: z.union([z.string(), z.lazy(() => StringFieldUpdateOperationsInputSchema)]).optional(),
    createdAt: z.union([z.coerce.date(), z.lazy(() => DateTimeFieldUpdateOperationsInputSchema)]).optional(),
    updatedAt: z.union([z.coerce.date(), z.lazy(() => DateTimeFieldUpdateOperationsInputSchema)]).optional(),
    userId: z.union([z.number().int(), z.lazy(() => IntFieldUpdateOperationsInputSchema)]).optional(),
  })
  .strict();

export const ConnectionCreateManyInputSchema: z.ZodType<Prisma.ConnectionCreateManyInput> = z
  .object({
    id: z.string().cuid().optional(),
    providerName: z.string(),
    providerId: z.string(),
    createdAt: z.coerce.date().optional(),
    updatedAt: z.coerce.date().optional(),
    userId: z.number().int(),
  })
  .strict();

export const ConnectionUpdateManyMutationInputSchema: z.ZodType<Prisma.ConnectionUpdateManyMutationInput> = z
  .object({
    id: z.union([z.string().cuid(), z.lazy(() => StringFieldUpdateOperationsInputSchema)]).optional(),
    providerName: z.union([z.string(), z.lazy(() => StringFieldUpdateOperationsInputSchema)]).optional(),
    providerId: z.union([z.string(), z.lazy(() => StringFieldUpdateOperationsInputSchema)]).optional(),
    createdAt: z.union([z.coerce.date(), z.lazy(() => DateTimeFieldUpdateOperationsInputSchema)]).optional(),
    updatedAt: z.union([z.coerce.date(), z.lazy(() => DateTimeFieldUpdateOperationsInputSchema)]).optional(),
  })
  .strict();

export const ConnectionUncheckedUpdateManyInputSchema: z.ZodType<Prisma.ConnectionUncheckedUpdateManyInput> = z
  .object({
    id: z.union([z.string().cuid(), z.lazy(() => StringFieldUpdateOperationsInputSchema)]).optional(),
    providerName: z.union([z.string(), z.lazy(() => StringFieldUpdateOperationsInputSchema)]).optional(),
    providerId: z.union([z.string(), z.lazy(() => StringFieldUpdateOperationsInputSchema)]).optional(),
    createdAt: z.union([z.coerce.date(), z.lazy(() => DateTimeFieldUpdateOperationsInputSchema)]).optional(),
    updatedAt: z.union([z.coerce.date(), z.lazy(() => DateTimeFieldUpdateOperationsInputSchema)]).optional(),
    userId: z.union([z.number().int(), z.lazy(() => IntFieldUpdateOperationsInputSchema)]).optional(),
  })
  .strict();

export const DocCreateInputSchema: z.ZodType<Prisma.DocCreateInput> = z
  .object({
    id: z.string().cuid().optional(),
    title: z.string(),
    content: z.string(),
    contentBinary: z.instanceof(Buffer).optional().nullable(),
    isArchived: z.boolean().optional(),
    isStarred: z.boolean().optional(),
    createdAt: z.coerce.date().optional(),
    updatedAt: z.coerce.date().optional(),
    coverImageId: z.string().optional().nullable(),
    position: z.number().int().optional(),
    owner: z.lazy(() => UserCreateNestedOneWithoutDocsInputSchema),
    parent: z.lazy(() => DocCreateNestedOneWithoutChildrenInputSchema).optional(),
    children: z.lazy(() => DocCreateNestedManyWithoutParentInputSchema).optional(),
    coverImage: z.lazy(() => CoverImageCreateNestedOneWithoutDocInputSchema).optional(),
    sharedWith: z.lazy(() => DocShareCreateNestedManyWithoutDocInputSchema).optional(),
  })
  .strict();

export const DocUncheckedCreateInputSchema: z.ZodType<Prisma.DocUncheckedCreateInput> = z
  .object({
    id: z.string().cuid().optional(),
    title: z.string(),
    content: z.string(),
    contentBinary: z.instanceof(Buffer).optional().nullable(),
    isArchived: z.boolean().optional(),
    isStarred: z.boolean().optional(),
    createdAt: z.coerce.date().optional(),
    updatedAt: z.coerce.date().optional(),
    ownerId: z.number().int(),
    parentId: z.string().optional().nullable(),
    coverImageId: z.string().optional().nullable(),
    position: z.number().int().optional(),
    children: z.lazy(() => DocUncheckedCreateNestedManyWithoutParentInputSchema).optional(),
    coverImage: z.lazy(() => CoverImageUncheckedCreateNestedOneWithoutDocInputSchema).optional(),
    sharedWith: z.lazy(() => DocShareUncheckedCreateNestedManyWithoutDocInputSchema).optional(),
  })
  .strict();

export const DocUpdateInputSchema: z.ZodType<Prisma.DocUpdateInput> = z
  .object({
    id: z.union([z.string().cuid(), z.lazy(() => StringFieldUpdateOperationsInputSchema)]).optional(),
    title: z.union([z.string(), z.lazy(() => StringFieldUpdateOperationsInputSchema)]).optional(),
    content: z.union([z.string(), z.lazy(() => StringFieldUpdateOperationsInputSchema)]).optional(),
    contentBinary: z
      .union([z.instanceof(Buffer), z.lazy(() => NullableBytesFieldUpdateOperationsInputSchema)])
      .optional()
      .nullable(),
    isArchived: z.union([z.boolean(), z.lazy(() => BoolFieldUpdateOperationsInputSchema)]).optional(),
    isStarred: z.union([z.boolean(), z.lazy(() => BoolFieldUpdateOperationsInputSchema)]).optional(),
    createdAt: z.union([z.coerce.date(), z.lazy(() => DateTimeFieldUpdateOperationsInputSchema)]).optional(),
    updatedAt: z.union([z.coerce.date(), z.lazy(() => DateTimeFieldUpdateOperationsInputSchema)]).optional(),
    coverImageId: z
      .union([z.string(), z.lazy(() => NullableStringFieldUpdateOperationsInputSchema)])
      .optional()
      .nullable(),
    position: z.union([z.number().int(), z.lazy(() => IntFieldUpdateOperationsInputSchema)]).optional(),
    owner: z.lazy(() => UserUpdateOneRequiredWithoutDocsNestedInputSchema).optional(),
    parent: z.lazy(() => DocUpdateOneWithoutChildrenNestedInputSchema).optional(),
    children: z.lazy(() => DocUpdateManyWithoutParentNestedInputSchema).optional(),
    coverImage: z.lazy(() => CoverImageUpdateOneWithoutDocNestedInputSchema).optional(),
    sharedWith: z.lazy(() => DocShareUpdateManyWithoutDocNestedInputSchema).optional(),
  })
  .strict();

export const DocUncheckedUpdateInputSchema: z.ZodType<Prisma.DocUncheckedUpdateInput> = z
  .object({
    id: z.union([z.string().cuid(), z.lazy(() => StringFieldUpdateOperationsInputSchema)]).optional(),
    title: z.union([z.string(), z.lazy(() => StringFieldUpdateOperationsInputSchema)]).optional(),
    content: z.union([z.string(), z.lazy(() => StringFieldUpdateOperationsInputSchema)]).optional(),
    contentBinary: z
      .union([z.instanceof(Buffer), z.lazy(() => NullableBytesFieldUpdateOperationsInputSchema)])
      .optional()
      .nullable(),
    isArchived: z.union([z.boolean(), z.lazy(() => BoolFieldUpdateOperationsInputSchema)]).optional(),
    isStarred: z.union([z.boolean(), z.lazy(() => BoolFieldUpdateOperationsInputSchema)]).optional(),
    createdAt: z.union([z.coerce.date(), z.lazy(() => DateTimeFieldUpdateOperationsInputSchema)]).optional(),
    updatedAt: z.union([z.coerce.date(), z.lazy(() => DateTimeFieldUpdateOperationsInputSchema)]).optional(),
    ownerId: z.union([z.number().int(), z.lazy(() => IntFieldUpdateOperationsInputSchema)]).optional(),
    parentId: z
      .union([z.string(), z.lazy(() => NullableStringFieldUpdateOperationsInputSchema)])
      .optional()
      .nullable(),
    coverImageId: z
      .union([z.string(), z.lazy(() => NullableStringFieldUpdateOperationsInputSchema)])
      .optional()
      .nullable(),
    position: z.union([z.number().int(), z.lazy(() => IntFieldUpdateOperationsInputSchema)]).optional(),
    children: z.lazy(() => DocUncheckedUpdateManyWithoutParentNestedInputSchema).optional(),
    coverImage: z.lazy(() => CoverImageUncheckedUpdateOneWithoutDocNestedInputSchema).optional(),
    sharedWith: z.lazy(() => DocShareUncheckedUpdateManyWithoutDocNestedInputSchema).optional(),
  })
  .strict();

export const DocCreateManyInputSchema: z.ZodType<Prisma.DocCreateManyInput> = z
  .object({
    id: z.string().cuid().optional(),
    title: z.string(),
    content: z.string(),
    contentBinary: z.instanceof(Buffer).optional().nullable(),
    isArchived: z.boolean().optional(),
    isStarred: z.boolean().optional(),
    createdAt: z.coerce.date().optional(),
    updatedAt: z.coerce.date().optional(),
    ownerId: z.number().int(),
    parentId: z.string().optional().nullable(),
    coverImageId: z.string().optional().nullable(),
    position: z.number().int().optional(),
  })
  .strict();

export const DocUpdateManyMutationInputSchema: z.ZodType<Prisma.DocUpdateManyMutationInput> = z
  .object({
    id: z.union([z.string().cuid(), z.lazy(() => StringFieldUpdateOperationsInputSchema)]).optional(),
    title: z.union([z.string(), z.lazy(() => StringFieldUpdateOperationsInputSchema)]).optional(),
    content: z.union([z.string(), z.lazy(() => StringFieldUpdateOperationsInputSchema)]).optional(),
    contentBinary: z
      .union([z.instanceof(Buffer), z.lazy(() => NullableBytesFieldUpdateOperationsInputSchema)])
      .optional()
      .nullable(),
    isArchived: z.union([z.boolean(), z.lazy(() => BoolFieldUpdateOperationsInputSchema)]).optional(),
    isStarred: z.union([z.boolean(), z.lazy(() => BoolFieldUpdateOperationsInputSchema)]).optional(),
    createdAt: z.union([z.coerce.date(), z.lazy(() => DateTimeFieldUpdateOperationsInputSchema)]).optional(),
    updatedAt: z.union([z.coerce.date(), z.lazy(() => DateTimeFieldUpdateOperationsInputSchema)]).optional(),
    coverImageId: z
      .union([z.string(), z.lazy(() => NullableStringFieldUpdateOperationsInputSchema)])
      .optional()
      .nullable(),
    position: z.union([z.number().int(), z.lazy(() => IntFieldUpdateOperationsInputSchema)]).optional(),
  })
  .strict();

export const DocUncheckedUpdateManyInputSchema: z.ZodType<Prisma.DocUncheckedUpdateManyInput> = z
  .object({
    id: z.union([z.string().cuid(), z.lazy(() => StringFieldUpdateOperationsInputSchema)]).optional(),
    title: z.union([z.string(), z.lazy(() => StringFieldUpdateOperationsInputSchema)]).optional(),
    content: z.union([z.string(), z.lazy(() => StringFieldUpdateOperationsInputSchema)]).optional(),
    contentBinary: z
      .union([z.instanceof(Buffer), z.lazy(() => NullableBytesFieldUpdateOperationsInputSchema)])
      .optional()
      .nullable(),
    isArchived: z.union([z.boolean(), z.lazy(() => BoolFieldUpdateOperationsInputSchema)]).optional(),
    isStarred: z.union([z.boolean(), z.lazy(() => BoolFieldUpdateOperationsInputSchema)]).optional(),
    createdAt: z.union([z.coerce.date(), z.lazy(() => DateTimeFieldUpdateOperationsInputSchema)]).optional(),
    updatedAt: z.union([z.coerce.date(), z.lazy(() => DateTimeFieldUpdateOperationsInputSchema)]).optional(),
    ownerId: z.union([z.number().int(), z.lazy(() => IntFieldUpdateOperationsInputSchema)]).optional(),
    parentId: z
      .union([z.string(), z.lazy(() => NullableStringFieldUpdateOperationsInputSchema)])
      .optional()
      .nullable(),
    coverImageId: z
      .union([z.string(), z.lazy(() => NullableStringFieldUpdateOperationsInputSchema)])
      .optional()
      .nullable(),
    position: z.union([z.number().int(), z.lazy(() => IntFieldUpdateOperationsInputSchema)]).optional(),
  })
  .strict();

export const CoverImageCreateInputSchema: z.ZodType<Prisma.CoverImageCreateInput> = z
  .object({
    id: z.string().cuid().optional(),
    url: z.string(),
    scrollY: z.number(),
    doc: z.lazy(() => DocCreateNestedOneWithoutCoverImageInputSchema),
  })
  .strict();

export const CoverImageUncheckedCreateInputSchema: z.ZodType<Prisma.CoverImageUncheckedCreateInput> = z
  .object({
    id: z.string().cuid().optional(),
    url: z.string(),
    scrollY: z.number(),
    docId: z.string(),
  })
  .strict();

export const CoverImageUpdateInputSchema: z.ZodType<Prisma.CoverImageUpdateInput> = z
  .object({
    id: z.union([z.string().cuid(), z.lazy(() => StringFieldUpdateOperationsInputSchema)]).optional(),
    url: z.union([z.string(), z.lazy(() => StringFieldUpdateOperationsInputSchema)]).optional(),
    scrollY: z.union([z.number(), z.lazy(() => FloatFieldUpdateOperationsInputSchema)]).optional(),
    doc: z.lazy(() => DocUpdateOneRequiredWithoutCoverImageNestedInputSchema).optional(),
  })
  .strict();

export const CoverImageUncheckedUpdateInputSchema: z.ZodType<Prisma.CoverImageUncheckedUpdateInput> = z
  .object({
    id: z.union([z.string().cuid(), z.lazy(() => StringFieldUpdateOperationsInputSchema)]).optional(),
    url: z.union([z.string(), z.lazy(() => StringFieldUpdateOperationsInputSchema)]).optional(),
    scrollY: z.union([z.number(), z.lazy(() => FloatFieldUpdateOperationsInputSchema)]).optional(),
    docId: z.union([z.string(), z.lazy(() => StringFieldUpdateOperationsInputSchema)]).optional(),
  })
  .strict();

export const CoverImageCreateManyInputSchema: z.ZodType<Prisma.CoverImageCreateManyInput> = z
  .object({
    id: z.string().cuid().optional(),
    url: z.string(),
    scrollY: z.number(),
    docId: z.string(),
  })
  .strict();

export const CoverImageUpdateManyMutationInputSchema: z.ZodType<Prisma.CoverImageUpdateManyMutationInput> = z
  .object({
    id: z.union([z.string().cuid(), z.lazy(() => StringFieldUpdateOperationsInputSchema)]).optional(),
    url: z.union([z.string(), z.lazy(() => StringFieldUpdateOperationsInputSchema)]).optional(),
    scrollY: z.union([z.number(), z.lazy(() => FloatFieldUpdateOperationsInputSchema)]).optional(),
  })
  .strict();

export const CoverImageUncheckedUpdateManyInputSchema: z.ZodType<Prisma.CoverImageUncheckedUpdateManyInput> = z
  .object({
    id: z.union([z.string().cuid(), z.lazy(() => StringFieldUpdateOperationsInputSchema)]).optional(),
    url: z.union([z.string(), z.lazy(() => StringFieldUpdateOperationsInputSchema)]).optional(),
    scrollY: z.union([z.number(), z.lazy(() => FloatFieldUpdateOperationsInputSchema)]).optional(),
    docId: z.union([z.string(), z.lazy(() => StringFieldUpdateOperationsInputSchema)]).optional(),
  })
  .strict();

export const DocShareCreateInputSchema: z.ZodType<Prisma.DocShareCreateInput> = z
  .object({
    id: z.string().cuid().optional(),
    permission: z.string().optional(),
    noticeType: z.string().optional(),
    createdAt: z.coerce.date().optional(),
    updatedAt: z.coerce.date().optional(),
    doc: z.lazy(() => DocCreateNestedOneWithoutSharedWithInputSchema),
    author: z.lazy(() => UserCreateNestedOneWithoutDocShareInputSchema),
    sharedTo: z.lazy(() => UserCreateNestedOneWithoutSharedDocsInputSchema),
  })
  .strict();

export const DocShareUncheckedCreateInputSchema: z.ZodType<Prisma.DocShareUncheckedCreateInput> = z
  .object({
    id: z.string().cuid().optional(),
    docId: z.string(),
    authorId: z.number().int(),
    userId: z.number().int(),
    permission: z.string().optional(),
    noticeType: z.string().optional(),
    createdAt: z.coerce.date().optional(),
    updatedAt: z.coerce.date().optional(),
  })
  .strict();

export const DocShareUpdateInputSchema: z.ZodType<Prisma.DocShareUpdateInput> = z
  .object({
    id: z.union([z.string().cuid(), z.lazy(() => StringFieldUpdateOperationsInputSchema)]).optional(),
    permission: z.union([z.string(), z.lazy(() => StringFieldUpdateOperationsInputSchema)]).optional(),
    noticeType: z.union([z.string(), z.lazy(() => StringFieldUpdateOperationsInputSchema)]).optional(),
    createdAt: z.union([z.coerce.date(), z.lazy(() => DateTimeFieldUpdateOperationsInputSchema)]).optional(),
    updatedAt: z.union([z.coerce.date(), z.lazy(() => DateTimeFieldUpdateOperationsInputSchema)]).optional(),
    doc: z.lazy(() => DocUpdateOneRequiredWithoutSharedWithNestedInputSchema).optional(),
    author: z.lazy(() => UserUpdateOneRequiredWithoutDocShareNestedInputSchema).optional(),
    sharedTo: z.lazy(() => UserUpdateOneRequiredWithoutSharedDocsNestedInputSchema).optional(),
  })
  .strict();

export const DocShareUncheckedUpdateInputSchema: z.ZodType<Prisma.DocShareUncheckedUpdateInput> = z
  .object({
    id: z.union([z.string().cuid(), z.lazy(() => StringFieldUpdateOperationsInputSchema)]).optional(),
    docId: z.union([z.string(), z.lazy(() => StringFieldUpdateOperationsInputSchema)]).optional(),
    authorId: z.union([z.number().int(), z.lazy(() => IntFieldUpdateOperationsInputSchema)]).optional(),
    userId: z.union([z.number().int(), z.lazy(() => IntFieldUpdateOperationsInputSchema)]).optional(),
    permission: z.union([z.string(), z.lazy(() => StringFieldUpdateOperationsInputSchema)]).optional(),
    noticeType: z.union([z.string(), z.lazy(() => StringFieldUpdateOperationsInputSchema)]).optional(),
    createdAt: z.union([z.coerce.date(), z.lazy(() => DateTimeFieldUpdateOperationsInputSchema)]).optional(),
    updatedAt: z.union([z.coerce.date(), z.lazy(() => DateTimeFieldUpdateOperationsInputSchema)]).optional(),
  })
  .strict();

export const DocShareCreateManyInputSchema: z.ZodType<Prisma.DocShareCreateManyInput> = z
  .object({
    id: z.string().cuid().optional(),
    docId: z.string(),
    authorId: z.number().int(),
    userId: z.number().int(),
    permission: z.string().optional(),
    noticeType: z.string().optional(),
    createdAt: z.coerce.date().optional(),
    updatedAt: z.coerce.date().optional(),
  })
  .strict();

export const DocShareUpdateManyMutationInputSchema: z.ZodType<Prisma.DocShareUpdateManyMutationInput> = z
  .object({
    id: z.union([z.string().cuid(), z.lazy(() => StringFieldUpdateOperationsInputSchema)]).optional(),
    permission: z.union([z.string(), z.lazy(() => StringFieldUpdateOperationsInputSchema)]).optional(),
    noticeType: z.union([z.string(), z.lazy(() => StringFieldUpdateOperationsInputSchema)]).optional(),
    createdAt: z.union([z.coerce.date(), z.lazy(() => DateTimeFieldUpdateOperationsInputSchema)]).optional(),
    updatedAt: z.union([z.coerce.date(), z.lazy(() => DateTimeFieldUpdateOperationsInputSchema)]).optional(),
  })
  .strict();

export const DocShareUncheckedUpdateManyInputSchema: z.ZodType<Prisma.DocShareUncheckedUpdateManyInput> = z
  .object({
    id: z.union([z.string().cuid(), z.lazy(() => StringFieldUpdateOperationsInputSchema)]).optional(),
    docId: z.union([z.string(), z.lazy(() => StringFieldUpdateOperationsInputSchema)]).optional(),
    authorId: z.union([z.number().int(), z.lazy(() => IntFieldUpdateOperationsInputSchema)]).optional(),
    userId: z.union([z.number().int(), z.lazy(() => IntFieldUpdateOperationsInputSchema)]).optional(),
    permission: z.union([z.string(), z.lazy(() => StringFieldUpdateOperationsInputSchema)]).optional(),
    noticeType: z.union([z.string(), z.lazy(() => StringFieldUpdateOperationsInputSchema)]).optional(),
    createdAt: z.union([z.coerce.date(), z.lazy(() => DateTimeFieldUpdateOperationsInputSchema)]).optional(),
    updatedAt: z.union([z.coerce.date(), z.lazy(() => DateTimeFieldUpdateOperationsInputSchema)]).optional(),
  })
  .strict();

export const IntFilterSchema: z.ZodType<Prisma.IntFilter> = z
  .object({
    equals: z.number().optional(),
    in: z.number().array().optional(),
    notIn: z.number().array().optional(),
    lt: z.number().optional(),
    lte: z.number().optional(),
    gt: z.number().optional(),
    gte: z.number().optional(),
    not: z.union([z.number(), z.lazy(() => NestedIntFilterSchema)]).optional(),
  })
  .strict();

export const StringFilterSchema: z.ZodType<Prisma.StringFilter> = z
  .object({
    equals: z.string().optional(),
    in: z.string().array().optional(),
    notIn: z.string().array().optional(),
    lt: z.string().optional(),
    lte: z.string().optional(),
    gt: z.string().optional(),
    gte: z.string().optional(),
    contains: z.string().optional(),
    startsWith: z.string().optional(),
    endsWith: z.string().optional(),
    mode: z.lazy(() => QueryModeSchema).optional(),
    not: z.union([z.string(), z.lazy(() => NestedStringFilterSchema)]).optional(),
  })
  .strict();

export const StringNullableFilterSchema: z.ZodType<Prisma.StringNullableFilter> = z
  .object({
    equals: z.string().optional().nullable(),
    in: z.string().array().optional().nullable(),
    notIn: z.string().array().optional().nullable(),
    lt: z.string().optional(),
    lte: z.string().optional(),
    gt: z.string().optional(),
    gte: z.string().optional(),
    contains: z.string().optional(),
    startsWith: z.string().optional(),
    endsWith: z.string().optional(),
    mode: z.lazy(() => QueryModeSchema).optional(),
    not: z
      .union([z.string(), z.lazy(() => NestedStringNullableFilterSchema)])
      .optional()
      .nullable(),
  })
  .strict();

export const DateTimeNullableFilterSchema: z.ZodType<Prisma.DateTimeNullableFilter> = z
  .object({
    equals: z.coerce.date().optional().nullable(),
    in: z.coerce.date().array().optional().nullable(),
    notIn: z.coerce.date().array().optional().nullable(),
    lt: z.coerce.date().optional(),
    lte: z.coerce.date().optional(),
    gt: z.coerce.date().optional(),
    gte: z.coerce.date().optional(),
    not: z
      .union([z.coerce.date(), z.lazy(() => NestedDateTimeNullableFilterSchema)])
      .optional()
      .nullable(),
  })
  .strict();

export const DateTimeFilterSchema: z.ZodType<Prisma.DateTimeFilter> = z
  .object({
    equals: z.coerce.date().optional(),
    in: z.coerce.date().array().optional(),
    notIn: z.coerce.date().array().optional(),
    lt: z.coerce.date().optional(),
    lte: z.coerce.date().optional(),
    gt: z.coerce.date().optional(),
    gte: z.coerce.date().optional(),
    not: z.union([z.coerce.date(), z.lazy(() => NestedDateTimeFilterSchema)]).optional(),
  })
  .strict();

export const PasswordNullableRelationFilterSchema: z.ZodType<Prisma.PasswordNullableRelationFilter> = z
  .object({
    is: z
      .lazy(() => PasswordWhereInputSchema)
      .optional()
      .nullable(),
    isNot: z
      .lazy(() => PasswordWhereInputSchema)
      .optional()
      .nullable(),
  })
  .strict();

export const ConnectionListRelationFilterSchema: z.ZodType<Prisma.ConnectionListRelationFilter> = z
  .object({
    every: z.lazy(() => ConnectionWhereInputSchema).optional(),
    some: z.lazy(() => ConnectionWhereInputSchema).optional(),
    none: z.lazy(() => ConnectionWhereInputSchema).optional(),
  })
  .strict();

export const DocListRelationFilterSchema: z.ZodType<Prisma.DocListRelationFilter> = z
  .object({
    every: z.lazy(() => DocWhereInputSchema).optional(),
    some: z.lazy(() => DocWhereInputSchema).optional(),
    none: z.lazy(() => DocWhereInputSchema).optional(),
  })
  .strict();

export const DocShareListRelationFilterSchema: z.ZodType<Prisma.DocShareListRelationFilter> = z
  .object({
    every: z.lazy(() => DocShareWhereInputSchema).optional(),
    some: z.lazy(() => DocShareWhereInputSchema).optional(),
    none: z.lazy(() => DocShareWhereInputSchema).optional(),
  })
  .strict();

export const SortOrderInputSchema: z.ZodType<Prisma.SortOrderInput> = z
  .object({
    sort: z.lazy(() => SortOrderSchema),
    nulls: z.lazy(() => NullsOrderSchema).optional(),
  })
  .strict();

export const ConnectionOrderByRelationAggregateInputSchema: z.ZodType<Prisma.ConnectionOrderByRelationAggregateInput> = z
  .object({
    _count: z.lazy(() => SortOrderSchema).optional(),
  })
  .strict();

export const DocOrderByRelationAggregateInputSchema: z.ZodType<Prisma.DocOrderByRelationAggregateInput> = z
  .object({
    _count: z.lazy(() => SortOrderSchema).optional(),
  })
  .strict();

export const DocShareOrderByRelationAggregateInputSchema: z.ZodType<Prisma.DocShareOrderByRelationAggregateInput> = z
  .object({
    _count: z.lazy(() => SortOrderSchema).optional(),
  })
  .strict();

export const UserCountOrderByAggregateInputSchema: z.ZodType<Prisma.UserCountOrderByAggregateInput> = z
  .object({
    id: z.lazy(() => SortOrderSchema).optional(),
    email: z.lazy(() => SortOrderSchema).optional(),
    displayName: z.lazy(() => SortOrderSchema).optional(),
    imageUrl: z.lazy(() => SortOrderSchema).optional(),
    emailVerified: z.lazy(() => SortOrderSchema).optional(),
    status: z.lazy(() => SortOrderSchema).optional(),
    created_time: z.lazy(() => SortOrderSchema).optional(),
    updated_time: z.lazy(() => SortOrderSchema).optional(),
    hashedRefreshToken: z.lazy(() => SortOrderSchema).optional(),
  })
  .strict();

export const UserAvgOrderByAggregateInputSchema: z.ZodType<Prisma.UserAvgOrderByAggregateInput> = z
  .object({
    id: z.lazy(() => SortOrderSchema).optional(),
  })
  .strict();

export const UserMaxOrderByAggregateInputSchema: z.ZodType<Prisma.UserMaxOrderByAggregateInput> = z
  .object({
    id: z.lazy(() => SortOrderSchema).optional(),
    email: z.lazy(() => SortOrderSchema).optional(),
    displayName: z.lazy(() => SortOrderSchema).optional(),
    imageUrl: z.lazy(() => SortOrderSchema).optional(),
    emailVerified: z.lazy(() => SortOrderSchema).optional(),
    status: z.lazy(() => SortOrderSchema).optional(),
    created_time: z.lazy(() => SortOrderSchema).optional(),
    updated_time: z.lazy(() => SortOrderSchema).optional(),
    hashedRefreshToken: z.lazy(() => SortOrderSchema).optional(),
  })
  .strict();

export const UserMinOrderByAggregateInputSchema: z.ZodType<Prisma.UserMinOrderByAggregateInput> = z
  .object({
    id: z.lazy(() => SortOrderSchema).optional(),
    email: z.lazy(() => SortOrderSchema).optional(),
    displayName: z.lazy(() => SortOrderSchema).optional(),
    imageUrl: z.lazy(() => SortOrderSchema).optional(),
    emailVerified: z.lazy(() => SortOrderSchema).optional(),
    status: z.lazy(() => SortOrderSchema).optional(),
    created_time: z.lazy(() => SortOrderSchema).optional(),
    updated_time: z.lazy(() => SortOrderSchema).optional(),
    hashedRefreshToken: z.lazy(() => SortOrderSchema).optional(),
  })
  .strict();

export const UserSumOrderByAggregateInputSchema: z.ZodType<Prisma.UserSumOrderByAggregateInput> = z
  .object({
    id: z.lazy(() => SortOrderSchema).optional(),
  })
  .strict();

export const IntWithAggregatesFilterSchema: z.ZodType<Prisma.IntWithAggregatesFilter> = z
  .object({
    equals: z.number().optional(),
    in: z.number().array().optional(),
    notIn: z.number().array().optional(),
    lt: z.number().optional(),
    lte: z.number().optional(),
    gt: z.number().optional(),
    gte: z.number().optional(),
    not: z.union([z.number(), z.lazy(() => NestedIntWithAggregatesFilterSchema)]).optional(),
    _count: z.lazy(() => NestedIntFilterSchema).optional(),
    _avg: z.lazy(() => NestedFloatFilterSchema).optional(),
    _sum: z.lazy(() => NestedIntFilterSchema).optional(),
    _min: z.lazy(() => NestedIntFilterSchema).optional(),
    _max: z.lazy(() => NestedIntFilterSchema).optional(),
  })
  .strict();

export const StringWithAggregatesFilterSchema: z.ZodType<Prisma.StringWithAggregatesFilter> = z
  .object({
    equals: z.string().optional(),
    in: z.string().array().optional(),
    notIn: z.string().array().optional(),
    lt: z.string().optional(),
    lte: z.string().optional(),
    gt: z.string().optional(),
    gte: z.string().optional(),
    contains: z.string().optional(),
    startsWith: z.string().optional(),
    endsWith: z.string().optional(),
    mode: z.lazy(() => QueryModeSchema).optional(),
    not: z.union([z.string(), z.lazy(() => NestedStringWithAggregatesFilterSchema)]).optional(),
    _count: z.lazy(() => NestedIntFilterSchema).optional(),
    _min: z.lazy(() => NestedStringFilterSchema).optional(),
    _max: z.lazy(() => NestedStringFilterSchema).optional(),
  })
  .strict();

export const StringNullableWithAggregatesFilterSchema: z.ZodType<Prisma.StringNullableWithAggregatesFilter> = z
  .object({
    equals: z.string().optional().nullable(),
    in: z.string().array().optional().nullable(),
    notIn: z.string().array().optional().nullable(),
    lt: z.string().optional(),
    lte: z.string().optional(),
    gt: z.string().optional(),
    gte: z.string().optional(),
    contains: z.string().optional(),
    startsWith: z.string().optional(),
    endsWith: z.string().optional(),
    mode: z.lazy(() => QueryModeSchema).optional(),
    not: z
      .union([z.string(), z.lazy(() => NestedStringNullableWithAggregatesFilterSchema)])
      .optional()
      .nullable(),
    _count: z.lazy(() => NestedIntNullableFilterSchema).optional(),
    _min: z.lazy(() => NestedStringNullableFilterSchema).optional(),
    _max: z.lazy(() => NestedStringNullableFilterSchema).optional(),
  })
  .strict();

export const DateTimeNullableWithAggregatesFilterSchema: z.ZodType<Prisma.DateTimeNullableWithAggregatesFilter> = z
  .object({
    equals: z.coerce.date().optional().nullable(),
    in: z.coerce.date().array().optional().nullable(),
    notIn: z.coerce.date().array().optional().nullable(),
    lt: z.coerce.date().optional(),
    lte: z.coerce.date().optional(),
    gt: z.coerce.date().optional(),
    gte: z.coerce.date().optional(),
    not: z
      .union([z.coerce.date(), z.lazy(() => NestedDateTimeNullableWithAggregatesFilterSchema)])
      .optional()
      .nullable(),
    _count: z.lazy(() => NestedIntNullableFilterSchema).optional(),
    _min: z.lazy(() => NestedDateTimeNullableFilterSchema).optional(),
    _max: z.lazy(() => NestedDateTimeNullableFilterSchema).optional(),
  })
  .strict();

export const DateTimeWithAggregatesFilterSchema: z.ZodType<Prisma.DateTimeWithAggregatesFilter> = z
  .object({
    equals: z.coerce.date().optional(),
    in: z.coerce.date().array().optional(),
    notIn: z.coerce.date().array().optional(),
    lt: z.coerce.date().optional(),
    lte: z.coerce.date().optional(),
    gt: z.coerce.date().optional(),
    gte: z.coerce.date().optional(),
    not: z.union([z.coerce.date(), z.lazy(() => NestedDateTimeWithAggregatesFilterSchema)]).optional(),
    _count: z.lazy(() => NestedIntFilterSchema).optional(),
    _min: z.lazy(() => NestedDateTimeFilterSchema).optional(),
    _max: z.lazy(() => NestedDateTimeFilterSchema).optional(),
  })
  .strict();

export const UserRelationFilterSchema: z.ZodType<Prisma.UserRelationFilter> = z
  .object({
    is: z.lazy(() => UserWhereInputSchema).optional(),
    isNot: z.lazy(() => UserWhereInputSchema).optional(),
  })
  .strict();

export const PasswordCountOrderByAggregateInputSchema: z.ZodType<Prisma.PasswordCountOrderByAggregateInput> = z
  .object({
    hash: z.lazy(() => SortOrderSchema).optional(),
    userId: z.lazy(() => SortOrderSchema).optional(),
  })
  .strict();

export const PasswordAvgOrderByAggregateInputSchema: z.ZodType<Prisma.PasswordAvgOrderByAggregateInput> = z
  .object({
    userId: z.lazy(() => SortOrderSchema).optional(),
  })
  .strict();

export const PasswordMaxOrderByAggregateInputSchema: z.ZodType<Prisma.PasswordMaxOrderByAggregateInput> = z
  .object({
    hash: z.lazy(() => SortOrderSchema).optional(),
    userId: z.lazy(() => SortOrderSchema).optional(),
  })
  .strict();

export const PasswordMinOrderByAggregateInputSchema: z.ZodType<Prisma.PasswordMinOrderByAggregateInput> = z
  .object({
    hash: z.lazy(() => SortOrderSchema).optional(),
    userId: z.lazy(() => SortOrderSchema).optional(),
  })
  .strict();

export const PasswordSumOrderByAggregateInputSchema: z.ZodType<Prisma.PasswordSumOrderByAggregateInput> = z
  .object({
    userId: z.lazy(() => SortOrderSchema).optional(),
  })
  .strict();

export const ConnectionProviderNameProviderIdCompoundUniqueInputSchema: z.ZodType<Prisma.ConnectionProviderNameProviderIdCompoundUniqueInput> = z
  .object({
    providerName: z.string(),
    providerId: z.string(),
  })
  .strict();

export const ConnectionCountOrderByAggregateInputSchema: z.ZodType<Prisma.ConnectionCountOrderByAggregateInput> = z
  .object({
    id: z.lazy(() => SortOrderSchema).optional(),
    providerName: z.lazy(() => SortOrderSchema).optional(),
    providerId: z.lazy(() => SortOrderSchema).optional(),
    createdAt: z.lazy(() => SortOrderSchema).optional(),
    updatedAt: z.lazy(() => SortOrderSchema).optional(),
    userId: z.lazy(() => SortOrderSchema).optional(),
  })
  .strict();

export const ConnectionAvgOrderByAggregateInputSchema: z.ZodType<Prisma.ConnectionAvgOrderByAggregateInput> = z
  .object({
    userId: z.lazy(() => SortOrderSchema).optional(),
  })
  .strict();

export const ConnectionMaxOrderByAggregateInputSchema: z.ZodType<Prisma.ConnectionMaxOrderByAggregateInput> = z
  .object({
    id: z.lazy(() => SortOrderSchema).optional(),
    providerName: z.lazy(() => SortOrderSchema).optional(),
    providerId: z.lazy(() => SortOrderSchema).optional(),
    createdAt: z.lazy(() => SortOrderSchema).optional(),
    updatedAt: z.lazy(() => SortOrderSchema).optional(),
    userId: z.lazy(() => SortOrderSchema).optional(),
  })
  .strict();

export const ConnectionMinOrderByAggregateInputSchema: z.ZodType<Prisma.ConnectionMinOrderByAggregateInput> = z
  .object({
    id: z.lazy(() => SortOrderSchema).optional(),
    providerName: z.lazy(() => SortOrderSchema).optional(),
    providerId: z.lazy(() => SortOrderSchema).optional(),
    createdAt: z.lazy(() => SortOrderSchema).optional(),
    updatedAt: z.lazy(() => SortOrderSchema).optional(),
    userId: z.lazy(() => SortOrderSchema).optional(),
  })
  .strict();

export const ConnectionSumOrderByAggregateInputSchema: z.ZodType<Prisma.ConnectionSumOrderByAggregateInput> = z
  .object({
    userId: z.lazy(() => SortOrderSchema).optional(),
  })
  .strict();

export const BytesNullableFilterSchema: z.ZodType<Prisma.BytesNullableFilter> = z
  .object({
    equals: z.instanceof(Buffer).optional().nullable(),
    in: z.instanceof(Buffer).array().optional().nullable(),
    notIn: z.instanceof(Buffer).array().optional().nullable(),
    not: z
      .union([z.instanceof(Buffer), z.lazy(() => NestedBytesNullableFilterSchema)])
      .optional()
      .nullable(),
  })
  .strict();

export const BoolFilterSchema: z.ZodType<Prisma.BoolFilter> = z
  .object({
    equals: z.boolean().optional(),
    not: z.union([z.boolean(), z.lazy(() => NestedBoolFilterSchema)]).optional(),
  })
  .strict();

export const DocNullableRelationFilterSchema: z.ZodType<Prisma.DocNullableRelationFilter> = z
  .object({
    is: z
      .lazy(() => DocWhereInputSchema)
      .optional()
      .nullable(),
    isNot: z
      .lazy(() => DocWhereInputSchema)
      .optional()
      .nullable(),
  })
  .strict();

export const CoverImageNullableRelationFilterSchema: z.ZodType<Prisma.CoverImageNullableRelationFilter> = z
  .object({
    is: z
      .lazy(() => CoverImageWhereInputSchema)
      .optional()
      .nullable(),
    isNot: z
      .lazy(() => CoverImageWhereInputSchema)
      .optional()
      .nullable(),
  })
  .strict();

export const DocCountOrderByAggregateInputSchema: z.ZodType<Prisma.DocCountOrderByAggregateInput> = z
  .object({
    id: z.lazy(() => SortOrderSchema).optional(),
    title: z.lazy(() => SortOrderSchema).optional(),
    content: z.lazy(() => SortOrderSchema).optional(),
    contentBinary: z.lazy(() => SortOrderSchema).optional(),
    isArchived: z.lazy(() => SortOrderSchema).optional(),
    isStarred: z.lazy(() => SortOrderSchema).optional(),
    createdAt: z.lazy(() => SortOrderSchema).optional(),
    updatedAt: z.lazy(() => SortOrderSchema).optional(),
    ownerId: z.lazy(() => SortOrderSchema).optional(),
    parentId: z.lazy(() => SortOrderSchema).optional(),
    coverImageId: z.lazy(() => SortOrderSchema).optional(),
    position: z.lazy(() => SortOrderSchema).optional(),
  })
  .strict();

export const DocAvgOrderByAggregateInputSchema: z.ZodType<Prisma.DocAvgOrderByAggregateInput> = z
  .object({
    ownerId: z.lazy(() => SortOrderSchema).optional(),
    position: z.lazy(() => SortOrderSchema).optional(),
  })
  .strict();

export const DocMaxOrderByAggregateInputSchema: z.ZodType<Prisma.DocMaxOrderByAggregateInput> = z
  .object({
    id: z.lazy(() => SortOrderSchema).optional(),
    title: z.lazy(() => SortOrderSchema).optional(),
    content: z.lazy(() => SortOrderSchema).optional(),
    contentBinary: z.lazy(() => SortOrderSchema).optional(),
    isArchived: z.lazy(() => SortOrderSchema).optional(),
    isStarred: z.lazy(() => SortOrderSchema).optional(),
    createdAt: z.lazy(() => SortOrderSchema).optional(),
    updatedAt: z.lazy(() => SortOrderSchema).optional(),
    ownerId: z.lazy(() => SortOrderSchema).optional(),
    parentId: z.lazy(() => SortOrderSchema).optional(),
    coverImageId: z.lazy(() => SortOrderSchema).optional(),
    position: z.lazy(() => SortOrderSchema).optional(),
  })
  .strict();

export const DocMinOrderByAggregateInputSchema: z.ZodType<Prisma.DocMinOrderByAggregateInput> = z
  .object({
    id: z.lazy(() => SortOrderSchema).optional(),
    title: z.lazy(() => SortOrderSchema).optional(),
    content: z.lazy(() => SortOrderSchema).optional(),
    contentBinary: z.lazy(() => SortOrderSchema).optional(),
    isArchived: z.lazy(() => SortOrderSchema).optional(),
    isStarred: z.lazy(() => SortOrderSchema).optional(),
    createdAt: z.lazy(() => SortOrderSchema).optional(),
    updatedAt: z.lazy(() => SortOrderSchema).optional(),
    ownerId: z.lazy(() => SortOrderSchema).optional(),
    parentId: z.lazy(() => SortOrderSchema).optional(),
    coverImageId: z.lazy(() => SortOrderSchema).optional(),
    position: z.lazy(() => SortOrderSchema).optional(),
  })
  .strict();

export const DocSumOrderByAggregateInputSchema: z.ZodType<Prisma.DocSumOrderByAggregateInput> = z
  .object({
    ownerId: z.lazy(() => SortOrderSchema).optional(),
    position: z.lazy(() => SortOrderSchema).optional(),
  })
  .strict();

export const BytesNullableWithAggregatesFilterSchema: z.ZodType<Prisma.BytesNullableWithAggregatesFilter> = z
  .object({
    equals: z.instanceof(Buffer).optional().nullable(),
    in: z.instanceof(Buffer).array().optional().nullable(),
    notIn: z.instanceof(Buffer).array().optional().nullable(),
    not: z
      .union([z.instanceof(Buffer), z.lazy(() => NestedBytesNullableWithAggregatesFilterSchema)])
      .optional()
      .nullable(),
    _count: z.lazy(() => NestedIntNullableFilterSchema).optional(),
    _min: z.lazy(() => NestedBytesNullableFilterSchema).optional(),
    _max: z.lazy(() => NestedBytesNullableFilterSchema).optional(),
  })
  .strict();

export const BoolWithAggregatesFilterSchema: z.ZodType<Prisma.BoolWithAggregatesFilter> = z
  .object({
    equals: z.boolean().optional(),
    not: z.union([z.boolean(), z.lazy(() => NestedBoolWithAggregatesFilterSchema)]).optional(),
    _count: z.lazy(() => NestedIntFilterSchema).optional(),
    _min: z.lazy(() => NestedBoolFilterSchema).optional(),
    _max: z.lazy(() => NestedBoolFilterSchema).optional(),
  })
  .strict();

export const FloatFilterSchema: z.ZodType<Prisma.FloatFilter> = z
  .object({
    equals: z.number().optional(),
    in: z.number().array().optional(),
    notIn: z.number().array().optional(),
    lt: z.number().optional(),
    lte: z.number().optional(),
    gt: z.number().optional(),
    gte: z.number().optional(),
    not: z.union([z.number(), z.lazy(() => NestedFloatFilterSchema)]).optional(),
  })
  .strict();

export const DocRelationFilterSchema: z.ZodType<Prisma.DocRelationFilter> = z
  .object({
    is: z.lazy(() => DocWhereInputSchema).optional(),
    isNot: z.lazy(() => DocWhereInputSchema).optional(),
  })
  .strict();

export const CoverImageCountOrderByAggregateInputSchema: z.ZodType<Prisma.CoverImageCountOrderByAggregateInput> = z
  .object({
    id: z.lazy(() => SortOrderSchema).optional(),
    url: z.lazy(() => SortOrderSchema).optional(),
    scrollY: z.lazy(() => SortOrderSchema).optional(),
    docId: z.lazy(() => SortOrderSchema).optional(),
  })
  .strict();

export const CoverImageAvgOrderByAggregateInputSchema: z.ZodType<Prisma.CoverImageAvgOrderByAggregateInput> = z
  .object({
    scrollY: z.lazy(() => SortOrderSchema).optional(),
  })
  .strict();

export const CoverImageMaxOrderByAggregateInputSchema: z.ZodType<Prisma.CoverImageMaxOrderByAggregateInput> = z
  .object({
    id: z.lazy(() => SortOrderSchema).optional(),
    url: z.lazy(() => SortOrderSchema).optional(),
    scrollY: z.lazy(() => SortOrderSchema).optional(),
    docId: z.lazy(() => SortOrderSchema).optional(),
  })
  .strict();

export const CoverImageMinOrderByAggregateInputSchema: z.ZodType<Prisma.CoverImageMinOrderByAggregateInput> = z
  .object({
    id: z.lazy(() => SortOrderSchema).optional(),
    url: z.lazy(() => SortOrderSchema).optional(),
    scrollY: z.lazy(() => SortOrderSchema).optional(),
    docId: z.lazy(() => SortOrderSchema).optional(),
  })
  .strict();

export const CoverImageSumOrderByAggregateInputSchema: z.ZodType<Prisma.CoverImageSumOrderByAggregateInput> = z
  .object({
    scrollY: z.lazy(() => SortOrderSchema).optional(),
  })
  .strict();

export const FloatWithAggregatesFilterSchema: z.ZodType<Prisma.FloatWithAggregatesFilter> = z
  .object({
    equals: z.number().optional(),
    in: z.number().array().optional(),
    notIn: z.number().array().optional(),
    lt: z.number().optional(),
    lte: z.number().optional(),
    gt: z.number().optional(),
    gte: z.number().optional(),
    not: z.union([z.number(), z.lazy(() => NestedFloatWithAggregatesFilterSchema)]).optional(),
    _count: z.lazy(() => NestedIntFilterSchema).optional(),
    _avg: z.lazy(() => NestedFloatFilterSchema).optional(),
    _sum: z.lazy(() => NestedFloatFilterSchema).optional(),
    _min: z.lazy(() => NestedFloatFilterSchema).optional(),
    _max: z.lazy(() => NestedFloatFilterSchema).optional(),
  })
  .strict();

export const DocShareDocIdUserIdCompoundUniqueInputSchema: z.ZodType<Prisma.DocShareDocIdUserIdCompoundUniqueInput> = z
  .object({
    docId: z.string(),
    userId: z.number(),
  })
  .strict();

export const DocShareCountOrderByAggregateInputSchema: z.ZodType<Prisma.DocShareCountOrderByAggregateInput> = z
  .object({
    id: z.lazy(() => SortOrderSchema).optional(),
    docId: z.lazy(() => SortOrderSchema).optional(),
    authorId: z.lazy(() => SortOrderSchema).optional(),
    userId: z.lazy(() => SortOrderSchema).optional(),
    permission: z.lazy(() => SortOrderSchema).optional(),
    noticeType: z.lazy(() => SortOrderSchema).optional(),
    createdAt: z.lazy(() => SortOrderSchema).optional(),
    updatedAt: z.lazy(() => SortOrderSchema).optional(),
  })
  .strict();

export const DocShareAvgOrderByAggregateInputSchema: z.ZodType<Prisma.DocShareAvgOrderByAggregateInput> = z
  .object({
    authorId: z.lazy(() => SortOrderSchema).optional(),
    userId: z.lazy(() => SortOrderSchema).optional(),
  })
  .strict();

export const DocShareMaxOrderByAggregateInputSchema: z.ZodType<Prisma.DocShareMaxOrderByAggregateInput> = z
  .object({
    id: z.lazy(() => SortOrderSchema).optional(),
    docId: z.lazy(() => SortOrderSchema).optional(),
    authorId: z.lazy(() => SortOrderSchema).optional(),
    userId: z.lazy(() => SortOrderSchema).optional(),
    permission: z.lazy(() => SortOrderSchema).optional(),
    noticeType: z.lazy(() => SortOrderSchema).optional(),
    createdAt: z.lazy(() => SortOrderSchema).optional(),
    updatedAt: z.lazy(() => SortOrderSchema).optional(),
  })
  .strict();

export const DocShareMinOrderByAggregateInputSchema: z.ZodType<Prisma.DocShareMinOrderByAggregateInput> = z
  .object({
    id: z.lazy(() => SortOrderSchema).optional(),
    docId: z.lazy(() => SortOrderSchema).optional(),
    authorId: z.lazy(() => SortOrderSchema).optional(),
    userId: z.lazy(() => SortOrderSchema).optional(),
    permission: z.lazy(() => SortOrderSchema).optional(),
    noticeType: z.lazy(() => SortOrderSchema).optional(),
    createdAt: z.lazy(() => SortOrderSchema).optional(),
    updatedAt: z.lazy(() => SortOrderSchema).optional(),
  })
  .strict();

export const DocShareSumOrderByAggregateInputSchema: z.ZodType<Prisma.DocShareSumOrderByAggregateInput> = z
  .object({
    authorId: z.lazy(() => SortOrderSchema).optional(),
    userId: z.lazy(() => SortOrderSchema).optional(),
  })
  .strict();

export const PasswordCreateNestedOneWithoutUserInputSchema: z.ZodType<Prisma.PasswordCreateNestedOneWithoutUserInput> = z
  .object({
    create: z.union([z.lazy(() => PasswordCreateWithoutUserInputSchema), z.lazy(() => PasswordUncheckedCreateWithoutUserInputSchema)]).optional(),
    connectOrCreate: z.lazy(() => PasswordCreateOrConnectWithoutUserInputSchema).optional(),
    connect: z.lazy(() => PasswordWhereUniqueInputSchema).optional(),
  })
  .strict();

export const ConnectionCreateNestedManyWithoutUserInputSchema: z.ZodType<Prisma.ConnectionCreateNestedManyWithoutUserInput> = z
  .object({
    create: z
      .union([
        z.lazy(() => ConnectionCreateWithoutUserInputSchema),
        z.lazy(() => ConnectionCreateWithoutUserInputSchema).array(),
        z.lazy(() => ConnectionUncheckedCreateWithoutUserInputSchema),
        z.lazy(() => ConnectionUncheckedCreateWithoutUserInputSchema).array(),
      ])
      .optional(),
    connectOrCreate: z
      .union([z.lazy(() => ConnectionCreateOrConnectWithoutUserInputSchema), z.lazy(() => ConnectionCreateOrConnectWithoutUserInputSchema).array()])
      .optional(),
    createMany: z.lazy(() => ConnectionCreateManyUserInputEnvelopeSchema).optional(),
    connect: z.union([z.lazy(() => ConnectionWhereUniqueInputSchema), z.lazy(() => ConnectionWhereUniqueInputSchema).array()]).optional(),
  })
  .strict();

export const DocCreateNestedManyWithoutOwnerInputSchema: z.ZodType<Prisma.DocCreateNestedManyWithoutOwnerInput> = z
  .object({
    create: z
      .union([
        z.lazy(() => DocCreateWithoutOwnerInputSchema),
        z.lazy(() => DocCreateWithoutOwnerInputSchema).array(),
        z.lazy(() => DocUncheckedCreateWithoutOwnerInputSchema),
        z.lazy(() => DocUncheckedCreateWithoutOwnerInputSchema).array(),
      ])
      .optional(),
    connectOrCreate: z
      .union([z.lazy(() => DocCreateOrConnectWithoutOwnerInputSchema), z.lazy(() => DocCreateOrConnectWithoutOwnerInputSchema).array()])
      .optional(),
    createMany: z.lazy(() => DocCreateManyOwnerInputEnvelopeSchema).optional(),
    connect: z.union([z.lazy(() => DocWhereUniqueInputSchema), z.lazy(() => DocWhereUniqueInputSchema).array()]).optional(),
  })
  .strict();

export const DocShareCreateNestedManyWithoutSharedToInputSchema: z.ZodType<Prisma.DocShareCreateNestedManyWithoutSharedToInput> = z
  .object({
    create: z
      .union([
        z.lazy(() => DocShareCreateWithoutSharedToInputSchema),
        z.lazy(() => DocShareCreateWithoutSharedToInputSchema).array(),
        z.lazy(() => DocShareUncheckedCreateWithoutSharedToInputSchema),
        z.lazy(() => DocShareUncheckedCreateWithoutSharedToInputSchema).array(),
      ])
      .optional(),
    connectOrCreate: z
      .union([z.lazy(() => DocShareCreateOrConnectWithoutSharedToInputSchema), z.lazy(() => DocShareCreateOrConnectWithoutSharedToInputSchema).array()])
      .optional(),
    createMany: z.lazy(() => DocShareCreateManySharedToInputEnvelopeSchema).optional(),
    connect: z.union([z.lazy(() => DocShareWhereUniqueInputSchema), z.lazy(() => DocShareWhereUniqueInputSchema).array()]).optional(),
  })
  .strict();

export const DocShareCreateNestedManyWithoutAuthorInputSchema: z.ZodType<Prisma.DocShareCreateNestedManyWithoutAuthorInput> = z
  .object({
    create: z
      .union([
        z.lazy(() => DocShareCreateWithoutAuthorInputSchema),
        z.lazy(() => DocShareCreateWithoutAuthorInputSchema).array(),
        z.lazy(() => DocShareUncheckedCreateWithoutAuthorInputSchema),
        z.lazy(() => DocShareUncheckedCreateWithoutAuthorInputSchema).array(),
      ])
      .optional(),
    connectOrCreate: z
      .union([z.lazy(() => DocShareCreateOrConnectWithoutAuthorInputSchema), z.lazy(() => DocShareCreateOrConnectWithoutAuthorInputSchema).array()])
      .optional(),
    createMany: z.lazy(() => DocShareCreateManyAuthorInputEnvelopeSchema).optional(),
    connect: z.union([z.lazy(() => DocShareWhereUniqueInputSchema), z.lazy(() => DocShareWhereUniqueInputSchema).array()]).optional(),
  })
  .strict();

export const PasswordUncheckedCreateNestedOneWithoutUserInputSchema: z.ZodType<Prisma.PasswordUncheckedCreateNestedOneWithoutUserInput> = z
  .object({
    create: z.union([z.lazy(() => PasswordCreateWithoutUserInputSchema), z.lazy(() => PasswordUncheckedCreateWithoutUserInputSchema)]).optional(),
    connectOrCreate: z.lazy(() => PasswordCreateOrConnectWithoutUserInputSchema).optional(),
    connect: z.lazy(() => PasswordWhereUniqueInputSchema).optional(),
  })
  .strict();

export const ConnectionUncheckedCreateNestedManyWithoutUserInputSchema: z.ZodType<Prisma.ConnectionUncheckedCreateNestedManyWithoutUserInput> = z
  .object({
    create: z
      .union([
        z.lazy(() => ConnectionCreateWithoutUserInputSchema),
        z.lazy(() => ConnectionCreateWithoutUserInputSchema).array(),
        z.lazy(() => ConnectionUncheckedCreateWithoutUserInputSchema),
        z.lazy(() => ConnectionUncheckedCreateWithoutUserInputSchema).array(),
      ])
      .optional(),
    connectOrCreate: z
      .union([z.lazy(() => ConnectionCreateOrConnectWithoutUserInputSchema), z.lazy(() => ConnectionCreateOrConnectWithoutUserInputSchema).array()])
      .optional(),
    createMany: z.lazy(() => ConnectionCreateManyUserInputEnvelopeSchema).optional(),
    connect: z.union([z.lazy(() => ConnectionWhereUniqueInputSchema), z.lazy(() => ConnectionWhereUniqueInputSchema).array()]).optional(),
  })
  .strict();

export const DocUncheckedCreateNestedManyWithoutOwnerInputSchema: z.ZodType<Prisma.DocUncheckedCreateNestedManyWithoutOwnerInput> = z
  .object({
    create: z
      .union([
        z.lazy(() => DocCreateWithoutOwnerInputSchema),
        z.lazy(() => DocCreateWithoutOwnerInputSchema).array(),
        z.lazy(() => DocUncheckedCreateWithoutOwnerInputSchema),
        z.lazy(() => DocUncheckedCreateWithoutOwnerInputSchema).array(),
      ])
      .optional(),
    connectOrCreate: z
      .union([z.lazy(() => DocCreateOrConnectWithoutOwnerInputSchema), z.lazy(() => DocCreateOrConnectWithoutOwnerInputSchema).array()])
      .optional(),
    createMany: z.lazy(() => DocCreateManyOwnerInputEnvelopeSchema).optional(),
    connect: z.union([z.lazy(() => DocWhereUniqueInputSchema), z.lazy(() => DocWhereUniqueInputSchema).array()]).optional(),
  })
  .strict();

export const DocShareUncheckedCreateNestedManyWithoutSharedToInputSchema: z.ZodType<Prisma.DocShareUncheckedCreateNestedManyWithoutSharedToInput> = z
  .object({
    create: z
      .union([
        z.lazy(() => DocShareCreateWithoutSharedToInputSchema),
        z.lazy(() => DocShareCreateWithoutSharedToInputSchema).array(),
        z.lazy(() => DocShareUncheckedCreateWithoutSharedToInputSchema),
        z.lazy(() => DocShareUncheckedCreateWithoutSharedToInputSchema).array(),
      ])
      .optional(),
    connectOrCreate: z
      .union([z.lazy(() => DocShareCreateOrConnectWithoutSharedToInputSchema), z.lazy(() => DocShareCreateOrConnectWithoutSharedToInputSchema).array()])
      .optional(),
    createMany: z.lazy(() => DocShareCreateManySharedToInputEnvelopeSchema).optional(),
    connect: z.union([z.lazy(() => DocShareWhereUniqueInputSchema), z.lazy(() => DocShareWhereUniqueInputSchema).array()]).optional(),
  })
  .strict();

export const DocShareUncheckedCreateNestedManyWithoutAuthorInputSchema: z.ZodType<Prisma.DocShareUncheckedCreateNestedManyWithoutAuthorInput> = z
  .object({
    create: z
      .union([
        z.lazy(() => DocShareCreateWithoutAuthorInputSchema),
        z.lazy(() => DocShareCreateWithoutAuthorInputSchema).array(),
        z.lazy(() => DocShareUncheckedCreateWithoutAuthorInputSchema),
        z.lazy(() => DocShareUncheckedCreateWithoutAuthorInputSchema).array(),
      ])
      .optional(),
    connectOrCreate: z
      .union([z.lazy(() => DocShareCreateOrConnectWithoutAuthorInputSchema), z.lazy(() => DocShareCreateOrConnectWithoutAuthorInputSchema).array()])
      .optional(),
    createMany: z.lazy(() => DocShareCreateManyAuthorInputEnvelopeSchema).optional(),
    connect: z.union([z.lazy(() => DocShareWhereUniqueInputSchema), z.lazy(() => DocShareWhereUniqueInputSchema).array()]).optional(),
  })
  .strict();

export const StringFieldUpdateOperationsInputSchema: z.ZodType<Prisma.StringFieldUpdateOperationsInput> = z
  .object({
    set: z.string().optional(),
  })
  .strict();

export const NullableStringFieldUpdateOperationsInputSchema: z.ZodType<Prisma.NullableStringFieldUpdateOperationsInput> = z
  .object({
    set: z.string().optional().nullable(),
  })
  .strict();

export const NullableDateTimeFieldUpdateOperationsInputSchema: z.ZodType<Prisma.NullableDateTimeFieldUpdateOperationsInput> = z
  .object({
    set: z.coerce.date().optional().nullable(),
  })
  .strict();

export const DateTimeFieldUpdateOperationsInputSchema: z.ZodType<Prisma.DateTimeFieldUpdateOperationsInput> = z
  .object({
    set: z.coerce.date().optional(),
  })
  .strict();

export const PasswordUpdateOneWithoutUserNestedInputSchema: z.ZodType<Prisma.PasswordUpdateOneWithoutUserNestedInput> = z
  .object({
    create: z.union([z.lazy(() => PasswordCreateWithoutUserInputSchema), z.lazy(() => PasswordUncheckedCreateWithoutUserInputSchema)]).optional(),
    connectOrCreate: z.lazy(() => PasswordCreateOrConnectWithoutUserInputSchema).optional(),
    upsert: z.lazy(() => PasswordUpsertWithoutUserInputSchema).optional(),
    disconnect: z.union([z.boolean(), z.lazy(() => PasswordWhereInputSchema)]).optional(),
    delete: z.union([z.boolean(), z.lazy(() => PasswordWhereInputSchema)]).optional(),
    connect: z.lazy(() => PasswordWhereUniqueInputSchema).optional(),
    update: z
      .union([
        z.lazy(() => PasswordUpdateToOneWithWhereWithoutUserInputSchema),
        z.lazy(() => PasswordUpdateWithoutUserInputSchema),
        z.lazy(() => PasswordUncheckedUpdateWithoutUserInputSchema),
      ])
      .optional(),
  })
  .strict();

export const ConnectionUpdateManyWithoutUserNestedInputSchema: z.ZodType<Prisma.ConnectionUpdateManyWithoutUserNestedInput> = z
  .object({
    create: z
      .union([
        z.lazy(() => ConnectionCreateWithoutUserInputSchema),
        z.lazy(() => ConnectionCreateWithoutUserInputSchema).array(),
        z.lazy(() => ConnectionUncheckedCreateWithoutUserInputSchema),
        z.lazy(() => ConnectionUncheckedCreateWithoutUserInputSchema).array(),
      ])
      .optional(),
    connectOrCreate: z
      .union([z.lazy(() => ConnectionCreateOrConnectWithoutUserInputSchema), z.lazy(() => ConnectionCreateOrConnectWithoutUserInputSchema).array()])
      .optional(),
    upsert: z
      .union([z.lazy(() => ConnectionUpsertWithWhereUniqueWithoutUserInputSchema), z.lazy(() => ConnectionUpsertWithWhereUniqueWithoutUserInputSchema).array()])
      .optional(),
    createMany: z.lazy(() => ConnectionCreateManyUserInputEnvelopeSchema).optional(),
    set: z.union([z.lazy(() => ConnectionWhereUniqueInputSchema), z.lazy(() => ConnectionWhereUniqueInputSchema).array()]).optional(),
    disconnect: z.union([z.lazy(() => ConnectionWhereUniqueInputSchema), z.lazy(() => ConnectionWhereUniqueInputSchema).array()]).optional(),
    delete: z.union([z.lazy(() => ConnectionWhereUniqueInputSchema), z.lazy(() => ConnectionWhereUniqueInputSchema).array()]).optional(),
    connect: z.union([z.lazy(() => ConnectionWhereUniqueInputSchema), z.lazy(() => ConnectionWhereUniqueInputSchema).array()]).optional(),
    update: z
      .union([z.lazy(() => ConnectionUpdateWithWhereUniqueWithoutUserInputSchema), z.lazy(() => ConnectionUpdateWithWhereUniqueWithoutUserInputSchema).array()])
      .optional(),
    updateMany: z
      .union([z.lazy(() => ConnectionUpdateManyWithWhereWithoutUserInputSchema), z.lazy(() => ConnectionUpdateManyWithWhereWithoutUserInputSchema).array()])
      .optional(),
    deleteMany: z.union([z.lazy(() => ConnectionScalarWhereInputSchema), z.lazy(() => ConnectionScalarWhereInputSchema).array()]).optional(),
  })
  .strict();

export const DocUpdateManyWithoutOwnerNestedInputSchema: z.ZodType<Prisma.DocUpdateManyWithoutOwnerNestedInput> = z
  .object({
    create: z
      .union([
        z.lazy(() => DocCreateWithoutOwnerInputSchema),
        z.lazy(() => DocCreateWithoutOwnerInputSchema).array(),
        z.lazy(() => DocUncheckedCreateWithoutOwnerInputSchema),
        z.lazy(() => DocUncheckedCreateWithoutOwnerInputSchema).array(),
      ])
      .optional(),
    connectOrCreate: z
      .union([z.lazy(() => DocCreateOrConnectWithoutOwnerInputSchema), z.lazy(() => DocCreateOrConnectWithoutOwnerInputSchema).array()])
      .optional(),
    upsert: z
      .union([z.lazy(() => DocUpsertWithWhereUniqueWithoutOwnerInputSchema), z.lazy(() => DocUpsertWithWhereUniqueWithoutOwnerInputSchema).array()])
      .optional(),
    createMany: z.lazy(() => DocCreateManyOwnerInputEnvelopeSchema).optional(),
    set: z.union([z.lazy(() => DocWhereUniqueInputSchema), z.lazy(() => DocWhereUniqueInputSchema).array()]).optional(),
    disconnect: z.union([z.lazy(() => DocWhereUniqueInputSchema), z.lazy(() => DocWhereUniqueInputSchema).array()]).optional(),
    delete: z.union([z.lazy(() => DocWhereUniqueInputSchema), z.lazy(() => DocWhereUniqueInputSchema).array()]).optional(),
    connect: z.union([z.lazy(() => DocWhereUniqueInputSchema), z.lazy(() => DocWhereUniqueInputSchema).array()]).optional(),
    update: z
      .union([z.lazy(() => DocUpdateWithWhereUniqueWithoutOwnerInputSchema), z.lazy(() => DocUpdateWithWhereUniqueWithoutOwnerInputSchema).array()])
      .optional(),
    updateMany: z
      .union([z.lazy(() => DocUpdateManyWithWhereWithoutOwnerInputSchema), z.lazy(() => DocUpdateManyWithWhereWithoutOwnerInputSchema).array()])
      .optional(),
    deleteMany: z.union([z.lazy(() => DocScalarWhereInputSchema), z.lazy(() => DocScalarWhereInputSchema).array()]).optional(),
  })
  .strict();

export const DocShareUpdateManyWithoutSharedToNestedInputSchema: z.ZodType<Prisma.DocShareUpdateManyWithoutSharedToNestedInput> = z
  .object({
    create: z
      .union([
        z.lazy(() => DocShareCreateWithoutSharedToInputSchema),
        z.lazy(() => DocShareCreateWithoutSharedToInputSchema).array(),
        z.lazy(() => DocShareUncheckedCreateWithoutSharedToInputSchema),
        z.lazy(() => DocShareUncheckedCreateWithoutSharedToInputSchema).array(),
      ])
      .optional(),
    connectOrCreate: z
      .union([z.lazy(() => DocShareCreateOrConnectWithoutSharedToInputSchema), z.lazy(() => DocShareCreateOrConnectWithoutSharedToInputSchema).array()])
      .optional(),
    upsert: z
      .union([
        z.lazy(() => DocShareUpsertWithWhereUniqueWithoutSharedToInputSchema),
        z.lazy(() => DocShareUpsertWithWhereUniqueWithoutSharedToInputSchema).array(),
      ])
      .optional(),
    createMany: z.lazy(() => DocShareCreateManySharedToInputEnvelopeSchema).optional(),
    set: z.union([z.lazy(() => DocShareWhereUniqueInputSchema), z.lazy(() => DocShareWhereUniqueInputSchema).array()]).optional(),
    disconnect: z.union([z.lazy(() => DocShareWhereUniqueInputSchema), z.lazy(() => DocShareWhereUniqueInputSchema).array()]).optional(),
    delete: z.union([z.lazy(() => DocShareWhereUniqueInputSchema), z.lazy(() => DocShareWhereUniqueInputSchema).array()]).optional(),
    connect: z.union([z.lazy(() => DocShareWhereUniqueInputSchema), z.lazy(() => DocShareWhereUniqueInputSchema).array()]).optional(),
    update: z
      .union([
        z.lazy(() => DocShareUpdateWithWhereUniqueWithoutSharedToInputSchema),
        z.lazy(() => DocShareUpdateWithWhereUniqueWithoutSharedToInputSchema).array(),
      ])
      .optional(),
    updateMany: z
      .union([z.lazy(() => DocShareUpdateManyWithWhereWithoutSharedToInputSchema), z.lazy(() => DocShareUpdateManyWithWhereWithoutSharedToInputSchema).array()])
      .optional(),
    deleteMany: z.union([z.lazy(() => DocShareScalarWhereInputSchema), z.lazy(() => DocShareScalarWhereInputSchema).array()]).optional(),
  })
  .strict();

export const DocShareUpdateManyWithoutAuthorNestedInputSchema: z.ZodType<Prisma.DocShareUpdateManyWithoutAuthorNestedInput> = z
  .object({
    create: z
      .union([
        z.lazy(() => DocShareCreateWithoutAuthorInputSchema),
        z.lazy(() => DocShareCreateWithoutAuthorInputSchema).array(),
        z.lazy(() => DocShareUncheckedCreateWithoutAuthorInputSchema),
        z.lazy(() => DocShareUncheckedCreateWithoutAuthorInputSchema).array(),
      ])
      .optional(),
    connectOrCreate: z
      .union([z.lazy(() => DocShareCreateOrConnectWithoutAuthorInputSchema), z.lazy(() => DocShareCreateOrConnectWithoutAuthorInputSchema).array()])
      .optional(),
    upsert: z
      .union([z.lazy(() => DocShareUpsertWithWhereUniqueWithoutAuthorInputSchema), z.lazy(() => DocShareUpsertWithWhereUniqueWithoutAuthorInputSchema).array()])
      .optional(),
    createMany: z.lazy(() => DocShareCreateManyAuthorInputEnvelopeSchema).optional(),
    set: z.union([z.lazy(() => DocShareWhereUniqueInputSchema), z.lazy(() => DocShareWhereUniqueInputSchema).array()]).optional(),
    disconnect: z.union([z.lazy(() => DocShareWhereUniqueInputSchema), z.lazy(() => DocShareWhereUniqueInputSchema).array()]).optional(),
    delete: z.union([z.lazy(() => DocShareWhereUniqueInputSchema), z.lazy(() => DocShareWhereUniqueInputSchema).array()]).optional(),
    connect: z.union([z.lazy(() => DocShareWhereUniqueInputSchema), z.lazy(() => DocShareWhereUniqueInputSchema).array()]).optional(),
    update: z
      .union([z.lazy(() => DocShareUpdateWithWhereUniqueWithoutAuthorInputSchema), z.lazy(() => DocShareUpdateWithWhereUniqueWithoutAuthorInputSchema).array()])
      .optional(),
    updateMany: z
      .union([z.lazy(() => DocShareUpdateManyWithWhereWithoutAuthorInputSchema), z.lazy(() => DocShareUpdateManyWithWhereWithoutAuthorInputSchema).array()])
      .optional(),
    deleteMany: z.union([z.lazy(() => DocShareScalarWhereInputSchema), z.lazy(() => DocShareScalarWhereInputSchema).array()]).optional(),
  })
  .strict();

export const IntFieldUpdateOperationsInputSchema: z.ZodType<Prisma.IntFieldUpdateOperationsInput> = z
  .object({
    set: z.number().optional(),
    increment: z.number().optional(),
    decrement: z.number().optional(),
    multiply: z.number().optional(),
    divide: z.number().optional(),
  })
  .strict();

export const PasswordUncheckedUpdateOneWithoutUserNestedInputSchema: z.ZodType<Prisma.PasswordUncheckedUpdateOneWithoutUserNestedInput> = z
  .object({
    create: z.union([z.lazy(() => PasswordCreateWithoutUserInputSchema), z.lazy(() => PasswordUncheckedCreateWithoutUserInputSchema)]).optional(),
    connectOrCreate: z.lazy(() => PasswordCreateOrConnectWithoutUserInputSchema).optional(),
    upsert: z.lazy(() => PasswordUpsertWithoutUserInputSchema).optional(),
    disconnect: z.union([z.boolean(), z.lazy(() => PasswordWhereInputSchema)]).optional(),
    delete: z.union([z.boolean(), z.lazy(() => PasswordWhereInputSchema)]).optional(),
    connect: z.lazy(() => PasswordWhereUniqueInputSchema).optional(),
    update: z
      .union([
        z.lazy(() => PasswordUpdateToOneWithWhereWithoutUserInputSchema),
        z.lazy(() => PasswordUpdateWithoutUserInputSchema),
        z.lazy(() => PasswordUncheckedUpdateWithoutUserInputSchema),
      ])
      .optional(),
  })
  .strict();

export const ConnectionUncheckedUpdateManyWithoutUserNestedInputSchema: z.ZodType<Prisma.ConnectionUncheckedUpdateManyWithoutUserNestedInput> = z
  .object({
    create: z
      .union([
        z.lazy(() => ConnectionCreateWithoutUserInputSchema),
        z.lazy(() => ConnectionCreateWithoutUserInputSchema).array(),
        z.lazy(() => ConnectionUncheckedCreateWithoutUserInputSchema),
        z.lazy(() => ConnectionUncheckedCreateWithoutUserInputSchema).array(),
      ])
      .optional(),
    connectOrCreate: z
      .union([z.lazy(() => ConnectionCreateOrConnectWithoutUserInputSchema), z.lazy(() => ConnectionCreateOrConnectWithoutUserInputSchema).array()])
      .optional(),
    upsert: z
      .union([z.lazy(() => ConnectionUpsertWithWhereUniqueWithoutUserInputSchema), z.lazy(() => ConnectionUpsertWithWhereUniqueWithoutUserInputSchema).array()])
      .optional(),
    createMany: z.lazy(() => ConnectionCreateManyUserInputEnvelopeSchema).optional(),
    set: z.union([z.lazy(() => ConnectionWhereUniqueInputSchema), z.lazy(() => ConnectionWhereUniqueInputSchema).array()]).optional(),
    disconnect: z.union([z.lazy(() => ConnectionWhereUniqueInputSchema), z.lazy(() => ConnectionWhereUniqueInputSchema).array()]).optional(),
    delete: z.union([z.lazy(() => ConnectionWhereUniqueInputSchema), z.lazy(() => ConnectionWhereUniqueInputSchema).array()]).optional(),
    connect: z.union([z.lazy(() => ConnectionWhereUniqueInputSchema), z.lazy(() => ConnectionWhereUniqueInputSchema).array()]).optional(),
    update: z
      .union([z.lazy(() => ConnectionUpdateWithWhereUniqueWithoutUserInputSchema), z.lazy(() => ConnectionUpdateWithWhereUniqueWithoutUserInputSchema).array()])
      .optional(),
    updateMany: z
      .union([z.lazy(() => ConnectionUpdateManyWithWhereWithoutUserInputSchema), z.lazy(() => ConnectionUpdateManyWithWhereWithoutUserInputSchema).array()])
      .optional(),
    deleteMany: z.union([z.lazy(() => ConnectionScalarWhereInputSchema), z.lazy(() => ConnectionScalarWhereInputSchema).array()]).optional(),
  })
  .strict();

export const DocUncheckedUpdateManyWithoutOwnerNestedInputSchema: z.ZodType<Prisma.DocUncheckedUpdateManyWithoutOwnerNestedInput> = z
  .object({
    create: z
      .union([
        z.lazy(() => DocCreateWithoutOwnerInputSchema),
        z.lazy(() => DocCreateWithoutOwnerInputSchema).array(),
        z.lazy(() => DocUncheckedCreateWithoutOwnerInputSchema),
        z.lazy(() => DocUncheckedCreateWithoutOwnerInputSchema).array(),
      ])
      .optional(),
    connectOrCreate: z
      .union([z.lazy(() => DocCreateOrConnectWithoutOwnerInputSchema), z.lazy(() => DocCreateOrConnectWithoutOwnerInputSchema).array()])
      .optional(),
    upsert: z
      .union([z.lazy(() => DocUpsertWithWhereUniqueWithoutOwnerInputSchema), z.lazy(() => DocUpsertWithWhereUniqueWithoutOwnerInputSchema).array()])
      .optional(),
    createMany: z.lazy(() => DocCreateManyOwnerInputEnvelopeSchema).optional(),
    set: z.union([z.lazy(() => DocWhereUniqueInputSchema), z.lazy(() => DocWhereUniqueInputSchema).array()]).optional(),
    disconnect: z.union([z.lazy(() => DocWhereUniqueInputSchema), z.lazy(() => DocWhereUniqueInputSchema).array()]).optional(),
    delete: z.union([z.lazy(() => DocWhereUniqueInputSchema), z.lazy(() => DocWhereUniqueInputSchema).array()]).optional(),
    connect: z.union([z.lazy(() => DocWhereUniqueInputSchema), z.lazy(() => DocWhereUniqueInputSchema).array()]).optional(),
    update: z
      .union([z.lazy(() => DocUpdateWithWhereUniqueWithoutOwnerInputSchema), z.lazy(() => DocUpdateWithWhereUniqueWithoutOwnerInputSchema).array()])
      .optional(),
    updateMany: z
      .union([z.lazy(() => DocUpdateManyWithWhereWithoutOwnerInputSchema), z.lazy(() => DocUpdateManyWithWhereWithoutOwnerInputSchema).array()])
      .optional(),
    deleteMany: z.union([z.lazy(() => DocScalarWhereInputSchema), z.lazy(() => DocScalarWhereInputSchema).array()]).optional(),
  })
  .strict();

export const DocShareUncheckedUpdateManyWithoutSharedToNestedInputSchema: z.ZodType<Prisma.DocShareUncheckedUpdateManyWithoutSharedToNestedInput> = z
  .object({
    create: z
      .union([
        z.lazy(() => DocShareCreateWithoutSharedToInputSchema),
        z.lazy(() => DocShareCreateWithoutSharedToInputSchema).array(),
        z.lazy(() => DocShareUncheckedCreateWithoutSharedToInputSchema),
        z.lazy(() => DocShareUncheckedCreateWithoutSharedToInputSchema).array(),
      ])
      .optional(),
    connectOrCreate: z
      .union([z.lazy(() => DocShareCreateOrConnectWithoutSharedToInputSchema), z.lazy(() => DocShareCreateOrConnectWithoutSharedToInputSchema).array()])
      .optional(),
    upsert: z
      .union([
        z.lazy(() => DocShareUpsertWithWhereUniqueWithoutSharedToInputSchema),
        z.lazy(() => DocShareUpsertWithWhereUniqueWithoutSharedToInputSchema).array(),
      ])
      .optional(),
    createMany: z.lazy(() => DocShareCreateManySharedToInputEnvelopeSchema).optional(),
    set: z.union([z.lazy(() => DocShareWhereUniqueInputSchema), z.lazy(() => DocShareWhereUniqueInputSchema).array()]).optional(),
    disconnect: z.union([z.lazy(() => DocShareWhereUniqueInputSchema), z.lazy(() => DocShareWhereUniqueInputSchema).array()]).optional(),
    delete: z.union([z.lazy(() => DocShareWhereUniqueInputSchema), z.lazy(() => DocShareWhereUniqueInputSchema).array()]).optional(),
    connect: z.union([z.lazy(() => DocShareWhereUniqueInputSchema), z.lazy(() => DocShareWhereUniqueInputSchema).array()]).optional(),
    update: z
      .union([
        z.lazy(() => DocShareUpdateWithWhereUniqueWithoutSharedToInputSchema),
        z.lazy(() => DocShareUpdateWithWhereUniqueWithoutSharedToInputSchema).array(),
      ])
      .optional(),
    updateMany: z
      .union([z.lazy(() => DocShareUpdateManyWithWhereWithoutSharedToInputSchema), z.lazy(() => DocShareUpdateManyWithWhereWithoutSharedToInputSchema).array()])
      .optional(),
    deleteMany: z.union([z.lazy(() => DocShareScalarWhereInputSchema), z.lazy(() => DocShareScalarWhereInputSchema).array()]).optional(),
  })
  .strict();

export const DocShareUncheckedUpdateManyWithoutAuthorNestedInputSchema: z.ZodType<Prisma.DocShareUncheckedUpdateManyWithoutAuthorNestedInput> = z
  .object({
    create: z
      .union([
        z.lazy(() => DocShareCreateWithoutAuthorInputSchema),
        z.lazy(() => DocShareCreateWithoutAuthorInputSchema).array(),
        z.lazy(() => DocShareUncheckedCreateWithoutAuthorInputSchema),
        z.lazy(() => DocShareUncheckedCreateWithoutAuthorInputSchema).array(),
      ])
      .optional(),
    connectOrCreate: z
      .union([z.lazy(() => DocShareCreateOrConnectWithoutAuthorInputSchema), z.lazy(() => DocShareCreateOrConnectWithoutAuthorInputSchema).array()])
      .optional(),
    upsert: z
      .union([z.lazy(() => DocShareUpsertWithWhereUniqueWithoutAuthorInputSchema), z.lazy(() => DocShareUpsertWithWhereUniqueWithoutAuthorInputSchema).array()])
      .optional(),
    createMany: z.lazy(() => DocShareCreateManyAuthorInputEnvelopeSchema).optional(),
    set: z.union([z.lazy(() => DocShareWhereUniqueInputSchema), z.lazy(() => DocShareWhereUniqueInputSchema).array()]).optional(),
    disconnect: z.union([z.lazy(() => DocShareWhereUniqueInputSchema), z.lazy(() => DocShareWhereUniqueInputSchema).array()]).optional(),
    delete: z.union([z.lazy(() => DocShareWhereUniqueInputSchema), z.lazy(() => DocShareWhereUniqueInputSchema).array()]).optional(),
    connect: z.union([z.lazy(() => DocShareWhereUniqueInputSchema), z.lazy(() => DocShareWhereUniqueInputSchema).array()]).optional(),
    update: z
      .union([z.lazy(() => DocShareUpdateWithWhereUniqueWithoutAuthorInputSchema), z.lazy(() => DocShareUpdateWithWhereUniqueWithoutAuthorInputSchema).array()])
      .optional(),
    updateMany: z
      .union([z.lazy(() => DocShareUpdateManyWithWhereWithoutAuthorInputSchema), z.lazy(() => DocShareUpdateManyWithWhereWithoutAuthorInputSchema).array()])
      .optional(),
    deleteMany: z.union([z.lazy(() => DocShareScalarWhereInputSchema), z.lazy(() => DocShareScalarWhereInputSchema).array()]).optional(),
  })
  .strict();

export const UserCreateNestedOneWithoutPasswordInputSchema: z.ZodType<Prisma.UserCreateNestedOneWithoutPasswordInput> = z
  .object({
    create: z.union([z.lazy(() => UserCreateWithoutPasswordInputSchema), z.lazy(() => UserUncheckedCreateWithoutPasswordInputSchema)]).optional(),
    connectOrCreate: z.lazy(() => UserCreateOrConnectWithoutPasswordInputSchema).optional(),
    connect: z.lazy(() => UserWhereUniqueInputSchema).optional(),
  })
  .strict();

export const UserUpdateOneRequiredWithoutPasswordNestedInputSchema: z.ZodType<Prisma.UserUpdateOneRequiredWithoutPasswordNestedInput> = z
  .object({
    create: z.union([z.lazy(() => UserCreateWithoutPasswordInputSchema), z.lazy(() => UserUncheckedCreateWithoutPasswordInputSchema)]).optional(),
    connectOrCreate: z.lazy(() => UserCreateOrConnectWithoutPasswordInputSchema).optional(),
    upsert: z.lazy(() => UserUpsertWithoutPasswordInputSchema).optional(),
    connect: z.lazy(() => UserWhereUniqueInputSchema).optional(),
    update: z
      .union([
        z.lazy(() => UserUpdateToOneWithWhereWithoutPasswordInputSchema),
        z.lazy(() => UserUpdateWithoutPasswordInputSchema),
        z.lazy(() => UserUncheckedUpdateWithoutPasswordInputSchema),
      ])
      .optional(),
  })
  .strict();

export const UserCreateNestedOneWithoutConnectionsInputSchema: z.ZodType<Prisma.UserCreateNestedOneWithoutConnectionsInput> = z
  .object({
    create: z.union([z.lazy(() => UserCreateWithoutConnectionsInputSchema), z.lazy(() => UserUncheckedCreateWithoutConnectionsInputSchema)]).optional(),
    connectOrCreate: z.lazy(() => UserCreateOrConnectWithoutConnectionsInputSchema).optional(),
    connect: z.lazy(() => UserWhereUniqueInputSchema).optional(),
  })
  .strict();

export const UserUpdateOneRequiredWithoutConnectionsNestedInputSchema: z.ZodType<Prisma.UserUpdateOneRequiredWithoutConnectionsNestedInput> = z
  .object({
    create: z.union([z.lazy(() => UserCreateWithoutConnectionsInputSchema), z.lazy(() => UserUncheckedCreateWithoutConnectionsInputSchema)]).optional(),
    connectOrCreate: z.lazy(() => UserCreateOrConnectWithoutConnectionsInputSchema).optional(),
    upsert: z.lazy(() => UserUpsertWithoutConnectionsInputSchema).optional(),
    connect: z.lazy(() => UserWhereUniqueInputSchema).optional(),
    update: z
      .union([
        z.lazy(() => UserUpdateToOneWithWhereWithoutConnectionsInputSchema),
        z.lazy(() => UserUpdateWithoutConnectionsInputSchema),
        z.lazy(() => UserUncheckedUpdateWithoutConnectionsInputSchema),
      ])
      .optional(),
  })
  .strict();

export const UserCreateNestedOneWithoutDocsInputSchema: z.ZodType<Prisma.UserCreateNestedOneWithoutDocsInput> = z
  .object({
    create: z.union([z.lazy(() => UserCreateWithoutDocsInputSchema), z.lazy(() => UserUncheckedCreateWithoutDocsInputSchema)]).optional(),
    connectOrCreate: z.lazy(() => UserCreateOrConnectWithoutDocsInputSchema).optional(),
    connect: z.lazy(() => UserWhereUniqueInputSchema).optional(),
  })
  .strict();

export const DocCreateNestedOneWithoutChildrenInputSchema: z.ZodType<Prisma.DocCreateNestedOneWithoutChildrenInput> = z
  .object({
    create: z.union([z.lazy(() => DocCreateWithoutChildrenInputSchema), z.lazy(() => DocUncheckedCreateWithoutChildrenInputSchema)]).optional(),
    connectOrCreate: z.lazy(() => DocCreateOrConnectWithoutChildrenInputSchema).optional(),
    connect: z.lazy(() => DocWhereUniqueInputSchema).optional(),
  })
  .strict();

export const DocCreateNestedManyWithoutParentInputSchema: z.ZodType<Prisma.DocCreateNestedManyWithoutParentInput> = z
  .object({
    create: z
      .union([
        z.lazy(() => DocCreateWithoutParentInputSchema),
        z.lazy(() => DocCreateWithoutParentInputSchema).array(),
        z.lazy(() => DocUncheckedCreateWithoutParentInputSchema),
        z.lazy(() => DocUncheckedCreateWithoutParentInputSchema).array(),
      ])
      .optional(),
    connectOrCreate: z
      .union([z.lazy(() => DocCreateOrConnectWithoutParentInputSchema), z.lazy(() => DocCreateOrConnectWithoutParentInputSchema).array()])
      .optional(),
    createMany: z.lazy(() => DocCreateManyParentInputEnvelopeSchema).optional(),
    connect: z.union([z.lazy(() => DocWhereUniqueInputSchema), z.lazy(() => DocWhereUniqueInputSchema).array()]).optional(),
  })
  .strict();

export const CoverImageCreateNestedOneWithoutDocInputSchema: z.ZodType<Prisma.CoverImageCreateNestedOneWithoutDocInput> = z
  .object({
    create: z.union([z.lazy(() => CoverImageCreateWithoutDocInputSchema), z.lazy(() => CoverImageUncheckedCreateWithoutDocInputSchema)]).optional(),
    connectOrCreate: z.lazy(() => CoverImageCreateOrConnectWithoutDocInputSchema).optional(),
    connect: z.lazy(() => CoverImageWhereUniqueInputSchema).optional(),
  })
  .strict();

export const DocShareCreateNestedManyWithoutDocInputSchema: z.ZodType<Prisma.DocShareCreateNestedManyWithoutDocInput> = z
  .object({
    create: z
      .union([
        z.lazy(() => DocShareCreateWithoutDocInputSchema),
        z.lazy(() => DocShareCreateWithoutDocInputSchema).array(),
        z.lazy(() => DocShareUncheckedCreateWithoutDocInputSchema),
        z.lazy(() => DocShareUncheckedCreateWithoutDocInputSchema).array(),
      ])
      .optional(),
    connectOrCreate: z
      .union([z.lazy(() => DocShareCreateOrConnectWithoutDocInputSchema), z.lazy(() => DocShareCreateOrConnectWithoutDocInputSchema).array()])
      .optional(),
    createMany: z.lazy(() => DocShareCreateManyDocInputEnvelopeSchema).optional(),
    connect: z.union([z.lazy(() => DocShareWhereUniqueInputSchema), z.lazy(() => DocShareWhereUniqueInputSchema).array()]).optional(),
  })
  .strict();

export const DocUncheckedCreateNestedManyWithoutParentInputSchema: z.ZodType<Prisma.DocUncheckedCreateNestedManyWithoutParentInput> = z
  .object({
    create: z
      .union([
        z.lazy(() => DocCreateWithoutParentInputSchema),
        z.lazy(() => DocCreateWithoutParentInputSchema).array(),
        z.lazy(() => DocUncheckedCreateWithoutParentInputSchema),
        z.lazy(() => DocUncheckedCreateWithoutParentInputSchema).array(),
      ])
      .optional(),
    connectOrCreate: z
      .union([z.lazy(() => DocCreateOrConnectWithoutParentInputSchema), z.lazy(() => DocCreateOrConnectWithoutParentInputSchema).array()])
      .optional(),
    createMany: z.lazy(() => DocCreateManyParentInputEnvelopeSchema).optional(),
    connect: z.union([z.lazy(() => DocWhereUniqueInputSchema), z.lazy(() => DocWhereUniqueInputSchema).array()]).optional(),
  })
  .strict();

export const CoverImageUncheckedCreateNestedOneWithoutDocInputSchema: z.ZodType<Prisma.CoverImageUncheckedCreateNestedOneWithoutDocInput> = z
  .object({
    create: z.union([z.lazy(() => CoverImageCreateWithoutDocInputSchema), z.lazy(() => CoverImageUncheckedCreateWithoutDocInputSchema)]).optional(),
    connectOrCreate: z.lazy(() => CoverImageCreateOrConnectWithoutDocInputSchema).optional(),
    connect: z.lazy(() => CoverImageWhereUniqueInputSchema).optional(),
  })
  .strict();

export const DocShareUncheckedCreateNestedManyWithoutDocInputSchema: z.ZodType<Prisma.DocShareUncheckedCreateNestedManyWithoutDocInput> = z
  .object({
    create: z
      .union([
        z.lazy(() => DocShareCreateWithoutDocInputSchema),
        z.lazy(() => DocShareCreateWithoutDocInputSchema).array(),
        z.lazy(() => DocShareUncheckedCreateWithoutDocInputSchema),
        z.lazy(() => DocShareUncheckedCreateWithoutDocInputSchema).array(),
      ])
      .optional(),
    connectOrCreate: z
      .union([z.lazy(() => DocShareCreateOrConnectWithoutDocInputSchema), z.lazy(() => DocShareCreateOrConnectWithoutDocInputSchema).array()])
      .optional(),
    createMany: z.lazy(() => DocShareCreateManyDocInputEnvelopeSchema).optional(),
    connect: z.union([z.lazy(() => DocShareWhereUniqueInputSchema), z.lazy(() => DocShareWhereUniqueInputSchema).array()]).optional(),
  })
  .strict();

export const NullableBytesFieldUpdateOperationsInputSchema: z.ZodType<Prisma.NullableBytesFieldUpdateOperationsInput> = z
  .object({
    set: z.instanceof(Buffer).optional().nullable(),
  })
  .strict();

export const BoolFieldUpdateOperationsInputSchema: z.ZodType<Prisma.BoolFieldUpdateOperationsInput> = z
  .object({
    set: z.boolean().optional(),
  })
  .strict();

export const UserUpdateOneRequiredWithoutDocsNestedInputSchema: z.ZodType<Prisma.UserUpdateOneRequiredWithoutDocsNestedInput> = z
  .object({
    create: z.union([z.lazy(() => UserCreateWithoutDocsInputSchema), z.lazy(() => UserUncheckedCreateWithoutDocsInputSchema)]).optional(),
    connectOrCreate: z.lazy(() => UserCreateOrConnectWithoutDocsInputSchema).optional(),
    upsert: z.lazy(() => UserUpsertWithoutDocsInputSchema).optional(),
    connect: z.lazy(() => UserWhereUniqueInputSchema).optional(),
    update: z
      .union([
        z.lazy(() => UserUpdateToOneWithWhereWithoutDocsInputSchema),
        z.lazy(() => UserUpdateWithoutDocsInputSchema),
        z.lazy(() => UserUncheckedUpdateWithoutDocsInputSchema),
      ])
      .optional(),
  })
  .strict();

export const DocUpdateOneWithoutChildrenNestedInputSchema: z.ZodType<Prisma.DocUpdateOneWithoutChildrenNestedInput> = z
  .object({
    create: z.union([z.lazy(() => DocCreateWithoutChildrenInputSchema), z.lazy(() => DocUncheckedCreateWithoutChildrenInputSchema)]).optional(),
    connectOrCreate: z.lazy(() => DocCreateOrConnectWithoutChildrenInputSchema).optional(),
    upsert: z.lazy(() => DocUpsertWithoutChildrenInputSchema).optional(),
    disconnect: z.union([z.boolean(), z.lazy(() => DocWhereInputSchema)]).optional(),
    delete: z.union([z.boolean(), z.lazy(() => DocWhereInputSchema)]).optional(),
    connect: z.lazy(() => DocWhereUniqueInputSchema).optional(),
    update: z
      .union([
        z.lazy(() => DocUpdateToOneWithWhereWithoutChildrenInputSchema),
        z.lazy(() => DocUpdateWithoutChildrenInputSchema),
        z.lazy(() => DocUncheckedUpdateWithoutChildrenInputSchema),
      ])
      .optional(),
  })
  .strict();

export const DocUpdateManyWithoutParentNestedInputSchema: z.ZodType<Prisma.DocUpdateManyWithoutParentNestedInput> = z
  .object({
    create: z
      .union([
        z.lazy(() => DocCreateWithoutParentInputSchema),
        z.lazy(() => DocCreateWithoutParentInputSchema).array(),
        z.lazy(() => DocUncheckedCreateWithoutParentInputSchema),
        z.lazy(() => DocUncheckedCreateWithoutParentInputSchema).array(),
      ])
      .optional(),
    connectOrCreate: z
      .union([z.lazy(() => DocCreateOrConnectWithoutParentInputSchema), z.lazy(() => DocCreateOrConnectWithoutParentInputSchema).array()])
      .optional(),
    upsert: z
      .union([z.lazy(() => DocUpsertWithWhereUniqueWithoutParentInputSchema), z.lazy(() => DocUpsertWithWhereUniqueWithoutParentInputSchema).array()])
      .optional(),
    createMany: z.lazy(() => DocCreateManyParentInputEnvelopeSchema).optional(),
    set: z.union([z.lazy(() => DocWhereUniqueInputSchema), z.lazy(() => DocWhereUniqueInputSchema).array()]).optional(),
    disconnect: z.union([z.lazy(() => DocWhereUniqueInputSchema), z.lazy(() => DocWhereUniqueInputSchema).array()]).optional(),
    delete: z.union([z.lazy(() => DocWhereUniqueInputSchema), z.lazy(() => DocWhereUniqueInputSchema).array()]).optional(),
    connect: z.union([z.lazy(() => DocWhereUniqueInputSchema), z.lazy(() => DocWhereUniqueInputSchema).array()]).optional(),
    update: z
      .union([z.lazy(() => DocUpdateWithWhereUniqueWithoutParentInputSchema), z.lazy(() => DocUpdateWithWhereUniqueWithoutParentInputSchema).array()])
      .optional(),
    updateMany: z
      .union([z.lazy(() => DocUpdateManyWithWhereWithoutParentInputSchema), z.lazy(() => DocUpdateManyWithWhereWithoutParentInputSchema).array()])
      .optional(),
    deleteMany: z.union([z.lazy(() => DocScalarWhereInputSchema), z.lazy(() => DocScalarWhereInputSchema).array()]).optional(),
  })
  .strict();

export const CoverImageUpdateOneWithoutDocNestedInputSchema: z.ZodType<Prisma.CoverImageUpdateOneWithoutDocNestedInput> = z
  .object({
    create: z.union([z.lazy(() => CoverImageCreateWithoutDocInputSchema), z.lazy(() => CoverImageUncheckedCreateWithoutDocInputSchema)]).optional(),
    connectOrCreate: z.lazy(() => CoverImageCreateOrConnectWithoutDocInputSchema).optional(),
    upsert: z.lazy(() => CoverImageUpsertWithoutDocInputSchema).optional(),
    disconnect: z.union([z.boolean(), z.lazy(() => CoverImageWhereInputSchema)]).optional(),
    delete: z.union([z.boolean(), z.lazy(() => CoverImageWhereInputSchema)]).optional(),
    connect: z.lazy(() => CoverImageWhereUniqueInputSchema).optional(),
    update: z
      .union([
        z.lazy(() => CoverImageUpdateToOneWithWhereWithoutDocInputSchema),
        z.lazy(() => CoverImageUpdateWithoutDocInputSchema),
        z.lazy(() => CoverImageUncheckedUpdateWithoutDocInputSchema),
      ])
      .optional(),
  })
  .strict();

export const DocShareUpdateManyWithoutDocNestedInputSchema: z.ZodType<Prisma.DocShareUpdateManyWithoutDocNestedInput> = z
  .object({
    create: z
      .union([
        z.lazy(() => DocShareCreateWithoutDocInputSchema),
        z.lazy(() => DocShareCreateWithoutDocInputSchema).array(),
        z.lazy(() => DocShareUncheckedCreateWithoutDocInputSchema),
        z.lazy(() => DocShareUncheckedCreateWithoutDocInputSchema).array(),
      ])
      .optional(),
    connectOrCreate: z
      .union([z.lazy(() => DocShareCreateOrConnectWithoutDocInputSchema), z.lazy(() => DocShareCreateOrConnectWithoutDocInputSchema).array()])
      .optional(),
    upsert: z
      .union([z.lazy(() => DocShareUpsertWithWhereUniqueWithoutDocInputSchema), z.lazy(() => DocShareUpsertWithWhereUniqueWithoutDocInputSchema).array()])
      .optional(),
    createMany: z.lazy(() => DocShareCreateManyDocInputEnvelopeSchema).optional(),
    set: z.union([z.lazy(() => DocShareWhereUniqueInputSchema), z.lazy(() => DocShareWhereUniqueInputSchema).array()]).optional(),
    disconnect: z.union([z.lazy(() => DocShareWhereUniqueInputSchema), z.lazy(() => DocShareWhereUniqueInputSchema).array()]).optional(),
    delete: z.union([z.lazy(() => DocShareWhereUniqueInputSchema), z.lazy(() => DocShareWhereUniqueInputSchema).array()]).optional(),
    connect: z.union([z.lazy(() => DocShareWhereUniqueInputSchema), z.lazy(() => DocShareWhereUniqueInputSchema).array()]).optional(),
    update: z
      .union([z.lazy(() => DocShareUpdateWithWhereUniqueWithoutDocInputSchema), z.lazy(() => DocShareUpdateWithWhereUniqueWithoutDocInputSchema).array()])
      .optional(),
    updateMany: z
      .union([z.lazy(() => DocShareUpdateManyWithWhereWithoutDocInputSchema), z.lazy(() => DocShareUpdateManyWithWhereWithoutDocInputSchema).array()])
      .optional(),
    deleteMany: z.union([z.lazy(() => DocShareScalarWhereInputSchema), z.lazy(() => DocShareScalarWhereInputSchema).array()]).optional(),
  })
  .strict();

export const DocUncheckedUpdateManyWithoutParentNestedInputSchema: z.ZodType<Prisma.DocUncheckedUpdateManyWithoutParentNestedInput> = z
  .object({
    create: z
      .union([
        z.lazy(() => DocCreateWithoutParentInputSchema),
        z.lazy(() => DocCreateWithoutParentInputSchema).array(),
        z.lazy(() => DocUncheckedCreateWithoutParentInputSchema),
        z.lazy(() => DocUncheckedCreateWithoutParentInputSchema).array(),
      ])
      .optional(),
    connectOrCreate: z
      .union([z.lazy(() => DocCreateOrConnectWithoutParentInputSchema), z.lazy(() => DocCreateOrConnectWithoutParentInputSchema).array()])
      .optional(),
    upsert: z
      .union([z.lazy(() => DocUpsertWithWhereUniqueWithoutParentInputSchema), z.lazy(() => DocUpsertWithWhereUniqueWithoutParentInputSchema).array()])
      .optional(),
    createMany: z.lazy(() => DocCreateManyParentInputEnvelopeSchema).optional(),
    set: z.union([z.lazy(() => DocWhereUniqueInputSchema), z.lazy(() => DocWhereUniqueInputSchema).array()]).optional(),
    disconnect: z.union([z.lazy(() => DocWhereUniqueInputSchema), z.lazy(() => DocWhereUniqueInputSchema).array()]).optional(),
    delete: z.union([z.lazy(() => DocWhereUniqueInputSchema), z.lazy(() => DocWhereUniqueInputSchema).array()]).optional(),
    connect: z.union([z.lazy(() => DocWhereUniqueInputSchema), z.lazy(() => DocWhereUniqueInputSchema).array()]).optional(),
    update: z
      .union([z.lazy(() => DocUpdateWithWhereUniqueWithoutParentInputSchema), z.lazy(() => DocUpdateWithWhereUniqueWithoutParentInputSchema).array()])
      .optional(),
    updateMany: z
      .union([z.lazy(() => DocUpdateManyWithWhereWithoutParentInputSchema), z.lazy(() => DocUpdateManyWithWhereWithoutParentInputSchema).array()])
      .optional(),
    deleteMany: z.union([z.lazy(() => DocScalarWhereInputSchema), z.lazy(() => DocScalarWhereInputSchema).array()]).optional(),
  })
  .strict();

export const CoverImageUncheckedUpdateOneWithoutDocNestedInputSchema: z.ZodType<Prisma.CoverImageUncheckedUpdateOneWithoutDocNestedInput> = z
  .object({
    create: z.union([z.lazy(() => CoverImageCreateWithoutDocInputSchema), z.lazy(() => CoverImageUncheckedCreateWithoutDocInputSchema)]).optional(),
    connectOrCreate: z.lazy(() => CoverImageCreateOrConnectWithoutDocInputSchema).optional(),
    upsert: z.lazy(() => CoverImageUpsertWithoutDocInputSchema).optional(),
    disconnect: z.union([z.boolean(), z.lazy(() => CoverImageWhereInputSchema)]).optional(),
    delete: z.union([z.boolean(), z.lazy(() => CoverImageWhereInputSchema)]).optional(),
    connect: z.lazy(() => CoverImageWhereUniqueInputSchema).optional(),
    update: z
      .union([
        z.lazy(() => CoverImageUpdateToOneWithWhereWithoutDocInputSchema),
        z.lazy(() => CoverImageUpdateWithoutDocInputSchema),
        z.lazy(() => CoverImageUncheckedUpdateWithoutDocInputSchema),
      ])
      .optional(),
  })
  .strict();

export const DocShareUncheckedUpdateManyWithoutDocNestedInputSchema: z.ZodType<Prisma.DocShareUncheckedUpdateManyWithoutDocNestedInput> = z
  .object({
    create: z
      .union([
        z.lazy(() => DocShareCreateWithoutDocInputSchema),
        z.lazy(() => DocShareCreateWithoutDocInputSchema).array(),
        z.lazy(() => DocShareUncheckedCreateWithoutDocInputSchema),
        z.lazy(() => DocShareUncheckedCreateWithoutDocInputSchema).array(),
      ])
      .optional(),
    connectOrCreate: z
      .union([z.lazy(() => DocShareCreateOrConnectWithoutDocInputSchema), z.lazy(() => DocShareCreateOrConnectWithoutDocInputSchema).array()])
      .optional(),
    upsert: z
      .union([z.lazy(() => DocShareUpsertWithWhereUniqueWithoutDocInputSchema), z.lazy(() => DocShareUpsertWithWhereUniqueWithoutDocInputSchema).array()])
      .optional(),
    createMany: z.lazy(() => DocShareCreateManyDocInputEnvelopeSchema).optional(),
    set: z.union([z.lazy(() => DocShareWhereUniqueInputSchema), z.lazy(() => DocShareWhereUniqueInputSchema).array()]).optional(),
    disconnect: z.union([z.lazy(() => DocShareWhereUniqueInputSchema), z.lazy(() => DocShareWhereUniqueInputSchema).array()]).optional(),
    delete: z.union([z.lazy(() => DocShareWhereUniqueInputSchema), z.lazy(() => DocShareWhereUniqueInputSchema).array()]).optional(),
    connect: z.union([z.lazy(() => DocShareWhereUniqueInputSchema), z.lazy(() => DocShareWhereUniqueInputSchema).array()]).optional(),
    update: z
      .union([z.lazy(() => DocShareUpdateWithWhereUniqueWithoutDocInputSchema), z.lazy(() => DocShareUpdateWithWhereUniqueWithoutDocInputSchema).array()])
      .optional(),
    updateMany: z
      .union([z.lazy(() => DocShareUpdateManyWithWhereWithoutDocInputSchema), z.lazy(() => DocShareUpdateManyWithWhereWithoutDocInputSchema).array()])
      .optional(),
    deleteMany: z.union([z.lazy(() => DocShareScalarWhereInputSchema), z.lazy(() => DocShareScalarWhereInputSchema).array()]).optional(),
  })
  .strict();

export const DocCreateNestedOneWithoutCoverImageInputSchema: z.ZodType<Prisma.DocCreateNestedOneWithoutCoverImageInput> = z
  .object({
    create: z.union([z.lazy(() => DocCreateWithoutCoverImageInputSchema), z.lazy(() => DocUncheckedCreateWithoutCoverImageInputSchema)]).optional(),
    connectOrCreate: z.lazy(() => DocCreateOrConnectWithoutCoverImageInputSchema).optional(),
    connect: z.lazy(() => DocWhereUniqueInputSchema).optional(),
  })
  .strict();

export const FloatFieldUpdateOperationsInputSchema: z.ZodType<Prisma.FloatFieldUpdateOperationsInput> = z
  .object({
    set: z.number().optional(),
    increment: z.number().optional(),
    decrement: z.number().optional(),
    multiply: z.number().optional(),
    divide: z.number().optional(),
  })
  .strict();

export const DocUpdateOneRequiredWithoutCoverImageNestedInputSchema: z.ZodType<Prisma.DocUpdateOneRequiredWithoutCoverImageNestedInput> = z
  .object({
    create: z.union([z.lazy(() => DocCreateWithoutCoverImageInputSchema), z.lazy(() => DocUncheckedCreateWithoutCoverImageInputSchema)]).optional(),
    connectOrCreate: z.lazy(() => DocCreateOrConnectWithoutCoverImageInputSchema).optional(),
    upsert: z.lazy(() => DocUpsertWithoutCoverImageInputSchema).optional(),
    connect: z.lazy(() => DocWhereUniqueInputSchema).optional(),
    update: z
      .union([
        z.lazy(() => DocUpdateToOneWithWhereWithoutCoverImageInputSchema),
        z.lazy(() => DocUpdateWithoutCoverImageInputSchema),
        z.lazy(() => DocUncheckedUpdateWithoutCoverImageInputSchema),
      ])
      .optional(),
  })
  .strict();

export const DocCreateNestedOneWithoutSharedWithInputSchema: z.ZodType<Prisma.DocCreateNestedOneWithoutSharedWithInput> = z
  .object({
    create: z.union([z.lazy(() => DocCreateWithoutSharedWithInputSchema), z.lazy(() => DocUncheckedCreateWithoutSharedWithInputSchema)]).optional(),
    connectOrCreate: z.lazy(() => DocCreateOrConnectWithoutSharedWithInputSchema).optional(),
    connect: z.lazy(() => DocWhereUniqueInputSchema).optional(),
  })
  .strict();

export const UserCreateNestedOneWithoutDocShareInputSchema: z.ZodType<Prisma.UserCreateNestedOneWithoutDocShareInput> = z
  .object({
    create: z.union([z.lazy(() => UserCreateWithoutDocShareInputSchema), z.lazy(() => UserUncheckedCreateWithoutDocShareInputSchema)]).optional(),
    connectOrCreate: z.lazy(() => UserCreateOrConnectWithoutDocShareInputSchema).optional(),
    connect: z.lazy(() => UserWhereUniqueInputSchema).optional(),
  })
  .strict();

export const UserCreateNestedOneWithoutSharedDocsInputSchema: z.ZodType<Prisma.UserCreateNestedOneWithoutSharedDocsInput> = z
  .object({
    create: z.union([z.lazy(() => UserCreateWithoutSharedDocsInputSchema), z.lazy(() => UserUncheckedCreateWithoutSharedDocsInputSchema)]).optional(),
    connectOrCreate: z.lazy(() => UserCreateOrConnectWithoutSharedDocsInputSchema).optional(),
    connect: z.lazy(() => UserWhereUniqueInputSchema).optional(),
  })
  .strict();

export const DocUpdateOneRequiredWithoutSharedWithNestedInputSchema: z.ZodType<Prisma.DocUpdateOneRequiredWithoutSharedWithNestedInput> = z
  .object({
    create: z.union([z.lazy(() => DocCreateWithoutSharedWithInputSchema), z.lazy(() => DocUncheckedCreateWithoutSharedWithInputSchema)]).optional(),
    connectOrCreate: z.lazy(() => DocCreateOrConnectWithoutSharedWithInputSchema).optional(),
    upsert: z.lazy(() => DocUpsertWithoutSharedWithInputSchema).optional(),
    connect: z.lazy(() => DocWhereUniqueInputSchema).optional(),
    update: z
      .union([
        z.lazy(() => DocUpdateToOneWithWhereWithoutSharedWithInputSchema),
        z.lazy(() => DocUpdateWithoutSharedWithInputSchema),
        z.lazy(() => DocUncheckedUpdateWithoutSharedWithInputSchema),
      ])
      .optional(),
  })
  .strict();

export const UserUpdateOneRequiredWithoutDocShareNestedInputSchema: z.ZodType<Prisma.UserUpdateOneRequiredWithoutDocShareNestedInput> = z
  .object({
    create: z.union([z.lazy(() => UserCreateWithoutDocShareInputSchema), z.lazy(() => UserUncheckedCreateWithoutDocShareInputSchema)]).optional(),
    connectOrCreate: z.lazy(() => UserCreateOrConnectWithoutDocShareInputSchema).optional(),
    upsert: z.lazy(() => UserUpsertWithoutDocShareInputSchema).optional(),
    connect: z.lazy(() => UserWhereUniqueInputSchema).optional(),
    update: z
      .union([
        z.lazy(() => UserUpdateToOneWithWhereWithoutDocShareInputSchema),
        z.lazy(() => UserUpdateWithoutDocShareInputSchema),
        z.lazy(() => UserUncheckedUpdateWithoutDocShareInputSchema),
      ])
      .optional(),
  })
  .strict();

export const UserUpdateOneRequiredWithoutSharedDocsNestedInputSchema: z.ZodType<Prisma.UserUpdateOneRequiredWithoutSharedDocsNestedInput> = z
  .object({
    create: z.union([z.lazy(() => UserCreateWithoutSharedDocsInputSchema), z.lazy(() => UserUncheckedCreateWithoutSharedDocsInputSchema)]).optional(),
    connectOrCreate: z.lazy(() => UserCreateOrConnectWithoutSharedDocsInputSchema).optional(),
    upsert: z.lazy(() => UserUpsertWithoutSharedDocsInputSchema).optional(),
    connect: z.lazy(() => UserWhereUniqueInputSchema).optional(),
    update: z
      .union([
        z.lazy(() => UserUpdateToOneWithWhereWithoutSharedDocsInputSchema),
        z.lazy(() => UserUpdateWithoutSharedDocsInputSchema),
        z.lazy(() => UserUncheckedUpdateWithoutSharedDocsInputSchema),
      ])
      .optional(),
  })
  .strict();

export const NestedIntFilterSchema: z.ZodType<Prisma.NestedIntFilter> = z
  .object({
    equals: z.number().optional(),
    in: z.number().array().optional(),
    notIn: z.number().array().optional(),
    lt: z.number().optional(),
    lte: z.number().optional(),
    gt: z.number().optional(),
    gte: z.number().optional(),
    not: z.union([z.number(), z.lazy(() => NestedIntFilterSchema)]).optional(),
  })
  .strict();

export const NestedStringFilterSchema: z.ZodType<Prisma.NestedStringFilter> = z
  .object({
    equals: z.string().optional(),
    in: z.string().array().optional(),
    notIn: z.string().array().optional(),
    lt: z.string().optional(),
    lte: z.string().optional(),
    gt: z.string().optional(),
    gte: z.string().optional(),
    contains: z.string().optional(),
    startsWith: z.string().optional(),
    endsWith: z.string().optional(),
    not: z.union([z.string(), z.lazy(() => NestedStringFilterSchema)]).optional(),
  })
  .strict();

export const NestedStringNullableFilterSchema: z.ZodType<Prisma.NestedStringNullableFilter> = z
  .object({
    equals: z.string().optional().nullable(),
    in: z.string().array().optional().nullable(),
    notIn: z.string().array().optional().nullable(),
    lt: z.string().optional(),
    lte: z.string().optional(),
    gt: z.string().optional(),
    gte: z.string().optional(),
    contains: z.string().optional(),
    startsWith: z.string().optional(),
    endsWith: z.string().optional(),
    not: z
      .union([z.string(), z.lazy(() => NestedStringNullableFilterSchema)])
      .optional()
      .nullable(),
  })
  .strict();

export const NestedDateTimeNullableFilterSchema: z.ZodType<Prisma.NestedDateTimeNullableFilter> = z
  .object({
    equals: z.coerce.date().optional().nullable(),
    in: z.coerce.date().array().optional().nullable(),
    notIn: z.coerce.date().array().optional().nullable(),
    lt: z.coerce.date().optional(),
    lte: z.coerce.date().optional(),
    gt: z.coerce.date().optional(),
    gte: z.coerce.date().optional(),
    not: z
      .union([z.coerce.date(), z.lazy(() => NestedDateTimeNullableFilterSchema)])
      .optional()
      .nullable(),
  })
  .strict();

export const NestedDateTimeFilterSchema: z.ZodType<Prisma.NestedDateTimeFilter> = z
  .object({
    equals: z.coerce.date().optional(),
    in: z.coerce.date().array().optional(),
    notIn: z.coerce.date().array().optional(),
    lt: z.coerce.date().optional(),
    lte: z.coerce.date().optional(),
    gt: z.coerce.date().optional(),
    gte: z.coerce.date().optional(),
    not: z.union([z.coerce.date(), z.lazy(() => NestedDateTimeFilterSchema)]).optional(),
  })
  .strict();

export const NestedIntWithAggregatesFilterSchema: z.ZodType<Prisma.NestedIntWithAggregatesFilter> = z
  .object({
    equals: z.number().optional(),
    in: z.number().array().optional(),
    notIn: z.number().array().optional(),
    lt: z.number().optional(),
    lte: z.number().optional(),
    gt: z.number().optional(),
    gte: z.number().optional(),
    not: z.union([z.number(), z.lazy(() => NestedIntWithAggregatesFilterSchema)]).optional(),
    _count: z.lazy(() => NestedIntFilterSchema).optional(),
    _avg: z.lazy(() => NestedFloatFilterSchema).optional(),
    _sum: z.lazy(() => NestedIntFilterSchema).optional(),
    _min: z.lazy(() => NestedIntFilterSchema).optional(),
    _max: z.lazy(() => NestedIntFilterSchema).optional(),
  })
  .strict();

export const NestedFloatFilterSchema: z.ZodType<Prisma.NestedFloatFilter> = z
  .object({
    equals: z.number().optional(),
    in: z.number().array().optional(),
    notIn: z.number().array().optional(),
    lt: z.number().optional(),
    lte: z.number().optional(),
    gt: z.number().optional(),
    gte: z.number().optional(),
    not: z.union([z.number(), z.lazy(() => NestedFloatFilterSchema)]).optional(),
  })
  .strict();

export const NestedStringWithAggregatesFilterSchema: z.ZodType<Prisma.NestedStringWithAggregatesFilter> = z
  .object({
    equals: z.string().optional(),
    in: z.string().array().optional(),
    notIn: z.string().array().optional(),
    lt: z.string().optional(),
    lte: z.string().optional(),
    gt: z.string().optional(),
    gte: z.string().optional(),
    contains: z.string().optional(),
    startsWith: z.string().optional(),
    endsWith: z.string().optional(),
    not: z.union([z.string(), z.lazy(() => NestedStringWithAggregatesFilterSchema)]).optional(),
    _count: z.lazy(() => NestedIntFilterSchema).optional(),
    _min: z.lazy(() => NestedStringFilterSchema).optional(),
    _max: z.lazy(() => NestedStringFilterSchema).optional(),
  })
  .strict();

export const NestedStringNullableWithAggregatesFilterSchema: z.ZodType<Prisma.NestedStringNullableWithAggregatesFilter> = z
  .object({
    equals: z.string().optional().nullable(),
    in: z.string().array().optional().nullable(),
    notIn: z.string().array().optional().nullable(),
    lt: z.string().optional(),
    lte: z.string().optional(),
    gt: z.string().optional(),
    gte: z.string().optional(),
    contains: z.string().optional(),
    startsWith: z.string().optional(),
    endsWith: z.string().optional(),
    not: z
      .union([z.string(), z.lazy(() => NestedStringNullableWithAggregatesFilterSchema)])
      .optional()
      .nullable(),
    _count: z.lazy(() => NestedIntNullableFilterSchema).optional(),
    _min: z.lazy(() => NestedStringNullableFilterSchema).optional(),
    _max: z.lazy(() => NestedStringNullableFilterSchema).optional(),
  })
  .strict();

export const NestedIntNullableFilterSchema: z.ZodType<Prisma.NestedIntNullableFilter> = z
  .object({
    equals: z.number().optional().nullable(),
    in: z.number().array().optional().nullable(),
    notIn: z.number().array().optional().nullable(),
    lt: z.number().optional(),
    lte: z.number().optional(),
    gt: z.number().optional(),
    gte: z.number().optional(),
    not: z
      .union([z.number(), z.lazy(() => NestedIntNullableFilterSchema)])
      .optional()
      .nullable(),
  })
  .strict();

export const NestedDateTimeNullableWithAggregatesFilterSchema: z.ZodType<Prisma.NestedDateTimeNullableWithAggregatesFilter> = z
  .object({
    equals: z.coerce.date().optional().nullable(),
    in: z.coerce.date().array().optional().nullable(),
    notIn: z.coerce.date().array().optional().nullable(),
    lt: z.coerce.date().optional(),
    lte: z.coerce.date().optional(),
    gt: z.coerce.date().optional(),
    gte: z.coerce.date().optional(),
    not: z
      .union([z.coerce.date(), z.lazy(() => NestedDateTimeNullableWithAggregatesFilterSchema)])
      .optional()
      .nullable(),
    _count: z.lazy(() => NestedIntNullableFilterSchema).optional(),
    _min: z.lazy(() => NestedDateTimeNullableFilterSchema).optional(),
    _max: z.lazy(() => NestedDateTimeNullableFilterSchema).optional(),
  })
  .strict();

export const NestedDateTimeWithAggregatesFilterSchema: z.ZodType<Prisma.NestedDateTimeWithAggregatesFilter> = z
  .object({
    equals: z.coerce.date().optional(),
    in: z.coerce.date().array().optional(),
    notIn: z.coerce.date().array().optional(),
    lt: z.coerce.date().optional(),
    lte: z.coerce.date().optional(),
    gt: z.coerce.date().optional(),
    gte: z.coerce.date().optional(),
    not: z.union([z.coerce.date(), z.lazy(() => NestedDateTimeWithAggregatesFilterSchema)]).optional(),
    _count: z.lazy(() => NestedIntFilterSchema).optional(),
    _min: z.lazy(() => NestedDateTimeFilterSchema).optional(),
    _max: z.lazy(() => NestedDateTimeFilterSchema).optional(),
  })
  .strict();

export const NestedBytesNullableFilterSchema: z.ZodType<Prisma.NestedBytesNullableFilter> = z
  .object({
    equals: z.instanceof(Buffer).optional().nullable(),
    in: z.instanceof(Buffer).array().optional().nullable(),
    notIn: z.instanceof(Buffer).array().optional().nullable(),
    not: z
      .union([z.instanceof(Buffer), z.lazy(() => NestedBytesNullableFilterSchema)])
      .optional()
      .nullable(),
  })
  .strict();

export const NestedBoolFilterSchema: z.ZodType<Prisma.NestedBoolFilter> = z
  .object({
    equals: z.boolean().optional(),
    not: z.union([z.boolean(), z.lazy(() => NestedBoolFilterSchema)]).optional(),
  })
  .strict();

export const NestedBytesNullableWithAggregatesFilterSchema: z.ZodType<Prisma.NestedBytesNullableWithAggregatesFilter> = z
  .object({
    equals: z.instanceof(Buffer).optional().nullable(),
    in: z.instanceof(Buffer).array().optional().nullable(),
    notIn: z.instanceof(Buffer).array().optional().nullable(),
    not: z
      .union([z.instanceof(Buffer), z.lazy(() => NestedBytesNullableWithAggregatesFilterSchema)])
      .optional()
      .nullable(),
    _count: z.lazy(() => NestedIntNullableFilterSchema).optional(),
    _min: z.lazy(() => NestedBytesNullableFilterSchema).optional(),
    _max: z.lazy(() => NestedBytesNullableFilterSchema).optional(),
  })
  .strict();

export const NestedBoolWithAggregatesFilterSchema: z.ZodType<Prisma.NestedBoolWithAggregatesFilter> = z
  .object({
    equals: z.boolean().optional(),
    not: z.union([z.boolean(), z.lazy(() => NestedBoolWithAggregatesFilterSchema)]).optional(),
    _count: z.lazy(() => NestedIntFilterSchema).optional(),
    _min: z.lazy(() => NestedBoolFilterSchema).optional(),
    _max: z.lazy(() => NestedBoolFilterSchema).optional(),
  })
  .strict();

export const NestedFloatWithAggregatesFilterSchema: z.ZodType<Prisma.NestedFloatWithAggregatesFilter> = z
  .object({
    equals: z.number().optional(),
    in: z.number().array().optional(),
    notIn: z.number().array().optional(),
    lt: z.number().optional(),
    lte: z.number().optional(),
    gt: z.number().optional(),
    gte: z.number().optional(),
    not: z.union([z.number(), z.lazy(() => NestedFloatWithAggregatesFilterSchema)]).optional(),
    _count: z.lazy(() => NestedIntFilterSchema).optional(),
    _avg: z.lazy(() => NestedFloatFilterSchema).optional(),
    _sum: z.lazy(() => NestedFloatFilterSchema).optional(),
    _min: z.lazy(() => NestedFloatFilterSchema).optional(),
    _max: z.lazy(() => NestedFloatFilterSchema).optional(),
  })
  .strict();

export const PasswordCreateWithoutUserInputSchema: z.ZodType<Prisma.PasswordCreateWithoutUserInput> = z
  .object({
    hash: z.string(),
  })
  .strict();

export const PasswordUncheckedCreateWithoutUserInputSchema: z.ZodType<Prisma.PasswordUncheckedCreateWithoutUserInput> = z
  .object({
    hash: z.string(),
  })
  .strict();

export const PasswordCreateOrConnectWithoutUserInputSchema: z.ZodType<Prisma.PasswordCreateOrConnectWithoutUserInput> = z
  .object({
    where: z.lazy(() => PasswordWhereUniqueInputSchema),
    create: z.union([z.lazy(() => PasswordCreateWithoutUserInputSchema), z.lazy(() => PasswordUncheckedCreateWithoutUserInputSchema)]),
  })
  .strict();

export const ConnectionCreateWithoutUserInputSchema: z.ZodType<Prisma.ConnectionCreateWithoutUserInput> = z
  .object({
    id: z.string().cuid().optional(),
    providerName: z.string(),
    providerId: z.string(),
    createdAt: z.coerce.date().optional(),
    updatedAt: z.coerce.date().optional(),
  })
  .strict();

export const ConnectionUncheckedCreateWithoutUserInputSchema: z.ZodType<Prisma.ConnectionUncheckedCreateWithoutUserInput> = z
  .object({
    id: z.string().cuid().optional(),
    providerName: z.string(),
    providerId: z.string(),
    createdAt: z.coerce.date().optional(),
    updatedAt: z.coerce.date().optional(),
  })
  .strict();

export const ConnectionCreateOrConnectWithoutUserInputSchema: z.ZodType<Prisma.ConnectionCreateOrConnectWithoutUserInput> = z
  .object({
    where: z.lazy(() => ConnectionWhereUniqueInputSchema),
    create: z.union([z.lazy(() => ConnectionCreateWithoutUserInputSchema), z.lazy(() => ConnectionUncheckedCreateWithoutUserInputSchema)]),
  })
  .strict();

export const ConnectionCreateManyUserInputEnvelopeSchema: z.ZodType<Prisma.ConnectionCreateManyUserInputEnvelope> = z
  .object({
    data: z.union([z.lazy(() => ConnectionCreateManyUserInputSchema), z.lazy(() => ConnectionCreateManyUserInputSchema).array()]),
    skipDuplicates: z.boolean().optional(),
  })
  .strict();

export const DocCreateWithoutOwnerInputSchema: z.ZodType<Prisma.DocCreateWithoutOwnerInput> = z
  .object({
    id: z.string().cuid().optional(),
    title: z.string(),
    content: z.string(),
    contentBinary: z.instanceof(Buffer).optional().nullable(),
    isArchived: z.boolean().optional(),
    isStarred: z.boolean().optional(),
    createdAt: z.coerce.date().optional(),
    updatedAt: z.coerce.date().optional(),
    coverImageId: z.string().optional().nullable(),
    position: z.number().int().optional(),
    parent: z.lazy(() => DocCreateNestedOneWithoutChildrenInputSchema).optional(),
    children: z.lazy(() => DocCreateNestedManyWithoutParentInputSchema).optional(),
    coverImage: z.lazy(() => CoverImageCreateNestedOneWithoutDocInputSchema).optional(),
    sharedWith: z.lazy(() => DocShareCreateNestedManyWithoutDocInputSchema).optional(),
  })
  .strict();

export const DocUncheckedCreateWithoutOwnerInputSchema: z.ZodType<Prisma.DocUncheckedCreateWithoutOwnerInput> = z
  .object({
    id: z.string().cuid().optional(),
    title: z.string(),
    content: z.string(),
    contentBinary: z.instanceof(Buffer).optional().nullable(),
    isArchived: z.boolean().optional(),
    isStarred: z.boolean().optional(),
    createdAt: z.coerce.date().optional(),
    updatedAt: z.coerce.date().optional(),
    parentId: z.string().optional().nullable(),
    coverImageId: z.string().optional().nullable(),
    position: z.number().int().optional(),
    children: z.lazy(() => DocUncheckedCreateNestedManyWithoutParentInputSchema).optional(),
    coverImage: z.lazy(() => CoverImageUncheckedCreateNestedOneWithoutDocInputSchema).optional(),
    sharedWith: z.lazy(() => DocShareUncheckedCreateNestedManyWithoutDocInputSchema).optional(),
  })
  .strict();

export const DocCreateOrConnectWithoutOwnerInputSchema: z.ZodType<Prisma.DocCreateOrConnectWithoutOwnerInput> = z
  .object({
    where: z.lazy(() => DocWhereUniqueInputSchema),
    create: z.union([z.lazy(() => DocCreateWithoutOwnerInputSchema), z.lazy(() => DocUncheckedCreateWithoutOwnerInputSchema)]),
  })
  .strict();

export const DocCreateManyOwnerInputEnvelopeSchema: z.ZodType<Prisma.DocCreateManyOwnerInputEnvelope> = z
  .object({
    data: z.union([z.lazy(() => DocCreateManyOwnerInputSchema), z.lazy(() => DocCreateManyOwnerInputSchema).array()]),
    skipDuplicates: z.boolean().optional(),
  })
  .strict();

export const DocShareCreateWithoutSharedToInputSchema: z.ZodType<Prisma.DocShareCreateWithoutSharedToInput> = z
  .object({
    id: z.string().cuid().optional(),
    permission: z.string().optional(),
    noticeType: z.string().optional(),
    createdAt: z.coerce.date().optional(),
    updatedAt: z.coerce.date().optional(),
    doc: z.lazy(() => DocCreateNestedOneWithoutSharedWithInputSchema),
    author: z.lazy(() => UserCreateNestedOneWithoutDocShareInputSchema),
  })
  .strict();

export const DocShareUncheckedCreateWithoutSharedToInputSchema: z.ZodType<Prisma.DocShareUncheckedCreateWithoutSharedToInput> = z
  .object({
    id: z.string().cuid().optional(),
    docId: z.string(),
    authorId: z.number().int(),
    permission: z.string().optional(),
    noticeType: z.string().optional(),
    createdAt: z.coerce.date().optional(),
    updatedAt: z.coerce.date().optional(),
  })
  .strict();

export const DocShareCreateOrConnectWithoutSharedToInputSchema: z.ZodType<Prisma.DocShareCreateOrConnectWithoutSharedToInput> = z
  .object({
    where: z.lazy(() => DocShareWhereUniqueInputSchema),
    create: z.union([z.lazy(() => DocShareCreateWithoutSharedToInputSchema), z.lazy(() => DocShareUncheckedCreateWithoutSharedToInputSchema)]),
  })
  .strict();

export const DocShareCreateManySharedToInputEnvelopeSchema: z.ZodType<Prisma.DocShareCreateManySharedToInputEnvelope> = z
  .object({
    data: z.union([z.lazy(() => DocShareCreateManySharedToInputSchema), z.lazy(() => DocShareCreateManySharedToInputSchema).array()]),
    skipDuplicates: z.boolean().optional(),
  })
  .strict();

export const DocShareCreateWithoutAuthorInputSchema: z.ZodType<Prisma.DocShareCreateWithoutAuthorInput> = z
  .object({
    id: z.string().cuid().optional(),
    permission: z.string().optional(),
    noticeType: z.string().optional(),
    createdAt: z.coerce.date().optional(),
    updatedAt: z.coerce.date().optional(),
    doc: z.lazy(() => DocCreateNestedOneWithoutSharedWithInputSchema),
    sharedTo: z.lazy(() => UserCreateNestedOneWithoutSharedDocsInputSchema),
  })
  .strict();

export const DocShareUncheckedCreateWithoutAuthorInputSchema: z.ZodType<Prisma.DocShareUncheckedCreateWithoutAuthorInput> = z
  .object({
    id: z.string().cuid().optional(),
    docId: z.string(),
    userId: z.number().int(),
    permission: z.string().optional(),
    noticeType: z.string().optional(),
    createdAt: z.coerce.date().optional(),
    updatedAt: z.coerce.date().optional(),
  })
  .strict();

export const DocShareCreateOrConnectWithoutAuthorInputSchema: z.ZodType<Prisma.DocShareCreateOrConnectWithoutAuthorInput> = z
  .object({
    where: z.lazy(() => DocShareWhereUniqueInputSchema),
    create: z.union([z.lazy(() => DocShareCreateWithoutAuthorInputSchema), z.lazy(() => DocShareUncheckedCreateWithoutAuthorInputSchema)]),
  })
  .strict();

export const DocShareCreateManyAuthorInputEnvelopeSchema: z.ZodType<Prisma.DocShareCreateManyAuthorInputEnvelope> = z
  .object({
    data: z.union([z.lazy(() => DocShareCreateManyAuthorInputSchema), z.lazy(() => DocShareCreateManyAuthorInputSchema).array()]),
    skipDuplicates: z.boolean().optional(),
  })
  .strict();

export const PasswordUpsertWithoutUserInputSchema: z.ZodType<Prisma.PasswordUpsertWithoutUserInput> = z
  .object({
    update: z.union([z.lazy(() => PasswordUpdateWithoutUserInputSchema), z.lazy(() => PasswordUncheckedUpdateWithoutUserInputSchema)]),
    create: z.union([z.lazy(() => PasswordCreateWithoutUserInputSchema), z.lazy(() => PasswordUncheckedCreateWithoutUserInputSchema)]),
    where: z.lazy(() => PasswordWhereInputSchema).optional(),
  })
  .strict();

export const PasswordUpdateToOneWithWhereWithoutUserInputSchema: z.ZodType<Prisma.PasswordUpdateToOneWithWhereWithoutUserInput> = z
  .object({
    where: z.lazy(() => PasswordWhereInputSchema).optional(),
    data: z.union([z.lazy(() => PasswordUpdateWithoutUserInputSchema), z.lazy(() => PasswordUncheckedUpdateWithoutUserInputSchema)]),
  })
  .strict();

export const PasswordUpdateWithoutUserInputSchema: z.ZodType<Prisma.PasswordUpdateWithoutUserInput> = z
  .object({
    hash: z.union([z.string(), z.lazy(() => StringFieldUpdateOperationsInputSchema)]).optional(),
  })
  .strict();

export const PasswordUncheckedUpdateWithoutUserInputSchema: z.ZodType<Prisma.PasswordUncheckedUpdateWithoutUserInput> = z
  .object({
    hash: z.union([z.string(), z.lazy(() => StringFieldUpdateOperationsInputSchema)]).optional(),
  })
  .strict();

export const ConnectionUpsertWithWhereUniqueWithoutUserInputSchema: z.ZodType<Prisma.ConnectionUpsertWithWhereUniqueWithoutUserInput> = z
  .object({
    where: z.lazy(() => ConnectionWhereUniqueInputSchema),
    update: z.union([z.lazy(() => ConnectionUpdateWithoutUserInputSchema), z.lazy(() => ConnectionUncheckedUpdateWithoutUserInputSchema)]),
    create: z.union([z.lazy(() => ConnectionCreateWithoutUserInputSchema), z.lazy(() => ConnectionUncheckedCreateWithoutUserInputSchema)]),
  })
  .strict();

export const ConnectionUpdateWithWhereUniqueWithoutUserInputSchema: z.ZodType<Prisma.ConnectionUpdateWithWhereUniqueWithoutUserInput> = z
  .object({
    where: z.lazy(() => ConnectionWhereUniqueInputSchema),
    data: z.union([z.lazy(() => ConnectionUpdateWithoutUserInputSchema), z.lazy(() => ConnectionUncheckedUpdateWithoutUserInputSchema)]),
  })
  .strict();

export const ConnectionUpdateManyWithWhereWithoutUserInputSchema: z.ZodType<Prisma.ConnectionUpdateManyWithWhereWithoutUserInput> = z
  .object({
    where: z.lazy(() => ConnectionScalarWhereInputSchema),
    data: z.union([z.lazy(() => ConnectionUpdateManyMutationInputSchema), z.lazy(() => ConnectionUncheckedUpdateManyWithoutUserInputSchema)]),
  })
  .strict();

export const ConnectionScalarWhereInputSchema: z.ZodType<Prisma.ConnectionScalarWhereInput> = z
  .object({
    AND: z.union([z.lazy(() => ConnectionScalarWhereInputSchema), z.lazy(() => ConnectionScalarWhereInputSchema).array()]).optional(),
    OR: z
      .lazy(() => ConnectionScalarWhereInputSchema)
      .array()
      .optional(),
    NOT: z.union([z.lazy(() => ConnectionScalarWhereInputSchema), z.lazy(() => ConnectionScalarWhereInputSchema).array()]).optional(),
    id: z.union([z.lazy(() => StringFilterSchema), z.string()]).optional(),
    providerName: z.union([z.lazy(() => StringFilterSchema), z.string()]).optional(),
    providerId: z.union([z.lazy(() => StringFilterSchema), z.string()]).optional(),
    createdAt: z.union([z.lazy(() => DateTimeFilterSchema), z.coerce.date()]).optional(),
    updatedAt: z.union([z.lazy(() => DateTimeFilterSchema), z.coerce.date()]).optional(),
    userId: z.union([z.lazy(() => IntFilterSchema), z.number()]).optional(),
  })
  .strict();

export const DocUpsertWithWhereUniqueWithoutOwnerInputSchema: z.ZodType<Prisma.DocUpsertWithWhereUniqueWithoutOwnerInput> = z
  .object({
    where: z.lazy(() => DocWhereUniqueInputSchema),
    update: z.union([z.lazy(() => DocUpdateWithoutOwnerInputSchema), z.lazy(() => DocUncheckedUpdateWithoutOwnerInputSchema)]),
    create: z.union([z.lazy(() => DocCreateWithoutOwnerInputSchema), z.lazy(() => DocUncheckedCreateWithoutOwnerInputSchema)]),
  })
  .strict();

export const DocUpdateWithWhereUniqueWithoutOwnerInputSchema: z.ZodType<Prisma.DocUpdateWithWhereUniqueWithoutOwnerInput> = z
  .object({
    where: z.lazy(() => DocWhereUniqueInputSchema),
    data: z.union([z.lazy(() => DocUpdateWithoutOwnerInputSchema), z.lazy(() => DocUncheckedUpdateWithoutOwnerInputSchema)]),
  })
  .strict();

export const DocUpdateManyWithWhereWithoutOwnerInputSchema: z.ZodType<Prisma.DocUpdateManyWithWhereWithoutOwnerInput> = z
  .object({
    where: z.lazy(() => DocScalarWhereInputSchema),
    data: z.union([z.lazy(() => DocUpdateManyMutationInputSchema), z.lazy(() => DocUncheckedUpdateManyWithoutOwnerInputSchema)]),
  })
  .strict();

export const DocScalarWhereInputSchema: z.ZodType<Prisma.DocScalarWhereInput> = z
  .object({
    AND: z.union([z.lazy(() => DocScalarWhereInputSchema), z.lazy(() => DocScalarWhereInputSchema).array()]).optional(),
    OR: z
      .lazy(() => DocScalarWhereInputSchema)
      .array()
      .optional(),
    NOT: z.union([z.lazy(() => DocScalarWhereInputSchema), z.lazy(() => DocScalarWhereInputSchema).array()]).optional(),
    id: z.union([z.lazy(() => StringFilterSchema), z.string()]).optional(),
    title: z.union([z.lazy(() => StringFilterSchema), z.string()]).optional(),
    content: z.union([z.lazy(() => StringFilterSchema), z.string()]).optional(),
    contentBinary: z
      .union([z.lazy(() => BytesNullableFilterSchema), z.instanceof(Buffer)])
      .optional()
      .nullable(),
    isArchived: z.union([z.lazy(() => BoolFilterSchema), z.boolean()]).optional(),
    isStarred: z.union([z.lazy(() => BoolFilterSchema), z.boolean()]).optional(),
    createdAt: z.union([z.lazy(() => DateTimeFilterSchema), z.coerce.date()]).optional(),
    updatedAt: z.union([z.lazy(() => DateTimeFilterSchema), z.coerce.date()]).optional(),
    ownerId: z.union([z.lazy(() => IntFilterSchema), z.number()]).optional(),
    parentId: z
      .union([z.lazy(() => StringNullableFilterSchema), z.string()])
      .optional()
      .nullable(),
    coverImageId: z
      .union([z.lazy(() => StringNullableFilterSchema), z.string()])
      .optional()
      .nullable(),
    position: z.union([z.lazy(() => IntFilterSchema), z.number()]).optional(),
  })
  .strict();

export const DocShareUpsertWithWhereUniqueWithoutSharedToInputSchema: z.ZodType<Prisma.DocShareUpsertWithWhereUniqueWithoutSharedToInput> = z
  .object({
    where: z.lazy(() => DocShareWhereUniqueInputSchema),
    update: z.union([z.lazy(() => DocShareUpdateWithoutSharedToInputSchema), z.lazy(() => DocShareUncheckedUpdateWithoutSharedToInputSchema)]),
    create: z.union([z.lazy(() => DocShareCreateWithoutSharedToInputSchema), z.lazy(() => DocShareUncheckedCreateWithoutSharedToInputSchema)]),
  })
  .strict();

export const DocShareUpdateWithWhereUniqueWithoutSharedToInputSchema: z.ZodType<Prisma.DocShareUpdateWithWhereUniqueWithoutSharedToInput> = z
  .object({
    where: z.lazy(() => DocShareWhereUniqueInputSchema),
    data: z.union([z.lazy(() => DocShareUpdateWithoutSharedToInputSchema), z.lazy(() => DocShareUncheckedUpdateWithoutSharedToInputSchema)]),
  })
  .strict();

export const DocShareUpdateManyWithWhereWithoutSharedToInputSchema: z.ZodType<Prisma.DocShareUpdateManyWithWhereWithoutSharedToInput> = z
  .object({
    where: z.lazy(() => DocShareScalarWhereInputSchema),
    data: z.union([z.lazy(() => DocShareUpdateManyMutationInputSchema), z.lazy(() => DocShareUncheckedUpdateManyWithoutSharedToInputSchema)]),
  })
  .strict();

export const DocShareScalarWhereInputSchema: z.ZodType<Prisma.DocShareScalarWhereInput> = z
  .object({
    AND: z.union([z.lazy(() => DocShareScalarWhereInputSchema), z.lazy(() => DocShareScalarWhereInputSchema).array()]).optional(),
    OR: z
      .lazy(() => DocShareScalarWhereInputSchema)
      .array()
      .optional(),
    NOT: z.union([z.lazy(() => DocShareScalarWhereInputSchema), z.lazy(() => DocShareScalarWhereInputSchema).array()]).optional(),
    id: z.union([z.lazy(() => StringFilterSchema), z.string()]).optional(),
    docId: z.union([z.lazy(() => StringFilterSchema), z.string()]).optional(),
    authorId: z.union([z.lazy(() => IntFilterSchema), z.number()]).optional(),
    userId: z.union([z.lazy(() => IntFilterSchema), z.number()]).optional(),
    permission: z.union([z.lazy(() => StringFilterSchema), z.string()]).optional(),
    noticeType: z.union([z.lazy(() => StringFilterSchema), z.string()]).optional(),
    createdAt: z.union([z.lazy(() => DateTimeFilterSchema), z.coerce.date()]).optional(),
    updatedAt: z.union([z.lazy(() => DateTimeFilterSchema), z.coerce.date()]).optional(),
  })
  .strict();

export const DocShareUpsertWithWhereUniqueWithoutAuthorInputSchema: z.ZodType<Prisma.DocShareUpsertWithWhereUniqueWithoutAuthorInput> = z
  .object({
    where: z.lazy(() => DocShareWhereUniqueInputSchema),
    update: z.union([z.lazy(() => DocShareUpdateWithoutAuthorInputSchema), z.lazy(() => DocShareUncheckedUpdateWithoutAuthorInputSchema)]),
    create: z.union([z.lazy(() => DocShareCreateWithoutAuthorInputSchema), z.lazy(() => DocShareUncheckedCreateWithoutAuthorInputSchema)]),
  })
  .strict();

export const DocShareUpdateWithWhereUniqueWithoutAuthorInputSchema: z.ZodType<Prisma.DocShareUpdateWithWhereUniqueWithoutAuthorInput> = z
  .object({
    where: z.lazy(() => DocShareWhereUniqueInputSchema),
    data: z.union([z.lazy(() => DocShareUpdateWithoutAuthorInputSchema), z.lazy(() => DocShareUncheckedUpdateWithoutAuthorInputSchema)]),
  })
  .strict();

export const DocShareUpdateManyWithWhereWithoutAuthorInputSchema: z.ZodType<Prisma.DocShareUpdateManyWithWhereWithoutAuthorInput> = z
  .object({
    where: z.lazy(() => DocShareScalarWhereInputSchema),
    data: z.union([z.lazy(() => DocShareUpdateManyMutationInputSchema), z.lazy(() => DocShareUncheckedUpdateManyWithoutAuthorInputSchema)]),
  })
  .strict();

export const UserCreateWithoutPasswordInputSchema: z.ZodType<Prisma.UserCreateWithoutPasswordInput> = z
  .object({
    email: z.string(),
    displayName: z.string().optional().nullable(),
    imageUrl: z.string().optional().nullable(),
    emailVerified: z.coerce.date().optional().nullable(),
    status: z.string(),
    created_time: z.coerce.date().optional(),
    updated_time: z.coerce.date().optional(),
    hashedRefreshToken: z.string().optional().nullable(),
    connections: z.lazy(() => ConnectionCreateNestedManyWithoutUserInputSchema).optional(),
    docs: z.lazy(() => DocCreateNestedManyWithoutOwnerInputSchema).optional(),
    sharedDocs: z.lazy(() => DocShareCreateNestedManyWithoutSharedToInputSchema).optional(),
    DocShare: z.lazy(() => DocShareCreateNestedManyWithoutAuthorInputSchema).optional(),
  })
  .strict();

export const UserUncheckedCreateWithoutPasswordInputSchema: z.ZodType<Prisma.UserUncheckedCreateWithoutPasswordInput> = z
  .object({
    id: z.number().int().optional(),
    email: z.string(),
    displayName: z.string().optional().nullable(),
    imageUrl: z.string().optional().nullable(),
    emailVerified: z.coerce.date().optional().nullable(),
    status: z.string(),
    created_time: z.coerce.date().optional(),
    updated_time: z.coerce.date().optional(),
    hashedRefreshToken: z.string().optional().nullable(),
    connections: z.lazy(() => ConnectionUncheckedCreateNestedManyWithoutUserInputSchema).optional(),
    docs: z.lazy(() => DocUncheckedCreateNestedManyWithoutOwnerInputSchema).optional(),
    sharedDocs: z.lazy(() => DocShareUncheckedCreateNestedManyWithoutSharedToInputSchema).optional(),
    DocShare: z.lazy(() => DocShareUncheckedCreateNestedManyWithoutAuthorInputSchema).optional(),
  })
  .strict();

export const UserCreateOrConnectWithoutPasswordInputSchema: z.ZodType<Prisma.UserCreateOrConnectWithoutPasswordInput> = z
  .object({
    where: z.lazy(() => UserWhereUniqueInputSchema),
    create: z.union([z.lazy(() => UserCreateWithoutPasswordInputSchema), z.lazy(() => UserUncheckedCreateWithoutPasswordInputSchema)]),
  })
  .strict();

export const UserUpsertWithoutPasswordInputSchema: z.ZodType<Prisma.UserUpsertWithoutPasswordInput> = z
  .object({
    update: z.union([z.lazy(() => UserUpdateWithoutPasswordInputSchema), z.lazy(() => UserUncheckedUpdateWithoutPasswordInputSchema)]),
    create: z.union([z.lazy(() => UserCreateWithoutPasswordInputSchema), z.lazy(() => UserUncheckedCreateWithoutPasswordInputSchema)]),
    where: z.lazy(() => UserWhereInputSchema).optional(),
  })
  .strict();

export const UserUpdateToOneWithWhereWithoutPasswordInputSchema: z.ZodType<Prisma.UserUpdateToOneWithWhereWithoutPasswordInput> = z
  .object({
    where: z.lazy(() => UserWhereInputSchema).optional(),
    data: z.union([z.lazy(() => UserUpdateWithoutPasswordInputSchema), z.lazy(() => UserUncheckedUpdateWithoutPasswordInputSchema)]),
  })
  .strict();

export const UserUpdateWithoutPasswordInputSchema: z.ZodType<Prisma.UserUpdateWithoutPasswordInput> = z
  .object({
    email: z.union([z.string(), z.lazy(() => StringFieldUpdateOperationsInputSchema)]).optional(),
    displayName: z
      .union([z.string(), z.lazy(() => NullableStringFieldUpdateOperationsInputSchema)])
      .optional()
      .nullable(),
    imageUrl: z
      .union([z.string(), z.lazy(() => NullableStringFieldUpdateOperationsInputSchema)])
      .optional()
      .nullable(),
    emailVerified: z
      .union([z.coerce.date(), z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema)])
      .optional()
      .nullable(),
    status: z.union([z.string(), z.lazy(() => StringFieldUpdateOperationsInputSchema)]).optional(),
    created_time: z.union([z.coerce.date(), z.lazy(() => DateTimeFieldUpdateOperationsInputSchema)]).optional(),
    updated_time: z.union([z.coerce.date(), z.lazy(() => DateTimeFieldUpdateOperationsInputSchema)]).optional(),
    hashedRefreshToken: z
      .union([z.string(), z.lazy(() => NullableStringFieldUpdateOperationsInputSchema)])
      .optional()
      .nullable(),
    connections: z.lazy(() => ConnectionUpdateManyWithoutUserNestedInputSchema).optional(),
    docs: z.lazy(() => DocUpdateManyWithoutOwnerNestedInputSchema).optional(),
    sharedDocs: z.lazy(() => DocShareUpdateManyWithoutSharedToNestedInputSchema).optional(),
    DocShare: z.lazy(() => DocShareUpdateManyWithoutAuthorNestedInputSchema).optional(),
  })
  .strict();

export const UserUncheckedUpdateWithoutPasswordInputSchema: z.ZodType<Prisma.UserUncheckedUpdateWithoutPasswordInput> = z
  .object({
    id: z.union([z.number().int(), z.lazy(() => IntFieldUpdateOperationsInputSchema)]).optional(),
    email: z.union([z.string(), z.lazy(() => StringFieldUpdateOperationsInputSchema)]).optional(),
    displayName: z
      .union([z.string(), z.lazy(() => NullableStringFieldUpdateOperationsInputSchema)])
      .optional()
      .nullable(),
    imageUrl: z
      .union([z.string(), z.lazy(() => NullableStringFieldUpdateOperationsInputSchema)])
      .optional()
      .nullable(),
    emailVerified: z
      .union([z.coerce.date(), z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema)])
      .optional()
      .nullable(),
    status: z.union([z.string(), z.lazy(() => StringFieldUpdateOperationsInputSchema)]).optional(),
    created_time: z.union([z.coerce.date(), z.lazy(() => DateTimeFieldUpdateOperationsInputSchema)]).optional(),
    updated_time: z.union([z.coerce.date(), z.lazy(() => DateTimeFieldUpdateOperationsInputSchema)]).optional(),
    hashedRefreshToken: z
      .union([z.string(), z.lazy(() => NullableStringFieldUpdateOperationsInputSchema)])
      .optional()
      .nullable(),
    connections: z.lazy(() => ConnectionUncheckedUpdateManyWithoutUserNestedInputSchema).optional(),
    docs: z.lazy(() => DocUncheckedUpdateManyWithoutOwnerNestedInputSchema).optional(),
    sharedDocs: z.lazy(() => DocShareUncheckedUpdateManyWithoutSharedToNestedInputSchema).optional(),
    DocShare: z.lazy(() => DocShareUncheckedUpdateManyWithoutAuthorNestedInputSchema).optional(),
  })
  .strict();

export const UserCreateWithoutConnectionsInputSchema: z.ZodType<Prisma.UserCreateWithoutConnectionsInput> = z
  .object({
    email: z.string(),
    displayName: z.string().optional().nullable(),
    imageUrl: z.string().optional().nullable(),
    emailVerified: z.coerce.date().optional().nullable(),
    status: z.string(),
    created_time: z.coerce.date().optional(),
    updated_time: z.coerce.date().optional(),
    hashedRefreshToken: z.string().optional().nullable(),
    password: z.lazy(() => PasswordCreateNestedOneWithoutUserInputSchema).optional(),
    docs: z.lazy(() => DocCreateNestedManyWithoutOwnerInputSchema).optional(),
    sharedDocs: z.lazy(() => DocShareCreateNestedManyWithoutSharedToInputSchema).optional(),
    DocShare: z.lazy(() => DocShareCreateNestedManyWithoutAuthorInputSchema).optional(),
  })
  .strict();

export const UserUncheckedCreateWithoutConnectionsInputSchema: z.ZodType<Prisma.UserUncheckedCreateWithoutConnectionsInput> = z
  .object({
    id: z.number().int().optional(),
    email: z.string(),
    displayName: z.string().optional().nullable(),
    imageUrl: z.string().optional().nullable(),
    emailVerified: z.coerce.date().optional().nullable(),
    status: z.string(),
    created_time: z.coerce.date().optional(),
    updated_time: z.coerce.date().optional(),
    hashedRefreshToken: z.string().optional().nullable(),
    password: z.lazy(() => PasswordUncheckedCreateNestedOneWithoutUserInputSchema).optional(),
    docs: z.lazy(() => DocUncheckedCreateNestedManyWithoutOwnerInputSchema).optional(),
    sharedDocs: z.lazy(() => DocShareUncheckedCreateNestedManyWithoutSharedToInputSchema).optional(),
    DocShare: z.lazy(() => DocShareUncheckedCreateNestedManyWithoutAuthorInputSchema).optional(),
  })
  .strict();

export const UserCreateOrConnectWithoutConnectionsInputSchema: z.ZodType<Prisma.UserCreateOrConnectWithoutConnectionsInput> = z
  .object({
    where: z.lazy(() => UserWhereUniqueInputSchema),
    create: z.union([z.lazy(() => UserCreateWithoutConnectionsInputSchema), z.lazy(() => UserUncheckedCreateWithoutConnectionsInputSchema)]),
  })
  .strict();

export const UserUpsertWithoutConnectionsInputSchema: z.ZodType<Prisma.UserUpsertWithoutConnectionsInput> = z
  .object({
    update: z.union([z.lazy(() => UserUpdateWithoutConnectionsInputSchema), z.lazy(() => UserUncheckedUpdateWithoutConnectionsInputSchema)]),
    create: z.union([z.lazy(() => UserCreateWithoutConnectionsInputSchema), z.lazy(() => UserUncheckedCreateWithoutConnectionsInputSchema)]),
    where: z.lazy(() => UserWhereInputSchema).optional(),
  })
  .strict();

export const UserUpdateToOneWithWhereWithoutConnectionsInputSchema: z.ZodType<Prisma.UserUpdateToOneWithWhereWithoutConnectionsInput> = z
  .object({
    where: z.lazy(() => UserWhereInputSchema).optional(),
    data: z.union([z.lazy(() => UserUpdateWithoutConnectionsInputSchema), z.lazy(() => UserUncheckedUpdateWithoutConnectionsInputSchema)]),
  })
  .strict();

export const UserUpdateWithoutConnectionsInputSchema: z.ZodType<Prisma.UserUpdateWithoutConnectionsInput> = z
  .object({
    email: z.union([z.string(), z.lazy(() => StringFieldUpdateOperationsInputSchema)]).optional(),
    displayName: z
      .union([z.string(), z.lazy(() => NullableStringFieldUpdateOperationsInputSchema)])
      .optional()
      .nullable(),
    imageUrl: z
      .union([z.string(), z.lazy(() => NullableStringFieldUpdateOperationsInputSchema)])
      .optional()
      .nullable(),
    emailVerified: z
      .union([z.coerce.date(), z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema)])
      .optional()
      .nullable(),
    status: z.union([z.string(), z.lazy(() => StringFieldUpdateOperationsInputSchema)]).optional(),
    created_time: z.union([z.coerce.date(), z.lazy(() => DateTimeFieldUpdateOperationsInputSchema)]).optional(),
    updated_time: z.union([z.coerce.date(), z.lazy(() => DateTimeFieldUpdateOperationsInputSchema)]).optional(),
    hashedRefreshToken: z
      .union([z.string(), z.lazy(() => NullableStringFieldUpdateOperationsInputSchema)])
      .optional()
      .nullable(),
    password: z.lazy(() => PasswordUpdateOneWithoutUserNestedInputSchema).optional(),
    docs: z.lazy(() => DocUpdateManyWithoutOwnerNestedInputSchema).optional(),
    sharedDocs: z.lazy(() => DocShareUpdateManyWithoutSharedToNestedInputSchema).optional(),
    DocShare: z.lazy(() => DocShareUpdateManyWithoutAuthorNestedInputSchema).optional(),
  })
  .strict();

export const UserUncheckedUpdateWithoutConnectionsInputSchema: z.ZodType<Prisma.UserUncheckedUpdateWithoutConnectionsInput> = z
  .object({
    id: z.union([z.number().int(), z.lazy(() => IntFieldUpdateOperationsInputSchema)]).optional(),
    email: z.union([z.string(), z.lazy(() => StringFieldUpdateOperationsInputSchema)]).optional(),
    displayName: z
      .union([z.string(), z.lazy(() => NullableStringFieldUpdateOperationsInputSchema)])
      .optional()
      .nullable(),
    imageUrl: z
      .union([z.string(), z.lazy(() => NullableStringFieldUpdateOperationsInputSchema)])
      .optional()
      .nullable(),
    emailVerified: z
      .union([z.coerce.date(), z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema)])
      .optional()
      .nullable(),
    status: z.union([z.string(), z.lazy(() => StringFieldUpdateOperationsInputSchema)]).optional(),
    created_time: z.union([z.coerce.date(), z.lazy(() => DateTimeFieldUpdateOperationsInputSchema)]).optional(),
    updated_time: z.union([z.coerce.date(), z.lazy(() => DateTimeFieldUpdateOperationsInputSchema)]).optional(),
    hashedRefreshToken: z
      .union([z.string(), z.lazy(() => NullableStringFieldUpdateOperationsInputSchema)])
      .optional()
      .nullable(),
    password: z.lazy(() => PasswordUncheckedUpdateOneWithoutUserNestedInputSchema).optional(),
    docs: z.lazy(() => DocUncheckedUpdateManyWithoutOwnerNestedInputSchema).optional(),
    sharedDocs: z.lazy(() => DocShareUncheckedUpdateManyWithoutSharedToNestedInputSchema).optional(),
    DocShare: z.lazy(() => DocShareUncheckedUpdateManyWithoutAuthorNestedInputSchema).optional(),
  })
  .strict();

export const UserCreateWithoutDocsInputSchema: z.ZodType<Prisma.UserCreateWithoutDocsInput> = z
  .object({
    email: z.string(),
    displayName: z.string().optional().nullable(),
    imageUrl: z.string().optional().nullable(),
    emailVerified: z.coerce.date().optional().nullable(),
    status: z.string(),
    created_time: z.coerce.date().optional(),
    updated_time: z.coerce.date().optional(),
    hashedRefreshToken: z.string().optional().nullable(),
    password: z.lazy(() => PasswordCreateNestedOneWithoutUserInputSchema).optional(),
    connections: z.lazy(() => ConnectionCreateNestedManyWithoutUserInputSchema).optional(),
    sharedDocs: z.lazy(() => DocShareCreateNestedManyWithoutSharedToInputSchema).optional(),
    DocShare: z.lazy(() => DocShareCreateNestedManyWithoutAuthorInputSchema).optional(),
  })
  .strict();

export const UserUncheckedCreateWithoutDocsInputSchema: z.ZodType<Prisma.UserUncheckedCreateWithoutDocsInput> = z
  .object({
    id: z.number().int().optional(),
    email: z.string(),
    displayName: z.string().optional().nullable(),
    imageUrl: z.string().optional().nullable(),
    emailVerified: z.coerce.date().optional().nullable(),
    status: z.string(),
    created_time: z.coerce.date().optional(),
    updated_time: z.coerce.date().optional(),
    hashedRefreshToken: z.string().optional().nullable(),
    password: z.lazy(() => PasswordUncheckedCreateNestedOneWithoutUserInputSchema).optional(),
    connections: z.lazy(() => ConnectionUncheckedCreateNestedManyWithoutUserInputSchema).optional(),
    sharedDocs: z.lazy(() => DocShareUncheckedCreateNestedManyWithoutSharedToInputSchema).optional(),
    DocShare: z.lazy(() => DocShareUncheckedCreateNestedManyWithoutAuthorInputSchema).optional(),
  })
  .strict();

export const UserCreateOrConnectWithoutDocsInputSchema: z.ZodType<Prisma.UserCreateOrConnectWithoutDocsInput> = z
  .object({
    where: z.lazy(() => UserWhereUniqueInputSchema),
    create: z.union([z.lazy(() => UserCreateWithoutDocsInputSchema), z.lazy(() => UserUncheckedCreateWithoutDocsInputSchema)]),
  })
  .strict();

export const DocCreateWithoutChildrenInputSchema: z.ZodType<Prisma.DocCreateWithoutChildrenInput> = z
  .object({
    id: z.string().cuid().optional(),
    title: z.string(),
    content: z.string(),
    contentBinary: z.instanceof(Buffer).optional().nullable(),
    isArchived: z.boolean().optional(),
    isStarred: z.boolean().optional(),
    createdAt: z.coerce.date().optional(),
    updatedAt: z.coerce.date().optional(),
    coverImageId: z.string().optional().nullable(),
    position: z.number().int().optional(),
    owner: z.lazy(() => UserCreateNestedOneWithoutDocsInputSchema),
    parent: z.lazy(() => DocCreateNestedOneWithoutChildrenInputSchema).optional(),
    coverImage: z.lazy(() => CoverImageCreateNestedOneWithoutDocInputSchema).optional(),
    sharedWith: z.lazy(() => DocShareCreateNestedManyWithoutDocInputSchema).optional(),
  })
  .strict();

export const DocUncheckedCreateWithoutChildrenInputSchema: z.ZodType<Prisma.DocUncheckedCreateWithoutChildrenInput> = z
  .object({
    id: z.string().cuid().optional(),
    title: z.string(),
    content: z.string(),
    contentBinary: z.instanceof(Buffer).optional().nullable(),
    isArchived: z.boolean().optional(),
    isStarred: z.boolean().optional(),
    createdAt: z.coerce.date().optional(),
    updatedAt: z.coerce.date().optional(),
    ownerId: z.number().int(),
    parentId: z.string().optional().nullable(),
    coverImageId: z.string().optional().nullable(),
    position: z.number().int().optional(),
    coverImage: z.lazy(() => CoverImageUncheckedCreateNestedOneWithoutDocInputSchema).optional(),
    sharedWith: z.lazy(() => DocShareUncheckedCreateNestedManyWithoutDocInputSchema).optional(),
  })
  .strict();

export const DocCreateOrConnectWithoutChildrenInputSchema: z.ZodType<Prisma.DocCreateOrConnectWithoutChildrenInput> = z
  .object({
    where: z.lazy(() => DocWhereUniqueInputSchema),
    create: z.union([z.lazy(() => DocCreateWithoutChildrenInputSchema), z.lazy(() => DocUncheckedCreateWithoutChildrenInputSchema)]),
  })
  .strict();

export const DocCreateWithoutParentInputSchema: z.ZodType<Prisma.DocCreateWithoutParentInput> = z
  .object({
    id: z.string().cuid().optional(),
    title: z.string(),
    content: z.string(),
    contentBinary: z.instanceof(Buffer).optional().nullable(),
    isArchived: z.boolean().optional(),
    isStarred: z.boolean().optional(),
    createdAt: z.coerce.date().optional(),
    updatedAt: z.coerce.date().optional(),
    coverImageId: z.string().optional().nullable(),
    position: z.number().int().optional(),
    owner: z.lazy(() => UserCreateNestedOneWithoutDocsInputSchema),
    children: z.lazy(() => DocCreateNestedManyWithoutParentInputSchema).optional(),
    coverImage: z.lazy(() => CoverImageCreateNestedOneWithoutDocInputSchema).optional(),
    sharedWith: z.lazy(() => DocShareCreateNestedManyWithoutDocInputSchema).optional(),
  })
  .strict();

export const DocUncheckedCreateWithoutParentInputSchema: z.ZodType<Prisma.DocUncheckedCreateWithoutParentInput> = z
  .object({
    id: z.string().cuid().optional(),
    title: z.string(),
    content: z.string(),
    contentBinary: z.instanceof(Buffer).optional().nullable(),
    isArchived: z.boolean().optional(),
    isStarred: z.boolean().optional(),
    createdAt: z.coerce.date().optional(),
    updatedAt: z.coerce.date().optional(),
    ownerId: z.number().int(),
    coverImageId: z.string().optional().nullable(),
    position: z.number().int().optional(),
    children: z.lazy(() => DocUncheckedCreateNestedManyWithoutParentInputSchema).optional(),
    coverImage: z.lazy(() => CoverImageUncheckedCreateNestedOneWithoutDocInputSchema).optional(),
    sharedWith: z.lazy(() => DocShareUncheckedCreateNestedManyWithoutDocInputSchema).optional(),
  })
  .strict();

export const DocCreateOrConnectWithoutParentInputSchema: z.ZodType<Prisma.DocCreateOrConnectWithoutParentInput> = z
  .object({
    where: z.lazy(() => DocWhereUniqueInputSchema),
    create: z.union([z.lazy(() => DocCreateWithoutParentInputSchema), z.lazy(() => DocUncheckedCreateWithoutParentInputSchema)]),
  })
  .strict();

export const DocCreateManyParentInputEnvelopeSchema: z.ZodType<Prisma.DocCreateManyParentInputEnvelope> = z
  .object({
    data: z.union([z.lazy(() => DocCreateManyParentInputSchema), z.lazy(() => DocCreateManyParentInputSchema).array()]),
    skipDuplicates: z.boolean().optional(),
  })
  .strict();

export const CoverImageCreateWithoutDocInputSchema: z.ZodType<Prisma.CoverImageCreateWithoutDocInput> = z
  .object({
    id: z.string().cuid().optional(),
    url: z.string(),
    scrollY: z.number(),
  })
  .strict();

export const CoverImageUncheckedCreateWithoutDocInputSchema: z.ZodType<Prisma.CoverImageUncheckedCreateWithoutDocInput> = z
  .object({
    id: z.string().cuid().optional(),
    url: z.string(),
    scrollY: z.number(),
  })
  .strict();

export const CoverImageCreateOrConnectWithoutDocInputSchema: z.ZodType<Prisma.CoverImageCreateOrConnectWithoutDocInput> = z
  .object({
    where: z.lazy(() => CoverImageWhereUniqueInputSchema),
    create: z.union([z.lazy(() => CoverImageCreateWithoutDocInputSchema), z.lazy(() => CoverImageUncheckedCreateWithoutDocInputSchema)]),
  })
  .strict();

export const DocShareCreateWithoutDocInputSchema: z.ZodType<Prisma.DocShareCreateWithoutDocInput> = z
  .object({
    id: z.string().cuid().optional(),
    permission: z.string().optional(),
    noticeType: z.string().optional(),
    createdAt: z.coerce.date().optional(),
    updatedAt: z.coerce.date().optional(),
    author: z.lazy(() => UserCreateNestedOneWithoutDocShareInputSchema),
    sharedTo: z.lazy(() => UserCreateNestedOneWithoutSharedDocsInputSchema),
  })
  .strict();

export const DocShareUncheckedCreateWithoutDocInputSchema: z.ZodType<Prisma.DocShareUncheckedCreateWithoutDocInput> = z
  .object({
    id: z.string().cuid().optional(),
    authorId: z.number().int(),
    userId: z.number().int(),
    permission: z.string().optional(),
    noticeType: z.string().optional(),
    createdAt: z.coerce.date().optional(),
    updatedAt: z.coerce.date().optional(),
  })
  .strict();

export const DocShareCreateOrConnectWithoutDocInputSchema: z.ZodType<Prisma.DocShareCreateOrConnectWithoutDocInput> = z
  .object({
    where: z.lazy(() => DocShareWhereUniqueInputSchema),
    create: z.union([z.lazy(() => DocShareCreateWithoutDocInputSchema), z.lazy(() => DocShareUncheckedCreateWithoutDocInputSchema)]),
  })
  .strict();

export const DocShareCreateManyDocInputEnvelopeSchema: z.ZodType<Prisma.DocShareCreateManyDocInputEnvelope> = z
  .object({
    data: z.union([z.lazy(() => DocShareCreateManyDocInputSchema), z.lazy(() => DocShareCreateManyDocInputSchema).array()]),
    skipDuplicates: z.boolean().optional(),
  })
  .strict();

export const UserUpsertWithoutDocsInputSchema: z.ZodType<Prisma.UserUpsertWithoutDocsInput> = z
  .object({
    update: z.union([z.lazy(() => UserUpdateWithoutDocsInputSchema), z.lazy(() => UserUncheckedUpdateWithoutDocsInputSchema)]),
    create: z.union([z.lazy(() => UserCreateWithoutDocsInputSchema), z.lazy(() => UserUncheckedCreateWithoutDocsInputSchema)]),
    where: z.lazy(() => UserWhereInputSchema).optional(),
  })
  .strict();

export const UserUpdateToOneWithWhereWithoutDocsInputSchema: z.ZodType<Prisma.UserUpdateToOneWithWhereWithoutDocsInput> = z
  .object({
    where: z.lazy(() => UserWhereInputSchema).optional(),
    data: z.union([z.lazy(() => UserUpdateWithoutDocsInputSchema), z.lazy(() => UserUncheckedUpdateWithoutDocsInputSchema)]),
  })
  .strict();

export const UserUpdateWithoutDocsInputSchema: z.ZodType<Prisma.UserUpdateWithoutDocsInput> = z
  .object({
    email: z.union([z.string(), z.lazy(() => StringFieldUpdateOperationsInputSchema)]).optional(),
    displayName: z
      .union([z.string(), z.lazy(() => NullableStringFieldUpdateOperationsInputSchema)])
      .optional()
      .nullable(),
    imageUrl: z
      .union([z.string(), z.lazy(() => NullableStringFieldUpdateOperationsInputSchema)])
      .optional()
      .nullable(),
    emailVerified: z
      .union([z.coerce.date(), z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema)])
      .optional()
      .nullable(),
    status: z.union([z.string(), z.lazy(() => StringFieldUpdateOperationsInputSchema)]).optional(),
    created_time: z.union([z.coerce.date(), z.lazy(() => DateTimeFieldUpdateOperationsInputSchema)]).optional(),
    updated_time: z.union([z.coerce.date(), z.lazy(() => DateTimeFieldUpdateOperationsInputSchema)]).optional(),
    hashedRefreshToken: z
      .union([z.string(), z.lazy(() => NullableStringFieldUpdateOperationsInputSchema)])
      .optional()
      .nullable(),
    password: z.lazy(() => PasswordUpdateOneWithoutUserNestedInputSchema).optional(),
    connections: z.lazy(() => ConnectionUpdateManyWithoutUserNestedInputSchema).optional(),
    sharedDocs: z.lazy(() => DocShareUpdateManyWithoutSharedToNestedInputSchema).optional(),
    DocShare: z.lazy(() => DocShareUpdateManyWithoutAuthorNestedInputSchema).optional(),
  })
  .strict();

export const UserUncheckedUpdateWithoutDocsInputSchema: z.ZodType<Prisma.UserUncheckedUpdateWithoutDocsInput> = z
  .object({
    id: z.union([z.number().int(), z.lazy(() => IntFieldUpdateOperationsInputSchema)]).optional(),
    email: z.union([z.string(), z.lazy(() => StringFieldUpdateOperationsInputSchema)]).optional(),
    displayName: z
      .union([z.string(), z.lazy(() => NullableStringFieldUpdateOperationsInputSchema)])
      .optional()
      .nullable(),
    imageUrl: z
      .union([z.string(), z.lazy(() => NullableStringFieldUpdateOperationsInputSchema)])
      .optional()
      .nullable(),
    emailVerified: z
      .union([z.coerce.date(), z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema)])
      .optional()
      .nullable(),
    status: z.union([z.string(), z.lazy(() => StringFieldUpdateOperationsInputSchema)]).optional(),
    created_time: z.union([z.coerce.date(), z.lazy(() => DateTimeFieldUpdateOperationsInputSchema)]).optional(),
    updated_time: z.union([z.coerce.date(), z.lazy(() => DateTimeFieldUpdateOperationsInputSchema)]).optional(),
    hashedRefreshToken: z
      .union([z.string(), z.lazy(() => NullableStringFieldUpdateOperationsInputSchema)])
      .optional()
      .nullable(),
    password: z.lazy(() => PasswordUncheckedUpdateOneWithoutUserNestedInputSchema).optional(),
    connections: z.lazy(() => ConnectionUncheckedUpdateManyWithoutUserNestedInputSchema).optional(),
    sharedDocs: z.lazy(() => DocShareUncheckedUpdateManyWithoutSharedToNestedInputSchema).optional(),
    DocShare: z.lazy(() => DocShareUncheckedUpdateManyWithoutAuthorNestedInputSchema).optional(),
  })
  .strict();

export const DocUpsertWithoutChildrenInputSchema: z.ZodType<Prisma.DocUpsertWithoutChildrenInput> = z
  .object({
    update: z.union([z.lazy(() => DocUpdateWithoutChildrenInputSchema), z.lazy(() => DocUncheckedUpdateWithoutChildrenInputSchema)]),
    create: z.union([z.lazy(() => DocCreateWithoutChildrenInputSchema), z.lazy(() => DocUncheckedCreateWithoutChildrenInputSchema)]),
    where: z.lazy(() => DocWhereInputSchema).optional(),
  })
  .strict();

export const DocUpdateToOneWithWhereWithoutChildrenInputSchema: z.ZodType<Prisma.DocUpdateToOneWithWhereWithoutChildrenInput> = z
  .object({
    where: z.lazy(() => DocWhereInputSchema).optional(),
    data: z.union([z.lazy(() => DocUpdateWithoutChildrenInputSchema), z.lazy(() => DocUncheckedUpdateWithoutChildrenInputSchema)]),
  })
  .strict();

export const DocUpdateWithoutChildrenInputSchema: z.ZodType<Prisma.DocUpdateWithoutChildrenInput> = z
  .object({
    id: z.union([z.string().cuid(), z.lazy(() => StringFieldUpdateOperationsInputSchema)]).optional(),
    title: z.union([z.string(), z.lazy(() => StringFieldUpdateOperationsInputSchema)]).optional(),
    content: z.union([z.string(), z.lazy(() => StringFieldUpdateOperationsInputSchema)]).optional(),
    contentBinary: z
      .union([z.instanceof(Buffer), z.lazy(() => NullableBytesFieldUpdateOperationsInputSchema)])
      .optional()
      .nullable(),
    isArchived: z.union([z.boolean(), z.lazy(() => BoolFieldUpdateOperationsInputSchema)]).optional(),
    isStarred: z.union([z.boolean(), z.lazy(() => BoolFieldUpdateOperationsInputSchema)]).optional(),
    createdAt: z.union([z.coerce.date(), z.lazy(() => DateTimeFieldUpdateOperationsInputSchema)]).optional(),
    updatedAt: z.union([z.coerce.date(), z.lazy(() => DateTimeFieldUpdateOperationsInputSchema)]).optional(),
    coverImageId: z
      .union([z.string(), z.lazy(() => NullableStringFieldUpdateOperationsInputSchema)])
      .optional()
      .nullable(),
    position: z.union([z.number().int(), z.lazy(() => IntFieldUpdateOperationsInputSchema)]).optional(),
    owner: z.lazy(() => UserUpdateOneRequiredWithoutDocsNestedInputSchema).optional(),
    parent: z.lazy(() => DocUpdateOneWithoutChildrenNestedInputSchema).optional(),
    coverImage: z.lazy(() => CoverImageUpdateOneWithoutDocNestedInputSchema).optional(),
    sharedWith: z.lazy(() => DocShareUpdateManyWithoutDocNestedInputSchema).optional(),
  })
  .strict();

export const DocUncheckedUpdateWithoutChildrenInputSchema: z.ZodType<Prisma.DocUncheckedUpdateWithoutChildrenInput> = z
  .object({
    id: z.union([z.string().cuid(), z.lazy(() => StringFieldUpdateOperationsInputSchema)]).optional(),
    title: z.union([z.string(), z.lazy(() => StringFieldUpdateOperationsInputSchema)]).optional(),
    content: z.union([z.string(), z.lazy(() => StringFieldUpdateOperationsInputSchema)]).optional(),
    contentBinary: z
      .union([z.instanceof(Buffer), z.lazy(() => NullableBytesFieldUpdateOperationsInputSchema)])
      .optional()
      .nullable(),
    isArchived: z.union([z.boolean(), z.lazy(() => BoolFieldUpdateOperationsInputSchema)]).optional(),
    isStarred: z.union([z.boolean(), z.lazy(() => BoolFieldUpdateOperationsInputSchema)]).optional(),
    createdAt: z.union([z.coerce.date(), z.lazy(() => DateTimeFieldUpdateOperationsInputSchema)]).optional(),
    updatedAt: z.union([z.coerce.date(), z.lazy(() => DateTimeFieldUpdateOperationsInputSchema)]).optional(),
    ownerId: z.union([z.number().int(), z.lazy(() => IntFieldUpdateOperationsInputSchema)]).optional(),
    parentId: z
      .union([z.string(), z.lazy(() => NullableStringFieldUpdateOperationsInputSchema)])
      .optional()
      .nullable(),
    coverImageId: z
      .union([z.string(), z.lazy(() => NullableStringFieldUpdateOperationsInputSchema)])
      .optional()
      .nullable(),
    position: z.union([z.number().int(), z.lazy(() => IntFieldUpdateOperationsInputSchema)]).optional(),
    coverImage: z.lazy(() => CoverImageUncheckedUpdateOneWithoutDocNestedInputSchema).optional(),
    sharedWith: z.lazy(() => DocShareUncheckedUpdateManyWithoutDocNestedInputSchema).optional(),
  })
  .strict();

export const DocUpsertWithWhereUniqueWithoutParentInputSchema: z.ZodType<Prisma.DocUpsertWithWhereUniqueWithoutParentInput> = z
  .object({
    where: z.lazy(() => DocWhereUniqueInputSchema),
    update: z.union([z.lazy(() => DocUpdateWithoutParentInputSchema), z.lazy(() => DocUncheckedUpdateWithoutParentInputSchema)]),
    create: z.union([z.lazy(() => DocCreateWithoutParentInputSchema), z.lazy(() => DocUncheckedCreateWithoutParentInputSchema)]),
  })
  .strict();

export const DocUpdateWithWhereUniqueWithoutParentInputSchema: z.ZodType<Prisma.DocUpdateWithWhereUniqueWithoutParentInput> = z
  .object({
    where: z.lazy(() => DocWhereUniqueInputSchema),
    data: z.union([z.lazy(() => DocUpdateWithoutParentInputSchema), z.lazy(() => DocUncheckedUpdateWithoutParentInputSchema)]),
  })
  .strict();

export const DocUpdateManyWithWhereWithoutParentInputSchema: z.ZodType<Prisma.DocUpdateManyWithWhereWithoutParentInput> = z
  .object({
    where: z.lazy(() => DocScalarWhereInputSchema),
    data: z.union([z.lazy(() => DocUpdateManyMutationInputSchema), z.lazy(() => DocUncheckedUpdateManyWithoutParentInputSchema)]),
  })
  .strict();

export const CoverImageUpsertWithoutDocInputSchema: z.ZodType<Prisma.CoverImageUpsertWithoutDocInput> = z
  .object({
    update: z.union([z.lazy(() => CoverImageUpdateWithoutDocInputSchema), z.lazy(() => CoverImageUncheckedUpdateWithoutDocInputSchema)]),
    create: z.union([z.lazy(() => CoverImageCreateWithoutDocInputSchema), z.lazy(() => CoverImageUncheckedCreateWithoutDocInputSchema)]),
    where: z.lazy(() => CoverImageWhereInputSchema).optional(),
  })
  .strict();

export const CoverImageUpdateToOneWithWhereWithoutDocInputSchema: z.ZodType<Prisma.CoverImageUpdateToOneWithWhereWithoutDocInput> = z
  .object({
    where: z.lazy(() => CoverImageWhereInputSchema).optional(),
    data: z.union([z.lazy(() => CoverImageUpdateWithoutDocInputSchema), z.lazy(() => CoverImageUncheckedUpdateWithoutDocInputSchema)]),
  })
  .strict();

export const CoverImageUpdateWithoutDocInputSchema: z.ZodType<Prisma.CoverImageUpdateWithoutDocInput> = z
  .object({
    id: z.union([z.string().cuid(), z.lazy(() => StringFieldUpdateOperationsInputSchema)]).optional(),
    url: z.union([z.string(), z.lazy(() => StringFieldUpdateOperationsInputSchema)]).optional(),
    scrollY: z.union([z.number(), z.lazy(() => FloatFieldUpdateOperationsInputSchema)]).optional(),
  })
  .strict();

export const CoverImageUncheckedUpdateWithoutDocInputSchema: z.ZodType<Prisma.CoverImageUncheckedUpdateWithoutDocInput> = z
  .object({
    id: z.union([z.string().cuid(), z.lazy(() => StringFieldUpdateOperationsInputSchema)]).optional(),
    url: z.union([z.string(), z.lazy(() => StringFieldUpdateOperationsInputSchema)]).optional(),
    scrollY: z.union([z.number(), z.lazy(() => FloatFieldUpdateOperationsInputSchema)]).optional(),
  })
  .strict();

export const DocShareUpsertWithWhereUniqueWithoutDocInputSchema: z.ZodType<Prisma.DocShareUpsertWithWhereUniqueWithoutDocInput> = z
  .object({
    where: z.lazy(() => DocShareWhereUniqueInputSchema),
    update: z.union([z.lazy(() => DocShareUpdateWithoutDocInputSchema), z.lazy(() => DocShareUncheckedUpdateWithoutDocInputSchema)]),
    create: z.union([z.lazy(() => DocShareCreateWithoutDocInputSchema), z.lazy(() => DocShareUncheckedCreateWithoutDocInputSchema)]),
  })
  .strict();

export const DocShareUpdateWithWhereUniqueWithoutDocInputSchema: z.ZodType<Prisma.DocShareUpdateWithWhereUniqueWithoutDocInput> = z
  .object({
    where: z.lazy(() => DocShareWhereUniqueInputSchema),
    data: z.union([z.lazy(() => DocShareUpdateWithoutDocInputSchema), z.lazy(() => DocShareUncheckedUpdateWithoutDocInputSchema)]),
  })
  .strict();

export const DocShareUpdateManyWithWhereWithoutDocInputSchema: z.ZodType<Prisma.DocShareUpdateManyWithWhereWithoutDocInput> = z
  .object({
    where: z.lazy(() => DocShareScalarWhereInputSchema),
    data: z.union([z.lazy(() => DocShareUpdateManyMutationInputSchema), z.lazy(() => DocShareUncheckedUpdateManyWithoutDocInputSchema)]),
  })
  .strict();

export const DocCreateWithoutCoverImageInputSchema: z.ZodType<Prisma.DocCreateWithoutCoverImageInput> = z
  .object({
    id: z.string().cuid().optional(),
    title: z.string(),
    content: z.string(),
    contentBinary: z.instanceof(Buffer).optional().nullable(),
    isArchived: z.boolean().optional(),
    isStarred: z.boolean().optional(),
    createdAt: z.coerce.date().optional(),
    updatedAt: z.coerce.date().optional(),
    coverImageId: z.string().optional().nullable(),
    position: z.number().int().optional(),
    owner: z.lazy(() => UserCreateNestedOneWithoutDocsInputSchema),
    parent: z.lazy(() => DocCreateNestedOneWithoutChildrenInputSchema).optional(),
    children: z.lazy(() => DocCreateNestedManyWithoutParentInputSchema).optional(),
    sharedWith: z.lazy(() => DocShareCreateNestedManyWithoutDocInputSchema).optional(),
  })
  .strict();

export const DocUncheckedCreateWithoutCoverImageInputSchema: z.ZodType<Prisma.DocUncheckedCreateWithoutCoverImageInput> = z
  .object({
    id: z.string().cuid().optional(),
    title: z.string(),
    content: z.string(),
    contentBinary: z.instanceof(Buffer).optional().nullable(),
    isArchived: z.boolean().optional(),
    isStarred: z.boolean().optional(),
    createdAt: z.coerce.date().optional(),
    updatedAt: z.coerce.date().optional(),
    ownerId: z.number().int(),
    parentId: z.string().optional().nullable(),
    coverImageId: z.string().optional().nullable(),
    position: z.number().int().optional(),
    children: z.lazy(() => DocUncheckedCreateNestedManyWithoutParentInputSchema).optional(),
    sharedWith: z.lazy(() => DocShareUncheckedCreateNestedManyWithoutDocInputSchema).optional(),
  })
  .strict();

export const DocCreateOrConnectWithoutCoverImageInputSchema: z.ZodType<Prisma.DocCreateOrConnectWithoutCoverImageInput> = z
  .object({
    where: z.lazy(() => DocWhereUniqueInputSchema),
    create: z.union([z.lazy(() => DocCreateWithoutCoverImageInputSchema), z.lazy(() => DocUncheckedCreateWithoutCoverImageInputSchema)]),
  })
  .strict();

export const DocUpsertWithoutCoverImageInputSchema: z.ZodType<Prisma.DocUpsertWithoutCoverImageInput> = z
  .object({
    update: z.union([z.lazy(() => DocUpdateWithoutCoverImageInputSchema), z.lazy(() => DocUncheckedUpdateWithoutCoverImageInputSchema)]),
    create: z.union([z.lazy(() => DocCreateWithoutCoverImageInputSchema), z.lazy(() => DocUncheckedCreateWithoutCoverImageInputSchema)]),
    where: z.lazy(() => DocWhereInputSchema).optional(),
  })
  .strict();

export const DocUpdateToOneWithWhereWithoutCoverImageInputSchema: z.ZodType<Prisma.DocUpdateToOneWithWhereWithoutCoverImageInput> = z
  .object({
    where: z.lazy(() => DocWhereInputSchema).optional(),
    data: z.union([z.lazy(() => DocUpdateWithoutCoverImageInputSchema), z.lazy(() => DocUncheckedUpdateWithoutCoverImageInputSchema)]),
  })
  .strict();

export const DocUpdateWithoutCoverImageInputSchema: z.ZodType<Prisma.DocUpdateWithoutCoverImageInput> = z
  .object({
    id: z.union([z.string().cuid(), z.lazy(() => StringFieldUpdateOperationsInputSchema)]).optional(),
    title: z.union([z.string(), z.lazy(() => StringFieldUpdateOperationsInputSchema)]).optional(),
    content: z.union([z.string(), z.lazy(() => StringFieldUpdateOperationsInputSchema)]).optional(),
    contentBinary: z
      .union([z.instanceof(Buffer), z.lazy(() => NullableBytesFieldUpdateOperationsInputSchema)])
      .optional()
      .nullable(),
    isArchived: z.union([z.boolean(), z.lazy(() => BoolFieldUpdateOperationsInputSchema)]).optional(),
    isStarred: z.union([z.boolean(), z.lazy(() => BoolFieldUpdateOperationsInputSchema)]).optional(),
    createdAt: z.union([z.coerce.date(), z.lazy(() => DateTimeFieldUpdateOperationsInputSchema)]).optional(),
    updatedAt: z.union([z.coerce.date(), z.lazy(() => DateTimeFieldUpdateOperationsInputSchema)]).optional(),
    coverImageId: z
      .union([z.string(), z.lazy(() => NullableStringFieldUpdateOperationsInputSchema)])
      .optional()
      .nullable(),
    position: z.union([z.number().int(), z.lazy(() => IntFieldUpdateOperationsInputSchema)]).optional(),
    owner: z.lazy(() => UserUpdateOneRequiredWithoutDocsNestedInputSchema).optional(),
    parent: z.lazy(() => DocUpdateOneWithoutChildrenNestedInputSchema).optional(),
    children: z.lazy(() => DocUpdateManyWithoutParentNestedInputSchema).optional(),
    sharedWith: z.lazy(() => DocShareUpdateManyWithoutDocNestedInputSchema).optional(),
  })
  .strict();

export const DocUncheckedUpdateWithoutCoverImageInputSchema: z.ZodType<Prisma.DocUncheckedUpdateWithoutCoverImageInput> = z
  .object({
    id: z.union([z.string().cuid(), z.lazy(() => StringFieldUpdateOperationsInputSchema)]).optional(),
    title: z.union([z.string(), z.lazy(() => StringFieldUpdateOperationsInputSchema)]).optional(),
    content: z.union([z.string(), z.lazy(() => StringFieldUpdateOperationsInputSchema)]).optional(),
    contentBinary: z
      .union([z.instanceof(Buffer), z.lazy(() => NullableBytesFieldUpdateOperationsInputSchema)])
      .optional()
      .nullable(),
    isArchived: z.union([z.boolean(), z.lazy(() => BoolFieldUpdateOperationsInputSchema)]).optional(),
    isStarred: z.union([z.boolean(), z.lazy(() => BoolFieldUpdateOperationsInputSchema)]).optional(),
    createdAt: z.union([z.coerce.date(), z.lazy(() => DateTimeFieldUpdateOperationsInputSchema)]).optional(),
    updatedAt: z.union([z.coerce.date(), z.lazy(() => DateTimeFieldUpdateOperationsInputSchema)]).optional(),
    ownerId: z.union([z.number().int(), z.lazy(() => IntFieldUpdateOperationsInputSchema)]).optional(),
    parentId: z
      .union([z.string(), z.lazy(() => NullableStringFieldUpdateOperationsInputSchema)])
      .optional()
      .nullable(),
    coverImageId: z
      .union([z.string(), z.lazy(() => NullableStringFieldUpdateOperationsInputSchema)])
      .optional()
      .nullable(),
    position: z.union([z.number().int(), z.lazy(() => IntFieldUpdateOperationsInputSchema)]).optional(),
    children: z.lazy(() => DocUncheckedUpdateManyWithoutParentNestedInputSchema).optional(),
    sharedWith: z.lazy(() => DocShareUncheckedUpdateManyWithoutDocNestedInputSchema).optional(),
  })
  .strict();

export const DocCreateWithoutSharedWithInputSchema: z.ZodType<Prisma.DocCreateWithoutSharedWithInput> = z
  .object({
    id: z.string().cuid().optional(),
    title: z.string(),
    content: z.string(),
    contentBinary: z.instanceof(Buffer).optional().nullable(),
    isArchived: z.boolean().optional(),
    isStarred: z.boolean().optional(),
    createdAt: z.coerce.date().optional(),
    updatedAt: z.coerce.date().optional(),
    coverImageId: z.string().optional().nullable(),
    position: z.number().int().optional(),
    owner: z.lazy(() => UserCreateNestedOneWithoutDocsInputSchema),
    parent: z.lazy(() => DocCreateNestedOneWithoutChildrenInputSchema).optional(),
    children: z.lazy(() => DocCreateNestedManyWithoutParentInputSchema).optional(),
    coverImage: z.lazy(() => CoverImageCreateNestedOneWithoutDocInputSchema).optional(),
  })
  .strict();

export const DocUncheckedCreateWithoutSharedWithInputSchema: z.ZodType<Prisma.DocUncheckedCreateWithoutSharedWithInput> = z
  .object({
    id: z.string().cuid().optional(),
    title: z.string(),
    content: z.string(),
    contentBinary: z.instanceof(Buffer).optional().nullable(),
    isArchived: z.boolean().optional(),
    isStarred: z.boolean().optional(),
    createdAt: z.coerce.date().optional(),
    updatedAt: z.coerce.date().optional(),
    ownerId: z.number().int(),
    parentId: z.string().optional().nullable(),
    coverImageId: z.string().optional().nullable(),
    position: z.number().int().optional(),
    children: z.lazy(() => DocUncheckedCreateNestedManyWithoutParentInputSchema).optional(),
    coverImage: z.lazy(() => CoverImageUncheckedCreateNestedOneWithoutDocInputSchema).optional(),
  })
  .strict();

export const DocCreateOrConnectWithoutSharedWithInputSchema: z.ZodType<Prisma.DocCreateOrConnectWithoutSharedWithInput> = z
  .object({
    where: z.lazy(() => DocWhereUniqueInputSchema),
    create: z.union([z.lazy(() => DocCreateWithoutSharedWithInputSchema), z.lazy(() => DocUncheckedCreateWithoutSharedWithInputSchema)]),
  })
  .strict();

export const UserCreateWithoutDocShareInputSchema: z.ZodType<Prisma.UserCreateWithoutDocShareInput> = z
  .object({
    email: z.string(),
    displayName: z.string().optional().nullable(),
    imageUrl: z.string().optional().nullable(),
    emailVerified: z.coerce.date().optional().nullable(),
    status: z.string(),
    created_time: z.coerce.date().optional(),
    updated_time: z.coerce.date().optional(),
    hashedRefreshToken: z.string().optional().nullable(),
    password: z.lazy(() => PasswordCreateNestedOneWithoutUserInputSchema).optional(),
    connections: z.lazy(() => ConnectionCreateNestedManyWithoutUserInputSchema).optional(),
    docs: z.lazy(() => DocCreateNestedManyWithoutOwnerInputSchema).optional(),
    sharedDocs: z.lazy(() => DocShareCreateNestedManyWithoutSharedToInputSchema).optional(),
  })
  .strict();

export const UserUncheckedCreateWithoutDocShareInputSchema: z.ZodType<Prisma.UserUncheckedCreateWithoutDocShareInput> = z
  .object({
    id: z.number().int().optional(),
    email: z.string(),
    displayName: z.string().optional().nullable(),
    imageUrl: z.string().optional().nullable(),
    emailVerified: z.coerce.date().optional().nullable(),
    status: z.string(),
    created_time: z.coerce.date().optional(),
    updated_time: z.coerce.date().optional(),
    hashedRefreshToken: z.string().optional().nullable(),
    password: z.lazy(() => PasswordUncheckedCreateNestedOneWithoutUserInputSchema).optional(),
    connections: z.lazy(() => ConnectionUncheckedCreateNestedManyWithoutUserInputSchema).optional(),
    docs: z.lazy(() => DocUncheckedCreateNestedManyWithoutOwnerInputSchema).optional(),
    sharedDocs: z.lazy(() => DocShareUncheckedCreateNestedManyWithoutSharedToInputSchema).optional(),
  })
  .strict();

export const UserCreateOrConnectWithoutDocShareInputSchema: z.ZodType<Prisma.UserCreateOrConnectWithoutDocShareInput> = z
  .object({
    where: z.lazy(() => UserWhereUniqueInputSchema),
    create: z.union([z.lazy(() => UserCreateWithoutDocShareInputSchema), z.lazy(() => UserUncheckedCreateWithoutDocShareInputSchema)]),
  })
  .strict();

export const UserCreateWithoutSharedDocsInputSchema: z.ZodType<Prisma.UserCreateWithoutSharedDocsInput> = z
  .object({
    email: z.string(),
    displayName: z.string().optional().nullable(),
    imageUrl: z.string().optional().nullable(),
    emailVerified: z.coerce.date().optional().nullable(),
    status: z.string(),
    created_time: z.coerce.date().optional(),
    updated_time: z.coerce.date().optional(),
    hashedRefreshToken: z.string().optional().nullable(),
    password: z.lazy(() => PasswordCreateNestedOneWithoutUserInputSchema).optional(),
    connections: z.lazy(() => ConnectionCreateNestedManyWithoutUserInputSchema).optional(),
    docs: z.lazy(() => DocCreateNestedManyWithoutOwnerInputSchema).optional(),
    DocShare: z.lazy(() => DocShareCreateNestedManyWithoutAuthorInputSchema).optional(),
  })
  .strict();

export const UserUncheckedCreateWithoutSharedDocsInputSchema: z.ZodType<Prisma.UserUncheckedCreateWithoutSharedDocsInput> = z
  .object({
    id: z.number().int().optional(),
    email: z.string(),
    displayName: z.string().optional().nullable(),
    imageUrl: z.string().optional().nullable(),
    emailVerified: z.coerce.date().optional().nullable(),
    status: z.string(),
    created_time: z.coerce.date().optional(),
    updated_time: z.coerce.date().optional(),
    hashedRefreshToken: z.string().optional().nullable(),
    password: z.lazy(() => PasswordUncheckedCreateNestedOneWithoutUserInputSchema).optional(),
    connections: z.lazy(() => ConnectionUncheckedCreateNestedManyWithoutUserInputSchema).optional(),
    docs: z.lazy(() => DocUncheckedCreateNestedManyWithoutOwnerInputSchema).optional(),
    DocShare: z.lazy(() => DocShareUncheckedCreateNestedManyWithoutAuthorInputSchema).optional(),
  })
  .strict();

export const UserCreateOrConnectWithoutSharedDocsInputSchema: z.ZodType<Prisma.UserCreateOrConnectWithoutSharedDocsInput> = z
  .object({
    where: z.lazy(() => UserWhereUniqueInputSchema),
    create: z.union([z.lazy(() => UserCreateWithoutSharedDocsInputSchema), z.lazy(() => UserUncheckedCreateWithoutSharedDocsInputSchema)]),
  })
  .strict();

export const DocUpsertWithoutSharedWithInputSchema: z.ZodType<Prisma.DocUpsertWithoutSharedWithInput> = z
  .object({
    update: z.union([z.lazy(() => DocUpdateWithoutSharedWithInputSchema), z.lazy(() => DocUncheckedUpdateWithoutSharedWithInputSchema)]),
    create: z.union([z.lazy(() => DocCreateWithoutSharedWithInputSchema), z.lazy(() => DocUncheckedCreateWithoutSharedWithInputSchema)]),
    where: z.lazy(() => DocWhereInputSchema).optional(),
  })
  .strict();

export const DocUpdateToOneWithWhereWithoutSharedWithInputSchema: z.ZodType<Prisma.DocUpdateToOneWithWhereWithoutSharedWithInput> = z
  .object({
    where: z.lazy(() => DocWhereInputSchema).optional(),
    data: z.union([z.lazy(() => DocUpdateWithoutSharedWithInputSchema), z.lazy(() => DocUncheckedUpdateWithoutSharedWithInputSchema)]),
  })
  .strict();

export const DocUpdateWithoutSharedWithInputSchema: z.ZodType<Prisma.DocUpdateWithoutSharedWithInput> = z
  .object({
    id: z.union([z.string().cuid(), z.lazy(() => StringFieldUpdateOperationsInputSchema)]).optional(),
    title: z.union([z.string(), z.lazy(() => StringFieldUpdateOperationsInputSchema)]).optional(),
    content: z.union([z.string(), z.lazy(() => StringFieldUpdateOperationsInputSchema)]).optional(),
    contentBinary: z
      .union([z.instanceof(Buffer), z.lazy(() => NullableBytesFieldUpdateOperationsInputSchema)])
      .optional()
      .nullable(),
    isArchived: z.union([z.boolean(), z.lazy(() => BoolFieldUpdateOperationsInputSchema)]).optional(),
    isStarred: z.union([z.boolean(), z.lazy(() => BoolFieldUpdateOperationsInputSchema)]).optional(),
    createdAt: z.union([z.coerce.date(), z.lazy(() => DateTimeFieldUpdateOperationsInputSchema)]).optional(),
    updatedAt: z.union([z.coerce.date(), z.lazy(() => DateTimeFieldUpdateOperationsInputSchema)]).optional(),
    coverImageId: z
      .union([z.string(), z.lazy(() => NullableStringFieldUpdateOperationsInputSchema)])
      .optional()
      .nullable(),
    position: z.union([z.number().int(), z.lazy(() => IntFieldUpdateOperationsInputSchema)]).optional(),
    owner: z.lazy(() => UserUpdateOneRequiredWithoutDocsNestedInputSchema).optional(),
    parent: z.lazy(() => DocUpdateOneWithoutChildrenNestedInputSchema).optional(),
    children: z.lazy(() => DocUpdateManyWithoutParentNestedInputSchema).optional(),
    coverImage: z.lazy(() => CoverImageUpdateOneWithoutDocNestedInputSchema).optional(),
  })
  .strict();

export const DocUncheckedUpdateWithoutSharedWithInputSchema: z.ZodType<Prisma.DocUncheckedUpdateWithoutSharedWithInput> = z
  .object({
    id: z.union([z.string().cuid(), z.lazy(() => StringFieldUpdateOperationsInputSchema)]).optional(),
    title: z.union([z.string(), z.lazy(() => StringFieldUpdateOperationsInputSchema)]).optional(),
    content: z.union([z.string(), z.lazy(() => StringFieldUpdateOperationsInputSchema)]).optional(),
    contentBinary: z
      .union([z.instanceof(Buffer), z.lazy(() => NullableBytesFieldUpdateOperationsInputSchema)])
      .optional()
      .nullable(),
    isArchived: z.union([z.boolean(), z.lazy(() => BoolFieldUpdateOperationsInputSchema)]).optional(),
    isStarred: z.union([z.boolean(), z.lazy(() => BoolFieldUpdateOperationsInputSchema)]).optional(),
    createdAt: z.union([z.coerce.date(), z.lazy(() => DateTimeFieldUpdateOperationsInputSchema)]).optional(),
    updatedAt: z.union([z.coerce.date(), z.lazy(() => DateTimeFieldUpdateOperationsInputSchema)]).optional(),
    ownerId: z.union([z.number().int(), z.lazy(() => IntFieldUpdateOperationsInputSchema)]).optional(),
    parentId: z
      .union([z.string(), z.lazy(() => NullableStringFieldUpdateOperationsInputSchema)])
      .optional()
      .nullable(),
    coverImageId: z
      .union([z.string(), z.lazy(() => NullableStringFieldUpdateOperationsInputSchema)])
      .optional()
      .nullable(),
    position: z.union([z.number().int(), z.lazy(() => IntFieldUpdateOperationsInputSchema)]).optional(),
    children: z.lazy(() => DocUncheckedUpdateManyWithoutParentNestedInputSchema).optional(),
    coverImage: z.lazy(() => CoverImageUncheckedUpdateOneWithoutDocNestedInputSchema).optional(),
  })
  .strict();

export const UserUpsertWithoutDocShareInputSchema: z.ZodType<Prisma.UserUpsertWithoutDocShareInput> = z
  .object({
    update: z.union([z.lazy(() => UserUpdateWithoutDocShareInputSchema), z.lazy(() => UserUncheckedUpdateWithoutDocShareInputSchema)]),
    create: z.union([z.lazy(() => UserCreateWithoutDocShareInputSchema), z.lazy(() => UserUncheckedCreateWithoutDocShareInputSchema)]),
    where: z.lazy(() => UserWhereInputSchema).optional(),
  })
  .strict();

export const UserUpdateToOneWithWhereWithoutDocShareInputSchema: z.ZodType<Prisma.UserUpdateToOneWithWhereWithoutDocShareInput> = z
  .object({
    where: z.lazy(() => UserWhereInputSchema).optional(),
    data: z.union([z.lazy(() => UserUpdateWithoutDocShareInputSchema), z.lazy(() => UserUncheckedUpdateWithoutDocShareInputSchema)]),
  })
  .strict();

export const UserUpdateWithoutDocShareInputSchema: z.ZodType<Prisma.UserUpdateWithoutDocShareInput> = z
  .object({
    email: z.union([z.string(), z.lazy(() => StringFieldUpdateOperationsInputSchema)]).optional(),
    displayName: z
      .union([z.string(), z.lazy(() => NullableStringFieldUpdateOperationsInputSchema)])
      .optional()
      .nullable(),
    imageUrl: z
      .union([z.string(), z.lazy(() => NullableStringFieldUpdateOperationsInputSchema)])
      .optional()
      .nullable(),
    emailVerified: z
      .union([z.coerce.date(), z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema)])
      .optional()
      .nullable(),
    status: z.union([z.string(), z.lazy(() => StringFieldUpdateOperationsInputSchema)]).optional(),
    created_time: z.union([z.coerce.date(), z.lazy(() => DateTimeFieldUpdateOperationsInputSchema)]).optional(),
    updated_time: z.union([z.coerce.date(), z.lazy(() => DateTimeFieldUpdateOperationsInputSchema)]).optional(),
    hashedRefreshToken: z
      .union([z.string(), z.lazy(() => NullableStringFieldUpdateOperationsInputSchema)])
      .optional()
      .nullable(),
    password: z.lazy(() => PasswordUpdateOneWithoutUserNestedInputSchema).optional(),
    connections: z.lazy(() => ConnectionUpdateManyWithoutUserNestedInputSchema).optional(),
    docs: z.lazy(() => DocUpdateManyWithoutOwnerNestedInputSchema).optional(),
    sharedDocs: z.lazy(() => DocShareUpdateManyWithoutSharedToNestedInputSchema).optional(),
  })
  .strict();

export const UserUncheckedUpdateWithoutDocShareInputSchema: z.ZodType<Prisma.UserUncheckedUpdateWithoutDocShareInput> = z
  .object({
    id: z.union([z.number().int(), z.lazy(() => IntFieldUpdateOperationsInputSchema)]).optional(),
    email: z.union([z.string(), z.lazy(() => StringFieldUpdateOperationsInputSchema)]).optional(),
    displayName: z
      .union([z.string(), z.lazy(() => NullableStringFieldUpdateOperationsInputSchema)])
      .optional()
      .nullable(),
    imageUrl: z
      .union([z.string(), z.lazy(() => NullableStringFieldUpdateOperationsInputSchema)])
      .optional()
      .nullable(),
    emailVerified: z
      .union([z.coerce.date(), z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema)])
      .optional()
      .nullable(),
    status: z.union([z.string(), z.lazy(() => StringFieldUpdateOperationsInputSchema)]).optional(),
    created_time: z.union([z.coerce.date(), z.lazy(() => DateTimeFieldUpdateOperationsInputSchema)]).optional(),
    updated_time: z.union([z.coerce.date(), z.lazy(() => DateTimeFieldUpdateOperationsInputSchema)]).optional(),
    hashedRefreshToken: z
      .union([z.string(), z.lazy(() => NullableStringFieldUpdateOperationsInputSchema)])
      .optional()
      .nullable(),
    password: z.lazy(() => PasswordUncheckedUpdateOneWithoutUserNestedInputSchema).optional(),
    connections: z.lazy(() => ConnectionUncheckedUpdateManyWithoutUserNestedInputSchema).optional(),
    docs: z.lazy(() => DocUncheckedUpdateManyWithoutOwnerNestedInputSchema).optional(),
    sharedDocs: z.lazy(() => DocShareUncheckedUpdateManyWithoutSharedToNestedInputSchema).optional(),
  })
  .strict();

export const UserUpsertWithoutSharedDocsInputSchema: z.ZodType<Prisma.UserUpsertWithoutSharedDocsInput> = z
  .object({
    update: z.union([z.lazy(() => UserUpdateWithoutSharedDocsInputSchema), z.lazy(() => UserUncheckedUpdateWithoutSharedDocsInputSchema)]),
    create: z.union([z.lazy(() => UserCreateWithoutSharedDocsInputSchema), z.lazy(() => UserUncheckedCreateWithoutSharedDocsInputSchema)]),
    where: z.lazy(() => UserWhereInputSchema).optional(),
  })
  .strict();

export const UserUpdateToOneWithWhereWithoutSharedDocsInputSchema: z.ZodType<Prisma.UserUpdateToOneWithWhereWithoutSharedDocsInput> = z
  .object({
    where: z.lazy(() => UserWhereInputSchema).optional(),
    data: z.union([z.lazy(() => UserUpdateWithoutSharedDocsInputSchema), z.lazy(() => UserUncheckedUpdateWithoutSharedDocsInputSchema)]),
  })
  .strict();

export const UserUpdateWithoutSharedDocsInputSchema: z.ZodType<Prisma.UserUpdateWithoutSharedDocsInput> = z
  .object({
    email: z.union([z.string(), z.lazy(() => StringFieldUpdateOperationsInputSchema)]).optional(),
    displayName: z
      .union([z.string(), z.lazy(() => NullableStringFieldUpdateOperationsInputSchema)])
      .optional()
      .nullable(),
    imageUrl: z
      .union([z.string(), z.lazy(() => NullableStringFieldUpdateOperationsInputSchema)])
      .optional()
      .nullable(),
    emailVerified: z
      .union([z.coerce.date(), z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema)])
      .optional()
      .nullable(),
    status: z.union([z.string(), z.lazy(() => StringFieldUpdateOperationsInputSchema)]).optional(),
    created_time: z.union([z.coerce.date(), z.lazy(() => DateTimeFieldUpdateOperationsInputSchema)]).optional(),
    updated_time: z.union([z.coerce.date(), z.lazy(() => DateTimeFieldUpdateOperationsInputSchema)]).optional(),
    hashedRefreshToken: z
      .union([z.string(), z.lazy(() => NullableStringFieldUpdateOperationsInputSchema)])
      .optional()
      .nullable(),
    password: z.lazy(() => PasswordUpdateOneWithoutUserNestedInputSchema).optional(),
    connections: z.lazy(() => ConnectionUpdateManyWithoutUserNestedInputSchema).optional(),
    docs: z.lazy(() => DocUpdateManyWithoutOwnerNestedInputSchema).optional(),
    DocShare: z.lazy(() => DocShareUpdateManyWithoutAuthorNestedInputSchema).optional(),
  })
  .strict();

export const UserUncheckedUpdateWithoutSharedDocsInputSchema: z.ZodType<Prisma.UserUncheckedUpdateWithoutSharedDocsInput> = z
  .object({
    id: z.union([z.number().int(), z.lazy(() => IntFieldUpdateOperationsInputSchema)]).optional(),
    email: z.union([z.string(), z.lazy(() => StringFieldUpdateOperationsInputSchema)]).optional(),
    displayName: z
      .union([z.string(), z.lazy(() => NullableStringFieldUpdateOperationsInputSchema)])
      .optional()
      .nullable(),
    imageUrl: z
      .union([z.string(), z.lazy(() => NullableStringFieldUpdateOperationsInputSchema)])
      .optional()
      .nullable(),
    emailVerified: z
      .union([z.coerce.date(), z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema)])
      .optional()
      .nullable(),
    status: z.union([z.string(), z.lazy(() => StringFieldUpdateOperationsInputSchema)]).optional(),
    created_time: z.union([z.coerce.date(), z.lazy(() => DateTimeFieldUpdateOperationsInputSchema)]).optional(),
    updated_time: z.union([z.coerce.date(), z.lazy(() => DateTimeFieldUpdateOperationsInputSchema)]).optional(),
    hashedRefreshToken: z
      .union([z.string(), z.lazy(() => NullableStringFieldUpdateOperationsInputSchema)])
      .optional()
      .nullable(),
    password: z.lazy(() => PasswordUncheckedUpdateOneWithoutUserNestedInputSchema).optional(),
    connections: z.lazy(() => ConnectionUncheckedUpdateManyWithoutUserNestedInputSchema).optional(),
    docs: z.lazy(() => DocUncheckedUpdateManyWithoutOwnerNestedInputSchema).optional(),
    DocShare: z.lazy(() => DocShareUncheckedUpdateManyWithoutAuthorNestedInputSchema).optional(),
  })
  .strict();

export const ConnectionCreateManyUserInputSchema: z.ZodType<Prisma.ConnectionCreateManyUserInput> = z
  .object({
    id: z.string().cuid().optional(),
    providerName: z.string(),
    providerId: z.string(),
    createdAt: z.coerce.date().optional(),
    updatedAt: z.coerce.date().optional(),
  })
  .strict();

export const DocCreateManyOwnerInputSchema: z.ZodType<Prisma.DocCreateManyOwnerInput> = z
  .object({
    id: z.string().cuid().optional(),
    title: z.string(),
    content: z.string(),
    contentBinary: z.instanceof(Buffer).optional().nullable(),
    isArchived: z.boolean().optional(),
    isStarred: z.boolean().optional(),
    createdAt: z.coerce.date().optional(),
    updatedAt: z.coerce.date().optional(),
    parentId: z.string().optional().nullable(),
    coverImageId: z.string().optional().nullable(),
    position: z.number().int().optional(),
  })
  .strict();

export const DocShareCreateManySharedToInputSchema: z.ZodType<Prisma.DocShareCreateManySharedToInput> = z
  .object({
    id: z.string().cuid().optional(),
    docId: z.string(),
    authorId: z.number().int(),
    permission: z.string().optional(),
    noticeType: z.string().optional(),
    createdAt: z.coerce.date().optional(),
    updatedAt: z.coerce.date().optional(),
  })
  .strict();

export const DocShareCreateManyAuthorInputSchema: z.ZodType<Prisma.DocShareCreateManyAuthorInput> = z
  .object({
    id: z.string().cuid().optional(),
    docId: z.string(),
    userId: z.number().int(),
    permission: z.string().optional(),
    noticeType: z.string().optional(),
    createdAt: z.coerce.date().optional(),
    updatedAt: z.coerce.date().optional(),
  })
  .strict();

export const ConnectionUpdateWithoutUserInputSchema: z.ZodType<Prisma.ConnectionUpdateWithoutUserInput> = z
  .object({
    id: z.union([z.string().cuid(), z.lazy(() => StringFieldUpdateOperationsInputSchema)]).optional(),
    providerName: z.union([z.string(), z.lazy(() => StringFieldUpdateOperationsInputSchema)]).optional(),
    providerId: z.union([z.string(), z.lazy(() => StringFieldUpdateOperationsInputSchema)]).optional(),
    createdAt: z.union([z.coerce.date(), z.lazy(() => DateTimeFieldUpdateOperationsInputSchema)]).optional(),
    updatedAt: z.union([z.coerce.date(), z.lazy(() => DateTimeFieldUpdateOperationsInputSchema)]).optional(),
  })
  .strict();

export const ConnectionUncheckedUpdateWithoutUserInputSchema: z.ZodType<Prisma.ConnectionUncheckedUpdateWithoutUserInput> = z
  .object({
    id: z.union([z.string().cuid(), z.lazy(() => StringFieldUpdateOperationsInputSchema)]).optional(),
    providerName: z.union([z.string(), z.lazy(() => StringFieldUpdateOperationsInputSchema)]).optional(),
    providerId: z.union([z.string(), z.lazy(() => StringFieldUpdateOperationsInputSchema)]).optional(),
    createdAt: z.union([z.coerce.date(), z.lazy(() => DateTimeFieldUpdateOperationsInputSchema)]).optional(),
    updatedAt: z.union([z.coerce.date(), z.lazy(() => DateTimeFieldUpdateOperationsInputSchema)]).optional(),
  })
  .strict();

export const ConnectionUncheckedUpdateManyWithoutUserInputSchema: z.ZodType<Prisma.ConnectionUncheckedUpdateManyWithoutUserInput> = z
  .object({
    id: z.union([z.string().cuid(), z.lazy(() => StringFieldUpdateOperationsInputSchema)]).optional(),
    providerName: z.union([z.string(), z.lazy(() => StringFieldUpdateOperationsInputSchema)]).optional(),
    providerId: z.union([z.string(), z.lazy(() => StringFieldUpdateOperationsInputSchema)]).optional(),
    createdAt: z.union([z.coerce.date(), z.lazy(() => DateTimeFieldUpdateOperationsInputSchema)]).optional(),
    updatedAt: z.union([z.coerce.date(), z.lazy(() => DateTimeFieldUpdateOperationsInputSchema)]).optional(),
  })
  .strict();

export const DocUpdateWithoutOwnerInputSchema: z.ZodType<Prisma.DocUpdateWithoutOwnerInput> = z
  .object({
    id: z.union([z.string().cuid(), z.lazy(() => StringFieldUpdateOperationsInputSchema)]).optional(),
    title: z.union([z.string(), z.lazy(() => StringFieldUpdateOperationsInputSchema)]).optional(),
    content: z.union([z.string(), z.lazy(() => StringFieldUpdateOperationsInputSchema)]).optional(),
    contentBinary: z
      .union([z.instanceof(Buffer), z.lazy(() => NullableBytesFieldUpdateOperationsInputSchema)])
      .optional()
      .nullable(),
    isArchived: z.union([z.boolean(), z.lazy(() => BoolFieldUpdateOperationsInputSchema)]).optional(),
    isStarred: z.union([z.boolean(), z.lazy(() => BoolFieldUpdateOperationsInputSchema)]).optional(),
    createdAt: z.union([z.coerce.date(), z.lazy(() => DateTimeFieldUpdateOperationsInputSchema)]).optional(),
    updatedAt: z.union([z.coerce.date(), z.lazy(() => DateTimeFieldUpdateOperationsInputSchema)]).optional(),
    coverImageId: z
      .union([z.string(), z.lazy(() => NullableStringFieldUpdateOperationsInputSchema)])
      .optional()
      .nullable(),
    position: z.union([z.number().int(), z.lazy(() => IntFieldUpdateOperationsInputSchema)]).optional(),
    parent: z.lazy(() => DocUpdateOneWithoutChildrenNestedInputSchema).optional(),
    children: z.lazy(() => DocUpdateManyWithoutParentNestedInputSchema).optional(),
    coverImage: z.lazy(() => CoverImageUpdateOneWithoutDocNestedInputSchema).optional(),
    sharedWith: z.lazy(() => DocShareUpdateManyWithoutDocNestedInputSchema).optional(),
  })
  .strict();

export const DocUncheckedUpdateWithoutOwnerInputSchema: z.ZodType<Prisma.DocUncheckedUpdateWithoutOwnerInput> = z
  .object({
    id: z.union([z.string().cuid(), z.lazy(() => StringFieldUpdateOperationsInputSchema)]).optional(),
    title: z.union([z.string(), z.lazy(() => StringFieldUpdateOperationsInputSchema)]).optional(),
    content: z.union([z.string(), z.lazy(() => StringFieldUpdateOperationsInputSchema)]).optional(),
    contentBinary: z
      .union([z.instanceof(Buffer), z.lazy(() => NullableBytesFieldUpdateOperationsInputSchema)])
      .optional()
      .nullable(),
    isArchived: z.union([z.boolean(), z.lazy(() => BoolFieldUpdateOperationsInputSchema)]).optional(),
    isStarred: z.union([z.boolean(), z.lazy(() => BoolFieldUpdateOperationsInputSchema)]).optional(),
    createdAt: z.union([z.coerce.date(), z.lazy(() => DateTimeFieldUpdateOperationsInputSchema)]).optional(),
    updatedAt: z.union([z.coerce.date(), z.lazy(() => DateTimeFieldUpdateOperationsInputSchema)]).optional(),
    parentId: z
      .union([z.string(), z.lazy(() => NullableStringFieldUpdateOperationsInputSchema)])
      .optional()
      .nullable(),
    coverImageId: z
      .union([z.string(), z.lazy(() => NullableStringFieldUpdateOperationsInputSchema)])
      .optional()
      .nullable(),
    position: z.union([z.number().int(), z.lazy(() => IntFieldUpdateOperationsInputSchema)]).optional(),
    children: z.lazy(() => DocUncheckedUpdateManyWithoutParentNestedInputSchema).optional(),
    coverImage: z.lazy(() => CoverImageUncheckedUpdateOneWithoutDocNestedInputSchema).optional(),
    sharedWith: z.lazy(() => DocShareUncheckedUpdateManyWithoutDocNestedInputSchema).optional(),
  })
  .strict();

export const DocUncheckedUpdateManyWithoutOwnerInputSchema: z.ZodType<Prisma.DocUncheckedUpdateManyWithoutOwnerInput> = z
  .object({
    id: z.union([z.string().cuid(), z.lazy(() => StringFieldUpdateOperationsInputSchema)]).optional(),
    title: z.union([z.string(), z.lazy(() => StringFieldUpdateOperationsInputSchema)]).optional(),
    content: z.union([z.string(), z.lazy(() => StringFieldUpdateOperationsInputSchema)]).optional(),
    contentBinary: z
      .union([z.instanceof(Buffer), z.lazy(() => NullableBytesFieldUpdateOperationsInputSchema)])
      .optional()
      .nullable(),
    isArchived: z.union([z.boolean(), z.lazy(() => BoolFieldUpdateOperationsInputSchema)]).optional(),
    isStarred: z.union([z.boolean(), z.lazy(() => BoolFieldUpdateOperationsInputSchema)]).optional(),
    createdAt: z.union([z.coerce.date(), z.lazy(() => DateTimeFieldUpdateOperationsInputSchema)]).optional(),
    updatedAt: z.union([z.coerce.date(), z.lazy(() => DateTimeFieldUpdateOperationsInputSchema)]).optional(),
    parentId: z
      .union([z.string(), z.lazy(() => NullableStringFieldUpdateOperationsInputSchema)])
      .optional()
      .nullable(),
    coverImageId: z
      .union([z.string(), z.lazy(() => NullableStringFieldUpdateOperationsInputSchema)])
      .optional()
      .nullable(),
    position: z.union([z.number().int(), z.lazy(() => IntFieldUpdateOperationsInputSchema)]).optional(),
  })
  .strict();

export const DocShareUpdateWithoutSharedToInputSchema: z.ZodType<Prisma.DocShareUpdateWithoutSharedToInput> = z
  .object({
    id: z.union([z.string().cuid(), z.lazy(() => StringFieldUpdateOperationsInputSchema)]).optional(),
    permission: z.union([z.string(), z.lazy(() => StringFieldUpdateOperationsInputSchema)]).optional(),
    noticeType: z.union([z.string(), z.lazy(() => StringFieldUpdateOperationsInputSchema)]).optional(),
    createdAt: z.union([z.coerce.date(), z.lazy(() => DateTimeFieldUpdateOperationsInputSchema)]).optional(),
    updatedAt: z.union([z.coerce.date(), z.lazy(() => DateTimeFieldUpdateOperationsInputSchema)]).optional(),
    doc: z.lazy(() => DocUpdateOneRequiredWithoutSharedWithNestedInputSchema).optional(),
    author: z.lazy(() => UserUpdateOneRequiredWithoutDocShareNestedInputSchema).optional(),
  })
  .strict();

export const DocShareUncheckedUpdateWithoutSharedToInputSchema: z.ZodType<Prisma.DocShareUncheckedUpdateWithoutSharedToInput> = z
  .object({
    id: z.union([z.string().cuid(), z.lazy(() => StringFieldUpdateOperationsInputSchema)]).optional(),
    docId: z.union([z.string(), z.lazy(() => StringFieldUpdateOperationsInputSchema)]).optional(),
    authorId: z.union([z.number().int(), z.lazy(() => IntFieldUpdateOperationsInputSchema)]).optional(),
    permission: z.union([z.string(), z.lazy(() => StringFieldUpdateOperationsInputSchema)]).optional(),
    noticeType: z.union([z.string(), z.lazy(() => StringFieldUpdateOperationsInputSchema)]).optional(),
    createdAt: z.union([z.coerce.date(), z.lazy(() => DateTimeFieldUpdateOperationsInputSchema)]).optional(),
    updatedAt: z.union([z.coerce.date(), z.lazy(() => DateTimeFieldUpdateOperationsInputSchema)]).optional(),
  })
  .strict();

export const DocShareUncheckedUpdateManyWithoutSharedToInputSchema: z.ZodType<Prisma.DocShareUncheckedUpdateManyWithoutSharedToInput> = z
  .object({
    id: z.union([z.string().cuid(), z.lazy(() => StringFieldUpdateOperationsInputSchema)]).optional(),
    docId: z.union([z.string(), z.lazy(() => StringFieldUpdateOperationsInputSchema)]).optional(),
    authorId: z.union([z.number().int(), z.lazy(() => IntFieldUpdateOperationsInputSchema)]).optional(),
    permission: z.union([z.string(), z.lazy(() => StringFieldUpdateOperationsInputSchema)]).optional(),
    noticeType: z.union([z.string(), z.lazy(() => StringFieldUpdateOperationsInputSchema)]).optional(),
    createdAt: z.union([z.coerce.date(), z.lazy(() => DateTimeFieldUpdateOperationsInputSchema)]).optional(),
    updatedAt: z.union([z.coerce.date(), z.lazy(() => DateTimeFieldUpdateOperationsInputSchema)]).optional(),
  })
  .strict();

export const DocShareUpdateWithoutAuthorInputSchema: z.ZodType<Prisma.DocShareUpdateWithoutAuthorInput> = z
  .object({
    id: z.union([z.string().cuid(), z.lazy(() => StringFieldUpdateOperationsInputSchema)]).optional(),
    permission: z.union([z.string(), z.lazy(() => StringFieldUpdateOperationsInputSchema)]).optional(),
    noticeType: z.union([z.string(), z.lazy(() => StringFieldUpdateOperationsInputSchema)]).optional(),
    createdAt: z.union([z.coerce.date(), z.lazy(() => DateTimeFieldUpdateOperationsInputSchema)]).optional(),
    updatedAt: z.union([z.coerce.date(), z.lazy(() => DateTimeFieldUpdateOperationsInputSchema)]).optional(),
    doc: z.lazy(() => DocUpdateOneRequiredWithoutSharedWithNestedInputSchema).optional(),
    sharedTo: z.lazy(() => UserUpdateOneRequiredWithoutSharedDocsNestedInputSchema).optional(),
  })
  .strict();

export const DocShareUncheckedUpdateWithoutAuthorInputSchema: z.ZodType<Prisma.DocShareUncheckedUpdateWithoutAuthorInput> = z
  .object({
    id: z.union([z.string().cuid(), z.lazy(() => StringFieldUpdateOperationsInputSchema)]).optional(),
    docId: z.union([z.string(), z.lazy(() => StringFieldUpdateOperationsInputSchema)]).optional(),
    userId: z.union([z.number().int(), z.lazy(() => IntFieldUpdateOperationsInputSchema)]).optional(),
    permission: z.union([z.string(), z.lazy(() => StringFieldUpdateOperationsInputSchema)]).optional(),
    noticeType: z.union([z.string(), z.lazy(() => StringFieldUpdateOperationsInputSchema)]).optional(),
    createdAt: z.union([z.coerce.date(), z.lazy(() => DateTimeFieldUpdateOperationsInputSchema)]).optional(),
    updatedAt: z.union([z.coerce.date(), z.lazy(() => DateTimeFieldUpdateOperationsInputSchema)]).optional(),
  })
  .strict();

export const DocShareUncheckedUpdateManyWithoutAuthorInputSchema: z.ZodType<Prisma.DocShareUncheckedUpdateManyWithoutAuthorInput> = z
  .object({
    id: z.union([z.string().cuid(), z.lazy(() => StringFieldUpdateOperationsInputSchema)]).optional(),
    docId: z.union([z.string(), z.lazy(() => StringFieldUpdateOperationsInputSchema)]).optional(),
    userId: z.union([z.number().int(), z.lazy(() => IntFieldUpdateOperationsInputSchema)]).optional(),
    permission: z.union([z.string(), z.lazy(() => StringFieldUpdateOperationsInputSchema)]).optional(),
    noticeType: z.union([z.string(), z.lazy(() => StringFieldUpdateOperationsInputSchema)]).optional(),
    createdAt: z.union([z.coerce.date(), z.lazy(() => DateTimeFieldUpdateOperationsInputSchema)]).optional(),
    updatedAt: z.union([z.coerce.date(), z.lazy(() => DateTimeFieldUpdateOperationsInputSchema)]).optional(),
  })
  .strict();

export const DocCreateManyParentInputSchema: z.ZodType<Prisma.DocCreateManyParentInput> = z
  .object({
    id: z.string().cuid().optional(),
    title: z.string(),
    content: z.string(),
    contentBinary: z.instanceof(Buffer).optional().nullable(),
    isArchived: z.boolean().optional(),
    isStarred: z.boolean().optional(),
    createdAt: z.coerce.date().optional(),
    updatedAt: z.coerce.date().optional(),
    ownerId: z.number().int(),
    coverImageId: z.string().optional().nullable(),
    position: z.number().int().optional(),
  })
  .strict();

export const DocShareCreateManyDocInputSchema: z.ZodType<Prisma.DocShareCreateManyDocInput> = z
  .object({
    id: z.string().cuid().optional(),
    authorId: z.number().int(),
    userId: z.number().int(),
    permission: z.string().optional(),
    noticeType: z.string().optional(),
    createdAt: z.coerce.date().optional(),
    updatedAt: z.coerce.date().optional(),
  })
  .strict();

export const DocUpdateWithoutParentInputSchema: z.ZodType<Prisma.DocUpdateWithoutParentInput> = z
  .object({
    id: z.union([z.string().cuid(), z.lazy(() => StringFieldUpdateOperationsInputSchema)]).optional(),
    title: z.union([z.string(), z.lazy(() => StringFieldUpdateOperationsInputSchema)]).optional(),
    content: z.union([z.string(), z.lazy(() => StringFieldUpdateOperationsInputSchema)]).optional(),
    contentBinary: z
      .union([z.instanceof(Buffer), z.lazy(() => NullableBytesFieldUpdateOperationsInputSchema)])
      .optional()
      .nullable(),
    isArchived: z.union([z.boolean(), z.lazy(() => BoolFieldUpdateOperationsInputSchema)]).optional(),
    isStarred: z.union([z.boolean(), z.lazy(() => BoolFieldUpdateOperationsInputSchema)]).optional(),
    createdAt: z.union([z.coerce.date(), z.lazy(() => DateTimeFieldUpdateOperationsInputSchema)]).optional(),
    updatedAt: z.union([z.coerce.date(), z.lazy(() => DateTimeFieldUpdateOperationsInputSchema)]).optional(),
    coverImageId: z
      .union([z.string(), z.lazy(() => NullableStringFieldUpdateOperationsInputSchema)])
      .optional()
      .nullable(),
    position: z.union([z.number().int(), z.lazy(() => IntFieldUpdateOperationsInputSchema)]).optional(),
    owner: z.lazy(() => UserUpdateOneRequiredWithoutDocsNestedInputSchema).optional(),
    children: z.lazy(() => DocUpdateManyWithoutParentNestedInputSchema).optional(),
    coverImage: z.lazy(() => CoverImageUpdateOneWithoutDocNestedInputSchema).optional(),
    sharedWith: z.lazy(() => DocShareUpdateManyWithoutDocNestedInputSchema).optional(),
  })
  .strict();

export const DocUncheckedUpdateWithoutParentInputSchema: z.ZodType<Prisma.DocUncheckedUpdateWithoutParentInput> = z
  .object({
    id: z.union([z.string().cuid(), z.lazy(() => StringFieldUpdateOperationsInputSchema)]).optional(),
    title: z.union([z.string(), z.lazy(() => StringFieldUpdateOperationsInputSchema)]).optional(),
    content: z.union([z.string(), z.lazy(() => StringFieldUpdateOperationsInputSchema)]).optional(),
    contentBinary: z
      .union([z.instanceof(Buffer), z.lazy(() => NullableBytesFieldUpdateOperationsInputSchema)])
      .optional()
      .nullable(),
    isArchived: z.union([z.boolean(), z.lazy(() => BoolFieldUpdateOperationsInputSchema)]).optional(),
    isStarred: z.union([z.boolean(), z.lazy(() => BoolFieldUpdateOperationsInputSchema)]).optional(),
    createdAt: z.union([z.coerce.date(), z.lazy(() => DateTimeFieldUpdateOperationsInputSchema)]).optional(),
    updatedAt: z.union([z.coerce.date(), z.lazy(() => DateTimeFieldUpdateOperationsInputSchema)]).optional(),
    ownerId: z.union([z.number().int(), z.lazy(() => IntFieldUpdateOperationsInputSchema)]).optional(),
    coverImageId: z
      .union([z.string(), z.lazy(() => NullableStringFieldUpdateOperationsInputSchema)])
      .optional()
      .nullable(),
    position: z.union([z.number().int(), z.lazy(() => IntFieldUpdateOperationsInputSchema)]).optional(),
    children: z.lazy(() => DocUncheckedUpdateManyWithoutParentNestedInputSchema).optional(),
    coverImage: z.lazy(() => CoverImageUncheckedUpdateOneWithoutDocNestedInputSchema).optional(),
    sharedWith: z.lazy(() => DocShareUncheckedUpdateManyWithoutDocNestedInputSchema).optional(),
  })
  .strict();

export const DocUncheckedUpdateManyWithoutParentInputSchema: z.ZodType<Prisma.DocUncheckedUpdateManyWithoutParentInput> = z
  .object({
    id: z.union([z.string().cuid(), z.lazy(() => StringFieldUpdateOperationsInputSchema)]).optional(),
    title: z.union([z.string(), z.lazy(() => StringFieldUpdateOperationsInputSchema)]).optional(),
    content: z.union([z.string(), z.lazy(() => StringFieldUpdateOperationsInputSchema)]).optional(),
    contentBinary: z
      .union([z.instanceof(Buffer), z.lazy(() => NullableBytesFieldUpdateOperationsInputSchema)])
      .optional()
      .nullable(),
    isArchived: z.union([z.boolean(), z.lazy(() => BoolFieldUpdateOperationsInputSchema)]).optional(),
    isStarred: z.union([z.boolean(), z.lazy(() => BoolFieldUpdateOperationsInputSchema)]).optional(),
    createdAt: z.union([z.coerce.date(), z.lazy(() => DateTimeFieldUpdateOperationsInputSchema)]).optional(),
    updatedAt: z.union([z.coerce.date(), z.lazy(() => DateTimeFieldUpdateOperationsInputSchema)]).optional(),
    ownerId: z.union([z.number().int(), z.lazy(() => IntFieldUpdateOperationsInputSchema)]).optional(),
    coverImageId: z
      .union([z.string(), z.lazy(() => NullableStringFieldUpdateOperationsInputSchema)])
      .optional()
      .nullable(),
    position: z.union([z.number().int(), z.lazy(() => IntFieldUpdateOperationsInputSchema)]).optional(),
  })
  .strict();

export const DocShareUpdateWithoutDocInputSchema: z.ZodType<Prisma.DocShareUpdateWithoutDocInput> = z
  .object({
    id: z.union([z.string().cuid(), z.lazy(() => StringFieldUpdateOperationsInputSchema)]).optional(),
    permission: z.union([z.string(), z.lazy(() => StringFieldUpdateOperationsInputSchema)]).optional(),
    noticeType: z.union([z.string(), z.lazy(() => StringFieldUpdateOperationsInputSchema)]).optional(),
    createdAt: z.union([z.coerce.date(), z.lazy(() => DateTimeFieldUpdateOperationsInputSchema)]).optional(),
    updatedAt: z.union([z.coerce.date(), z.lazy(() => DateTimeFieldUpdateOperationsInputSchema)]).optional(),
    author: z.lazy(() => UserUpdateOneRequiredWithoutDocShareNestedInputSchema).optional(),
    sharedTo: z.lazy(() => UserUpdateOneRequiredWithoutSharedDocsNestedInputSchema).optional(),
  })
  .strict();

export const DocShareUncheckedUpdateWithoutDocInputSchema: z.ZodType<Prisma.DocShareUncheckedUpdateWithoutDocInput> = z
  .object({
    id: z.union([z.string().cuid(), z.lazy(() => StringFieldUpdateOperationsInputSchema)]).optional(),
    authorId: z.union([z.number().int(), z.lazy(() => IntFieldUpdateOperationsInputSchema)]).optional(),
    userId: z.union([z.number().int(), z.lazy(() => IntFieldUpdateOperationsInputSchema)]).optional(),
    permission: z.union([z.string(), z.lazy(() => StringFieldUpdateOperationsInputSchema)]).optional(),
    noticeType: z.union([z.string(), z.lazy(() => StringFieldUpdateOperationsInputSchema)]).optional(),
    createdAt: z.union([z.coerce.date(), z.lazy(() => DateTimeFieldUpdateOperationsInputSchema)]).optional(),
    updatedAt: z.union([z.coerce.date(), z.lazy(() => DateTimeFieldUpdateOperationsInputSchema)]).optional(),
  })
  .strict();

export const DocShareUncheckedUpdateManyWithoutDocInputSchema: z.ZodType<Prisma.DocShareUncheckedUpdateManyWithoutDocInput> = z
  .object({
    id: z.union([z.string().cuid(), z.lazy(() => StringFieldUpdateOperationsInputSchema)]).optional(),
    authorId: z.union([z.number().int(), z.lazy(() => IntFieldUpdateOperationsInputSchema)]).optional(),
    userId: z.union([z.number().int(), z.lazy(() => IntFieldUpdateOperationsInputSchema)]).optional(),
    permission: z.union([z.string(), z.lazy(() => StringFieldUpdateOperationsInputSchema)]).optional(),
    noticeType: z.union([z.string(), z.lazy(() => StringFieldUpdateOperationsInputSchema)]).optional(),
    createdAt: z.union([z.coerce.date(), z.lazy(() => DateTimeFieldUpdateOperationsInputSchema)]).optional(),
    updatedAt: z.union([z.coerce.date(), z.lazy(() => DateTimeFieldUpdateOperationsInputSchema)]).optional(),
  })
  .strict();

/////////////////////////////////////////
// ARGS
/////////////////////////////////////////

export const UserFindFirstArgsSchema: z.ZodType<Prisma.UserFindFirstArgs> = z
  .object({
    select: UserSelectSchema.optional(),
    include: UserIncludeSchema.optional(),
    where: UserWhereInputSchema.optional(),
    orderBy: z.union([UserOrderByWithRelationInputSchema.array(), UserOrderByWithRelationInputSchema]).optional(),
    cursor: UserWhereUniqueInputSchema.optional(),
    take: z.number().optional(),
    skip: z.number().optional(),
    distinct: z.union([UserScalarFieldEnumSchema, UserScalarFieldEnumSchema.array()]).optional(),
  })
  .strict();

export const UserFindFirstOrThrowArgsSchema: z.ZodType<Prisma.UserFindFirstOrThrowArgs> = z
  .object({
    select: UserSelectSchema.optional(),
    include: UserIncludeSchema.optional(),
    where: UserWhereInputSchema.optional(),
    orderBy: z.union([UserOrderByWithRelationInputSchema.array(), UserOrderByWithRelationInputSchema]).optional(),
    cursor: UserWhereUniqueInputSchema.optional(),
    take: z.number().optional(),
    skip: z.number().optional(),
    distinct: z.union([UserScalarFieldEnumSchema, UserScalarFieldEnumSchema.array()]).optional(),
  })
  .strict();

export const UserFindManyArgsSchema: z.ZodType<Prisma.UserFindManyArgs> = z
  .object({
    select: UserSelectSchema.optional(),
    include: UserIncludeSchema.optional(),
    where: UserWhereInputSchema.optional(),
    orderBy: z.union([UserOrderByWithRelationInputSchema.array(), UserOrderByWithRelationInputSchema]).optional(),
    cursor: UserWhereUniqueInputSchema.optional(),
    take: z.number().optional(),
    skip: z.number().optional(),
    distinct: z.union([UserScalarFieldEnumSchema, UserScalarFieldEnumSchema.array()]).optional(),
  })
  .strict();

export const UserAggregateArgsSchema: z.ZodType<Prisma.UserAggregateArgs> = z
  .object({
    where: UserWhereInputSchema.optional(),
    orderBy: z.union([UserOrderByWithRelationInputSchema.array(), UserOrderByWithRelationInputSchema]).optional(),
    cursor: UserWhereUniqueInputSchema.optional(),
    take: z.number().optional(),
    skip: z.number().optional(),
  })
  .strict();

export const UserGroupByArgsSchema: z.ZodType<Prisma.UserGroupByArgs> = z
  .object({
    where: UserWhereInputSchema.optional(),
    orderBy: z.union([UserOrderByWithAggregationInputSchema.array(), UserOrderByWithAggregationInputSchema]).optional(),
    by: UserScalarFieldEnumSchema.array(),
    having: UserScalarWhereWithAggregatesInputSchema.optional(),
    take: z.number().optional(),
    skip: z.number().optional(),
  })
  .strict();

export const UserFindUniqueArgsSchema: z.ZodType<Prisma.UserFindUniqueArgs> = z
  .object({
    select: UserSelectSchema.optional(),
    include: UserIncludeSchema.optional(),
    where: UserWhereUniqueInputSchema,
  })
  .strict();

export const UserFindUniqueOrThrowArgsSchema: z.ZodType<Prisma.UserFindUniqueOrThrowArgs> = z
  .object({
    select: UserSelectSchema.optional(),
    include: UserIncludeSchema.optional(),
    where: UserWhereUniqueInputSchema,
  })
  .strict();

export const PasswordFindFirstArgsSchema: z.ZodType<Prisma.PasswordFindFirstArgs> = z
  .object({
    select: PasswordSelectSchema.optional(),
    include: PasswordIncludeSchema.optional(),
    where: PasswordWhereInputSchema.optional(),
    orderBy: z.union([PasswordOrderByWithRelationInputSchema.array(), PasswordOrderByWithRelationInputSchema]).optional(),
    cursor: PasswordWhereUniqueInputSchema.optional(),
    take: z.number().optional(),
    skip: z.number().optional(),
    distinct: z.union([PasswordScalarFieldEnumSchema, PasswordScalarFieldEnumSchema.array()]).optional(),
  })
  .strict();

export const PasswordFindFirstOrThrowArgsSchema: z.ZodType<Prisma.PasswordFindFirstOrThrowArgs> = z
  .object({
    select: PasswordSelectSchema.optional(),
    include: PasswordIncludeSchema.optional(),
    where: PasswordWhereInputSchema.optional(),
    orderBy: z.union([PasswordOrderByWithRelationInputSchema.array(), PasswordOrderByWithRelationInputSchema]).optional(),
    cursor: PasswordWhereUniqueInputSchema.optional(),
    take: z.number().optional(),
    skip: z.number().optional(),
    distinct: z.union([PasswordScalarFieldEnumSchema, PasswordScalarFieldEnumSchema.array()]).optional(),
  })
  .strict();

export const PasswordFindManyArgsSchema: z.ZodType<Prisma.PasswordFindManyArgs> = z
  .object({
    select: PasswordSelectSchema.optional(),
    include: PasswordIncludeSchema.optional(),
    where: PasswordWhereInputSchema.optional(),
    orderBy: z.union([PasswordOrderByWithRelationInputSchema.array(), PasswordOrderByWithRelationInputSchema]).optional(),
    cursor: PasswordWhereUniqueInputSchema.optional(),
    take: z.number().optional(),
    skip: z.number().optional(),
    distinct: z.union([PasswordScalarFieldEnumSchema, PasswordScalarFieldEnumSchema.array()]).optional(),
  })
  .strict();

export const PasswordAggregateArgsSchema: z.ZodType<Prisma.PasswordAggregateArgs> = z
  .object({
    where: PasswordWhereInputSchema.optional(),
    orderBy: z.union([PasswordOrderByWithRelationInputSchema.array(), PasswordOrderByWithRelationInputSchema]).optional(),
    cursor: PasswordWhereUniqueInputSchema.optional(),
    take: z.number().optional(),
    skip: z.number().optional(),
  })
  .strict();

export const PasswordGroupByArgsSchema: z.ZodType<Prisma.PasswordGroupByArgs> = z
  .object({
    where: PasswordWhereInputSchema.optional(),
    orderBy: z.union([PasswordOrderByWithAggregationInputSchema.array(), PasswordOrderByWithAggregationInputSchema]).optional(),
    by: PasswordScalarFieldEnumSchema.array(),
    having: PasswordScalarWhereWithAggregatesInputSchema.optional(),
    take: z.number().optional(),
    skip: z.number().optional(),
  })
  .strict();

export const PasswordFindUniqueArgsSchema: z.ZodType<Prisma.PasswordFindUniqueArgs> = z
  .object({
    select: PasswordSelectSchema.optional(),
    include: PasswordIncludeSchema.optional(),
    where: PasswordWhereUniqueInputSchema,
  })
  .strict();

export const PasswordFindUniqueOrThrowArgsSchema: z.ZodType<Prisma.PasswordFindUniqueOrThrowArgs> = z
  .object({
    select: PasswordSelectSchema.optional(),
    include: PasswordIncludeSchema.optional(),
    where: PasswordWhereUniqueInputSchema,
  })
  .strict();

export const ConnectionFindFirstArgsSchema: z.ZodType<Prisma.ConnectionFindFirstArgs> = z
  .object({
    select: ConnectionSelectSchema.optional(),
    include: ConnectionIncludeSchema.optional(),
    where: ConnectionWhereInputSchema.optional(),
    orderBy: z.union([ConnectionOrderByWithRelationInputSchema.array(), ConnectionOrderByWithRelationInputSchema]).optional(),
    cursor: ConnectionWhereUniqueInputSchema.optional(),
    take: z.number().optional(),
    skip: z.number().optional(),
    distinct: z.union([ConnectionScalarFieldEnumSchema, ConnectionScalarFieldEnumSchema.array()]).optional(),
  })
  .strict();

export const ConnectionFindFirstOrThrowArgsSchema: z.ZodType<Prisma.ConnectionFindFirstOrThrowArgs> = z
  .object({
    select: ConnectionSelectSchema.optional(),
    include: ConnectionIncludeSchema.optional(),
    where: ConnectionWhereInputSchema.optional(),
    orderBy: z.union([ConnectionOrderByWithRelationInputSchema.array(), ConnectionOrderByWithRelationInputSchema]).optional(),
    cursor: ConnectionWhereUniqueInputSchema.optional(),
    take: z.number().optional(),
    skip: z.number().optional(),
    distinct: z.union([ConnectionScalarFieldEnumSchema, ConnectionScalarFieldEnumSchema.array()]).optional(),
  })
  .strict();

export const ConnectionFindManyArgsSchema: z.ZodType<Prisma.ConnectionFindManyArgs> = z
  .object({
    select: ConnectionSelectSchema.optional(),
    include: ConnectionIncludeSchema.optional(),
    where: ConnectionWhereInputSchema.optional(),
    orderBy: z.union([ConnectionOrderByWithRelationInputSchema.array(), ConnectionOrderByWithRelationInputSchema]).optional(),
    cursor: ConnectionWhereUniqueInputSchema.optional(),
    take: z.number().optional(),
    skip: z.number().optional(),
    distinct: z.union([ConnectionScalarFieldEnumSchema, ConnectionScalarFieldEnumSchema.array()]).optional(),
  })
  .strict();

export const ConnectionAggregateArgsSchema: z.ZodType<Prisma.ConnectionAggregateArgs> = z
  .object({
    where: ConnectionWhereInputSchema.optional(),
    orderBy: z.union([ConnectionOrderByWithRelationInputSchema.array(), ConnectionOrderByWithRelationInputSchema]).optional(),
    cursor: ConnectionWhereUniqueInputSchema.optional(),
    take: z.number().optional(),
    skip: z.number().optional(),
  })
  .strict();

export const ConnectionGroupByArgsSchema: z.ZodType<Prisma.ConnectionGroupByArgs> = z
  .object({
    where: ConnectionWhereInputSchema.optional(),
    orderBy: z.union([ConnectionOrderByWithAggregationInputSchema.array(), ConnectionOrderByWithAggregationInputSchema]).optional(),
    by: ConnectionScalarFieldEnumSchema.array(),
    having: ConnectionScalarWhereWithAggregatesInputSchema.optional(),
    take: z.number().optional(),
    skip: z.number().optional(),
  })
  .strict();

export const ConnectionFindUniqueArgsSchema: z.ZodType<Prisma.ConnectionFindUniqueArgs> = z
  .object({
    select: ConnectionSelectSchema.optional(),
    include: ConnectionIncludeSchema.optional(),
    where: ConnectionWhereUniqueInputSchema,
  })
  .strict();

export const ConnectionFindUniqueOrThrowArgsSchema: z.ZodType<Prisma.ConnectionFindUniqueOrThrowArgs> = z
  .object({
    select: ConnectionSelectSchema.optional(),
    include: ConnectionIncludeSchema.optional(),
    where: ConnectionWhereUniqueInputSchema,
  })
  .strict();

export const DocFindFirstArgsSchema: z.ZodType<Prisma.DocFindFirstArgs> = z
  .object({
    select: DocSelectSchema.optional(),
    include: DocIncludeSchema.optional(),
    where: DocWhereInputSchema.optional(),
    orderBy: z.union([DocOrderByWithRelationInputSchema.array(), DocOrderByWithRelationInputSchema]).optional(),
    cursor: DocWhereUniqueInputSchema.optional(),
    take: z.number().optional(),
    skip: z.number().optional(),
    distinct: z.union([DocScalarFieldEnumSchema, DocScalarFieldEnumSchema.array()]).optional(),
  })
  .strict();

export const DocFindFirstOrThrowArgsSchema: z.ZodType<Prisma.DocFindFirstOrThrowArgs> = z
  .object({
    select: DocSelectSchema.optional(),
    include: DocIncludeSchema.optional(),
    where: DocWhereInputSchema.optional(),
    orderBy: z.union([DocOrderByWithRelationInputSchema.array(), DocOrderByWithRelationInputSchema]).optional(),
    cursor: DocWhereUniqueInputSchema.optional(),
    take: z.number().optional(),
    skip: z.number().optional(),
    distinct: z.union([DocScalarFieldEnumSchema, DocScalarFieldEnumSchema.array()]).optional(),
  })
  .strict();

export const DocFindManyArgsSchema: z.ZodType<Prisma.DocFindManyArgs> = z
  .object({
    select: DocSelectSchema.optional(),
    include: DocIncludeSchema.optional(),
    where: DocWhereInputSchema.optional(),
    orderBy: z.union([DocOrderByWithRelationInputSchema.array(), DocOrderByWithRelationInputSchema]).optional(),
    cursor: DocWhereUniqueInputSchema.optional(),
    take: z.number().optional(),
    skip: z.number().optional(),
    distinct: z.union([DocScalarFieldEnumSchema, DocScalarFieldEnumSchema.array()]).optional(),
  })
  .strict();

export const DocAggregateArgsSchema: z.ZodType<Prisma.DocAggregateArgs> = z
  .object({
    where: DocWhereInputSchema.optional(),
    orderBy: z.union([DocOrderByWithRelationInputSchema.array(), DocOrderByWithRelationInputSchema]).optional(),
    cursor: DocWhereUniqueInputSchema.optional(),
    take: z.number().optional(),
    skip: z.number().optional(),
  })
  .strict();

export const DocGroupByArgsSchema: z.ZodType<Prisma.DocGroupByArgs> = z
  .object({
    where: DocWhereInputSchema.optional(),
    orderBy: z.union([DocOrderByWithAggregationInputSchema.array(), DocOrderByWithAggregationInputSchema]).optional(),
    by: DocScalarFieldEnumSchema.array(),
    having: DocScalarWhereWithAggregatesInputSchema.optional(),
    take: z.number().optional(),
    skip: z.number().optional(),
  })
  .strict();

export const DocFindUniqueArgsSchema: z.ZodType<Prisma.DocFindUniqueArgs> = z
  .object({
    select: DocSelectSchema.optional(),
    include: DocIncludeSchema.optional(),
    where: DocWhereUniqueInputSchema,
  })
  .strict();

export const DocFindUniqueOrThrowArgsSchema: z.ZodType<Prisma.DocFindUniqueOrThrowArgs> = z
  .object({
    select: DocSelectSchema.optional(),
    include: DocIncludeSchema.optional(),
    where: DocWhereUniqueInputSchema,
  })
  .strict();

export const CoverImageFindFirstArgsSchema: z.ZodType<Prisma.CoverImageFindFirstArgs> = z
  .object({
    select: CoverImageSelectSchema.optional(),
    include: CoverImageIncludeSchema.optional(),
    where: CoverImageWhereInputSchema.optional(),
    orderBy: z.union([CoverImageOrderByWithRelationInputSchema.array(), CoverImageOrderByWithRelationInputSchema]).optional(),
    cursor: CoverImageWhereUniqueInputSchema.optional(),
    take: z.number().optional(),
    skip: z.number().optional(),
    distinct: z.union([CoverImageScalarFieldEnumSchema, CoverImageScalarFieldEnumSchema.array()]).optional(),
  })
  .strict();

export const CoverImageFindFirstOrThrowArgsSchema: z.ZodType<Prisma.CoverImageFindFirstOrThrowArgs> = z
  .object({
    select: CoverImageSelectSchema.optional(),
    include: CoverImageIncludeSchema.optional(),
    where: CoverImageWhereInputSchema.optional(),
    orderBy: z.union([CoverImageOrderByWithRelationInputSchema.array(), CoverImageOrderByWithRelationInputSchema]).optional(),
    cursor: CoverImageWhereUniqueInputSchema.optional(),
    take: z.number().optional(),
    skip: z.number().optional(),
    distinct: z.union([CoverImageScalarFieldEnumSchema, CoverImageScalarFieldEnumSchema.array()]).optional(),
  })
  .strict();

export const CoverImageFindManyArgsSchema: z.ZodType<Prisma.CoverImageFindManyArgs> = z
  .object({
    select: CoverImageSelectSchema.optional(),
    include: CoverImageIncludeSchema.optional(),
    where: CoverImageWhereInputSchema.optional(),
    orderBy: z.union([CoverImageOrderByWithRelationInputSchema.array(), CoverImageOrderByWithRelationInputSchema]).optional(),
    cursor: CoverImageWhereUniqueInputSchema.optional(),
    take: z.number().optional(),
    skip: z.number().optional(),
    distinct: z.union([CoverImageScalarFieldEnumSchema, CoverImageScalarFieldEnumSchema.array()]).optional(),
  })
  .strict();

export const CoverImageAggregateArgsSchema: z.ZodType<Prisma.CoverImageAggregateArgs> = z
  .object({
    where: CoverImageWhereInputSchema.optional(),
    orderBy: z.union([CoverImageOrderByWithRelationInputSchema.array(), CoverImageOrderByWithRelationInputSchema]).optional(),
    cursor: CoverImageWhereUniqueInputSchema.optional(),
    take: z.number().optional(),
    skip: z.number().optional(),
  })
  .strict();

export const CoverImageGroupByArgsSchema: z.ZodType<Prisma.CoverImageGroupByArgs> = z
  .object({
    where: CoverImageWhereInputSchema.optional(),
    orderBy: z.union([CoverImageOrderByWithAggregationInputSchema.array(), CoverImageOrderByWithAggregationInputSchema]).optional(),
    by: CoverImageScalarFieldEnumSchema.array(),
    having: CoverImageScalarWhereWithAggregatesInputSchema.optional(),
    take: z.number().optional(),
    skip: z.number().optional(),
  })
  .strict();

export const CoverImageFindUniqueArgsSchema: z.ZodType<Prisma.CoverImageFindUniqueArgs> = z
  .object({
    select: CoverImageSelectSchema.optional(),
    include: CoverImageIncludeSchema.optional(),
    where: CoverImageWhereUniqueInputSchema,
  })
  .strict();

export const CoverImageFindUniqueOrThrowArgsSchema: z.ZodType<Prisma.CoverImageFindUniqueOrThrowArgs> = z
  .object({
    select: CoverImageSelectSchema.optional(),
    include: CoverImageIncludeSchema.optional(),
    where: CoverImageWhereUniqueInputSchema,
  })
  .strict();

export const DocShareFindFirstArgsSchema: z.ZodType<Prisma.DocShareFindFirstArgs> = z
  .object({
    select: DocShareSelectSchema.optional(),
    include: DocShareIncludeSchema.optional(),
    where: DocShareWhereInputSchema.optional(),
    orderBy: z.union([DocShareOrderByWithRelationInputSchema.array(), DocShareOrderByWithRelationInputSchema]).optional(),
    cursor: DocShareWhereUniqueInputSchema.optional(),
    take: z.number().optional(),
    skip: z.number().optional(),
    distinct: z.union([DocShareScalarFieldEnumSchema, DocShareScalarFieldEnumSchema.array()]).optional(),
  })
  .strict();

export const DocShareFindFirstOrThrowArgsSchema: z.ZodType<Prisma.DocShareFindFirstOrThrowArgs> = z
  .object({
    select: DocShareSelectSchema.optional(),
    include: DocShareIncludeSchema.optional(),
    where: DocShareWhereInputSchema.optional(),
    orderBy: z.union([DocShareOrderByWithRelationInputSchema.array(), DocShareOrderByWithRelationInputSchema]).optional(),
    cursor: DocShareWhereUniqueInputSchema.optional(),
    take: z.number().optional(),
    skip: z.number().optional(),
    distinct: z.union([DocShareScalarFieldEnumSchema, DocShareScalarFieldEnumSchema.array()]).optional(),
  })
  .strict();

export const DocShareFindManyArgsSchema: z.ZodType<Prisma.DocShareFindManyArgs> = z
  .object({
    select: DocShareSelectSchema.optional(),
    include: DocShareIncludeSchema.optional(),
    where: DocShareWhereInputSchema.optional(),
    orderBy: z.union([DocShareOrderByWithRelationInputSchema.array(), DocShareOrderByWithRelationInputSchema]).optional(),
    cursor: DocShareWhereUniqueInputSchema.optional(),
    take: z.number().optional(),
    skip: z.number().optional(),
    distinct: z.union([DocShareScalarFieldEnumSchema, DocShareScalarFieldEnumSchema.array()]).optional(),
  })
  .strict();

export const DocShareAggregateArgsSchema: z.ZodType<Prisma.DocShareAggregateArgs> = z
  .object({
    where: DocShareWhereInputSchema.optional(),
    orderBy: z.union([DocShareOrderByWithRelationInputSchema.array(), DocShareOrderByWithRelationInputSchema]).optional(),
    cursor: DocShareWhereUniqueInputSchema.optional(),
    take: z.number().optional(),
    skip: z.number().optional(),
  })
  .strict();

export const DocShareGroupByArgsSchema: z.ZodType<Prisma.DocShareGroupByArgs> = z
  .object({
    where: DocShareWhereInputSchema.optional(),
    orderBy: z.union([DocShareOrderByWithAggregationInputSchema.array(), DocShareOrderByWithAggregationInputSchema]).optional(),
    by: DocShareScalarFieldEnumSchema.array(),
    having: DocShareScalarWhereWithAggregatesInputSchema.optional(),
    take: z.number().optional(),
    skip: z.number().optional(),
  })
  .strict();

export const DocShareFindUniqueArgsSchema: z.ZodType<Prisma.DocShareFindUniqueArgs> = z
  .object({
    select: DocShareSelectSchema.optional(),
    include: DocShareIncludeSchema.optional(),
    where: DocShareWhereUniqueInputSchema,
  })
  .strict();

export const DocShareFindUniqueOrThrowArgsSchema: z.ZodType<Prisma.DocShareFindUniqueOrThrowArgs> = z
  .object({
    select: DocShareSelectSchema.optional(),
    include: DocShareIncludeSchema.optional(),
    where: DocShareWhereUniqueInputSchema,
  })
  .strict();

export const UserCreateArgsSchema: z.ZodType<Prisma.UserCreateArgs> = z
  .object({
    select: UserSelectSchema.optional(),
    include: UserIncludeSchema.optional(),
    data: z.union([UserCreateInputSchema, UserUncheckedCreateInputSchema]),
  })
  .strict();

export const UserUpsertArgsSchema: z.ZodType<Prisma.UserUpsertArgs> = z
  .object({
    select: UserSelectSchema.optional(),
    include: UserIncludeSchema.optional(),
    where: UserWhereUniqueInputSchema,
    create: z.union([UserCreateInputSchema, UserUncheckedCreateInputSchema]),
    update: z.union([UserUpdateInputSchema, UserUncheckedUpdateInputSchema]),
  })
  .strict();

export const UserCreateManyArgsSchema: z.ZodType<Prisma.UserCreateManyArgs> = z
  .object({
    data: z.union([UserCreateManyInputSchema, UserCreateManyInputSchema.array()]),
    skipDuplicates: z.boolean().optional(),
  })
  .strict();

export const UserCreateManyAndReturnArgsSchema: z.ZodType<Prisma.UserCreateManyAndReturnArgs> = z
  .object({
    data: z.union([UserCreateManyInputSchema, UserCreateManyInputSchema.array()]),
    skipDuplicates: z.boolean().optional(),
  })
  .strict();

export const UserDeleteArgsSchema: z.ZodType<Prisma.UserDeleteArgs> = z
  .object({
    select: UserSelectSchema.optional(),
    include: UserIncludeSchema.optional(),
    where: UserWhereUniqueInputSchema,
  })
  .strict();

export const UserUpdateArgsSchema: z.ZodType<Prisma.UserUpdateArgs> = z
  .object({
    select: UserSelectSchema.optional(),
    include: UserIncludeSchema.optional(),
    data: z.union([UserUpdateInputSchema, UserUncheckedUpdateInputSchema]),
    where: UserWhereUniqueInputSchema,
  })
  .strict();

export const UserUpdateManyArgsSchema: z.ZodType<Prisma.UserUpdateManyArgs> = z
  .object({
    data: z.union([UserUpdateManyMutationInputSchema, UserUncheckedUpdateManyInputSchema]),
    where: UserWhereInputSchema.optional(),
  })
  .strict();

export const UserDeleteManyArgsSchema: z.ZodType<Prisma.UserDeleteManyArgs> = z
  .object({
    where: UserWhereInputSchema.optional(),
  })
  .strict();

export const PasswordCreateArgsSchema: z.ZodType<Prisma.PasswordCreateArgs> = z
  .object({
    select: PasswordSelectSchema.optional(),
    include: PasswordIncludeSchema.optional(),
    data: z.union([PasswordCreateInputSchema, PasswordUncheckedCreateInputSchema]),
  })
  .strict();

export const PasswordUpsertArgsSchema: z.ZodType<Prisma.PasswordUpsertArgs> = z
  .object({
    select: PasswordSelectSchema.optional(),
    include: PasswordIncludeSchema.optional(),
    where: PasswordWhereUniqueInputSchema,
    create: z.union([PasswordCreateInputSchema, PasswordUncheckedCreateInputSchema]),
    update: z.union([PasswordUpdateInputSchema, PasswordUncheckedUpdateInputSchema]),
  })
  .strict();

export const PasswordCreateManyArgsSchema: z.ZodType<Prisma.PasswordCreateManyArgs> = z
  .object({
    data: z.union([PasswordCreateManyInputSchema, PasswordCreateManyInputSchema.array()]),
    skipDuplicates: z.boolean().optional(),
  })
  .strict();

export const PasswordCreateManyAndReturnArgsSchema: z.ZodType<Prisma.PasswordCreateManyAndReturnArgs> = z
  .object({
    data: z.union([PasswordCreateManyInputSchema, PasswordCreateManyInputSchema.array()]),
    skipDuplicates: z.boolean().optional(),
  })
  .strict();

export const PasswordDeleteArgsSchema: z.ZodType<Prisma.PasswordDeleteArgs> = z
  .object({
    select: PasswordSelectSchema.optional(),
    include: PasswordIncludeSchema.optional(),
    where: PasswordWhereUniqueInputSchema,
  })
  .strict();

export const PasswordUpdateArgsSchema: z.ZodType<Prisma.PasswordUpdateArgs> = z
  .object({
    select: PasswordSelectSchema.optional(),
    include: PasswordIncludeSchema.optional(),
    data: z.union([PasswordUpdateInputSchema, PasswordUncheckedUpdateInputSchema]),
    where: PasswordWhereUniqueInputSchema,
  })
  .strict();

export const PasswordUpdateManyArgsSchema: z.ZodType<Prisma.PasswordUpdateManyArgs> = z
  .object({
    data: z.union([PasswordUpdateManyMutationInputSchema, PasswordUncheckedUpdateManyInputSchema]),
    where: PasswordWhereInputSchema.optional(),
  })
  .strict();

export const PasswordDeleteManyArgsSchema: z.ZodType<Prisma.PasswordDeleteManyArgs> = z
  .object({
    where: PasswordWhereInputSchema.optional(),
  })
  .strict();

export const ConnectionCreateArgsSchema: z.ZodType<Prisma.ConnectionCreateArgs> = z
  .object({
    select: ConnectionSelectSchema.optional(),
    include: ConnectionIncludeSchema.optional(),
    data: z.union([ConnectionCreateInputSchema, ConnectionUncheckedCreateInputSchema]),
  })
  .strict();

export const ConnectionUpsertArgsSchema: z.ZodType<Prisma.ConnectionUpsertArgs> = z
  .object({
    select: ConnectionSelectSchema.optional(),
    include: ConnectionIncludeSchema.optional(),
    where: ConnectionWhereUniqueInputSchema,
    create: z.union([ConnectionCreateInputSchema, ConnectionUncheckedCreateInputSchema]),
    update: z.union([ConnectionUpdateInputSchema, ConnectionUncheckedUpdateInputSchema]),
  })
  .strict();

export const ConnectionCreateManyArgsSchema: z.ZodType<Prisma.ConnectionCreateManyArgs> = z
  .object({
    data: z.union([ConnectionCreateManyInputSchema, ConnectionCreateManyInputSchema.array()]),
    skipDuplicates: z.boolean().optional(),
  })
  .strict();

export const ConnectionCreateManyAndReturnArgsSchema: z.ZodType<Prisma.ConnectionCreateManyAndReturnArgs> = z
  .object({
    data: z.union([ConnectionCreateManyInputSchema, ConnectionCreateManyInputSchema.array()]),
    skipDuplicates: z.boolean().optional(),
  })
  .strict();

export const ConnectionDeleteArgsSchema: z.ZodType<Prisma.ConnectionDeleteArgs> = z
  .object({
    select: ConnectionSelectSchema.optional(),
    include: ConnectionIncludeSchema.optional(),
    where: ConnectionWhereUniqueInputSchema,
  })
  .strict();

export const ConnectionUpdateArgsSchema: z.ZodType<Prisma.ConnectionUpdateArgs> = z
  .object({
    select: ConnectionSelectSchema.optional(),
    include: ConnectionIncludeSchema.optional(),
    data: z.union([ConnectionUpdateInputSchema, ConnectionUncheckedUpdateInputSchema]),
    where: ConnectionWhereUniqueInputSchema,
  })
  .strict();

export const ConnectionUpdateManyArgsSchema: z.ZodType<Prisma.ConnectionUpdateManyArgs> = z
  .object({
    data: z.union([ConnectionUpdateManyMutationInputSchema, ConnectionUncheckedUpdateManyInputSchema]),
    where: ConnectionWhereInputSchema.optional(),
  })
  .strict();

export const ConnectionDeleteManyArgsSchema: z.ZodType<Prisma.ConnectionDeleteManyArgs> = z
  .object({
    where: ConnectionWhereInputSchema.optional(),
  })
  .strict();

export const DocCreateArgsSchema: z.ZodType<Prisma.DocCreateArgs> = z
  .object({
    select: DocSelectSchema.optional(),
    include: DocIncludeSchema.optional(),
    data: z.union([DocCreateInputSchema, DocUncheckedCreateInputSchema]),
  })
  .strict();

export const DocUpsertArgsSchema: z.ZodType<Prisma.DocUpsertArgs> = z
  .object({
    select: DocSelectSchema.optional(),
    include: DocIncludeSchema.optional(),
    where: DocWhereUniqueInputSchema,
    create: z.union([DocCreateInputSchema, DocUncheckedCreateInputSchema]),
    update: z.union([DocUpdateInputSchema, DocUncheckedUpdateInputSchema]),
  })
  .strict();

export const DocCreateManyArgsSchema: z.ZodType<Prisma.DocCreateManyArgs> = z
  .object({
    data: z.union([DocCreateManyInputSchema, DocCreateManyInputSchema.array()]),
    skipDuplicates: z.boolean().optional(),
  })
  .strict();

export const DocCreateManyAndReturnArgsSchema: z.ZodType<Prisma.DocCreateManyAndReturnArgs> = z
  .object({
    data: z.union([DocCreateManyInputSchema, DocCreateManyInputSchema.array()]),
    skipDuplicates: z.boolean().optional(),
  })
  .strict();

export const DocDeleteArgsSchema: z.ZodType<Prisma.DocDeleteArgs> = z
  .object({
    select: DocSelectSchema.optional(),
    include: DocIncludeSchema.optional(),
    where: DocWhereUniqueInputSchema,
  })
  .strict();

export const DocUpdateArgsSchema: z.ZodType<Prisma.DocUpdateArgs> = z
  .object({
    select: DocSelectSchema.optional(),
    include: DocIncludeSchema.optional(),
    data: z.union([DocUpdateInputSchema, DocUncheckedUpdateInputSchema]),
    where: DocWhereUniqueInputSchema,
  })
  .strict();

export const DocUpdateManyArgsSchema: z.ZodType<Prisma.DocUpdateManyArgs> = z
  .object({
    data: z.union([DocUpdateManyMutationInputSchema, DocUncheckedUpdateManyInputSchema]),
    where: DocWhereInputSchema.optional(),
  })
  .strict();

export const DocDeleteManyArgsSchema: z.ZodType<Prisma.DocDeleteManyArgs> = z
  .object({
    where: DocWhereInputSchema.optional(),
  })
  .strict();

export const CoverImageCreateArgsSchema: z.ZodType<Prisma.CoverImageCreateArgs> = z
  .object({
    select: CoverImageSelectSchema.optional(),
    include: CoverImageIncludeSchema.optional(),
    data: z.union([CoverImageCreateInputSchema, CoverImageUncheckedCreateInputSchema]),
  })
  .strict();

export const CoverImageUpsertArgsSchema: z.ZodType<Prisma.CoverImageUpsertArgs> = z
  .object({
    select: CoverImageSelectSchema.optional(),
    include: CoverImageIncludeSchema.optional(),
    where: CoverImageWhereUniqueInputSchema,
    create: z.union([CoverImageCreateInputSchema, CoverImageUncheckedCreateInputSchema]),
    update: z.union([CoverImageUpdateInputSchema, CoverImageUncheckedUpdateInputSchema]),
  })
  .strict();

export const CoverImageCreateManyArgsSchema: z.ZodType<Prisma.CoverImageCreateManyArgs> = z
  .object({
    data: z.union([CoverImageCreateManyInputSchema, CoverImageCreateManyInputSchema.array()]),
    skipDuplicates: z.boolean().optional(),
  })
  .strict();

export const CoverImageCreateManyAndReturnArgsSchema: z.ZodType<Prisma.CoverImageCreateManyAndReturnArgs> = z
  .object({
    data: z.union([CoverImageCreateManyInputSchema, CoverImageCreateManyInputSchema.array()]),
    skipDuplicates: z.boolean().optional(),
  })
  .strict();

export const CoverImageDeleteArgsSchema: z.ZodType<Prisma.CoverImageDeleteArgs> = z
  .object({
    select: CoverImageSelectSchema.optional(),
    include: CoverImageIncludeSchema.optional(),
    where: CoverImageWhereUniqueInputSchema,
  })
  .strict();

export const CoverImageUpdateArgsSchema: z.ZodType<Prisma.CoverImageUpdateArgs> = z
  .object({
    select: CoverImageSelectSchema.optional(),
    include: CoverImageIncludeSchema.optional(),
    data: z.union([CoverImageUpdateInputSchema, CoverImageUncheckedUpdateInputSchema]),
    where: CoverImageWhereUniqueInputSchema,
  })
  .strict();

export const CoverImageUpdateManyArgsSchema: z.ZodType<Prisma.CoverImageUpdateManyArgs> = z
  .object({
    data: z.union([CoverImageUpdateManyMutationInputSchema, CoverImageUncheckedUpdateManyInputSchema]),
    where: CoverImageWhereInputSchema.optional(),
  })
  .strict();

export const CoverImageDeleteManyArgsSchema: z.ZodType<Prisma.CoverImageDeleteManyArgs> = z
  .object({
    where: CoverImageWhereInputSchema.optional(),
  })
  .strict();

export const DocShareCreateArgsSchema: z.ZodType<Prisma.DocShareCreateArgs> = z
  .object({
    select: DocShareSelectSchema.optional(),
    include: DocShareIncludeSchema.optional(),
    data: z.union([DocShareCreateInputSchema, DocShareUncheckedCreateInputSchema]),
  })
  .strict();

export const DocShareUpsertArgsSchema: z.ZodType<Prisma.DocShareUpsertArgs> = z
  .object({
    select: DocShareSelectSchema.optional(),
    include: DocShareIncludeSchema.optional(),
    where: DocShareWhereUniqueInputSchema,
    create: z.union([DocShareCreateInputSchema, DocShareUncheckedCreateInputSchema]),
    update: z.union([DocShareUpdateInputSchema, DocShareUncheckedUpdateInputSchema]),
  })
  .strict();

export const DocShareCreateManyArgsSchema: z.ZodType<Prisma.DocShareCreateManyArgs> = z
  .object({
    data: z.union([DocShareCreateManyInputSchema, DocShareCreateManyInputSchema.array()]),
    skipDuplicates: z.boolean().optional(),
  })
  .strict();

export const DocShareCreateManyAndReturnArgsSchema: z.ZodType<Prisma.DocShareCreateManyAndReturnArgs> = z
  .object({
    data: z.union([DocShareCreateManyInputSchema, DocShareCreateManyInputSchema.array()]),
    skipDuplicates: z.boolean().optional(),
  })
  .strict();

export const DocShareDeleteArgsSchema: z.ZodType<Prisma.DocShareDeleteArgs> = z
  .object({
    select: DocShareSelectSchema.optional(),
    include: DocShareIncludeSchema.optional(),
    where: DocShareWhereUniqueInputSchema,
  })
  .strict();

export const DocShareUpdateArgsSchema: z.ZodType<Prisma.DocShareUpdateArgs> = z
  .object({
    select: DocShareSelectSchema.optional(),
    include: DocShareIncludeSchema.optional(),
    data: z.union([DocShareUpdateInputSchema, DocShareUncheckedUpdateInputSchema]),
    where: DocShareWhereUniqueInputSchema,
  })
  .strict();

export const DocShareUpdateManyArgsSchema: z.ZodType<Prisma.DocShareUpdateManyArgs> = z
  .object({
    data: z.union([DocShareUpdateManyMutationInputSchema, DocShareUncheckedUpdateManyInputSchema]),
    where: DocShareWhereInputSchema.optional(),
  })
  .strict();

export const DocShareDeleteManyArgsSchema: z.ZodType<Prisma.DocShareDeleteManyArgs> = z
  .object({
    where: DocShareWhereInputSchema.optional(),
  })
  .strict();
