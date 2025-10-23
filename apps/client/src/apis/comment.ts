import request from "@/lib/request";
import type {
  CreateCommentRequest,
  CreateCommentResponse,
  UpdateCommentRequest,
  UpdateCommentResponse,
  ResolveCommentRequest,
  ResolveCommentResponse,
  UnresolveCommentRequest,
  UnresolveCommentResponse,
  AddReactionRequest,
  ReactionResponse,
  RemoveReactionRequest,
  DeleteCommentRequest,
  DeleteCommentResponse,
  ListCommentsRequest,
  ListCommentsResponse,
  CommentDto,
} from "@idea/contracts";

export const commentApi = {
  /**
   * Create a new comment or reply
   */
  create: async (data: CreateCommentRequest) => request.post<CreateCommentRequest, CreateCommentResponse>("/api/comments/create", data),

  /**
   * List comments with filtering and pagination
   */
  list: async (data: ListCommentsRequest) => request.post<ListCommentsRequest, ListCommentsResponse>("/api/comments/list", data),

  /**
   * Update a comment's content
   */
  update: async (data: UpdateCommentRequest) => request.post<UpdateCommentRequest, UpdateCommentResponse>("/api/comments/update", data),

  /**
   * Resolve a comment thread
   */
  resolve: async (id: string) => request.post<{ id: string }, ResolveCommentResponse>("/api/comments/resolve", { id }),

  /**
   * Unresolve a comment thread
   */
  unresolve: async (id: string) => request.post<{ id: string }, UnresolveCommentResponse>("/api/comments/unresolve", { id }),

  /**
   * Add an emoji reaction to a comment
   */
  addReaction: async (id: string, emoji: string) => request.post<AddReactionRequest, ReactionResponse>("/api/comments/add-reaction", { id, emoji }),

  /**
   * Remove an emoji reaction from a comment
   */
  removeReaction: async (id: string, emoji: string) => request.post<RemoveReactionRequest, ReactionResponse>("/api/comments/remove-reaction", { id, emoji }),

  /**
   * Delete a comment (soft delete)
   */
  delete: async (id: string) => request.post<DeleteCommentRequest, DeleteCommentResponse>("/api/comments/delete", { id }),

  /**
   * Get a single comment by ID
   */
  findOne: async (id: string) => request.get<void, { comment: CommentDto }>(`/api/comments/${id}`),
};
