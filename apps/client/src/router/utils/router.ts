import { logger } from "@/lib/logger";
import { Route } from "./route";
import { IRouteHandler, IRouteObject } from "./types";

type IRouteOptions = { route: IRouteObject; handler?: IRouteHandler };

let router: Router;

class Router {
  router: IRouteObject[] = [];

  constructor(...rest: Route[]) {
    this.push(...rest);
  }

  push(...rest: Route[]) {
    // Skip subsequent operations if no parameters
    if (!rest.length) {
      return;
    }

    // Get routeList after handler processing, if no handler exists, return routeObject directly
    const handleRouteList = rest.map((route) => {
      const { route: routeObject } = route;
      // Get route after handler processes route, return undefined if no handler
      const handleRouteObject = this._getHandledRoute(route);

      return handleRouteObject || routeObject;
    });

    this.router = this.router.concat(...handleRouteList);
  }

  private _getHandledRoute(route: Route) {
    const { handlerList, route: routeObject } = route;
    let handleRouteObject: IRouteObject | undefined;

    if (handlerList.length === 0) {
      return;
    }

    for (const handler of handlerList) {
      // Promise not supported
      if (handler instanceof Promise) {
        logger.warn("Router class _getHandledRoute warning: route handler function cannot be asynchronous");
        continue;
      }

      handleRouteObject = handler(routeObject);
    }

    return handleRouteObject;
  }
}

/** Register route to router */
export function registerRoute(...rest: Route[] | IRouteOptions[]) {
  if (rest.length === 0) {
    return;
  }
  if (!router) {
    router = new Router();
  }

  const routeList = rest.map((options) => {
    if (options instanceof Route) {
      return options;
    }
    return new Route(options.route, options.handler);
  });

  router.push(...routeList);
}

// Get router
export function getOrCreateRouter() {
  if (!router) {
    router = new Router();
  }
  return router;
}
