import "./index.css";
import { useEditor, EditorContent } from "@tiptap/react";
import Collaboration from "@tiptap/extension-collaboration";
import CollaborationCursor from "@tiptap/extension-collaboration-cursor";
import { useCollaborationProvider } from "./hooks/use-collaboration-provider";
import { getRandomElement } from "@idea/utils/string";
import useUserStore from "@/stores/user-store";
import { COLLABORATE_EDIT_USER_COLORS } from "./constant";
import { extensions } from "./extensions";
import BubbleMenus from "./bubble-menus";
import { useRef, useMemo, useEffect } from "react";
import { useEditorStore } from "@/stores/editor-store";
import { Skeleton } from "@idea/ui/shadcn/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@idea/ui/shadcn/ui/alert";
import { Button } from "@idea/ui/shadcn/ui/button";
import { RefreshCw, WifiOff } from "lucide-react";
import AIPanel from "./ai-panel";
import { getHierarchicalIndexes, getHeadlineLevel } from "@tiptap/extension-table-of-contents";
import TableOfContents from "@tiptap/extension-table-of-contents";
import React from "react";
import { TextSelection } from "@tiptap/pm/state";
import useUIStore from "@/stores/ui-store";
import { CommentMark } from "@idea/editor";

interface Props {
  id: string;
  editable: boolean;
  collabToken: string;
  collabWsUrl: string;
}

