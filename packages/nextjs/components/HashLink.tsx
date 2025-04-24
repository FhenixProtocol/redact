import { useState } from "react";
import Link from "next/link";
import { CheckIcon, CopyIcon, ExternalLinkIcon } from "lucide-react";
import CopyToClipboard from "react-copy-to-clipboard";
import { HashLinkType, useHashLink } from "~~/hooks/useHashLink";
import { cn } from "~~/lib/utils";

export const HashLink = ({
  type,
  hash,
  className,
  copyable,
  buttonSize = 4,
  copyStrokeWidth = 2,
}: {
  type: HashLinkType;
  hash: string;
  className?: string;
  copyable?: boolean;
  buttonSize?: number;
  copyStrokeWidth?: number;
}) => {
  const { href, ellipsed } = useHashLink(type, hash);

  return (
    <div className="flex flex-row gap-2">
      <Link
        href={href}
        className={cn("whitespace-pre font-reddit-mono hover:underline text-sm flex flex-row gap-1", className)}
      >
        {ellipsed}
        <ExternalLinkIcon className={`w-${buttonSize} h-${buttonSize}`} />
      </Link>
      {copyable && (
        <CopyButton copyStrokeWidth={copyStrokeWidth} className={`w-${buttonSize} h-${buttonSize}`} address={hash} />
      )}
    </div>
  );
};

export const CopyButton = ({
  className,
  address,
  copyStrokeWidth,
}: {
  className?: string;
  address: string;
  copyStrokeWidth?: number;
}) => {
  const [addressCopied, setAddressCopied] = useState(false);
  return (
    <CopyToClipboard
      text={address}
      onCopy={() => {
        setAddressCopied(true);
        setTimeout(() => {
          setAddressCopied(false);
        }, 800);
      }}
    >
      <button onClick={e => e.stopPropagation()} type="button" className="cursor-pointer">
        {addressCopied ? (
          <CheckIcon className={className} aria-hidden="true" />
        ) : (
          <CopyIcon className={className} strokeWidth={copyStrokeWidth} aria-hidden="true" />
        )}
      </button>
    </CopyToClipboard>
  );
};
