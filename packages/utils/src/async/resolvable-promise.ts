/**
 * Creates a promise that can be resolved or rejected externally.
 * Useful for managing async operations that need to be controlled from outside.
 *
 * @returns A promise with external resolve/reject methods and state tracking
 *
 * @example
 * ```typescript
 * const promise = resolvablePromise();
 *
 * // Later, from somewhere else:
 * promise.resolve('success!');
 *
 * // Check state:
 * if (promise.pending) {
 *   console.log('Still waiting...');
 * }
 * ```
 */
export const resolvablePromise = () => {
  let resolve: any;
  let reject: any;
  const promise: any = new Promise((_resolve, _reject) => {
    resolve = (value?: any) => {
      promise.fullfilled = true;
      promise.pending = false;
      _resolve(value);
    };
    reject = (reason?: any) => {
      promise.rejected = true;
      promise.pending = false;
      _reject(reason);
    };
  });
  promise.resolve = resolve;
  promise.reject = reject;
  promise.pending = true;
  return promise;
};
