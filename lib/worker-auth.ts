import { timingSafeEqual } from "node:crypto";

/** Exact bearer comparison; an unset or short secret can never authorize work. */
export function workerAuthorized(authorization: string | null, secret: string | undefined) {
  if (!authorization || !secret || secret.length < 16) return false;
  const expected = Buffer.from(`Bearer ${secret}`, "utf8");
  const received = Buffer.from(authorization, "utf8");
  return received.length === expected.length && timingSafeEqual(received, expected);
}
