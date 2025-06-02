import { BusinessEvents } from "@/_shared/socket/business-event.constant";

export interface WebsocketEvent<T = any> {
  name: BusinessEvents;
  workspaceId: string;
  actorId?: string;
  data: T;
  timestamp: string;
}
