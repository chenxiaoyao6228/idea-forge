import Loading from '@idea/ui/base/loading';
import { LazyExoticComponent, Suspense } from "react";

const LazyBoundary = (WrapComp: LazyExoticComponent<() => JSX.Element | null>) => (
  <Suspense fallback={<Loading fullScreen size="lg" id="lazy-boundary" />}>
    <WrapComp />
  </Suspense>
);

export default LazyBoundary;
