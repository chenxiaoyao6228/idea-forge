import { Subspace, SubspaceMember } from "@idea/contracts";

export function presentSubspace(subspace: Subspace) {
  return {
    ...subspace,
  };
}

export function presentSubspaces(subspaces: Subspace[]) {
  return subspaces.map(presentSubspace);
}

export function presentSubspaceMember(member: SubspaceMember) {
  return {
    ...member,
  };
}
