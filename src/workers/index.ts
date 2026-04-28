/** biome-ignore-all lint/correctness/noUndeclaredVariables: <-> */
const openCvWorker = new ComlinkWorker<typeof import("./opencv")>(
  new URL("./opencv", import.meta.url)
);

const mlWorker = new ComlinkWorker<typeof import("./ml")>(
  new URL("./ml", import.meta.url)
);

export { mlWorker, openCvWorker };
