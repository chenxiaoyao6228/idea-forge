import { useParams } from "react-router-dom";
import { useEffect } from "react";
import Loading from "@/components/ui/loading";
import Doc from "../doc";
import { websocketService } from "@/lib/websocket";
import useUIStore from "@/stores/ui";
import useWorkspaceStore, { workspaceSelectors } from "@/stores/workspace";
import SidebarContainer from "./sidebar";
import { useCurrentDocumentId } from "@/hooks/use-current-document";

export default function Main() {
  const activeDocumentId = useUIStore((state) => state.activeDocumentId);
  const fetchWorkspaces = useWorkspaceStore((state) => state.fetchList);
  const workspaces = useWorkspaceStore((state) => workspaceSelectors.selectAll(state));

  useCurrentDocumentId();

  useEffect(() => {
    fetchWorkspaces();
  }, []);

  useEffect(() => {
    websocketService.connect();
    return () => {
      websocketService.disconnect();
    };
  }, []);

  if (!workspaces.length) {
    return <Loading />;
  }

  let content = <></>;
  if (activeDocumentId) {
    content = <Doc />;
  }

  return (
    <>
      <SidebarContainer content={content} />
    </>
  );
}
