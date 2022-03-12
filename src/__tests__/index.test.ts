import { mutable, startWith } from "@ts-monad/observable";
import { property, propertyOf } from "..";

describe("#property & #propertyOf", () => {
  it("should extract a property of observable object", () => {
    const unobserve = jest.fn();
    const obj = mutable(startWith({ x: 1, y: 5 }, unobserve));
    const x = property<{ x: number }>("x")(obj);
    const y = propertyOf(obj)("y");

    const cbX = jest.fn();
    const obX = x.observe(cbX);

    const cbY = jest.fn();
    const obY = y.observe(cbY);

    expect(obX.state).toBe(1);

    obj.update(({ x, y }) => ({ x, y: y - 1 }));
    expect(cbX).not.toBeCalled();
    expect(cbY).toBeCalledTimes(1);
    expect(cbY).toBeCalledWith(4);

    obj.update(({ x, y }) => ({ x: x + 1, y }));
    expect(cbY).toBeCalledTimes(1);
    expect(cbX).toBeCalledTimes(1);
    expect(cbX).toBeCalledWith(2);

    // Cascaded unobserve
    obX.unobserve();
    obY.unobserve();
    expect(unobserve).toBeCalledTimes(1);
  });
});