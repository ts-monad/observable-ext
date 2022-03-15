import {
  bind,
  fmap,
  MutableStore,
  observable,
  Observable,
  Observer,
} from "@ts-monad/observable";

export const noop = () => {};

export const property = <R>(key: keyof R) => fmap((o: R) => o[key]);

export const propertyOf =
  <R>(ob: Observable<R>) =>
  (key: keyof R) =>
    property(key)(ob);

export const currentValue = <T>(ob: Observable<T>): T => {
  const { value, unobserve } = ob.observe(noop);
  unobserve();
  return value;
};

export const update =
  <T>(mut: MutableStore<T>) =>
  (f: (v: T) => T): T =>
    mut.set(f(mut.get()));

export const transition =
  <T>(f: (v: T) => T) =>
  (mut: MutableStore<T>): T =>
    update(mut)(f);

export const throttle =
  (ms: number) =>
  <T>(ob: Observable<T>): Observable<T> =>
    observable<T>(observer => {
      let timestamp = Date.now();
      let timeout: ReturnType<typeof setTimeout> | null = null;

      return ob.observe(newValue => {
        const notify = () => {
          if (timeout) {
            clearTimeout(timeout);
            timeout = null;
          }

          const now = Date.now();
          if (now > timestamp + ms) {
            timestamp = now;
            observer(newValue);
          } else {
            timeout = setTimeout(notify, timestamp + ms - now);
          }
        };
        notify();
      });
    });

export const debounce =
  (ms: number) =>
  <T>(ob: Observable<T>): Observable<T> =>
    observable<T>(observer => {
      let timeout: ReturnType<typeof setTimeout> | null = null;
      return ob.observe(newValue => {
        if (timeout) {
          clearTimeout(timeout);
        }
        timeout = setTimeout(() => {
          timeout = null;
          observer(newValue);
        }, ms);
      });
    });

export const delay =
  (ms: number) =>
  <T>(ob: Observable<T>): Observable<T> =>
    observable<T>(observer =>
      ob.observe(newValue => setTimeout(() => observer(newValue), ms))
    );

export type ObservableChain<S> = {
  fmap: <T>(f: (s: S) => T) => ObservableChain<T>;
  bind: <T>(f: (s: S) => Observable<T>) => ObservableChain<T>;
  tap: <T>(f: (s: Observable<S>) => Observable<T>) => ObservableChain<T>;
  observable: () => Observable<S>;
};

export const chain = <S>(ob: Observable<S>): ObservableChain<S> => ({
  fmap: f => chain(fmap(f)(ob)),
  bind: f => chain(bind(f)(ob)),
  tap: f => chain(f(ob)),
  observable: () => ob,
});
