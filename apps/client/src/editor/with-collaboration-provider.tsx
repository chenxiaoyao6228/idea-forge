import { useCollaborationProvider } from "./hooks/use-collaboration-provider";
import { getRandomElement } from "@idea/utils/string";
import useUserStore from "@/stores/user-store";
import { COLLABORATE_EDIT_USER_COLORS } from "./constant";
import { useMemo } from "react";
import { Skeleton } from "@idea/ui/shadcn/ui/skeleton";
import type { HocuspocusProvider } from "@hocuspocus/provider";

interface CollaborationUser {
  name: string;
  email?: string;
  imageUrl?: string;
  color: string;
}

interface WithProviderProps {
  provider: HocuspocusProvider;
  user: CollaborationUser;
}

interface EditorComponentProps {
  id: string;
  editable: boolean;
  collabToken: string;
  collabWsUrl: string;
}

/**
 * HOC that wraps an editor component with collaboration provider initialization
 * Only renders the wrapped component once the provider is fully ready
 * This ensures all extensions always have access to a valid provider
 *
 * @example
 * const EditorWithProvider = withCollaborationProvider(TiptapEditor);
 * <EditorWithProvider id="doc-id" editable={true} collabToken="token" collabWsUrl="ws://..." />
 */
export function withCollaborationProvider<P extends WithProviderProps>(WrappedComponent: React.ComponentType<P & { id: string; editable: boolean }>) {
  return function ComponentWithProvider(props: Omit<P, keyof WithProviderProps> & EditorComponentProps) {
    const { id, editable, collabToken, collabWsUrl, ...restProps } = props;
    const userInfo = useUserStore((s) => s.userInfo);

    // Memoize user based on specific fields to prevent recreation on unrelated changes
    const user = useMemo(
      () => ({
        name: userInfo?.displayName || (userInfo?.email as string),
        email: userInfo?.email,
        imageUrl: userInfo?.imageUrl,
        color: getRandomElement(COLLABORATE_EDIT_USER_COLORS) || COLLABORATE_EDIT_USER_COLORS[0],
      }),
      [userInfo?.displayName, userInfo?.email, userInfo?.imageUrl],
    );

    const provider = useCollaborationProvider({ documentId: id, user, editable, collabToken, collabWsUrl });

    // Check if provider, document, and awareness are ready
    // Note: The 'doc' XmlFragment will be created by the Collaboration extension when editor initializes
    // We just need to ensure the provider infrastructure is ready
    const isProviderReady = provider != null && provider.document != null && provider.awareness != null;

    // Show loading state while provider is initializing
    if (!isProviderReady) {
      return (
        <div className="flex flex-col gap-2 p-4">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
        </div>
      );
    }

    // Only render editor when provider is fully ready
    // This guarantees all extensions receive a valid provider
    return <WrappedComponent {...(restProps as unknown as P)} id={id} editable={editable} provider={provider} user={user} />;
  };
}
