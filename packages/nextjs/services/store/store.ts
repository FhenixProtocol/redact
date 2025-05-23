import { create } from "zustand";
import scaffoldConfig from "~~/scaffold.config";
import { ConfidentialTokenPair } from "~~/services/store/tokenStore";
import { ChainWithAttributes } from "~~/utils/scaffold-eth";

type GlobalState = {
  nativeCurrency: {
    price: number;
    isFetching: boolean;
  };
  setNativeCurrencyPrice: (newNativeCurrencyPriceState: number) => void;
  setIsNativeCurrencyFetching: (newIsNativeCurrencyFetching: boolean) => void;
  targetNetwork: ChainWithAttributes;
  setTargetNetwork: (newTargetNetwork: ChainWithAttributes) => void;

  // Add Token Modal
  isAddTokenModalOpen: boolean;
  setAddTokenModalOpen: (isOpen: boolean) => void;

  // Select Token Modal
  isSelectTokenModalOpen: boolean;
  onSelectTokenCallback: ((tokenPair: ConfidentialTokenPair, isEncrypt?: boolean) => void) | null;
  setSelectTokenModalOpen: (
    isOpen: boolean,
    onSelectToken?: ((tokenPair: ConfidentialTokenPair, isEncrypt?: boolean) => void) | null,
  ) => void;
};

export const useGlobalState = create<GlobalState>(set => ({
  nativeCurrency: {
    price: 0,
    isFetching: true,
  },
  setNativeCurrencyPrice: (newValue: number): void =>
    set(state => ({ nativeCurrency: { ...state.nativeCurrency, price: newValue } })),
  setIsNativeCurrencyFetching: (newValue: boolean): void =>
    set(state => ({ nativeCurrency: { ...state.nativeCurrency, isFetching: newValue } })),
  targetNetwork: scaffoldConfig.targetNetworks[0],
  setTargetNetwork: (newTargetNetwork: ChainWithAttributes) => set(() => ({ targetNetwork: newTargetNetwork })),

  // Add Token Modal
  isAddTokenModalOpen: false,
  setAddTokenModalOpen: (isOpen: boolean) => set(() => ({ isAddTokenModalOpen: isOpen })),

  // Select Token Modal
  isSelectTokenModalOpen: false,
  onSelectTokenCallback: null,
  setSelectTokenModalOpen: (isOpen: boolean, onSelectToken = null) =>
    set(() => ({
      isSelectTokenModalOpen: isOpen,
      onSelectTokenCallback: onSelectToken,
    })),
}));
