/**
 * Minimal bridge to expose the CofheClient to non-React code (e.g. decrypted.ts, tokenStore.ts).
 * The actual client lifecycle is managed by @cofhe/react's CofheProvider.
 * A React component (CofheClientBridge) syncs the client ref from context.
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
  return _client != null;
}
