import { Star } from "@idea/contracts";

export function presentStar(star: Star) {
  try {
    return {
      id: star.id,
      docId: star.docId,
      subspaceId: star.subspaceId,
      index: star.index,
      createdAt: star.createdAt.toISOString(),
      updatedAt: star.updatedAt.toISOString(),
    };
  } catch (error) {
    console.error("Error presenting star:", error);
    return {};
  }
}
