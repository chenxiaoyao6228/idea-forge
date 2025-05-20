import { Action, AppAbility, BaseAbility } from "@/_shared/casl/ability.class";
import { DefineAbility } from "@/_shared/casl/ability.decorator";
import { Injectable } from "@nestjs/common";
import { User } from "contracts";

@Injectable()
@DefineAbility("Workspace")
export class WorkspaceAbility extends BaseAbility {
  createForUser(user: User): AppAbility {
    return this.createAbility(({ can, cannot }) => {
      //   // Basic permissions
      //   can(Action.Read, "Workspace");
      //   can(Action.Create, "Workspace");
      //   can(Action.Update, "Workspace", {
      //     members: {
      //       some: {
      //         userId: user.id,
      //         role: "OWNER",
      //       },
      //     },
      //   });
      //   can(Action.Delete, "Workspace", {
      //     members: {
      //       some: {
      //         userId: user.id,
      //         role: "OWNER",
      //       },
      //     },
      //   });
      //   can(Action.Manage, "WorkspaceMember", {
      //     workspace: {
      //       members: {
      //         some: {
      //           userId: user.id,
      //           role: { in: ["OWNER", "ADMIN"] },
      //         },
      //       },
      //     },
      //   });
    });
  }
}
