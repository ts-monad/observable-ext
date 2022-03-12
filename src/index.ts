import { fmap, Observable } from "@ts-monad/observable";

export const property = <R>(key: keyof R) => fmap((o: R) => o[key]);

export const propertyOf =
  <R>(ob: Observable<R>) =>
  (key: keyof R) =>
    property(key)(ob);
