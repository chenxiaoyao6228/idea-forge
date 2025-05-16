import { createSelectorFunctions } from "auto-zustand-selectors-hook";
import type { StateCreator, StoreApi, UseBoundStore } from "zustand";
import { immer } from "zustand/middleware/immer";
import { devtools, persist, subscribeWithSelector } from "zustand/middleware";
import { createWithEqualityFn as create } from "zustand/traditional";
import { createComputed } from "zustand-computed";

/*
  docs:
  - https://zustand.docs.pmnd.rs/integrations/immer-middleware
  - https://zustand.docs.pmnd.rs/middlewares/devtools
  - https://zustand.docs.pmnd.rs/middlewares/subscribe-with-selector
  - https://github.com/chrisvander/zustand-computed
  - https://github.com/Albert-Gao/auto-zustand-selectors-hook/tree/master
*/

type ComputedState<T, C> = T & C;

interface StoreOptions {
  devtoolOptions: Parameters<typeof devtools>[1];
  persistOptions?: Parameters<typeof persist>[1];
}

export const createStore = <T extends object, C extends object>(
  fn: StateCreator<T, [["zustand/subscribeWithSelector", never], ["zustand/immer", never], ["zustand/devtools", never], ["zustand/persist", C]], []>,
  computedFn: (state: T) => C,
  options: StoreOptions,
) => {
  const { devtoolOptions = {}, persistOptions = {} } = options || {};

  const computedConfig = createComputed(computedFn)(fn as any);

  const baseStore = create<ComputedState<T, C>>()(
    subscribeWithSelector(
      immer(
        devtools(options.persistOptions ? persist(computedConfig as any, persistOptions as typeof persist) : (computedConfig as any), {
          ...devtoolOptions,
        }) as any,
      ),
    ),
  );

  return createSelectorFunctions(baseStore as UseBoundStore<StoreApi<ComputedState<T, C>>>);
};
