Steps and actions performed when upgrading `packages/hardhat` to use FHE.

1. Add following imports to devDependencies:

```json
  "devDependencies": {
    "@fhenixprotocol/cofhe-contracts": "0.0.13",
    "@fhenixprotocol/cofhe-mock-contracts": "^0.2.1-alpha.0",
    "cofhe-hardhat-plugin": "^0.2.1-alpha.0",
    "cofhejs": "^0.2.0"
  }
```

2. Change `tsconfig.ts` `module` to "Node16" or later (required by cofhejs)

```json
  "compilerOptions": {
    "module": "Node16"
  }
```

3. Add import to `hardhat.config.ts`

```typescript
import 'cofhe-hardhat-plugin'
```

4. Ensure solidity version >= 0.8.25

5. Ensure evmVersion is >= cancun
