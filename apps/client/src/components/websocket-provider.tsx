import { useEffect } from "react";
import { useWebsocketEventHandlers } from "@/hooks/websocket";
import { getWebsocketService } from "@/lib/websocket";

export function WebSocketProvider({ children }: { children: React.ReactNode }) {
  const websocketService = getWebsocketService();
  useWebsocketEventHandlers(websocketService.socket);

  useEffect(() => {
    // Connect to WebSocket when component mounts
    websocketService.connect().catch((error) => {
      console.error("[websocket-provider]: Connection failed:", error);
    });

    // Cleanup function will be called when component unmounts
    return () => {
      websocketService.disconnect();
    };
  }, []); // Empty dependency array to run only once

  return <>{children}</>;
}
