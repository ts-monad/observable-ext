import { fmap, mutable } from "@ts-monad/observable";
import {
  chain,
  currentValue,
  debounce,
  delay,
  noop,
  property,
  propertyOf,
  throttle,
  transition,
  update,
} from "..";

const inc = transition((i: number) => i + 1);

describe("#property & #propertyOf", () => {
  it("should extract a property of observable object", () => {
    const obj = mutable({ x: 1, y: 5 });
    const x = property<{ x: number }>("x")(obj);
    const y = propertyOf(obj)("y");

    const cbX = jest.fn();
    const obX = x.observe(cbX);

    const cbY = jest.fn();
    const obY = y.observe(cbY);

    expect(obX.value).toBe(1);

    update(obj)(({ x, y }) => ({ x, y: y - 1 }));
    expect(cbX).not.toBeCalled();
    expect(cbY).toBeCalledTimes(1);
    expect(cbY).toBeCalledWith(4);

    update(obj)(({ x, y }) => ({ x: x + 1, y }));
    expect(cbY).toBeCalledTimes(1);
    expect(cbX).toBeCalledTimes(1);
    expect(cbX).toBeCalledWith(2);

    // Cascaded unobserve
    obX.unobserve();
    obY.unobserve();
    expect(obj.isObserved()).toBeFalsy();
  });
});

describe("currentValue", () => {
  it("should get the current value of the observable", () => {
    const mut = mutable(0);

    expect(currentValue(mut)).toBe(0);
    expect(mut.isObserved()).toBeFalsy();

    inc(mut);

    expect(currentValue(mut)).toBe(1);
    expect(mut.isObserved()).toBeFalsy();
  });
});

describe("throttle", () => {
  it("should limit the frequency of update calls", async () => {
    const mut = mutable(0);
    const obT = throttle(10)(mut);
    const cb = jest.fn();
    const obn = obT.observe(cb);

    expect(obn.value).toBe(0);

    inc(mut); // 1
    expect(cb).not.toBeCalled();

    await new Promise(r => setTimeout(r, 15));
    expect(cb).toHaveBeenCalledTimes(1);
    expect(cb).toHaveBeenLastCalledWith(1);

    await new Promise(r => setTimeout(r, 15));
    inc(mut); // 2
    inc(mut); // 3
    inc(mut); // 4
    expect(cb).toHaveBeenCalledTimes(2);
    expect(cb).toHaveBeenLastCalledWith(2);

    await new Promise(r => setTimeout(r, 15));
    expect(cb).toHaveBeenCalledTimes(3);
    expect(cb).toHaveBeenLastCalledWith(4);

    obn.unobserve();
    expect(obT.isObserved()).toBeFalsy();
    expect(mut.isObserved()).toBeFalsy();
  });
});

describe("debounce", () => {
  it("should hold the update until it is stable", async () => {
    const mut = mutable(0);
    const obD = debounce(10)(mut);
    const cb = jest.fn();
    const obn = obD.observe(cb);

    expect(obn.value).toBe(0);

    inc(mut); // 1
    expect(cb).not.toBeCalled();

    await new Promise(r => setTimeout(r, 15));
    expect(cb).toHaveBeenCalledTimes(1);
    expect(cb).toHaveBeenLastCalledWith(1);

    await new Promise(r => setTimeout(r, 15));
    inc(mut); // 2
    inc(mut); // 3
    inc(mut); // 4
    expect(cb).toHaveBeenCalledTimes(1);

    await new Promise(r => setTimeout(r, 15));
    expect(cb).toHaveBeenCalledTimes(2);
    expect(cb).toHaveBeenLastCalledWith(4);

    obn.unobserve();
    expect(obD.isObserved()).toBeFalsy();
    expect(mut.isObserved()).toBeFalsy();
  });
});

describe("delay", () => {
  it("should delay the updates", async () => {
    const mut = mutable(0);
    const ob = delay(10)(mut);
    const cb = jest.fn();
    const obn = ob.observe(cb);

    expect(obn.value).toBe(0);

    inc(mut); // 1
    expect(cb).not.toBeCalled();

    await new Promise(r => setTimeout(r, 15));
    expect(cb).toHaveBeenCalledTimes(1);
    expect(cb).toHaveBeenLastCalledWith(1);

    obn.unobserve();
    expect(ob.isObserved()).toBeFalsy();
    expect(mut.isObserved()).toBeFalsy();
  });
});

describe("chain", () => {
  it("should be able to create an observable with chained operators", () => {
    const mutN = mutable(0);
    const mutF = mutable((x: number) => x * 3);
    const obM = chain(mutN)
      .fmap(x => x * 2) // n * 2
      .tap(fmap(x => x + 1)) // n * 2 + 1
      .bind(x => fmap((f: (n: number) => number) => f(x))(mutF)) // f(n * 2 + 1)
      .observable(); // m = (n * 2 + 1) * 3

    const cb = jest.fn();
    const { value, unobserve } = obM.observe(cb);

    expect(value).toBe(3);

    inc(mutN); // n is 1

    expect(cb).toHaveBeenLastCalledWith(9);

    update(mutF)(f => x => f(x) - x - 1); // m = (n * 2 + 1) * 2 - 1

    expect(cb).toHaveBeenLastCalledWith(5);

    unobserve();
    expect(obM.isObserved()).toBeFalsy();
    expect(mutN.isObserved()).toBeFalsy();
    expect(mutF.isObserved()).toBeFalsy();
  });
});

describe("__DUMMY_TEST__", () => {
  test("ensure the helper functions are covered", () => {
    expect(noop()).toBeUndefined();
  });
});
