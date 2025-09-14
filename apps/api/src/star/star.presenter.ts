import { Star } from "@idea/contracts";

export function presentStar(star: Star) {
  try {
    return {
      id: star.id,
      docId: star.docId,
      index: star.index,
    };
  } catch (error) {
    console.error("Error presenting star:", error);
    return {};
  }
}
