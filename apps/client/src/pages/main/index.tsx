import Loading from "@/components/ui/loading";
import Doc from "../doc";
import { useAllWorkspaces, useFetchWorkspaces, useCurrentWorkspace } from "@/stores/workspace-store";
import { useFetchGuests, useIsGuestCollaborator } from "@/stores/guest-collaborators-store";
import SidebarContainer from "./sidebar";
import { useCurrentDocument } from "@/hooks/use-current-document";
import { WebSocketProvider } from "@/components/websocket-provider";
import { useLayoutEffect, useRef } from "react";

export default function Main() {
  const { run: fetchWorkspaces } = useFetchWorkspaces();
  const { run: fetchGuests } = useFetchGuests();
  const currentDocument = useCurrentDocument();
  const workspaces = useAllWorkspaces();
  const currentWorkspace = useCurrentWorkspace();
  const isGuestCollaborator = useIsGuestCollaborator();

  useLayoutEffect(() => {
    fetchWorkspaces();
  }, []);

  // Bootstrap guest data when current workspace is available
  useLayoutEffect(() => {
    if (currentWorkspace && !isGuestCollaborator) {
      fetchGuests();
    }
  }, [currentWorkspace, isGuestCollaborator]);

  if (!workspaces.length) {
    return <Loading />;
  }

  // TODO: handle when user is first login, no active docs
  let content = <Loading />;
  if (currentDocument) {
    content = <Doc />;
  }

  return (
    <WebSocketProvider>
      <SidebarContainer content={content} />
    </WebSocketProvider>
  );
}
