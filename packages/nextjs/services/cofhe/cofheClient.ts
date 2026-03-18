/**
 * Re-exports the client accessor from @cofhe/react.
 *
 * @cofhe/react's CofheProvider automatically sets the client when connected
 * and clears it on disconnect. Non-React code (decrypted.ts, tokenStore.ts)
 * can import getCofheClient() to access the current client instance.
 */
export { getCofheClient, isCofheConnected as isCofheInitialized } from "@cofhe/react";
