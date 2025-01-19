import "./index.css";
import { useEditor, EditorContent, BubbleMenu } from "@tiptap/react";
import Collaboration from "@tiptap/extension-collaboration";
import CollaborationCursor from "@tiptap/extension-collaboration-cursor";
import { useCollaborationProvider } from "./hooks/useCollaborationProvider";
import { getRandomElement } from "@/lib/utils";
import useUserStore from "@/stores/user";
import { COLLABORATE_EDIT_USER_COLORS } from "./constant";
import { extensions } from "./extensions";
import BubbleMenus from "./bubble-menus";
import { useRef, useMemo } from "react";
import { useCurrentDocumentState } from "@/pages/doc/stores/editor-store";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { RefreshCw, WifiOff } from "lucide-react";
import AIPanel from "./ai-panel";

interface Props {
  id: string;
  editable: boolean;
  collabToken: string;
  collabWsUrl: string;
}

export default function TiptapEditor({ id, editable = true, collabToken, collabWsUrl }: Props) {
  const menuContainerRef = useRef(null);
  const { userInfo } = useUserStore();
  const currentDocument = useCurrentDocumentState();

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
      CollaborationCursor.configure({
        provider,
        user,
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
  });

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
  );
}
