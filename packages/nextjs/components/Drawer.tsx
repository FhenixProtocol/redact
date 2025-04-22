"use client";

import React, { useEffect, useState } from "react";
import { Button } from "./ui/Button";
import { Separator } from "./ui/Separator";
import { ArrowBack, ArrowLeft, Logout } from "@mui/icons-material";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, Settings, X } from "lucide-react";
import { useDisconnect } from "wagmi";
import { SettingsPage } from "~~/components/menu-pages/SettingsPage";
import { IconButton } from "~~/components/ui/IconButton";
import { cn } from "~~/lib/utils";

export interface DrawerChildProps {
  pushPage?: (page: DrawerPage) => void;
  popPage?: () => void;
}

/** A single 'page' in the drawer's navigation stack */
export interface DrawerPage {
  id: string;
  title?: string;
  header?: React.ReactElement;
  component: React.ReactElement<DrawerChildProps>;
}

export interface DrawerProps {
  /** Whether the drawer is open or closed */
  isOpen: boolean;
  /** Called when user clicks 'X' or otherwise closes the drawer */
  onClose: () => void;
  /**
   * The array of pages to show initially (usually 1 item).
   * Example:
   *   [{ id: "main", title: "My Wallet", component: <WalletMainPanel /> }]
   */
  initialPages: DrawerPage[];
  className?: string;
}

/**
 * A Drawer that manages a mini navigation stack of sub-pages.
 * - Pass `initialPages` to define the main (root) page.
 * - `pushPage()` to add more pages.
 * - `popPage()` to go back.
 */
const Drawer: React.FC<DrawerProps> = ({ isOpen, onClose, initialPages, className }) => {
  // Current stack of pages
  const [pages, setPages] = useState<DrawerPage[]>(initialPages);
  const [direction, setDirection] = useState<"left" | "right">("right");

  // Whenever `isOpen` changes from false→true, reset to the initial pages:
  useEffect(() => {
    if (isOpen) {
      setPages(initialPages);
    }
  }, [isOpen, initialPages]);

  /** Push a new page onto the stack */
  function pushPage(page: DrawerPage) {
    setPages(prev => [...prev, page]);
    setDirection("right");
  }

  /** Pop the top page off the stack */
  function popPage() {
    setPages(prev => prev.slice(0, -1));
    setDirection("left");
  }

  const currentPage = pages[pages.length - 1];

  // Framer Motion slide animation
  const slideVariants = {
    enter: { opacity: 0, x: direction === "right" ? "50px" : "-50px" }, // page enters from the right or left
    center: { opacity: 1, x: 0 }, // page is centered
    exit: { opacity: 0, x: direction === "left" ? "-50px" : "50px" }, // page exits to the opposite side
  };

  return (
    <div
      className={cn(
        "fixed top-0 right-0 h-full w-[400px] bg-white shadow-lg z-50 border-l border-blue-400",
        isOpen ? "translate-x-0" : "translate-x-full",
        "transform transition-transform duration-300",
        "flex flex-col",
        className,
      )}
    >
      {/* --------------------------
          Header
         -------------------------- */}
      <div className="p-4 w-full flex items-center relative">
        <span className="absolute bottom-0 w-[90%]"></span>
        {currentPage?.header}
        {currentPage?.title && <h2 className="text-lg ml-2">{currentPage?.title}</h2>}
        <IconButton icon={ChevronLeft} className="text-primary" size="lg" aria-label="Go back" onClick={onClose} />
      </div>

      {/* --------------------------
          Body - Animate each page
         -------------------------- */}
      <div className="relative flex-1 overflow-hidden flex flex-col">
        <AnimatePresence mode="wait">
          {currentPage && (
            <motion.div
              key={currentPage.id}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              className="flex-1 overflow-auto p-4"
              transition={{ type: "tween" }}
            >
              {/**
               * Here is the current page's component. If you need sub-navigation,
               * pass pushPage/popPage down to the component as props.
               */}
              {React.cloneElement<DrawerChildProps>(currentPage.component, {
                pushPage,
                popPage,
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="p-4 pb-0 w-full">
        <Button size="md" iconSize="lg" variant="surface" className="w-full" icon={ArrowBack} onClick={() => popPage()}>
          Back
        </Button>
      </div>
      <div className="p-4 flex flex-row justify-between">
        {currentPage?.id === "settings-page" ? <div className="w-6 h-6" /> : <SettingsButton pushPage={pushPage} />}
        <LogoutButton />
      </div>
    </div>
  );
};

const SettingsButton = ({ pushPage }: { pushPage: (page: DrawerPage) => void }) => {
  return (
    <Settings
      className="cursor-pointer text-primary"
      onClick={() => {
        pushPage({
          id: "settings-page",
          title: "Settings",
          component: <SettingsPage />,
        });
      }}
    />
  );
};

const LogoutButton = () => {
  const { disconnectAsync } = useDisconnect();
  return <Logout className="cursor-pointer text-primary" onClick={() => disconnectAsync()} />;
};

export default Drawer;
