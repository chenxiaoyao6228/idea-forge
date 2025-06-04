import { Star } from "contracts";

export function presentStar(star: Star) {
  return {
    id: star.id,
    docId: star.docId,
    subspaceId: star.subspaceId,
    index: star.index,
    createdAt: star.createdAt.toISOString(),
    updatedAt: star.updatedAt.toISOString(),
  };
}
