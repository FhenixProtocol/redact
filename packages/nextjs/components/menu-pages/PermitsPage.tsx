import React from "react";
import { Button } from "../ui/Button";
import { Permit, cofhejs, permitStore } from "cofhejs/web";
import { zeroAddress } from "viem";
import {
  useCofhejsAccount,
  useCofhejsActivePermit,
  useCofhejsAllPermits,
  useCofhejsInitialized,
} from "~~/hooks/useCofhe";
import { truncateAddress } from "~~/lib/common";

export function PermitsPage() {
  const account = useCofhejsAccount();
  const initialized = useCofhejsInitialized();

  const activePermit = useCofhejsActivePermit();
  const allPermits = useCofhejsAllPermits();

  return (
    <div className="p-4 pt-0 pb-0 flex flex-col gap-4 h-full items-start">
      <div className="flex flex-col items-start justify-start w-full">
        <div className="text-3xl text-primary font-semibold mb-3">Manage Permits</div>
      </div>

      <div className="flex flex-row items-center justify-between w-full">
        <span>Cofhejs Initialized:</span>
        <span>{initialized ? "Yes" : "No"}</span>
      </div>

      <div className="flex flex-row items-center justify-between w-full">
        <span>Cofhejs Account:</span>
        <span>{account != null ? truncateAddress(account) : "None"}</span>
      </div>

      <div>Active Permit:</div>
      {activePermit && <DisplayPermit permit={activePermit} isActive />}
      {activePermit == null && <div>No active permit</div>}

      <div>All Permits:</div>

      <div className="flex flex-col flex-grow overflow-x-hidden overflow-y-auto styled-scrollbar w-full gap-4">
        {allPermits?.map(permit => {
          return (
            <DisplayPermit
              key={permit.getHash()}
              permit={permit}
              isActive={permit.getHash() === activePermit?.getHash()}
              onSelect={() => {
                cofhejs.selectActivePermit(permit.getHash());
              }}
              onDelete={() => {
                if (!account) return;
                permitStore.removePermit(account, permit.getHash());
              }}
            />
          );
        })}
        {allPermits == null || (allPermits.length === 0 && <div>No permits</div>)}
      </div>

      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          if (!account) return;
          cofhejs.createPermit({
            type: "self",
            name: "Test Permit",
            issuer: account,
            expiration: (activePermit?.expiration ?? 1000000000) + 1,
          });
        }}
      >
        Create New Permit
      </Button>
    </div>
  );
}

const DisplayPermit = ({
  permit,
  isActive,
  onSelect,
  onDelete,
}: {
  permit: Permit;
  isActive: boolean;
  onSelect?: () => void;
  onDelete?: () => void;
}) => {
  const selectable = onSelect != null;
  return (
    <div className="flex flex-col items-center w-full bg-primary-foreground rounded-2xl p-2 gap-1">
      <div className="flex flex-row items-center w-full justify-between text-primary text-sm">
        <span>Hash</span>
        <span>{truncateAddress(permit.getHash())}</span>
      </div>
      <div className="flex flex-row items-center w-full justify-between text-primary text-sm">
        <span>Issuer</span>
        <span>{truncateAddress(permit.issuer)}</span>
      </div>
      {permit.recipient !== zeroAddress && (
        <div className="flex flex-row items-center w-full justify-between text-primary text-sm">
          <span>Recipient</span>
          <span>{truncateAddress(permit.recipient)}</span>
        </div>
      )}
      <div className="flex flex-row items-center w-full justify-between text-primary text-sm">
        <span>Expiration</span>
        <span>{permit.expiration}</span>
      </div>
      <div className="flex flex-row items-center w-full justify-between text-primary text-sm">
        <span>Chain</span>
        <span>{permit._signedDomain?.chainId}</span>
      </div>
      <div className="flex flex-row items-center w-full justify-between text-primary text-sm">
        <span>Signature</span>
        <span>{truncateAddress(permit.issuerSignature)}</span>
      </div>
      <div className="flex flex-row items-center w-full justify-between text-primary text-sm">
        <span>Actions</span>
        <div className="flex flex-row items-center gap-2">
          {onDelete && (
            <Button variant="outline" size="sm" className="w-min" onClick={onDelete}>
              Delete
            </Button>
          )}
          {selectable && !isActive && (
            <Button variant="outline" size="sm" className="w-min" onClick={onSelect}>
              Select
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
