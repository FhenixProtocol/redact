/* eslint-disable @typescript-eslint/no-unused-vars */
import { useCallback, useMemo } from "react";
import { useAccount } from "wagmi";
import { create } from "zustand";
import { immer } from "zustand/middleware/immer";

export enum DrawerPageName {
  Connect = "connect",
  Main = "main",
  Settings = "settings",
  Token = "token",
  Send = "send",
  Receive = "receive",
}

type DrawerPage = {
  page: DrawerPageName;
  pairAddress: string | undefined;
};

interface DrawerStore {
  open: boolean;
  animationDirection: "left" | "right";
  stack: DrawerPage[];
}

const useDrawerStore = create<DrawerStore>()(
  immer(set => ({
    open: false,
    animationDirection: "right",
    stack: [{ page: DrawerPageName.Main, pairAddress: undefined }],
  })),
);

// Actions

export const setDrawerPairAddress = (pairAddress: string | undefined) => {
  useDrawerStore.setState(state => {
    const stackPage = state.stack[state.stack.length - 1];
    if (stackPage == null) return;
    stackPage.pairAddress = pairAddress;
  });
};

// Hooks

const useDrawerStack = () => {
  return useDrawerStore(state => state.stack);
};

const useDrawerStackPage = () => {
  return useDrawerStore(state => state.stack[state.stack.length - 1]);
};

export const useDrawerPagesCount = () => {
  return useDrawerStore(state => state.stack.length);
};

export const useDrawerPage = (): DrawerPage => {
  const { address: account, isConnected } = useAccount();
  const stackPage = useDrawerStackPage();

  return useMemo(() => {
    if (!isConnected || account == null) return { page: DrawerPageName.Connect, pairAddress: undefined };
    if (stackPage == null) return { page: DrawerPageName.Main, pairAddress: undefined };
    return stackPage;
  }, [isConnected, account, stackPage]);
};

export const useDrawerPairAddress = () => {
  const stackPage = useDrawerStackPage();
  return stackPage?.pairAddress;
};

export const useSetDrawerOpen = () => {
  return useCallback((open: boolean) => {
    useDrawerStore.setState(state => {
      state.open = open;
      state.stack = [{ page: DrawerPageName.Main, pairAddress: undefined }];
    });
  }, []);
};

export const useDrawerOpen = () => {
  return useDrawerStore(state => state.open);
};

export const useDrawerBackButtonAction = () => {
  const stack = useDrawerStack();

  return useCallback(() => {
    if (stack.length === 1) {
      useDrawerStore.setState(state => {
        state.open = false;
        state.stack = [{ page: DrawerPageName.Main, pairAddress: undefined }];
      });
    } else {
      useDrawerStore.setState(state => {
        state.animationDirection = "left";
        state.stack = state.stack.slice(0, -1);
      });
    }
    return null;
  }, [stack]);
};

export const useDrawerPushPage = () => {
  return useCallback(
    (page: DrawerPage) =>
      useDrawerStore.setState(state => {
        state.animationDirection = "right";
        state.stack = [...state.stack, page];
      }),
    [],
  );
};

export const useDrawerPopPage = () => {
  return useCallback(
    () =>
      useDrawerStore.setState(state => {
        state.animationDirection = "left";
        state.stack = state.stack.slice(0, -1);
      }),
    [],
  );
};

export const useDrawerAnimationDirection = () => {
  return useDrawerStore(state => state.animationDirection);
};
