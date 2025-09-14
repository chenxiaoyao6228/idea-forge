import { Outlet, useRoutes } from "react-router-dom";
import { useIsMobile } from "./hooks/use-mobile";
import { useEffect } from "react";
// import "./components/modals/register-all-modals"; // register all modals in this app
import { ContextAwareConfirmation } from "react-confirm";

function useRemoveInitialLoader() {
  useEffect(() => {
    // remove initial loader
    const loader = document.getElementById("initial-loader");
    if (loader) {
      // add fade out animation
      loader.style.opacity = "0";
      loader.style.transition = "opacity 0.3s ease";

      // wait for animation to complete and remove element
      setTimeout(() => {
        loader.remove();
      }, 300);
    }
  }, []);
}

function App() {
  // const isMobile = useIsMobile();
  const isMobile = false;

  useRemoveInitialLoader();

  if (isMobile) {
    return (
      <div className="fixed top-0 left-0 w-full text-center text-base py-2 bg-yellow-500">
        <p>Mobile Device not supported yet!</p>
      </div>
    );
  }

  return (
    <>
      <ContextAwareConfirmation.ConfirmationRoot />
      <Outlet />
    </>
  );
}

export default App;
