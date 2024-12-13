import Loading from "@/components/loading";
import { LazyExoticComponent, NamedExoticComponent, Suspense } from "react";

const LazyBoundary = (WrapComp: LazyExoticComponent<(() => JSX.Element) | NamedExoticComponent>) => (
  <Suspense fallback={<Loading />}>
    <WrapComp />
  </Suspense>
);

export default LazyBoundary;
