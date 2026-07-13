// TypeScript may select the unknown accumulator overload for Object.values(Record<string, unknown>).
// This mirrors the standard numeric-initial-value reduce signature without changing runtime behavior.
interface Array<T> {
  reduce(
    callbackfn: (previousValue: number, currentValue: T, currentIndex: number, array: T[]) => number,
    initialValue: number,
  ): number;
}
