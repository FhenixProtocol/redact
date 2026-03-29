const confidentialEthAbi = [
  {
    inputs: [
      {
        internalType: "contract IWETH",
        name: "weth_",
        type: "address"
      }
    ],
    stateMutability: "nonpayable",
    type: "constructor"
  },
  {
    inputs: [],
    name: "AlreadyClaimed",
    type: "error"
  },
  {
    inputs: [],
    name: "AmountTooSmallForConfidentialPrecision",
    type: "error"
  },
  {
    inputs: [],
    name: "ClaimNotFound",
    type: "error"
  },
  {
    inputs: [],
    name: "ERC7984IncompatibleFunction",
    type: "error"
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "receiver",
        type: "address"
      }
    ],
    name: "ERC7984InvalidReceiver",
    type: "error"
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "sender",
        type: "address"
      }
    ],
    name: "ERC7984InvalidSender",
    type: "error"
  },
  {
    inputs: [],
    name: "ERC7984TotalSupplyOverflow",
    type: "error"
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "caller",
        type: "address"
      }
    ],
    name: "ERC7984UnauthorizedCaller",
    type: "error"
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "holder",
        type: "address"
      },
      {
        internalType: "address",
        name: "spender",
        type: "address"
      }
    ],
    name: "ERC7984UnauthorizedSpender",
    type: "error"
  },
  {
    inputs: [
      {
        internalType: "euint64",
        name: "amount",
        type: "bytes32"
      },
      {
        internalType: "address",
        name: "user",
        type: "address"
      }
    ],
    name: "ERC7984UnauthorizedUseOfEncryptedAmount",
    type: "error"
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "holder",
        type: "address"
      }
    ],
    name: "ERC7984ZeroBalance",
    type: "error"
  },
  {
    inputs: [
      {
        internalType: "uint8",
        name: "got",
        type: "uint8"
      },
      {
        internalType: "uint8",
        name: "expected",
        type: "uint8"
      }
    ],
    name: "InvalidEncryptedInput",
    type: "error"
  },
  {
    inputs: [],
    name: "LengthMismatch",
    type: "error"
  },
  {
    inputs: [],
    name: "NativeTransferFailed",
    type: "error"
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "owner",
        type: "address"
      }
    ],
    name: "OwnableInvalidOwner",
    type: "error"
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "account",
        type: "address"
      }
    ],
    name: "OwnableUnauthorizedAccount",
    type: "error"
  },
  {
    inputs: [
      {
        internalType: "uint8",
        name: "bits",
        type: "uint8"
      },
      {
        internalType: "uint256",
        name: "value",
        type: "uint256"
      }
    ],
    name: "SafeCastOverflowedUintDowncast",
    type: "error"
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "token",
        type: "address"
      }
    ],
    name: "SafeERC20FailedOperation",
    type: "error"
  },
  {
    inputs: [
      {
        internalType: "int32",
        name: "value",
        type: "int32"
      }
    ],
    name: "SecurityZoneOutOfBounds",
    type: "error"
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "euint64",
        name: "encryptedAmount",
        type: "bytes32"
      },
      {
        indexed: true,
        internalType: "address",
        name: "requester",
        type: "address"
      }
    ],
    name: "AmountDiscloseRequested",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "euint64",
        name: "encryptedAmount",
        type: "bytes32"
      },
      {
        indexed: false,
        internalType: "uint64",
        name: "amount",
        type: "uint64"
      }
    ],
    name: "AmountDisclosed",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "owner",
        type: "address"
      },
      {
        indexed: true,
        internalType: "address",
        name: "spender",
        type: "address"
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "value",
        type: "uint256"
      }
    ],
    name: "Approval",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "to",
        type: "address"
      },
      {
        indexed: true,
        internalType: "bytes32",
        name: "unshieldRequestId",
        type: "bytes32"
      },
      {
        indexed: true,
        internalType: "euint64",
        name: "unshieldAmount",
        type: "bytes32"
      },
      {
        indexed: false,
        internalType: "uint64",
        name: "unshieldAmountCleartext",
        type: "uint64"
      }
    ],
    name: "ClaimedUnshielded",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "from",
        type: "address"
      },
      {
        indexed: true,
        internalType: "address",
        name: "to",
        type: "address"
      },
      {
        indexed: true,
        internalType: "euint64",
        name: "amount",
        type: "bytes32"
      }
    ],
    name: "ConfidentialTransfer",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "holder",
        type: "address"
      },
      {
        indexed: true,
        internalType: "address",
        name: "operator",
        type: "address"
      },
      {
        indexed: false,
        internalType: "uint48",
        name: "until",
        type: "uint48"
      }
    ],
    name: "OperatorSet",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "previousOwner",
        type: "address"
      },
      {
        indexed: true,
        internalType: "address",
        name: "newOwner",
        type: "address"
      }
    ],
    name: "OwnershipTransferred",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "from",
        type: "address"
      },
      {
        indexed: true,
        internalType: "address",
        name: "to",
        type: "address"
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "value",
        type: "uint256"
      }
    ],
    name: "ShieldedNative",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "from",
        type: "address"
      },
      {
        indexed: true,
        internalType: "address",
        name: "to",
        type: "address"
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "value",
        type: "uint256"
      }
    ],
    name: "Transfer",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "to",
        type: "address"
      },
      {
        indexed: true,
        internalType: "euint64",
        name: "amount",
        type: "bytes32"
      }
    ],
    name: "Unshielded",
    type: "event"
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "",
        type: "address"
      },
      {
        internalType: "address",
        name: "",
        type: "address"
      }
    ],
    name: "allowance",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256"
      }
    ],
    stateMutability: "pure",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "",
        type: "address"
      },
      {
        internalType: "uint256",
        name: "",
        type: "uint256"
      }
    ],
    name: "approve",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool"
      }
    ],
    stateMutability: "pure",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "account",
        type: "address"
      }
    ],
    name: "balanceOf",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "balanceOfIsIndicator",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool"
      }
    ],
    stateMutability: "pure",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "bytes32",
        name: "ctHash",
        type: "bytes32"
      },
      {
        internalType: "uint64",
        name: "decryptedAmount",
        type: "uint64"
      },
      {
        internalType: "bytes",
        name: "decryptionProof",
        type: "bytes"
      }
    ],
    name: "claimUnshielded",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "bytes32[]",
        name: "ctHashes",
        type: "bytes32[]"
      },
      {
        internalType: "uint64[]",
        name: "decryptedAmounts",
        type: "uint64[]"
      },
      {
        internalType: "bytes[]",
        name: "decryptionProofs",
        type: "bytes[]"
      }
    ],
    name: "claimUnshieldedBatch",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "account",
        type: "address"
      }
    ],
    name: "confidentialBalanceOf",
    outputs: [
      {
        internalType: "euint64",
        name: "",
        type: "bytes32"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "confidentialTotalSupply",
    outputs: [
      {
        internalType: "euint64",
        name: "",
        type: "bytes32"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "to",
        type: "address"
      },
      {
        internalType: "euint64",
        name: "amount",
        type: "bytes32"
      }
    ],
    name: "confidentialTransfer",
    outputs: [
      {
        internalType: "euint64",
        name: "",
        type: "bytes32"
      }
    ],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "to",
        type: "address"
      },
      {
        components: [
          {
            internalType: "uint256",
            name: "ctHash",
            type: "uint256"
          },
          {
            internalType: "uint8",
            name: "securityZone",
            type: "uint8"
          },
          {
            internalType: "uint8",
            name: "utype",
            type: "uint8"
          },
          {
            internalType: "bytes",
            name: "signature",
            type: "bytes"
          }
        ],
        internalType: "struct InEuint64",
        name: "encryptedAmount",
        type: "tuple"
      }
    ],
    name: "confidentialTransfer",
    outputs: [
      {
        internalType: "euint64",
        name: "",
        type: "bytes32"
      }
    ],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "to",
        type: "address"
      },
      {
        internalType: "euint64",
        name: "amount",
        type: "bytes32"
      },
      {
        internalType: "bytes",
        name: "data",
        type: "bytes"
      }
    ],
    name: "confidentialTransferAndCall",
    outputs: [
      {
        internalType: "euint64",
        name: "transferred",
        type: "bytes32"
      }
    ],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "to",
        type: "address"
      },
      {
        components: [
          {
            internalType: "uint256",
            name: "ctHash",
            type: "uint256"
          },
          {
            internalType: "uint8",
            name: "securityZone",
            type: "uint8"
          },
          {
            internalType: "uint8",
            name: "utype",
            type: "uint8"
          },
          {
            internalType: "bytes",
            name: "signature",
            type: "bytes"
          }
        ],
        internalType: "struct InEuint64",
        name: "encryptedAmount",
        type: "tuple"
      },
      {
        internalType: "bytes",
        name: "data",
        type: "bytes"
      }
    ],
    name: "confidentialTransferAndCall",
    outputs: [
      {
        internalType: "euint64",
        name: "transferred",
        type: "bytes32"
      }
    ],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "from",
        type: "address"
      },
      {
        internalType: "address",
        name: "to",
        type: "address"
      },
      {
        components: [
          {
            internalType: "uint256",
            name: "ctHash",
            type: "uint256"
          },
          {
            internalType: "uint8",
            name: "securityZone",
            type: "uint8"
          },
          {
            internalType: "uint8",
            name: "utype",
            type: "uint8"
          },
          {
            internalType: "bytes",
            name: "signature",
            type: "bytes"
          }
        ],
        internalType: "struct InEuint64",
        name: "encryptedAmount",
        type: "tuple"
      }
    ],
    name: "confidentialTransferFrom",
    outputs: [
      {
        internalType: "euint64",
        name: "transferred",
        type: "bytes32"
      }
    ],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "from",
        type: "address"
      },
      {
        internalType: "address",
        name: "to",
        type: "address"
      },
      {
        internalType: "euint64",
        name: "amount",
        type: "bytes32"
      }
    ],
    name: "confidentialTransferFrom",
    outputs: [
      {
        internalType: "euint64",
        name: "transferred",
        type: "bytes32"
      }
    ],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "from",
        type: "address"
      },
      {
        internalType: "address",
        name: "to",
        type: "address"
      },
      {
        internalType: "euint64",
        name: "amount",
        type: "bytes32"
      },
      {
        internalType: "bytes",
        name: "data",
        type: "bytes"
      }
    ],
    name: "confidentialTransferFromAndCall",
    outputs: [
      {
        internalType: "euint64",
        name: "transferred",
        type: "bytes32"
      }
    ],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "from",
        type: "address"
      },
      {
        internalType: "address",
        name: "to",
        type: "address"
      },
      {
        components: [
          {
            internalType: "uint256",
            name: "ctHash",
            type: "uint256"
          },
          {
            internalType: "uint8",
            name: "securityZone",
            type: "uint8"
          },
          {
            internalType: "uint8",
            name: "utype",
            type: "uint8"
          },
          {
            internalType: "bytes",
            name: "signature",
            type: "bytes"
          }
        ],
        internalType: "struct InEuint64",
        name: "encryptedAmount",
        type: "tuple"
      },
      {
        internalType: "bytes",
        name: "data",
        type: "bytes"
      }
    ],
    name: "confidentialTransferFromAndCall",
    outputs: [
      {
        internalType: "euint64",
        name: "transferred",
        type: "bytes32"
      }
    ],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [],
    name: "contractURI",
    outputs: [
      {
        internalType: "string",
        name: "",
        type: "string"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "decimals",
    outputs: [
      {
        internalType: "uint8",
        name: "",
        type: "uint8"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "euint64",
        name: "encryptedAmount",
        type: "bytes32"
      },
      {
        internalType: "uint64",
        name: "cleartextAmount",
        type: "uint64"
      },
      {
        internalType: "bytes",
        name: "decryptionProof",
        type: "bytes"
      }
    ],
    name: "discloseEncryptedAmount",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "bytes32",
        name: "ctHash",
        type: "bytes32"
      }
    ],
    name: "getClaim",
    outputs: [
      {
        components: [
          {
            internalType: "address",
            name: "to",
            type: "address"
          },
          {
            internalType: "bytes32",
            name: "ctHash",
            type: "bytes32"
          },
          {
            internalType: "uint64",
            name: "requestedAmount",
            type: "uint64"
          },
          {
            internalType: "uint64",
            name: "decryptedAmount",
            type: "uint64"
          },
          {
            internalType: "bool",
            name: "claimed",
            type: "bool"
          }
        ],
        internalType: "struct ERC7984WrapperClaimHelper.Claim",
        name: "",
        type: "tuple"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "user",
        type: "address"
      }
    ],
    name: "getUserClaims",
    outputs: [
      {
        components: [
          {
            internalType: "address",
            name: "to",
            type: "address"
          },
          {
            internalType: "bytes32",
            name: "ctHash",
            type: "bytes32"
          },
          {
            internalType: "uint64",
            name: "requestedAmount",
            type: "uint64"
          },
          {
            internalType: "uint64",
            name: "decryptedAmount",
            type: "uint64"
          },
          {
            internalType: "bool",
            name: "claimed",
            type: "bool"
          }
        ],
        internalType: "struct ERC7984WrapperClaimHelper.Claim[]",
        name: "userClaims",
        type: "tuple[]"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "indicatorTick",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "inferredTotalSupply",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "holder",
        type: "address"
      },
      {
        internalType: "address",
        name: "spender",
        type: "address"
      }
    ],
    name: "isOperator",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "maxTotalSupply",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "name",
    outputs: [
      {
        internalType: "string",
        name: "",
        type: "string"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "owner",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "rate",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "renounceOwnership",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "euint64",
        name: "encryptedAmount",
        type: "bytes32"
      }
    ],
    name: "requestDiscloseEncryptedAmount",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [],
    name: "resetIndicatedBalance",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "operator",
        type: "address"
      },
      {
        internalType: "uint48",
        name: "until",
        type: "uint48"
      }
    ],
    name: "setOperator",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "to",
        type: "address"
      }
    ],
    name: "shieldNative",
    outputs: [
      {
        internalType: "euint64",
        name: "",
        type: "bytes32"
      }
    ],
    stateMutability: "payable",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "to",
        type: "address"
      },
      {
        internalType: "uint256",
        name: "value",
        type: "uint256"
      }
    ],
    name: "shieldWrappedNative",
    outputs: [
      {
        internalType: "euint64",
        name: "",
        type: "bytes32"
      }
    ],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "bytes4",
        name: "interfaceId",
        type: "bytes4"
      }
    ],
    name: "supportsInterface",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "symbol",
    outputs: [
      {
        internalType: "string",
        name: "",
        type: "string"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "totalSupply",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "",
        type: "address"
      },
      {
        internalType: "uint256",
        name: "",
        type: "uint256"
      }
    ],
    name: "transfer",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool"
      }
    ],
    stateMutability: "pure",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "",
        type: "address"
      },
      {
        internalType: "address",
        name: "",
        type: "address"
      },
      {
        internalType: "uint256",
        name: "",
        type: "uint256"
      }
    ],
    name: "transferFrom",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool"
      }
    ],
    stateMutability: "pure",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "newOwner",
        type: "address"
      }
    ],
    name: "transferOwnership",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "from",
        type: "address"
      },
      {
        internalType: "address",
        name: "to",
        type: "address"
      },
      {
        internalType: "uint64",
        name: "amount",
        type: "uint64"
      }
    ],
    name: "unshield",
    outputs: [
      {
        internalType: "euint64",
        name: "",
        type: "bytes32"
      }
    ],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [],
    name: "weth",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    stateMutability: "payable",
    type: "receive"
  }
] as const;

export default confidentialEthAbi;
