import { useState } from "react";
import Link from "next/link";
import { CheckIcon, CopyCheckIcon, CopyIcon, ExternalLinkIcon } from "lucide-react";
import CopyToClipboard from "react-copy-to-clipboard";
import { HashLinkType, useHashLink } from "~~/hooks/useHashLink";
import { cn } from "~~/lib/utils";

export const HashLink = ({
  type,
  hash,
  className,
  copyable,
}: {
  type: HashLinkType;
  hash: string;
  className?: string;
  copyable?: boolean;
}) => {
  const { href, ellipsed } = useHashLink(type, hash);

  return (
    <div className="flex flex-row gap-2">
      <Link
        href={href}
        className={cn("whitespace-pre font-mono hover:underline text-sm flex flex-row gap-1", className)}
      >
        {ellipsed}
        <ExternalLinkIcon className="w-4 h-4" />
      </Link>
      {copyable && <CopyButton className="w-4 h-4" address={hash} />}
    </div>
  );
};

export const CopyButton = ({ className, address }: { className?: string; address: string }) => {
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
          <CopyIcon className={className} aria-hidden="true" />
        )}
      </button>
    </CopyToClipboard>
  );
};
