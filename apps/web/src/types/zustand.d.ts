declare module 'zustand' {
  export type SetState<T> = (
    partial: Partial<T> | ((state: T) => Partial<T>),
    replace?: boolean,
  ) => void;

  export type StateCreator<T> = (
    set: SetState<T>,
    get: () => T,
    store: unknown,
  ) => T;

  export interface StoreApi<T> {
    getState: () => T;
    setState: SetState<T>;
    subscribe: (listener: (state: T, previousState: T) => void) => () => void;
  }

  export interface UseBoundStore<T> {
    (): T;
    <U>(selector: (state: T) => U): U;
    getState: () => T;
    setState: SetState<T>;
    subscribe: StoreApi<T>['subscribe'];
  }

  export function create<T>(): (
    initializer: StateCreator<T>,
  ) => UseBoundStore<T>;
}

declare module 'zustand/middleware' {
  import type { StateCreator } from 'zustand';

  export interface PersistOptions<T, U = Partial<T>> {
    name: string;
    partialize?: (state: T) => U;
  }

  export function persist<T, U = Partial<T>>(
    initializer: StateCreator<T>,
    options: PersistOptions<T, U>,
  ): StateCreator<T>;
}
