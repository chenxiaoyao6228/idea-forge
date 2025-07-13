import { useParams } from "react-router-dom";
import { useEffect } from "react";
import Loading from "@/components/ui/loading";
import Doc from "../doc";
import { websocketService } from "@/lib/websocket";
import useUIStore from "@/stores/ui";
import useWorkspaceStore, { workspaceSelectors } from "@/stores/workspace";
import SidebarContainer from "./sidebar";

export default function Main() {
  const { docId } = useParams();
  const setActiveDocumentId = useUIStore((state) => state.setActiveDocumentId);
  const fetchWorkspaces = useWorkspaceStore((state) => state.fetchList);
  const workspaces = useWorkspaceStore((state) => workspaceSelectors.selectAll(state));

  useEffect(() => {
    setActiveDocumentId(docId || "");
  }, [docId, setActiveDocumentId]);

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
  if (docId) {
    content = <Doc />;
  }

  return <SidebarContainer content={content} />;
}
