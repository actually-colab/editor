import _ from 'lodash';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface MemoizeDebouncedFunction<F extends (...args: any[]) => any> {
  (...args: Parameters<F>): void;
  flush: (...args: Parameters<F>) => void;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function memoizeDebounce<F extends (...args: any[]) => any>(
  func: F,
  wait = 0,
  options: _.DebounceSettings = {},
  resolver?: (...args: Parameters<F>) => unknown
): MemoizeDebouncedFunction<F> {
  const mem = _.memoize<(...args: Parameters<F>) => _.DebouncedFunc<F>>(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    (..._args: Parameters<F>) => _.debounce(func, wait, options),
    resolver
  );

  function f(
    this: MemoizeDebouncedFunction<F>,
    ...args: Parameters<F>
  ): ReturnType<F> | undefined {
    return mem(...args)(...args);
  }

  f.flush = (...args: Parameters<F>): void => {
    mem(...args).flush();
  };

  return (f as unknown) as MemoizeDebouncedFunction<F>;
}
