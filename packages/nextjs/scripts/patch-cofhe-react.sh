#!/bin/bash
# Patches @cofhe/react to fix SSR crash: "window is not defined"
#
# The library accesses window.localStorage at module level in queryUtils.ts,
# which crashes during Next.js server-side rendering.
# This patch makes the access lazy (deferred to first use).
#
# Remove this script once @cofhe/react publishes a version with the SSR fix.

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
NEXTJS_DIR="$(dirname "$SCRIPT_DIR")"
REACT_DIST="$NEXTJS_DIR/node_modules/@cofhe/react/dist"

if [ ! -f "$REACT_DIST/index.cjs" ]; then
  echo "⚠️  @cofhe/react not found, skipping patch"
  exit 0
fi

# Check if already patched
if grep -q "getStorage" "$REACT_DIST/index.cjs" 2>/dev/null; then
  exit 0
fi

echo "Patching @cofhe/react for SSR compatibility..."

for FILE in "$REACT_DIST/index.cjs" "$REACT_DIST/index.js"; do
  if [ ! -f "$FILE" ]; then continue; fi

  # 1. Replace module-level storage access with lazy getter
  sed -i 's|var storage = persistenceConfig.storage === "localStorage" ? window.localStorage : window.sessionStorage;|var getStorage = function() { if (typeof window === "undefined") return undefined; return persistenceConfig.storage === "localStorage" ? window.localStorage : window.sessionStorage; };|' "$FILE"

  # 2. Replace eager persister creation with lazy getter (CJS uses (0, import_...) call pattern)
  sed -i 's|var persister = (0, import_query_async_storage_persister.createAsyncStoragePersister)({|var _persister = null;\nvar getPersister = function() { if (_persister) return _persister; _persister = (0, import_query_async_storage_persister.createAsyncStoragePersister)({|' "$FILE"

  # 2b. Same for ESM (direct call pattern)
  sed -i 's|var persister = createAsyncStoragePersister({|var _persister = null;\nvar getPersister = function() { if (_persister) return _persister; _persister = createAsyncStoragePersister({|' "$FILE"

  # 3. Replace storage reference inside persister
  sed -i '/getPersister/,/deserializeWithBigInt/{s|  storage,|  storage: getStorage(),|}' "$FILE"

  # 4. Close the getPersister function after the persister object
  # Find the line with "deserialize: deserializeWithBigInt" that's followed by "});"
  sed -i '/deserialize: deserializeWithBigInt/{n;s|});|}); return _persister; };|}' "$FILE"
done

echo "✓ @cofhe/react patched for SSR"
