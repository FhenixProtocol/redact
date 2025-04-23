import { useTargetNetwork } from "~~/hooks/scaffold-eth";
import { truncateAddress } from "~~/lib/common";
import { getBlockExplorerAddressLink, getBlockExplorerTokenLink, getBlockExplorerTxLink } from "~~/utils/scaffold-eth";

export type HashLinkType = "token" | "address" | "tx";

export const useHashLink = (type: HashLinkType, hash: string) => {
  const { targetNetwork } = useTargetNetwork();

  // For both token and address types, we use the address link
  // Both are typically displayed the same way in block explorers
  const href =
    type === "token"
      ? getBlockExplorerTokenLink(targetNetwork, hash)
      : type === "tx"
        ? getBlockExplorerTxLink(targetNetwork.id, hash)
        : getBlockExplorerAddressLink(targetNetwork, hash);

  // Generate the ellipsed version of the hash
  const ellipsed = truncateAddress(hash, 6, 4);

  return {
    href,
    ellipsed,
  };
};
