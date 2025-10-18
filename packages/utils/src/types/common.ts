/**
 * Represents a value that can be either the type T or a Promise resolving to T.
 * Useful for functions that can handle both sync and async values.
 */
export type Awaitable<T> = T | Promise<T>;

/**
 * Represents a value that can be either the type T or null.
 */
export type Nullable<T> = T | null;

/**
 * Represents a value that can be either the type T or undefined.
 */
export type Optional<T> = T | undefined;

/**
 * Makes all properties of T nullable.
 */
export type Nullish<T> = {
  [K in keyof T]: T[K] | null | undefined;
};

/**
 * Represents a value that can be either the type T, null, or undefined.
 */
export type Maybe<T> = T | null | undefined;
