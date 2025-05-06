import React, { useMemo } from "react";
import { Button } from "../ui/Button";
import { Permit, cofhejs } from "cofhejs/web";
import { zeroAddress } from "viem";
import { useCofhejsAccount, useCofhejsInitialized } from "~~/hooks/useCofhe";
import { truncateAddress } from "~~/lib/common";

export function PermitsPage() {
  const account = useCofhejsAccount();
  const initialized = useCofhejsInitialized();

  const allPermits = useMemo(() => {
    if (!account || !initialized) return undefined;
    return cofhejs.getAllPermits();
  }, [account, initialized]);

  const activePermit = useMemo(() => {
    if (!account || !initialized) return undefined;
    return cofhejs.getPermit();
  }, [account, initialized]);

  return (
    <div className="p-4 pt-0 pb-0 flex flex-col gap-4 h-full items-center">
      <div className="flex flex-col items-start justify-start w-full">
        <div className="text-3xl text-primary font-semibold mb-3">Manage Permits</div>
      </div>

      <div>Cofhejs Initialized: {initialized ? "Yes" : "No"}</div>
      <div>Cofhejs Account: {account != null ? truncateAddress(account) : "None"}</div>

      <div>Active Permit:</div>
      {activePermit?.data && <DisplayPermit permit={activePermit.data} isActive />}
      {activePermit?.data == null && <div>No active permit</div>}

      <div>All Permits:</div>

      {Object.values(allPermits?.data ?? {}).map(permit => {
        return (
          <DisplayPermit
            key={permit.getHash()}
            permit={permit}
            isActive={permit.getHash() === activePermit?.data?.getHash()}
            onSelect={() => {
              cofhejs.selectActivePermit(permit.getHash());
            }}
          />
        );
      })}
      {(allPermits?.data == null || Object.keys(allPermits.data).length === 0) && <div>No permits</div>}

      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          cofhejs.createPermit();
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
}: {
  permit: Permit;
  isActive: boolean;
  onSelect?: () => void;
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
        <span>Chain</span>
        <span>{permit._signedDomain?.chainId}</span>
      </div>
      <div className="flex flex-row items-center w-full justify-between text-primary text-sm">
        <span>Signature</span>
        <span>{truncateAddress(permit.issuerSignature)}</span>
      </div>
      {selectable && !isActive && (
        <Button variant="outline" size="sm" className="w-min" onClick={onSelect}>
          Select
        </Button>
      )}
    </div>
  );
};
