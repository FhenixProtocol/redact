"use client";

import { useTokenStoreFetcher } from "~~/hooks/useTokenStoreHooks";
import { useClaimFetcher } from "~~/services/store/claim";

export const TokenStoreFetcher = () => {
  useTokenStoreFetcher();
  useClaimFetcher();
  return null;
};
