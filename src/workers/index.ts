/** biome-ignore-all lint/correctness/noUndeclaredVariables: <-> */
const workerInstance = new ComlinkWorker<typeof import("./worker")>(
  new URL("./worker", import.meta.url)
);

export { workerInstance };
