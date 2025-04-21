"use client";

import React from "react";
import { AddTokenModal } from "./AddTokenModal";
import { SelectToken } from "./SelectToken";
import { Modal } from "./ui/Modal";
import { useGlobalState } from "~~/services/store/store";
import { ConfidentialTokenPair } from "~~/services/store/tokenStore";

export const GlobalModals = () => {
  const {
    isAddTokenModalOpen,
    setAddTokenModalOpen,
    isSelectTokenModalOpen,
    setSelectTokenModalOpen,
    onSelectTokenCallback,
  } = useGlobalState();

  const handleSelectToken = (tokenPair: ConfidentialTokenPair) => {
    if (onSelectTokenCallback) {
      onSelectTokenCallback(tokenPair);
    }
    setSelectTokenModalOpen(false);
  };

  return (
    <>
      {/* Add Token Modal */}
      <AddTokenModal />

      {/* Select Token Modal */}
      <Modal
        isOpen={isSelectTokenModalOpen}
        onClose={() => setSelectTokenModalOpen(false)}
        title="Select Token"
        duration="slow"
      >
        <div className="flex flex-col gap-4">
          <SelectToken onSelectTokenPair={handleSelectToken} onClose={() => setSelectTokenModalOpen(false)} />
        </div>
      </Modal>
    </>
  );
};
