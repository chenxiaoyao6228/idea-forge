import { createZodDto } from "nestjs-zod";
import {
  createCommentSchema,
  listCommentsSchema,
  updateCommentSchema,
  resolveCommentSchema,
  unresolveCommentSchema,
  addReactionSchema,
  removeReactionSchema,
  deleteCommentSchema,
} from "@idea/contracts";

export class CreateCommentDto extends createZodDto(createCommentSchema) {}

export class ListCommentsDto extends createZodDto(listCommentsSchema) {}

export class UpdateCommentDto extends createZodDto(updateCommentSchema) {}

export class ResolveCommentDto extends createZodDto(resolveCommentSchema) {}

export class UnresolveCommentDto extends createZodDto(unresolveCommentSchema) {}

export class AddReactionDto extends createZodDto(addReactionSchema) {}

export class RemoveReactionDto extends createZodDto(removeReactionSchema) {}

export class DeleteCommentDto extends createZodDto(deleteCommentSchema) {}
