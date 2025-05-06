import React from "react";
import { CopyIcon } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "react-hot-toast";
import { useAccount } from "wagmi";
import { Button } from "~~/components/ui/Button";

export function ReceivePage() {
  const { address } = useAccount();

  const copyToClipboard = async () => {
    if (address) {
      await navigator.clipboard.writeText(address);
      toast.success("Address copied to clipboard!");
    }
  };

  return (
    <div className="p-4 pt-0 pb-0 flex flex-col gap-4 h-full items-center">
      <div className="flex flex-col items-start justify-start w-full">
        <div className="text-3xl text-primary font-semibold mb-3">Receive</div>
      </div>

      {address && (
        <>
          <div className="flex items-center bg-surface border-component-stroke border p-4 rounded-xl">
            <div className="bg-white p-4 rounded-lg shadow-md">
              <QRCodeSVG value={address} size={200} level="H" />
            </div>
          </div>
          <div className="flex items-center gap-2 bg-white p-2 rounded-full border border-primary-accent">
            <p className="text-sm font-reddit-mono px-2 text-primary-accent">
              {address.slice(0, 6)}...{address.slice(-4)}
            </p>
            <Button
              size="xs"
              variant="ghost"
              onClick={copyToClipboard}
              noOutline={true}
              className="hover:bg-primary-accent/10"
            >
              <CopyIcon className="h-4 w-4 text-primary-accent" strokeWidth={1.5} />
            </Button>
          </div>

          <p className="text-sm text-gray-500 text-center mt-2">
            Send tokens to this address to receive them in your wallet
          </p>
        </>
      )}

      {!address && <p className="text-sm text-gray-500">Please connect your wallet to see your receive address</p>}
    </div>
  );
}
