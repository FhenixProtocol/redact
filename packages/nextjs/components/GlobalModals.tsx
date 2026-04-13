"use client";

import React from "react";
import { AddTokenModal } from "./AddTokenModal";
import { SelectToken } from "./SelectToken";
import { Modal } from "./ui/Modal";
import { useGlobalState } from "~~/services/store/store";
import { ConfidentialTokenPair } from "~~/services/store/tokenStore";

export const GlobalModals = () => {
  const { isSelectTokenModalOpen, setSelectTokenModalOpen, onSelectTokenCallback, isMigrationModalOpen, setMigrationModalOpen } = useGlobalState();

  const handleSelectToken = (tokenPair: ConfidentialTokenPair, isEncrypt?: boolean) => {
    if (onSelectTokenCallback) {
      onSelectTokenCallback(tokenPair, isEncrypt);
    }
    setSelectTokenModalOpen(false);
  };

  return (
    <>
      {/* Add Token Modal */}
      <AddTokenModal />

      {/* Migration Modal */}
      <Modal
        isOpen={isMigrationModalOpen}
        onClose={() => setMigrationModalOpen(false)}
        title="Migration Instraction"
        duration="slow"
        className="w-[600px]"
      >
        <div>
          <p>Redact flow and contracts have been updated and not compatible with the old contract version.</p>
          <br/>
          <p>
            Please go to{" "}
            <a
              href="https://old.redact.money"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary-accent underline"
            >
              old redact version
            </a>{" "}
            ,decrypt and claim your tokens.
            <br/>
            The old version will be deprecated in the future.
          </p>
        </div>
      </Modal>

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
