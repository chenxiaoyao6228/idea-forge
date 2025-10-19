import { useEffect, useState } from "react";
import { useParams, Link, useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { publicShareApi } from "@/apis/public-share";
import useUserStore from "@/stores/user-store";
import { Button } from "@idea/ui/shadcn/ui/button";
import { Home, AlertCircle } from "lucide-react";
import Loading from "@idea/ui/base/loading";
import ReadOnlyEditor from "@/editor/read-only-editor";
import { PublicSidebar } from "./components/public-sidebar";
import { TableOfContent } from "@/pages/doc/components/table-of-content";
import BackToTop from "@/components/back-to-top";
import PublicDocumentBreadcrumb from "./components/public-breadcrumb";
import Cover from "@/pages/doc/cover";
import type { TableOfContentDataItem } from "@tiptap/extension-table-of-contents";
import type { Editor } from "@tiptap/react";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@idea/ui/shadcn/ui/sidebar";
import { NavigationTreeNode } from "@idea/contracts";
import { Emoji } from "emoji-picker-react";
import { DOCUMENT_TITLE_ID } from "@/editor/constant";

interface PublicDocumentResponseWithTree {
  share: {
    id: string;
    permission: string;
    views: number;
  };
  doc: {
    id: string;
    title: string;
    content: string;
    icon: string | null;
    coverImage?: any;
    workspace: {
      id: string;
      name: string;
      avatar: string | null;
    };
  };
  navigationTree: NavigationTreeNode;
}

export default function PublicDocument() {
  const { token, docId } = useParams<{ token: string; docId?: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [data, setData] = useState<PublicDocumentResponseWithTree | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ status?: number; message: string } | null>(null);

  // Table of Contents state
  const [tocItems, setTocItems] = useState<TableOfContentDataItem[]>([]);
  const [editor, setEditor] = useState<Editor | null>(null);

  // Hydrate user store from server-injected data (if user is authenticated)
  // This allows us to detect auth state on public pages
  useEffect(() => {
    const userInfo = (window as any)._userInfo;
    if (userInfo && !useUserStore.getState().userInfo) {
      useUserStore.setState({ userInfo });
      // Clean up
      (window as any)._userInfo = null;
      document.querySelector("#userHook")?.remove();
    }
  }, []);

  // Show notification if redirected from discovery
  useEffect(() => {
    if (searchParams.get("discovered") === "true") {
      toast.info(t("You were redirected to the public version of this document"), {
        duration: 5000,
      });
      // Remove the query parameter to clean up URL
      searchParams.delete("discovered");
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams, t]);

  useEffect(() => {
    const fetchDocument = async () => {
      if (!token) return;

      setLoading(true);
      setError(null);

      try {
        const response = docId ? await publicShareApi.getPublicNestedDocument(token, docId) : await publicShareApi.getPublicDocument(token);

        setData(response as unknown as PublicDocumentResponseWithTree);
      } catch (err: any) {
        console.error("Failed to fetch public document:", err);
        setError({
          status: err?.response?.status || err?.status,
          message: err?.response?.data?.message || "Failed to load document",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchDocument();
  }, [token, docId]);

  // Error states
  if (error) {
    const isExpired = error.status === 410;
    const isNotFound = error.status === 404;

    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="max-w-md w-full p-8 text-center space-y-4">
          <AlertCircle className="h-16 w-16 mx-auto text-muted-foreground" />
          <h1 className="text-2xl font-bold">
            {isExpired && t("Link Expired")}
            {isNotFound && t("Document Not Found")}
            {!isExpired && !isNotFound && t("Error Loading Document")}
          </h1>
          <p className="text-muted-foreground">
            {isExpired && t("This public link has expired or been revoked.")}
            {isNotFound && t("The document you're looking for doesn't exist or isn't publicly shared.")}
            {!isExpired && !isNotFound && error.message}
          </p>
          <div className="pt-4">
            <Button variant="outline" onClick={() => navigate("/")}>
              <Home className="h-4 w-4 mr-2" />
              {t("Go to Home")}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const { doc, navigationTree, share } = data;

  return (
    <SidebarProvider defaultOpen={true}>
      {/* Left Sidebar - Navigation Tree */}
      {navigationTree && (
        <PublicSidebar
          navigationTree={navigationTree}
          token={token!}
          activeDocId={docId || navigationTree.id}
          workspaceName={doc.workspace.name}
          docId={doc.id}
        />
      )}

      {/* Main Content Area */}
      <SidebarInset id="PUBLIC_DOC_SCROLL_CONTAINER" className="relative">
        {/* Header */}
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex h-14 items-center justify-between px-6">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="-ml-1" />
              <PublicDocumentBreadcrumb navigationTree={navigationTree} token={token!} activeDocId={docId || navigationTree.id} />
            </div>
            <div className="flex items-center gap-2">
              {share.views > 0 && (
                <span className="text-xs text-muted-foreground">
                  {t("Views")}: {share.views}
                </span>
              )}
            </div>
          </div>
        </header>

        {/* Scrollable Content Container - Match authenticated view layout */}
        <div className="flex-auto overflow-y-auto flex flex-col">
          {/* Cover Image - Reuse Cover component in read-only mode */}
          {doc.coverImage && <Cover cover={doc.coverImage} editable={false} />}

          {/* Main content container - Match exact classes from /pages/doc/index.tsx */}
          <div className="md:max-w-3xl lg:max-w-4xl mx-auto px-10 relative flex-1 flex flex-col">
            {/* Icon and Title - Toolbar component in read-only mode */}

            <div className={`${doc.coverImage ? "-mt-6" : "mt-6"} inline-flex items-center gap-x-2 group/icon `}>
              {doc.icon && <Emoji unified={doc.icon} size={64} />}
            </div>

            <div className={`text-4xl font-bold break-words outline-none text-[#2D2D2D] dark:text-[#CFCFCF] pb-[11.5px]`} id={DOCUMENT_TITLE_ID}>
              {doc.title || t("Untitled")}
            </div>

            {/* Document Content - ReadOnlyEditor with same styling as TiptapEditor */}
            <ReadOnlyEditor
              content={doc.content}
              className="prose prose-neutral dark:prose-invert max-w-none"
              onTocUpdate={setTocItems}
              onEditorReady={setEditor}
            />

            {/* Table of Contents - Same as authenticated view */}
            <TableOfContent editor={editor} items={tocItems} />

            {/* Footer - Sticks to bottom */}
            <footer className="border-t mt-auto p-4 text-center align-middle text-sm text-muted-foreground">
              <p>
                {t("Powered by")}{" "}
                <Link to="/" className="font-medium hover:underline">
                  Idea Forge
                </Link>
                {" - " + t("Work less, Create more")}
              </p>
            </footer>
          </div>
        </div>

        {/* Scroll to Top Button (reused from authenticated view) */}
        <BackToTop />
        {loading && <Loading fullScreen size="lg" id="public-document-loading" className="absolute top-0 left-0 w-full h-full" />}
      </SidebarInset>
    </SidebarProvider>
  );
}
