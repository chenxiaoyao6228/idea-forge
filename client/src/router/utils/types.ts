import { AgnosticIndexRouteObject, AgnosticNonIndexRouteObject } from "@remix-run/router";

export interface IndexRoute {
  /** route Hoc */
  wrapper?: (<T>(node: React.FC<T>, options: any) => React.FC<T>)[];
  caseSensitive?: AgnosticIndexRouteObject["caseSensitive"];
  path?: AgnosticIndexRouteObject["path"];
  id?: AgnosticIndexRouteObject["id"];
  loader?: AgnosticIndexRouteObject["loader"];
  action?: AgnosticIndexRouteObject["action"];
  hasErrorBoundary?: AgnosticIndexRouteObject["hasErrorBoundary"];
  shouldRevalidate?: AgnosticIndexRouteObject["shouldRevalidate"];
  handle?: AgnosticIndexRouteObject["handle"];
  index: true;
  children?: undefined;
  element?: React.ReactNode | null | React.LazyExoticComponent<(props: any) => JSX.Element | null>;
  errorElement?: React.ReactNode | null;
}

export interface NonRoute {
  /** route Hoc */
  wrapper?: (<T>(node: React.FC<T>, options: any) => React.FC<T>)[];
  caseSensitive?: AgnosticNonIndexRouteObject["caseSensitive"];
  path?: AgnosticNonIndexRouteObject["path"];
  id?: AgnosticNonIndexRouteObject["id"];
  loader?: AgnosticNonIndexRouteObject["loader"];
  action?: AgnosticNonIndexRouteObject["action"];
  hasErrorBoundary?: AgnosticNonIndexRouteObject["hasErrorBoundary"];
  shouldRevalidate?: AgnosticNonIndexRouteObject["shouldRevalidate"];
  handle?: AgnosticNonIndexRouteObject["handle"];
  index?: false;
  children?: IRouteObject[];
  element?: React.ReactNode | null | React.LazyExoticComponent<(props: any) => JSX.Element | null>;
  errorElement?: React.ReactNode | null;
}

export type IRouteObject = IndexRoute | NonRoute;

export type IRouteHandler = (route: IRouteObject) => IRouteObject;
