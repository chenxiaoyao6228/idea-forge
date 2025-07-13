## zustand store

use zustand to manage global state, you can use custom factory to facilitate creating store, see `utils/creator`

for simple store you can just use `create` from zustand

## template

see [demo-store](./demo-store.ts)

## official docs

- https://zustand.docs.pmnd.rs/integrations/immer-middleware
- https://zustand.docs.pmnd.rs/middlewares/devtools
- https://zustand.docs.pmnd.rs/middlewares/subscribe-with-selector
- https://github.com/chrisvander/zustand-computed
- https://github.com/Albert-Gao/auto-zustand-selectors-hook/tree/master

## Implementation Convention

- Only type the interface/type for store state and actions. Do NOT add explicit parameter types to the implementation of store functions. This keeps the implementation concise and matches the style in `user.ts` and the [React Client Code Style Guide](../../../../.cursor/rules/react-client.mdc).

- Example:

```ts
interface UserStoreState {
  loading: boolean;
  userInfo: UserInfo | null;
  setUserInfo: (userInfo: UserInfo) => void;
}

const useUserStore = create<UserStoreState>()((set) => ({
  loading: false,
  userInfo: null,
  setUserInfo: (userInfo) => set({ userInfo }), // no explicit type here
  logout: async () => {
    set({ loading: true });
    await authApi.logout();
    localStorage.clear();
    set({ userInfo: null, loading: false });
  },
}));
```

See the [@react-client.mdc](../../../../.cursor/rules/react-client.mdc) for the full style guide.
