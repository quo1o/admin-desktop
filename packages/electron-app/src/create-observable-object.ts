type THandler = <T>(target: T, property: PropertyKey, value: unknown) => void;

export default function createObservableObject <T extends Record<PropertyKey, unknown>> (
  target: T,
  ...handlers: THandler[]
) {
  return new Proxy(target, {
    set (target, property, value, receiver) {
      const isSuccess = Reflect.set(target, property, value, receiver);
      if (isSuccess) {
        handlers.forEach(handler => handler(target, property, value));
      }
      return isSuccess;
    },
  });
}
