#!/usr/bin/env node
/**
 * Local workarounds for two upstream regressions in @cofhe/* 0.5.0.
 *
 * (1) Next.js SSR crash: "self is not defined".
 *     Two top-level `self` references end up in the SSR bundle:
 *       - @cofhe/sdk/dist/zkProve.worker.{cjs,js} — `self.onmessage = ...` and
 *         `self.postMessage({ type: "ready" })` at module top level.
 *       - tfhe/snippets/.../workerHelpers.js — `waitForMsgType(self, ...).then(...)`
 *         at module top level. tfhe is statically imported by @cofhe/sdk/web
 *         (which is required by @cofhe/react), so this lands in the SSR graph.
 *     Both are guarded with `typeof self !== "undefined"` so the files can
 *     load in non-worker contexts without side effects.
 *
 * (2) Hardhat compile failure — @cofhe/mock-contracts@0.5.0 lags behind
 *     @fhenixprotocol/cofhe-contracts@0.1.3 in two ways:
 *       - TestBed.sol calls `FHE.decrypt(eNumber)`, removed in 0.1.3.
 *         We stub the body of `decrypt()` so the rest of the file compiles.
 *       - MockTaskManager.sol doesn't implement two new ITaskManager methods
 *         (verifyDecryptResultBatch / verifyDecryptResultBatchSafe), so the
 *         contract isn't fully concrete. We append loop-based implementations
 *         that delegate to the existing single-item helper.
 *     The hardhat-plugin auto-generates a stub that imports every mock
 *     contract, so these files get compiled even though the project never
 *     references them directly.
 *
 * The script walks every node_modules tree it can find under the repo root
 * (workspaces hoist or nest these inconsistently) and patches every match.
 *
 * Remove this script once both upstream packages publish fixed versions.
 */

const fs = require("fs");
const path = require("path");

const REPO_ROOT = path.resolve(__dirname, "..", "..", "..");
const SSR_MARKER = 'typeof self !== "undefined"';
const TESTBED_MARKER = "// FHE.decrypt removed";
const TASK_MANAGER_MARKER = "// verifyDecryptResultBatch added";

function patchFile(filePath, transform, alreadyPatchedMarker) {
  if (!fs.existsSync(filePath)) return false;
  const content = fs.readFileSync(filePath, "utf8");
  if (content.includes(alreadyPatchedMarker)) return false;

  const next = transform(content);
  if (next === null) {
    console.warn(`patch-cofhe-ssr: expected patterns not found in ${path.relative(REPO_ROOT, filePath)}, skipping`);
    return false;
  }

  fs.writeFileSync(filePath, next, "utf8");
  return true;
}

function patchZkProveWorker(filePath) {
  return patchFile(
    filePath,
    content => {
      const onmessage = "self.onmessage = async (event) => {";
      const ready = 'self.postMessage({\n  id: "init",\n  type: "ready"\n});';
      if (!content.includes(onmessage) || !content.includes(ready)) return null;
      return content.replace(onmessage, `if (${SSR_MARKER}) {\n${onmessage}`).replace(ready, `${ready}\n}`);
    },
    SSR_MARKER,
  );
}

function patchWorkerHelpers(filePath) {
  return patchFile(
    filePath,
    content => {
      const trigger = "waitForMsgType(self, 'wasm_bindgen_worker_init').then";
      if (!content.includes(trigger)) return null;
      return content.replace(trigger, `if (${SSR_MARKER}) ${trigger}`);
    },
    SSR_MARKER,
  );
}

function patchTestBed(filePath) {
  return patchFile(
    filePath,
    content => {
      const original = "function decrypt() public {\n    FHE.decrypt(eNumber);\n  }";
      if (!content.includes(original)) return null;
      const replacement = `function decrypt() public {\n    ${TESTBED_MARKER} in @fhenixprotocol/cofhe-contracts 0.1.3 — stubbed by patch-cofhe-ssr.js\n  }`;
      return content.replace(original, replacement);
    },
    TESTBED_MARKER,
  );
}

function patchMockTaskManager(filePath) {
  return patchFile(
    filePath,
    content => {
      const anchor =
        "  function isPubliclyAllowed(uint256 ctHash) external view returns (bool) {\n    revert NotImplemented();\n  }\n}";
      if (!content.includes(anchor)) return null;
      const stubs = `  function isPubliclyAllowed(uint256 ctHash) external view returns (bool) {
    revert NotImplemented();
  }

  ${TASK_MANAGER_MARKER} by patch-cofhe-ssr.js to satisfy ITaskManager from cofhe-contracts 0.1.3
  function verifyDecryptResultBatch(
    uint256[] calldata ctHashes,
    uint256[] calldata results,
    bytes[] calldata signatures
  ) external view returns (bool) {
    for (uint256 i = 0; i < ctHashes.length; i++) {
      if (!_verifyDecryptResult(ctHashes[i], results[i], signatures[i], true)) {
        return false;
      }
    }
    return true;
  }

  function verifyDecryptResultBatchSafe(
    uint256[] calldata ctHashes,
    uint256[] calldata results,
    bytes[] calldata signatures
  ) external view returns (bool[] memory) {
    bool[] memory out = new bool[](ctHashes.length);
    for (uint256 i = 0; i < ctHashes.length; i++) {
      out[i] = _verifyDecryptResult(ctHashes[i], results[i], signatures[i], false);
    }
    return out;
  }
}`;
      return content.replace(anchor, stubs);
    },
    TASK_MANAGER_MARKER,
  );
}

function findFiles(startDir, predicate, results = []) {
  let entries;
  try {
    entries = fs.readdirSync(startDir, { withFileTypes: true });
  } catch {
    return results;
  }
  for (const entry of entries) {
    const full = path.join(startDir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === ".git" || entry.name === ".next") continue;
      findFiles(full, predicate, results);
    } else if (predicate(full)) {
      results.push(full);
    }
  }
  return results;
}

const patched = [];

const zkWorkers = findFiles(
  REPO_ROOT,
  p => p.endsWith(path.join("@cofhe", "sdk", "dist", "zkProve.worker.cjs")) || p.endsWith(path.join("@cofhe", "sdk", "dist", "zkProve.worker.js")),
);
for (const f of zkWorkers) {
  if (patchZkProveWorker(f)) patched.push(path.relative(REPO_ROOT, f));
}

const helpers = findFiles(
  REPO_ROOT,
  p => p.includes(`${path.sep}tfhe${path.sep}snippets${path.sep}wasm-bindgen-rayon-`) && p.endsWith(`${path.sep}src${path.sep}workerHelpers.js`),
);
for (const f of helpers) {
  if (patchWorkerHelpers(f)) patched.push(path.relative(REPO_ROOT, f));
}

const testBeds = findFiles(REPO_ROOT, p => p.endsWith(path.join("@cofhe", "mock-contracts", "contracts", "TestBed.sol")));
for (const f of testBeds) {
  if (patchTestBed(f)) patched.push(path.relative(REPO_ROOT, f));
}

const taskManagers = findFiles(REPO_ROOT, p => p.endsWith(path.join("@cofhe", "mock-contracts", "contracts", "MockTaskManager.sol")));
for (const f of taskManagers) {
  if (patchMockTaskManager(f)) patched.push(path.relative(REPO_ROOT, f));
}

if (patched.length) {
  console.log("patch-cofhe-ssr applied:");
  for (const f of patched) console.log("  -", f);
}
