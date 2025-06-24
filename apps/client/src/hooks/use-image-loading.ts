import { useState } from "react";

export function useImageLoading() {
  const [isLoading, setIsLoading] = useState(true);

  function handleImageLoad() {
    setIsLoading(false);
  }

  return {
    isLoading,
    handleImageLoad,
  };
}
