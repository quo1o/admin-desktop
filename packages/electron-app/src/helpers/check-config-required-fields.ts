export default function checkConfigRequiredFields <
  C extends Record<string, string | undefined>,
  I extends string,
> (
  config: C,
  requiredFields: ReadonlyArray<I>,
): Record<I, string> | string {
  for (const field of requiredFields) {
    const isExist = config[field];
    if (!isExist) return `Не указан параметр ${field}`;
  }

  return config as Record<I, string>;
}
