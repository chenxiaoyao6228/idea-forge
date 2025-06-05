import { Subspace } from "@prisma/client";
import { SubspaceSchema } from "contracts";

export function presentSubspace(subspace: Subspace) {
  return SubspaceSchema.parse({
    ...subspace,
    createdAt: subspace.createdAt.toISOString(),
    updatedAt: subspace.updatedAt.toISOString(),
  });
}

export function presentSubspaces(subspaces: Subspace[]) {
  return subspaces.map(presentSubspace);
}
