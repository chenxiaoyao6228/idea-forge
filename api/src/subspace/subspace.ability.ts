import { Action, AppAbility, BaseAbility } from "@/_shared/casl/ability.class";
import { DefineAbility } from "@/_shared/casl/ability.decorator";
import { Injectable } from "@nestjs/common";
import { User } from "contracts";

@Injectable()
@DefineAbility("Subspace")
export class SubspaceAbility extends BaseAbility {
  createForUser(user: User): AppAbility {
    return this.createAbility(({ can, cannot }) => {
      // Basic permissions
      // can(Action.Read, "Subspace", {
      //   OR: [
      //     { type: "PUBLIC" },
      //     { type: "WORKSPACE_WIDE" },
      //     {
      //       members: {
      //         some: {
      //           userId: user.id,
      //         },
      //       },
      //     },
      //   ],
      // });
      // // Create permission - workspace owner or can create
      // can(Action.Create, "Subspace", {
      //   workspace: {
      //     members: {
      //       some: {
      //         userId: user.id,
      //       },
      //     },
      //   },
      // });
      // can(Action.Update, "Subspace", {
      //   members: {
      //     some: {
      //       userId: user.id,
      //       role: "ADMIN",
      //     },
      //   },
      // });
      // can(Action.Delete, "Subspace", {
      //   members: {
      //     some: {
      //       userId: user.id,
      //       role: "ADMIN",
      //     },
      //   },
      // });
      // can(Action.Manage, "SubspaceMember", {
      //   subspace: {
      //     members: {
      //       some: {
      //         userId: user.id,
      //         role: "ADMIN",
      //       },
      //     },
      //   },
      // });
    });
  }
}
