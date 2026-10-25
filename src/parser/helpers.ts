/**
 * TokKit parser helpers — TokNode base class, ObservedArray, Maybe.
 * TokKit parser helpers — base node classes, typed arrays, and utility wrappers.
 */

/**
 * Base class for all parsed TikTok nodes.
 */
export abstract class TokNode {
  readonly type: string;

  constructor(type: string) {
    this.type = type;
  }

  /**
   * Type guard — check if this node is a specific type.
   */
  is<T extends TokNode>(NodeClass: new (...args: never[]) => T): this is T {
    return this instanceof NodeClass;
  }

  /**
   * Cast to a specific type, throwing if the cast fails.
   */
  as<T extends TokNode>(NodeClass: new (...args: never[]) => T): T {
    if (this instanceof NodeClass) return this as unknown as T;
    throw new Error(`Cannot cast ${this.type} to ${NodeClass.name}`);
  }
}

/**
 * An enhanced array that supports type-safe filtering.
 */
export class ObservedArray<T> extends Array<T> {
  /**
   * Filter items by TokNode subclass type.
   */
  filterType<U extends TokNode>(
    NodeClass: new (...args: never[]) => U
  ): ObservedArray<U> {
    const result = new ObservedArray<U>();
    for (const item of this) {
      if (item instanceof NodeClass) {
        result.push(item as unknown as U);
      }
    }
    return result;
  }

  /**
   * Get the first item that matches a TokNode subclass type.
   */
  firstOfType<U extends TokNode>(
    NodeClass: new (...args: never[]) => U
  ): U | undefined {
    for (const item of this) {
      if (item instanceof NodeClass) {
        return item as unknown as U;
      }
    }
    return undefined;
  }

  /**
   * Get first item or undefined.
   */
  get first(): T | undefined {
    return this[0];
  }

  /**
   * Get last item or undefined.
   */
  get last(): T | undefined {
    return this[this.length - 1];
  }

  /**
   * Create from a regular array.
   */
  static from_array<T>(items: T[]): ObservedArray<T> {
    const arr = new ObservedArray<T>();
    arr.push(...items);
    return arr;
  }
}

/**
 * Safe property access wrapper — avoids null/undefined crashes.
 */
export class Maybe {
  readonly #value: unknown;

  constructor(value: unknown) {
    this.#value = value;
  }

  get isNull(): boolean {
    return this.#value === null || this.#value === undefined;
  }

  string(): string {
    return typeof this.#value === 'string' ? this.#value : '';
  }

  number(): number {
    return typeof this.#value === 'number' ? this.#value : 0;
  }

  boolean(): boolean {
    return typeof this.#value === 'boolean' ? this.#value : false;
  }

  array(): unknown[] {
    return Array.isArray(this.#value) ? this.#value : [];
  }

  object(): Record<string, unknown> {
    return (typeof this.#value === 'object' && this.#value !== null && !Array.isArray(this.#value))
      ? this.#value as Record<string, unknown>
      : {};
  }

  any(): unknown {
    return this.#value;
  }

  /**
   * Access a nested property.
   */
  key(name: string): Maybe {
    if (typeof this.#value === 'object' && this.#value !== null) {
      return new Maybe((this.#value as Record<string, unknown>)[name]);
    }
    return new Maybe(undefined);
  }
}

/**
 * Wrap a value in a Maybe for safe access.
 */
export function maybe(value: unknown): Maybe {
  return new Maybe(value);
}
