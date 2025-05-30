"use client";

import React from "react";
import { SelectToken } from "~~/components/SelectToken";
import { Modal } from "~~/components/ui/Modal";
import { ConfidentialTokenPair } from "~~/services/store/tokenStore";

export function SelectTokenModal({
  open,
  setOpen,
  onSelectTokenPair,
}: {
  open: boolean;
  setOpen: (open: boolean) => void;
  onSelectTokenPair: (tokenPair: ConfidentialTokenPair, isEncrypt?: boolean) => void;
}) {
  return (
    <Modal
      isOpen={open}
      onClose={() => setOpen(false)}
      title="Select Token"
      duration="slow" // or "normal" or "slow"
    >
      <div className="flex flex-col gap-4">
        <SelectToken onSelectTokenPair={onSelectTokenPair} onClose={() => setOpen(false)} />
      </div>
    </Modal>
  );
}
