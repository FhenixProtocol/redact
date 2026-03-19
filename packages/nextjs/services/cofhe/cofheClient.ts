/**
 * Module-level bridge to expose the CofheClient to non-React code.
 *
 * The client is set by useCofhe.ts when @cofhe/react connects,
 * and used by decrypted.ts, tokenStore.ts etc. that run outside React.
 *
 * Once @cofhe/react publishes getCofheClient(), this file can be replaced
 * with a re-export: export { getCofheClient } from "@cofhe/react";
 */
import type { CofheClient } from "@cofhe/sdk";

let _client: CofheClient | null = null;

export function getCofheClient(): CofheClient | null {
  return _client;
}

export function setCofheClient(client: CofheClient | null): void {
  _client = client;
}

export function isCofheInitialized(): boolean {
  return _client !== null;
}
