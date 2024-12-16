import Loading from "@/components/loading";
import { LazyExoticComponent, Suspense } from "react";

const LazyBoundary = (WrapComp: LazyExoticComponent<() => JSX.Element | null>) => (
  <Suspense fallback={<Loading />}>
    <WrapComp />
  </Suspense>
);

export default LazyBoundary;
