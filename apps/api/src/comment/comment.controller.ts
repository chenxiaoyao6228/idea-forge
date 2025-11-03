import { Controller, Post, Body, UseGuards, Get, Query, Param } from "@nestjs/common";
import { GetUser } from "@/auth/decorators/get-user.decorator";
import { PolicyGuard } from "@/_shared/casl/policy.guard";
import { CheckPolicy } from "@/_shared/casl/policy.decorator";
import { Action } from "@/_shared/casl/ability.class";
import { CommentService } from "./comment.service";
import { CommentPresenter } from "./comment.presenter";
import {
  CreateCommentDto,
  ListCommentsDto,
  UpdateCommentDto,
  ResolveCommentDto,
  UnresolveCommentDto,
  AddReactionDto,
  RemoveReactionDto,
  DeleteCommentDto,
} from "./comment.dto";

@UseGuards(PolicyGuard)
@Controller("/api/comments")
export class CommentController {
  constructor(
    private readonly commentService: CommentService,
    private readonly commentPresenter: CommentPresenter,
  ) {}

  /**
   * POST /api/comments/create
   * Create a new comment or reply
   * Rate limit: 10 per minute (TODO: add rate limiting)
   */
  @Post("create")
  // @CheckPolicy(Action.Create, "Comment")
  async create(@GetUser("id") userId: string, @Body() dto: CreateCommentDto) {
    // Create comment
    const comment = await this.commentService.create(userId, dto);

    // Present and return
    const presented = await this.commentPresenter.present(comment);
    return { comment: presented };
  }

  /**
   * POST /api/comments/list
   * List comments with filtering and pagination
   */
  @Post("list")
  // @CheckPolicy(Action.Read, "Comment")
  async list(@GetUser("id") userId: string, @Body() dto: ListCommentsDto) {
    // List comments
    const result = await this.commentService.list(userId, dto);

    return result;
  }

  /**
   * POST /api/comments/update
   * Update comment content
   */
  @Post("update")
  // @CheckPolicy(Action.Update, "Comment")
  async update(@GetUser("id") userId: string, @Body() dto: UpdateCommentDto) {
    const updated = await this.commentService.update(dto.id, dto);
    const presented = await this.commentPresenter.present(updated);

    return { comment: presented };
  }

  /**
   * POST /api/comments/resolve
   * Mark comment thread as resolved
   */
  @Post("resolve")
  // @CheckPolicy(Action.Update, "Comment")
  async resolve(@GetUser("id") userId: string, @Body() dto: ResolveCommentDto) {
    const resolved = await this.commentService.resolve(dto.id, userId);
    const presented = await this.commentPresenter.present(resolved);

    return { comment: presented };
  }

  /**
   * POST /api/comments/unresolve
   * Mark comment thread as unresolved
   */
  @Post("unresolve")
  // @CheckPolicy(Action.Update, "Comment")
  async unresolve(@GetUser("id") userId: string, @Body() dto: UnresolveCommentDto) {
    const unresolved = await this.commentService.unresolve(dto.id);
    const presented = await this.commentPresenter.present(unresolved);

    return { comment: presented };
  }

  /**
   * POST /api/comments/add-reaction
   * Add emoji reaction to comment
   * Rate limit: 25 per minute (TODO: add rate limiting)
   */
  @Post("add-reaction")
  @CheckPolicy(Action.Create, "Comment")
  async addReaction(@GetUser("id") userId: string, @Body() dto: AddReactionDto) {
    await this.commentService.addReaction(dto.id, userId, dto.emoji);

    return { success: true };
  }

  /**
   * POST /api/comments/remove-reaction
   * Remove emoji reaction from comment
   * Rate limit: 25 per minute (TODO: add rate limiting)
   */
  @Post("remove-reaction")
  @CheckPolicy(Action.Delete, "Comment")
  async removeReaction(@GetUser("id") userId: string, @Body() dto: RemoveReactionDto) {
    await this.commentService.removeReaction(dto.id, userId, dto.emoji);

    return { success: true };
  }

  /**
   * POST /api/comments/delete
   * Soft delete a comment
   */
  @Post("delete")
  @CheckPolicy(Action.Delete, "Comment")
  async delete(@GetUser("id") userId: string, @Body() dto: DeleteCommentDto) {
    await this.commentService.delete(dto.id);

    return { success: true };
  }

  /**
   * GET /api/comments/:id
   * Get a single comment by ID
   */
  @Get(":id")
  @CheckPolicy(Action.Read, "Comment")
  async findOne(@GetUser("id") userId: string, @Param("id") id: string) {
    const comment = await this.commentService.findById(id);
    const presented = await this.commentPresenter.present(comment);
    return { comment: presented };
  }
}
