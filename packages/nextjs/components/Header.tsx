"use client";

import React, { useCallback, useRef, useEffect, useState } from "react";
import { Wallet } from "lucide-react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useAccount } from "wagmi";
import { Button } from "~~/components/ui/Button";
import { Switcher } from "~~/components/ui/Switcher";
import { useOutsideClick } from "~~/hooks/scaffold-eth";
import { truncateAddress } from "~~/lib/common";
import { useSetDrawerOpen } from "~~/services/store/drawerStore";

export const Header = () => {
  const { address, isConnected } = useAccount();
  const setDrawerOpen = useSetDrawerOpen();
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleThemeChange = (value: number) => {
    const newTheme = value === 0 ? "light" : "dark";
    setTheme(newTheme);
  };

  const burgerMenuRef = useRef<HTMLDivElement>(null);
  useOutsideClick(
    burgerMenuRef,
    useCallback(() => {
      setDrawerOpen(false);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []),
  );

  return (
    <header className="flex items-center justify-between p-4 bg-card-bg backdrop-blur-[2px]">
      <div className="flex items-center gap-4">
        <div className="logo h-[28px] md:h-[50px]" aria-label="Logo" />
      </div>
      <div className="flex items-center gap-4">
        <div className="w-24">
          <Switcher
            label="Theme"
            hideLabel={true}
            options={[
              { description: "Light", icon: Sun },
              { description: "Dark", icon: Moon },
            ]}
            value={mounted ? (resolvedTheme === "light" ? 0 : 1) : 0}
            onValueChange={handleThemeChange}
            className="w-full border-none bg-transparent"
            disabled={!mounted}
          />
        </div>
        <Button
          variant="surface"
          className="rounded-md button-shadow px-2 md:px-4 py-1 md:py-2 h-[28px] md:h-[50px]"
          noOutline={true}
          onClick={() => setDrawerOpen(true)}
        >
          <Wallet className="w-4 h-4" />
          <span className="text-sm md:text-lg">
            {isConnected && address != null ? truncateAddress(address) : "Connect Wallet"}
          </span>
        </Button>
      </div>
    </header>
  );
};
