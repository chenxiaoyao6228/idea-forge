import Loading from "@/components/loading";
import { LazyExoticComponent, Suspense } from "react";

const LazyBoundary = (WrapComp: LazyExoticComponent<() => JSX.Element | null>) => (
  <Suspense fallback={<Loading size="lg" />}>
    <WrapComp />
  </Suspense>
);

export default LazyBoundary;
