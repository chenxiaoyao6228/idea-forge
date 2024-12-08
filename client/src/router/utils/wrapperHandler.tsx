import { IRouteObject } from "./types";
import React, { Suspense } from "react";

export function wrapperHandler(route: IRouteObject): IRouteObject {
  const { wrapper = [], element, children, ...restParams } = route;
  // Handle wrapper for the element itself
  const WrapperElement = wrapper.reduce(
    (reactNode, hoc) => {
      const node = () => {
        return <Suspense fallback={<React.Fragment />}>{reactNode({})}</Suspense>;
      };
      return hoc(node, { ...restParams, children });
    },
    (() => {
      return element;
    }) as React.FC,
  );

  const wrapperChildren = children?.map(wrapperHandler);

  return {
    ...route,
    element: <WrapperElement />,
    children: wrapperChildren,
  } as any;
}
