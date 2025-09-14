import "./index.css";
import { useEditor, EditorContent } from "@tiptap/react";
import Collaboration from "@tiptap/extension-collaboration";
import CollaborationCursor from "@tiptap/extension-collaboration-cursor";
import { useCollaborationProvider } from "./hooks/useCollaborationProvider";
import { getRandomElement } from "@/lib/utils";
import useUserStore from "@/stores/user";
import { COLLABORATE_EDIT_USER_COLORS } from "./constant";
import { extensions } from "./extensions";
import BubbleMenus from "./bubble-menus";
import { useRef, useMemo, useEffect } from "react";
import { useEditorStore } from "@/stores/editor-store";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { RefreshCw, WifiOff } from "lucide-react";
import AIPanel from "./ai-panel";
import { getHierarchicalIndexes } from "@tiptap/extension-table-of-contents";
import TableOfContents from "@tiptap/extension-table-of-contents";
import React from "react";
import { useCurrentDocument } from "@/hooks/use-current-document";
import { TextSelection } from "@tiptap/pm/state";

interface Props {
  id: string;
  editable: boolean;
  collabToken: string;
  collabWsUrl: string;
}

export default function TiptapEditor({ id, editable = true, collabToken, collabWsUrl }: Props) {
  const menuContainerRef = useRef(null);
  const { userInfo } = useUserStore();
  const currentDocument = useCurrentDocument();
  const setEditor = useEditorStore((state) => state.setEditor);
  const setTocItems = useEditorStore((state) => state.setTocItems);
  const { status, error, lastSyncedAt, pendingChanges, isIndexedDBLoaded } = currentDocument || {};

  const user = useMemo(
    () => ({
      name: userInfo?.displayName || (userInfo?.email as string),
      email: userInfo?.email,
      avatar: userInfo?.imageUrl,
      color: getRandomElement(COLLABORATE_EDIT_USER_COLORS),
    }),
    [userInfo],
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
      Collaboration.configure({
        document: provider.document,
      }),
      // FIXME: the cursor will cause the editor to crash somehow, need to fix it later
      // CollaborationCursor.configure({
      //   provider,
      //   user,
      // }),
      TableOfContents.configure({
        scrollParent: () => document?.getElementById("WORK_CONTENT_SCROLL_CONTAINER") || window,
        getIndex: getHierarchicalIndexes,
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
      console.log("Editor content:", editor.getJSON());
    },
  });

  useEffect(() => {
    if (editor) {
      setEditor(editor);
    }
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

  if (!user || !editor) return null;

  return (
    <React.Fragment>
      <div id="EDITOR-CONTAINER" className="editor-container relative md:col-[2] w-full mx-auto mt-2 " ref={menuContainerRef}>
        {renderStatusBanner()}

        {status !== "loading" && (
          <>
            <EditorContent editor={editor} className="w-full" />
            {/* <BubbleMenus editor={editor} containerRef={menuContainerRef} /> */}
            {/* <AIPanel editor={editor} /> */}
          </>
        )}
      </div>
    </React.Fragment>
  );
}
