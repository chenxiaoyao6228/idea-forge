import React from "react";
import { createBrowserRouter } from "react-router-dom";
import { Route } from "./utils/route";
import { IRouteObject } from "./utils/types";
import { wrapperHandler } from "./utils/wrapperHandler";
import { getOrCreateRouter, registerRoute } from "./utils/router";
import WithAuth from "@/hocs/with-auth";
import LazyBoundary from "@/components/lazy-boundary";

const RootLayout = React.lazy(() => import(/* webpackChunkName: "RootLayout" */ "@/RootLayout"));
const Home = React.lazy(() => import(/* webpackChunkName: "Home" */ "@/pages/home"));
const Login = React.lazy(() => import(/* webpackChunkName: "Login" */ "@/pages/login"));
const NotFound = React.lazy(() => import(/* webpackChunkName: "NotFound" */ "@/pages/not-found"));

// Routes that require authentication
const AuthRouteConfig: IRouteObject = {
  path: "/",
  element: <RootLayout />,
  errorElement: LazyBoundary(NotFound as any),
  wrapper: [WithAuth],
  children: [{ path: "/", element: LazyBoundary(Home) }],
};

// Routes that don't require authentication
// TODO: remember to update skipAuthPaths in api/src/_shared/middlewares/fallback.middleware.ts when changing adding new paths
const UnAuthRouteConfig: IRouteObject = {
  path: "/",
  element: <RootLayout />,
  errorElement: LazyBoundary(NotFound as any),
  wrapper: [],
  children: [
    {
      path: "/login",
      element: LazyBoundary(Login),
    },
  ],
};

// Create a new route. First parameter is route configuration, second is the handler.
// The most important is wrapperHandler, which processes the wrappers
const authRoute = new Route(AuthRouteConfig, wrapperHandler);
const unAuthRoute = new Route(UnAuthRouteConfig, wrapperHandler);

/**
 * Example explanation:
 *
 * {
  path: '/',
  element: <App />,
  wrapper: [checkUser, checkLang]
}
will be compiled to {
  path: '/',
  element: checkUser(checkLang(<App />)),
}
 */

// Register routes into the router
registerRoute(authRoute);
registerRoute(unAuthRoute);

// Get the router
const routerObject: any = getOrCreateRouter().router;

// Inject the router into createBrowserRouter
const router = createBrowserRouter(routerObject, {
  basename: "/",
});

export default router;
