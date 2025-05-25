export type ChainConfig = {
  weth?: string;
  eeth?: string;
  skipTokens?: boolean;
};

export type ChainConfigMap = {
  [chainId: string]: ChainConfig;
};

export const chainConfig: ChainConfigMap = {
  "31337": {},
  "11155111": {
    weth: "0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9",
    eeth: "",
    skipTokens: true
  },
  "421614": {
    weth: "0x0x980B62Da83eFf3D4576C647993b0c1D7faf17c73",
    eeth: "",
    skipTokens: true
  },
};
