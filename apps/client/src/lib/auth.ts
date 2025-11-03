export const displayUserName = (user: { displayName?: string | null; email?: string | null }) => {
  if (!user) return "";
  return user.displayName || user.email || "";
};

export const getInitialChar = (name: string) => {
  return name.charAt(0).toUpperCase();
};
