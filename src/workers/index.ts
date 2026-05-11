/** biome-ignore-all lint/correctness/noUndeclaredVariables: <-> */
const openCvWorker = new ComlinkWorker<typeof import("./opencv")>(
  new URL("./opencv", import.meta.url)
);

const mlWorker = new ComlinkWorker<typeof import("./ml")>(
  new URL("./ml", import.meta.url)
);

const dataSyncWorker = new ComlinkWorker<typeof import("./dataSync")>(
  new URL("./dataSync", import.meta.url)
);

export { dataSyncWorker, mlWorker, openCvWorker };
