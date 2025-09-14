import Loading from "@/components/ui/loading";
import Doc from "../doc";
import useWorkspaceStore, { workspaceSelectors } from "@/stores/workspace";
import SidebarContainer from "./sidebar";
import { useCurrentDocument } from "@/hooks/use-current-document";
import { websocketService } from "@/lib/websocket";
import { useLayoutEffect } from "react";

export default function Main() {
  const fetchWorkspaces = useWorkspaceStore((state) => state.fetchList);
  const currentDocument = useCurrentDocument();
  const workspaces = useWorkspaceStore((state) => workspaceSelectors.selectAll(state));

  useLayoutEffect(() => {
    fetchWorkspaces();
  }, []);

  useLayoutEffect(() => {
    websocketService.connect();
    return () => {
      websocketService.disconnect();
    };
  }, []);

  if (!workspaces.length) {
    return <Loading />;
  }

  let content = <Loading />;
  if (currentDocument) {
    content = <Doc />;
  }

  return <SidebarContainer content={content} />;
}
