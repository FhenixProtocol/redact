"use client";

import { useTokenStoreFetcher } from "~~/hooks/useTokenStoreHooks";
import { useClaimFetcher, useRefetchPendingClaims } from "~~/services/store/claim";

export const TokenStoreFetcher = () => {
  useTokenStoreFetcher();
  useClaimFetcher();
  useRefetchPendingClaims();
  return null;
};
