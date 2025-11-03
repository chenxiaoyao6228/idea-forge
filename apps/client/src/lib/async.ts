export const resolvablePromise = () => {
  let resolve: any;
  let reject: any;
  const promise: any = new Promise((_resolve, _reject) => {
    resolve = (...args: any) => {
      promise.fullfilled = true;
      promise.pending = false;
      // @ts-ignore
      _resolve(...args);
    };
    reject = (...args: any) => {
      promise.rejected = true;
      promise.pending = false;
      // @ts-ignore
      _reject(...args);
    };
  });
  promise.resolve = resolve;
  promise.reject = reject;
  promise.pending = true;
  return promise;
};

export function toAsync<T, U = any>(promise: Promise<T>): Promise<[U | null, T | null]> {
  return promise.then<[null, T]>((data: T) => [null, data]).catch<[U, null]>((err) => [err, null]);
}
