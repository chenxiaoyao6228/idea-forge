import { Outlet, useRoutes } from "react-router-dom";
import { useIsMobile } from "./hooks/use-mobile";
function RootLayout() {
  // const isMobile = useIsMobile();
  const isMobile = false;

  if (isMobile) {
    return (
      <div className="fixed top-0 left-0 w-full text-center text-base py-2 bg-yellow-500">
        <p>Mobile Device not supported yet!</p>
      </div>
    );
  }

  return <Outlet />;
}

export default RootLayout;
