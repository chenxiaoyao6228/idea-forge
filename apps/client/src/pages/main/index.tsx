import Loading from "@/components/ui/loading";
import Doc from "../doc";
import useWorkspaceStore, { useAllWorkspaces, useFetchWorkspaces } from "@/stores/workspace-store";
import SidebarContainer from "./sidebar";
import { useCurrentDocument } from "@/hooks/use-current-document";
import { WebSocketProvider } from "@/components/websocket-provider";
import { useLayoutEffect } from "react";

export default function Main() {
  const { run: fetchWorkspaces } = useFetchWorkspaces();
  const currentDocument = useCurrentDocument();
  const workspaces = useAllWorkspaces();

  useLayoutEffect(() => {
    fetchWorkspaces();
  }, []);

  if (!workspaces.length) {
    return <Loading />;
  }

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
