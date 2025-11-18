import Loading from "@idea/ui/base/loading";
import Doc from "../doc";
import { useAllWorkspaces, useFetchWorkspaces, useCurrentWorkspace } from "@/stores/workspace-store";
import { useFetchGuests, useIsGuestCollaborator } from "@/stores/guest-collaborators-store";
import SidebarContainer from "./sidebar";
import { WebSocketProvider } from "@/components/websocket-provider";
import { BatchImportStatusBar } from "@/components/batch-import-status-bar";
import { useLayoutEffect } from "react";
import { useFetchCurrentDocument } from "@/hooks/use-current-document";
import { useSyncOnReconnect } from "@/hooks/use-sync-on-reconnect";
import { useTrackLastVisitedDocument, useRedirectToLastVisited } from "@/hooks/use-last-visited-document";

export default function Main() {
  const { run: fetchWorkspaces } = useFetchWorkspaces();
  const { run: fetchGuests } = useFetchGuests();
  const currentDocument = useFetchCurrentDocument();
  const workspaces = useAllWorkspaces();
  const currentWorkspace = useCurrentWorkspace();
  const isGuestCollaborator = useIsGuestCollaborator();

  // Track last visited document and handle redirect on root path
  useTrackLastVisitedDocument();
  const { isRedirecting } = useRedirectToLastVisited();

  // Auto-refetch workspaces on WebSocket recovery (page visible, reconnect)
  useSyncOnReconnect(() => {
    fetchWorkspaces();
    fetchGuests();
  }, !!currentWorkspace);

  useLayoutEffect(() => {
    fetchWorkspaces();
  }, []);

  // Bootstrap guest data when current workspace is available
  useLayoutEffect(() => {
    if (currentWorkspace && !isGuestCollaborator) {
      fetchGuests();
    }
  }, []);

  if (!workspaces.length) {
    return <Loading fullScreen size="lg" id="main-no-workspaces" />;
  }

  // Show loading while redirecting to last visited or creating welcome doc
  if (isRedirecting) {
    return <Loading fullScreen size="lg" id="main-redirecting" />;
  }

  // Show document content when available
  let content = <Loading id="main-no-document" />;
  if (currentDocument) {
    content = <Doc />;
  }

  return (
    <WebSocketProvider>
      <SidebarContainer content={content} />
      <BatchImportStatusBar />
    </WebSocketProvider>
  );
}
