import { WebSocketGateway } from "@nestjs/websockets";
import { CollaborationService } from "./collaboration.service";

@WebSocketGateway()
export class CollaborationGateway {
  constructor(private readonly collaborationService: CollaborationService) {}
}
