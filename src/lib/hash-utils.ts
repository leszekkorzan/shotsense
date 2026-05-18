export const hmacSha256 = async (msg: string, key: string) => {
  const enc = new TextEncoder();

  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    enc.encode(key),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const buf = await crypto.subtle.sign("HMAC", cryptoKey, enc.encode(msg));

  return [...new Uint8Array(buf)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
};
