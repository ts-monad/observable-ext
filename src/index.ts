import {
  bind,
  fmap,
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

export const tmap =
  <T>(f: (observer: Observer<T>) => Observer<T>) =>
  (ob: Observable<T>): Observable<T> =>
    observable((observer) => ob.observe(f(observer)));

export const throttle = (ms: number) =>
  tmap((observer) => {
    let timestamp = Date.now();
    let timeout: ReturnType<typeof setTimeout> | null = null;

    return (newValue) => {
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
    };
  });

export const debounce = (ms: number) =>
  tmap((observer) => {
    let timeout: ReturnType<typeof setTimeout> | null = null;
    return (newValue) => {
      if (timeout) {
        clearTimeout(timeout);
      }
      timeout = setTimeout(() => {
        timeout = null;
        observer(newValue);
      }, ms);
    };
  });

export const delay = (ms: number) =>
  tmap((observer) => (newValue) => setTimeout(() => observer(newValue), ms));

export type ObservableChain<S> = {
  fmap: <T>(f: (s: S) => T) => ObservableChain<T>;
  bind: <T>(f: (s: S) => Observable<T>) => ObservableChain<T>;
  observable: () => Observable<S>;
};

export const chain = <S>(ob: Observable<S>): ObservableChain<S> => ({
  fmap: (f) => chain(fmap(f)(ob)),
  bind: (f) => chain(bind(f)(ob)),
  observable: () => ob,
});
