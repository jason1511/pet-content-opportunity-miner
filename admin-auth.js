export async function checkAdminAuthorization(request, env) {
  if (!env.ANALYTICS_ADMIN_TOKEN) return "unconfigured";
  const header = request.headers.get("Authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return "unauthorized";
  return await constantTimeEqual(token, env.ANALYTICS_ADMIN_TOKEN)
    ? "authorized"
    : "unauthorized";
}

async function constantTimeEqual(left, right) {
  const encoder = new TextEncoder();
  const [leftHash, rightHash] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(left)),
    crypto.subtle.digest("SHA-256", encoder.encode(right))
  ]);
  const leftBytes = new Uint8Array(leftHash);
  const rightBytes = new Uint8Array(rightHash);
  let difference = 0;
  for (let index = 0; index < leftBytes.length; index += 1) {
    difference |= leftBytes[index] ^ rightBytes[index];
  }
  return difference === 0;
}
