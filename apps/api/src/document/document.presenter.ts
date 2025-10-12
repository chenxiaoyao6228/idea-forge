export function presentDocument(document: any) {
  try {
    // Use spread operator to automatically include all fields
    // Only override fields that need transformation
    return {
      ...document,
      // Transform author info if present
      ...(document.author && {
        author: {
          id: document.author.id,
          displayName: document.author.displayName,
          email: document.author.email,
          imageUrl: document.author.imageUrl,
        },
      }),
    };
  } catch (e) {
    console.log("presentDocument error", e);
    throw e;
  }
}
