// The one null filter for Contentful link fields, e.g. `items.filter(present)`.
export function present<T>(value: T | null | undefined): value is T {
  return value != null;
}