function TiptapEditor({ id, editable = true, collabToken, collabWsUrl }: Props) {
  const menuContainerRef = useRef(null);
  const userInfo = useUserStore((s) => s.userInfo);
  const collaborationState = useEditorStore((state) => state.documents[id]);
  const { status, error, lastSyncedAt, pendingChanges, isIndexedDBLoaded } = collaborationState || {
    status: "loading",
    error: undefined,
    lastSyncedAt: undefined,
    pendingChanges: false,
    isIndexedDBLoaded: false,
  };
  const setEditor = useEditorStore((state) => state.setEditor);
  const setTocItems = useEditorStore((state) => state.setTocItems);
  const setCommentsSidebarOpen = useUIStore((state) => state.setCommentsSidebarOpen);
  const setFocusedCommentId = useUIStore((state) => state.setFocusedCommentId);

  // Memoize user based on specific fields to prevent recreation on unrelated changes
  const user = useMemo(
    () => ({
      name: userInfo?.displayName || (userInfo?.email as string),
      email: userInfo?.email,
      imageUrl: userInfo?.imageUrl,
      color: getRandomElement(COLLABORATE_EDIT_USER_COLORS) || COLLABORATE_EDIT_USER_COLORS[0],
    }),
    [userInfo?.displayName, userInfo?.email, userInfo?.imageUrl],
  );

  const provider = useCollaborationProvider({ documentId: id, user, editable, collabToken, collabWsUrl });

  const editor = useEditor({
    editorProps: {
      attributes: {
        class: "min-h-96 prose dark:prose-invert focus:outline-none max-w-none pb-40",
      },
    },
    editable,
    extensions: [
      ...extensions,
      CommentMark.configure({
        documentId: id,
        onCommentClick: (commentId: string) => {
          // Open sidebar and focus the comment
          setCommentsSidebarOpen(true);
          setFocusedCommentId(commentId);
        },
      }),
      ...(provider?.document
        ? [
            Collaboration.configure({
              document: provider.document,
            }),
          ]
        : []),
      // FIXME: the cursor will cause the editor to crash somehow, need to fix it later
      // if we have the condition 'provider?.awareness && provider.status === "connected"'
      // the extension won't work somehow, need to update this when making the tiptap 3.x upgrade
      // Only add CollaborationCursor if provider is available and ready
      // Add a small delay to ensure provider is fully initialized
      // ...(provider?.awareness && provider.status === "connected"
      //   ? [
      //       CollaborationCursor.configure({
      //         provider,
      //         user,
      //       }),
      //     ]
      //   : []),
      TableOfContents.configure({
        scrollParent: () => document?.getElementById("WORK_CONTENT_SCROLL_CONTAINER") || window,
        getIndex: getHierarchicalIndexes,
        getLevel: getHeadlineLevel,
        onUpdate(content) {
          // console.log('toc content...', content);
          setTocItems(content);
        },
      }),
    ],
    // onTransaction: ({ transaction, editor }) => {
    //   console.log("Transaction:", {
    //     time: new Date().toISOString(),
    //     docChanged: transaction.docChanged,
    //     steps: transaction.steps.map((step) => step.toJSON()),
    //     selection: transaction.selection.toJSON(),
    //   });
    // },
    onCreate: ({ editor }) => {
      console.log("Editor created:", editor);
    },
    onUpdate: ({ editor }) => {
      // console.log("Editor content:", editor.getJSON());
    },
    onDestroy: () => {
      console.log("Editor destroyed");
    },
  });

  useEffect(() => {
    if (editor) {
      setEditor(editor);
    }

    // Cleanup on unmount or when editor changes
    return () => {
      if (editor && !editor.isDestroyed) {
        editor.destroy();
      }
    };
  }, [editor, setEditor]);

  useEffect(() => {
    if (!editor) return;

    const handleHashChange = () => {
      const hash = window.location.hash.slice(1);
      if (!hash) return;

      // Give a small delay to ensure the DOM is fully rendered
      setTimeout(() => {
        const element = editor.view.dom.querySelector(`[data-node-id="${hash}"]`);
        if (element) {
          // Calculate scroll position and scroll
          element.scrollIntoView({ behavior: "smooth", block: "center" });

          // Get position of the node in the document
          const pos = editor.view.posAtDOM(element, 0);

          // Create transaction to add highlight mark
          let tr = editor.view.state.tr;

          // Set selection and add highlight mark
          tr.setSelection(new TextSelection(tr.doc.resolve(pos)));
          tr = tr.addMark(pos, pos + element.textContent!.length, editor.schema.marks.highlight.create());

          editor.view.dispatch(tr);
          editor.view.focus();

          // Remove highlight after delay
          setTimeout(() => {
            const tr = editor.view.state.tr.removeMark(pos, pos + element.textContent!.length, editor.schema.marks.highlight);
            editor.view.dispatch(tr);
          }, 2000);
        }
      }, 100);
    };

    handleHashChange();
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, [editor]);

  // @ts-ignore for debug
  window._editor = editor;

  // Add safety checks AFTER all hooks
  if (!provider || !provider.document || !user || !editor || !id || !collabToken || !collabWsUrl) {
    console.log("provider, user, editor, id, collabToken, collabWsUrl", provider, user, editor, id, collabToken, collabWsUrl);
    return (
      <div className="flex items-center justify-center h-64">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-8 w-32" />
      </div>
    );
  }

  const renderStatusBanner = () => {
    switch (status) {
      case "loading":
        return (
          <div className="space-y-2 ">
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-full" />
          </div>
        );

      case "connecting":
        // the user do not need to see this as long as the user can edit, right?
        return null;
      // return (
      //   <div className="bg-muted p-2 rounded-md mb-2">
      //     <p className="text-sm text-muted-foreground flex items-center">
      //       <RefreshCw className="animate-spin h-4 w-4 mr-2" />
      //       Connecting to collaboration server...
      //     </p>
      //   </div>
      // );

      case "unauthorized":
        return (
          <Alert variant="destructive" className="mb-2">
            <AlertTitle>Access Denied</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        );

      case "offline":
        return (
          <Alert className="mb-2">
            <AlertTitle className="flex items-center">
              <WifiOff className="h-4 w-4 mr-2" />
              Offline Editing Mode
            </AlertTitle>
            <AlertDescription>
              {pendingChanges ? "Changes are being saved locally and will sync when you're back online." : "You're working offline but can continue editing."}
              {lastSyncedAt && <p className="text-xs text-muted-foreground mt-1">Last synced: {new Date(lastSyncedAt).toLocaleString()}</p>}
            </AlertDescription>
          </Alert>
        );

      case "error":
        return (
          <Alert variant="destructive" className="mb-2">
            <AlertTitle>Connection Error</AlertTitle>
            <AlertDescription>
              {error}
              <Button variant="outline" className="mt-2" onClick={() => window.location.reload()}>
                <RefreshCw className="mr-2" />
                Retry Connection
              </Button>
            </AlertDescription>
          </Alert>
        );

      default:
        return null;
    }
  };

  return (
    <React.Fragment>
      <div id="EDITOR-CONTAINER" className="editor-container relative md:col-[2] w-full mx-auto mt-2 " ref={menuContainerRef}>
        {renderStatusBanner()}

        {status !== "loading" && (
          <>
            <EditorContent editor={editor} className="w-full" />
            <BubbleMenus editor={editor} containerRef={menuContainerRef} />
            <AIPanel editor={editor} />
          </>
        )}
      </div>
    </React.Fragment>
  );
}

// Memoize to prevent unnecessary re-renders on parent updates (e.g., i18n language changes)
export default React.memo(TiptapEditor);
