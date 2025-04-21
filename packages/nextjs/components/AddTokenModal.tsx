"use client";

import React from "react";
import { AddToken } from "~~/components/AddToken";
import { Modal } from "~~/components/ui/Modal";
import { useGlobalState } from "~~/services/store/store";

export function AddTokenModal() {
  const { isAddTokenModalOpen, setAddTokenModalOpen } = useGlobalState();
  return (
    <Modal
      isOpen={isAddTokenModalOpen}
      onClose={() => setAddTokenModalOpen(false)}
      title="Add Token"
      duration="slow" // or "normal" or "slow"
    >
      <div className="flex flex-col gap-4">
        <AddToken onClose={() => setAddTokenModalOpen(false)} />
      </div>
    </Modal>
  );
}
