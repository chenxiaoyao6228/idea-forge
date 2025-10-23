import { useState, useEffect, useRef } from "react";
import { ScrollArea } from "@idea/ui/shadcn/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@idea/ui/shadcn/ui/tabs";
import { MessageSquare } from "lucide-react";
import { cn } from "@idea/ui/shadcn/utils";
import { CommentThread } from "./comment-thread";
import { CommentForm } from "./comment-form";
import { useFetchComments, useUnresolvedThreadsInDocument, useResolvedThreadsInDocument, useUnresolvedCommentCount } from "@/stores/comment-store";
import { CommentStatusFilter } from "@idea/contracts";

interface CommentsSidebarProps {
  documentId: string;
  open: boolean;
  sortType?: "mostRecent" | "orderInDocument";
  referencedCommentIds?: string[];
}

export function CommentsSidebar({ documentId, open, sortType = "mostRecent", referencedCommentIds }: CommentsSidebarProps) {
  const [activeTab, setActiveTab] = useState<"current" | "resolved">("current");
  const [focusedCommentId, setFocusedCommentId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const fetchComments = useFetchComments();
  const unresolvedThreads = useUnresolvedThreadsInDocument(documentId, sortType, referencedCommentIds);
  const resolvedThreads = useResolvedThreadsInDocument(documentId, sortType, referencedCommentIds);
  const unresolvedCount = useUnresolvedCommentCount(documentId);

  // Fetch comments when sidebar opens or tab changes
  useEffect(() => {
    if (open && documentId) {
      fetchComments.run({
        documentId,
        statusFilter: activeTab === "resolved" ? [CommentStatusFilter.RESOLVED] : [CommentStatusFilter.UNRESOLVED],
        includeAnchorText: true,
        sort: "createdAt",
        direction: "DESC",
        limit: 50,
        offset: 0,
      });
    }
  }, [open, documentId, activeTab]);

  if (!open) return null;

  return (
    <div
      className={cn(
        "fixed right-0 top-12 h-[calc(100vh-48px)] w-[400px] bg-background border-l flex flex-col transition-transform duration-300 z-20",
        open ? "translate-x-0" : "translate-x-full",
      )}
    >
      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "current" | "resolved")} className="flex flex-col flex-1 overflow-hidden">
        <TabsList className="w-full grid grid-cols-2 rounded-none border-b">
          <TabsTrigger value="current" className="rounded-none">
            Current
            {unresolvedCount > 0 && (
              <span className="ml-2 px-1.5 py-0.5 text-xs font-medium bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 rounded">
                {unresolvedCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="resolved" className="rounded-none">
            Resolved
          </TabsTrigger>
        </TabsList>

        {/* Current Comments Tab */}
        <TabsContent value="current" className="flex-1 mt-0 overflow-hidden flex flex-col">
          <ScrollArea ref={scrollRef} className="flex-1">
            <div className="space-y-4 p-1">
              {fetchComments.loading && unresolvedThreads.length === 0 ? (
                <div className="flex items-center justify-center py-8 text-muted-foreground">Loading comments...</div>
              ) : unresolvedThreads.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <MessageSquare className="w-12 h-12 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">No comments yet</p>
                  <p className="text-xs text-muted-foreground mt-1">Select text in the document to add a comment</p>
                </div>
              ) : (
                unresolvedThreads.map((thread) => (
                  <CommentThread
                    key={thread.id}
                    comment={thread}
                    focused={focusedCommentId === thread.id}
                    recessed={!!focusedCommentId && focusedCommentId !== thread.id}
                    onFocus={() => setFocusedCommentId(thread.id)}
                  />
                ))
              )}
            </div>
          </ScrollArea>

          {/* Add comment form */}
          <div className="border-t p-1">
            <CommentForm documentId={documentId} placeholder="Add a comment..." draftKey={`draft-${documentId}-new`} />
          </div>
        </TabsContent>

        {/* Resolved Comments Tab */}
        <TabsContent value="resolved" className="flex-1 mt-0 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="space-y-4 p-4">
              {fetchComments.loading && resolvedThreads.length === 0 ? (
                <div className="flex items-center justify-center py-8 text-muted-foreground">Loading comments...</div>
              ) : resolvedThreads.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <MessageSquare className="w-12 h-12 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">No resolved comments</p>
                </div>
              ) : (
                resolvedThreads.map((thread) => (
                  <CommentThread
                    key={thread.id}
                    comment={thread}
                    focused={focusedCommentId === thread.id}
                    recessed={!!focusedCommentId && focusedCommentId !== thread.id}
                    onFocus={() => setFocusedCommentId(thread.id)}
                  />
                ))
              )}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}
