import { IRouteHandler, IRouteObject } from "./types";

export class Route {
  private readonly _route: IRouteObject;
  private readonly _handlerList: IRouteHandler[] = [];

  constructor(route: IRouteObject, handler?: IRouteHandler[] | IRouteHandler) {
    /** Route configuration object */
    this._route = route;
    /** Route handlers */
    handler && (this._handlerList = this._handlerList.concat(handler));
  }

  get route() {
    return this._route;
  }

  get handlerList() {
    return this._handlerList;
  }
}
