import { useEffect, useState } from "react";

// Lets a fast-changing input (e.g. a drag-driven range slider) settle before
// triggering expensive downstream work, without blocking the input's own
// visual feedback (which should keep reading the live, undebounced value).
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);
  return debounced;
}
