#!/usr/bin/env node
/**
 * Patches @cofhe/react to fix SSR crash: "window is not defined"
 *
 * The library accesses window.localStorage at module level in queryUtils.ts,
 * which crashes during Next.js server-side rendering.
 * This patch makes the access lazy (deferred to first use).
 *
 * Remove this script once @cofhe/react publishes a version with the SSR fix.
 */

const fs = require("fs");
const path = require("path");

const REACT_DIST = path.join(__dirname, "..", "node_modules", "@cofhe", "react", "dist");

function patchFile(filePath) {
  if (!fs.existsSync(filePath)) return false;

  let content = fs.readFileSync(filePath, "utf8");

  // Already patched
  if (content.includes("getStorage")) return false;

  // 1. Replace module-level storage access with lazy getter
  content = content.replace(
    'var storage = persistenceConfig.storage === "localStorage" ? window.localStorage : window.sessionStorage;',
    'var getStorage = function() { if (typeof window === "undefined") return undefined; return persistenceConfig.storage === "localStorage" ? window.localStorage : window.sessionStorage; };',
  );

  // 2. Replace eager persister creation with lazy getter (CJS pattern)
  content = content.replace(
    "var persister = (0, import_query_async_storage_persister.createAsyncStoragePersister)({",
    "var _persister = null;\nvar getPersister = function() { if (_persister) return _persister; _persister = (0, import_query_async_storage_persister.createAsyncStoragePersister)({",
  );

  // 2b. Same for ESM (direct call pattern)
  content = content.replace(
    "var persister = createAsyncStoragePersister({",
    "var _persister = null;\nvar getPersister = function() { if (_persister) return _persister; _persister = createAsyncStoragePersister({",
  );

  // 3. Replace "storage," inside the persister object with "storage: getStorage(),"
  content = content.replace(/getPersister[\s\S]*?storage,/, (match) =>
    match.replace("  storage,", "  storage: getStorage(),"),
  );

  // 4. Close the getPersister function after the persister object
  content = content.replace(
    /(deserialize: deserializeWithBigInt\n\}\);)/,
    "$1 return _persister; };",
  );

  fs.writeFileSync(filePath, content, "utf8");
  return true;
}

if (!fs.existsSync(path.join(REACT_DIST, "index.cjs"))) {
  console.log("@cofhe/react not found, skipping patch");
  process.exit(0);
}

const cjsPatched = patchFile(path.join(REACT_DIST, "index.cjs"));
const esmPatched = patchFile(path.join(REACT_DIST, "index.js"));

if (cjsPatched || esmPatched) {
  console.log("@cofhe/react patched for SSR");
}
