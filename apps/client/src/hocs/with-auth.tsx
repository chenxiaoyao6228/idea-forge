import { useEffect } from "react";
import useUserStore, { UserInfo } from "@/stores/user-store";
import Loading from "@/components/ui/loading";
import { useInitializeSubjectAbilities } from "@/stores/ability-store";

/**
 * Get userInfo from local window object and destroy local storage
 * Dehydrate user information
 */
function getUserInfoAndDestroyFromLocal(): UserInfo | undefined {
  const localInfo = (window as any)._userInfo || undefined;

  // Destroy locally stored information
  (window as any)._userInfo = null;

  // Remove HTML node containing local storage info
  document.querySelector("#userHook")?.remove();

  return localInfo;
}

export default function WithAuth(WrappedComponent: React.ComponentType<any>) {
  return function EnhancedComponent(props: any) {
    const userInfo = useUserStore((state) => state.userInfo);
    const initializeSubjectAbilities = useInitializeSubjectAbilities();

    useEffect(() => {
      if (window.location.pathname === "/auth-callback") {
        return;
      }

      const userInfo = getUserInfoAndDestroyFromLocal();
      if (userInfo) {
        useUserStore.setState({ userInfo });

        initializeSubjectAbilities(userInfo.abilities);
      }
    }, []);

    // Loading state
    if (!userInfo?.id && window.location.pathname !== "/auth-callback") {
      return <Loading fullScreen size="lg" id="with-auth" />;
    }

    // Render original component
    return <WrappedComponent {...props} />;
  };
}
