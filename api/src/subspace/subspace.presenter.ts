import { Subspace } from "@prisma/client";
import { NavigationNode } from "contracts";

export function presentSubspace(subspace: Subspace) {
  return {
    ...subspace,
    navigationTree: subspace.navigationTree || ([] as NavigationNode[]),
    createdAt: subspace.createdAt.toISOString(),
    updatedAt: subspace.updatedAt.toISOString(),
  };
}
