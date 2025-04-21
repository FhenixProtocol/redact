import { Address } from "viem";

export const tokenList: Record<number, Address[]> = {};

/*

Encryption flow

1. Deploy FHERC20 (done)
2. Approve FHERC20 (done)
3. Encrypt (current)

[[[[ CTA ]]]]


Decryption Flow

1. Decrypt (current)
2. Claim (pending, available, claimed)

[[[[ CTA ]]]]

*/
