import React from "react";
import { createBrowserRouter } from "react-router-dom";
import { Route } from "./utils/route";
import { IRouteObject } from "./utils/types";
import { wrapperHandler } from "./utils/wrapperHandler";
import { getOrCreateRouter, registerRoute } from "./utils/router";
import WithAuth from "@/hocs/with-auth";
import LazyBoundary from "@/components/lazy-boundary";
import ErrorBoundary from "@/components/error-boundary";
import WithHomeNav from "@/hocs/with-home-nav";

const App = React.lazy(() => import(/* webpackChunkName: "App" */ "@/App"));
const Marketing = React.lazy(() => import(/* webpackChunkName: "Marketing" */ "@/pages/marketing"));
const Login = React.lazy(() => import(/* webpackChunkName: "Login" */ "@/pages/login"));
const Register = React.lazy(() => import(/* webpackChunkName: "Register" */ "@/pages/register"));
const Verify = React.lazy(() => import(/* webpackChunkName: "Verify" */ "@/pages/verify"));
const NotFound = React.lazy(() => import(/* webpackChunkName: "NotFound" */ "@/pages/not-found"));
const ForgotPassword = React.lazy(() => import(/* webpackChunkName: "ForgotPassword" */ "@/pages/forgot-password"));
const ResetPassword = React.lazy(() => import(/* webpackChunkName: "ResetPassword" */ "@/pages/reset-password"));
const AuthCallback = React.lazy(() => import(/* webpackChunkName: "AuthCallback" */ "@/pages/auth-callback"));
const Main = React.lazy(() => import(/* webpackChunkName: "Doc" */ "@/pages/main"));
const CreateWorkspace = React.lazy(() => import(/* webpackChunkName: "CreateWorkspace" */ "@/pages/create-workspace"));
const TokenUsage = React.lazy(() => import(/* webpackChunkName: "TokenUsage" */ "@/pages/admin/token-usage"));
const TestSentry = React.lazy(() => import(/* webpackChunkName: "TestSentry" */ "@/pages/test-sentry"));
const PublicInvitation = React.lazy(() => import(/* webpackChunkName: "PublicInvitation" */ "@/pages/public-invitation"));

// Routes that require authentication
const AuthRouteConfig: IRouteObject = {
  path: "/",
  element: <App />,
  errorElement: LazyBoundary(ErrorBoundary as any),
  wrapper: [WithAuth],
  children: [
    {
      path: "/",
      element: LazyBoundary(Main),
    },
    {
      path: "/:docId",
      element: LazyBoundary(Main),
    },
    {
      path: "create-workspace",
      element: LazyBoundary(CreateWorkspace),
    },
    // TODO: make it nested
    {
      path: "/admin/token-usage",
      element: LazyBoundary(TokenUsage),
      errorElement: LazyBoundary(ErrorBoundary as any),
    },
    // TODO: remove this after testing
    {
      path: "/test-sentry",
      element: LazyBoundary(TestSentry),
    },
    {
      path: "/public-invitation/:token",
      element: LazyBoundary(PublicInvitation),
    },
  ],
};

// Routes that don't require authentication
// TODO: remember to update skipAuthPaths in api/src/_shared/middlewares/fallback.middleware.ts when changing adding new paths
const UnAuthRouteConfig: IRouteObject = {
  path: "/",
  element: <App />,
  errorElement: LazyBoundary(ErrorBoundary as any),
  wrapper: [WithHomeNav],
  children: [
    { path: "/marketing", wrapper: [WithHomeNav], element: LazyBoundary(Marketing) },
    {
      path: "/login",
      element: LazyBoundary(Login),
    },
    {
      path: "/register",
      element: LazyBoundary(Register),
    },
    {
      path: "/verify",
      element: LazyBoundary(Verify),
    },
    {
      path: "/forgot-password",
      element: LazyBoundary(ForgotPassword),
    },
    {
      path: "/reset-password",
      element: LazyBoundary(ResetPassword),
    },
    {
      path: "/auth-callback",
      element: LazyBoundary(AuthCallback),
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
