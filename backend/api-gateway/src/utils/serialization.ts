function isDecimal(value: unknown): value is { toString(): string; constructor: { name: string } } {
  return typeof value === "object" && value !== null && (value as any).constructor?.name === "Decimal";
}

export function serializeBigInt(input: any): any {
  if (input === null || input === undefined) return input;
  if (typeof input === "bigint") return input.toString();
  if (isDecimal(input)) return input.toString();
  if (Array.isArray(input)) return input.map((item) => serializeBigInt(item));
  if (typeof input === "object") {
    const out: Record<string, any> = {};
    for (const [key, value] of Object.entries(input)) {
      out[key] = serializeBigInt(value);
    }
    return out;
  }
  return input;
}
