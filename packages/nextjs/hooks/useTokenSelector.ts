import { useState, useEffect, useMemo } from 'react';
import { useAccount } from 'wagmi';
import { Address } from 'viem';
import { TokenListItem, useTokenStore } from '~~/services/store/tokenStore';
import { useTokenBalance } from '~~/hooks/useTokenBalance';
import { getTokenLogo } from '~~/lib/tokenUtils';
import { useCofhe } from "~~/hooks/useCofhe";

export interface UseTokenSelectorReturn {
  token: string;
  setToken: (val: string) => void;
  sliderValue: number[];
  setSliderValue: (val: number[]) => void;
  depositValue: number;
  setDepositValue: (val: number) => void;
  withdrawValue: number;
  setWithdrawValue: (val: number) => void;
  selectedTokenBalance: string;
  selectedPrivateTokenBalance: string;
  isLoadingPrivateBalance: boolean;
  selectedTokenInfo: TokenListItem | undefined;
  processedTokens: Array<{
    value: string;
    name: string;
    logo: string;
  }>;
  handleSliderChange: (value: number, isWithdraw?: boolean) => void;
  handleDepositChange: (value: string) => void;
  handleWithdrawChange: (value: string) => void;
}

export function useTokenSelector(): UseTokenSelectorReturn {
  const { address } = useAccount();
  const { tokens } = useTokenStore();
  const { isInitialized } = useCofhe();
  const [sliderValue, setSliderValue] = useState([50]);
  const [token, setToken] = useState<string>(tokens[0]?.symbol || '');

  const selectedTokenInfo = tokens.find((t: TokenListItem) => t.symbol === token);
  
  // Public balance
  const { balance: selectedTokenBalance } = useTokenBalance({
    tokenAddress: selectedTokenInfo?.address as Address,
    userAddress: address,
    decimals: selectedTokenInfo?.decimals || 18,
    isPrivate: false
  });
  
  // Private balance - only fetch when cofhejs is initialized
  const { balance: selectedPrivateTokenBalance, isLoading: isLoadingPrivateBalance } = useTokenBalance({
    tokenAddress: selectedTokenInfo?.address as Address,
    userAddress: address,
    decimals: selectedTokenInfo?.decimals || 18,
    isPrivate: true
  });
  

  const [depositValue, setDepositValue] = useState(() => {
    const initialBalance = Number(selectedTokenBalance);
    return (initialBalance * 50) / 100;
  });
  
  const [withdrawValue, setWithdrawValue] = useState(() => {
    const initialPrivateBalance = Number(selectedPrivateTokenBalance);
    return (initialPrivateBalance * 50) / 100;
  });
  
  // Add flags to track manual input
  const [isManualDepositInput, setIsManualDepositInput] = useState(false);
  const [isManualWithdrawInput, setIsManualWithdrawInput] = useState(false);
  
  // Modified to handle both deposit and withdraw cases
  const handleSliderChange = (value: number, isWithdraw = false) => {
    // When slider is moved directly, exit manual input mode
    if (isWithdraw) {
      setIsManualWithdrawInput(false);
    } else {
      setIsManualDepositInput(false);
    }
    
    setSliderValue([value]);
    
    if (isWithdraw) {
      const newWithdrawValue = (Number(selectedPrivateTokenBalance) * value) / 100;
      setWithdrawValue(newWithdrawValue);
    } else {
      const newDepositValue = (Number(selectedTokenBalance) * value) / 100;
      setDepositValue(newDepositValue);
    }
  };

  const handleDepositChange = (value: string) => {
    // Enter manual input mode
    setIsManualDepositInput(true);
    
    let newDeposit = parseFloat(value);
    if (isNaN(newDeposit)) newDeposit = 0;
    
    // Don't cap the value, allow any input
    setDepositValue(newDeposit);
    
    // Update slider to approximate position
    const currentBalance = Number(selectedTokenBalance);
    if (currentBalance > 0) {
      const newSliderValue = Math.min(Math.round((newDeposit / currentBalance) * 100), 100);
      setSliderValue([newSliderValue]);
    }
  };

  const handleWithdrawChange = (value: string) => {
    // Enter manual input mode
    setIsManualWithdrawInput(true);
    
    let newWithdraw = parseFloat(value);
    if (isNaN(newWithdraw)) newWithdraw = 0;
    
    // Don't cap the value, allow any input
    setWithdrawValue(newWithdraw);
    
    // Update slider to approximate position
    const currentPrivateBalance = Number(selectedPrivateTokenBalance);
    if (currentPrivateBalance > 0) {
      const newSliderValue = Math.min(Math.round((newWithdraw / currentPrivateBalance) * 100), 100);
      setSliderValue([newSliderValue]);
    }
  };

  // Update deposit value when token balance changes, but only if not in manual input mode
  useEffect(() => {
    if (!isManualDepositInput) {
      const newBalance = Number(selectedTokenBalance);
      const percentage = sliderValue[0]!;
      setDepositValue((newBalance * percentage) / 100);
    }
  }, [selectedTokenBalance, sliderValue, isManualDepositInput]);
  
  // Update withdraw value when private token balance changes, but only if not in manual input mode
  useEffect(() => {
    if (!isManualWithdrawInput) {
      const newPrivateBalance = Number(selectedPrivateTokenBalance);
      const percentage = sliderValue[0]!;
      setWithdrawValue((newPrivateBalance * percentage) / 100);
    }
  }, [selectedPrivateTokenBalance, sliderValue, isManualWithdrawInput]);

  const processedTokens = useMemo(() => {
    return tokens.map((token: TokenListItem) => ({
      value: token.symbol,
      name: token.symbol,
      logo: getTokenLogo(token.symbol, token.image)
    }));
  }, [tokens]);

  return {
    token,
    setToken,
    sliderValue,
    setSliderValue,
    depositValue,
    setDepositValue,
    withdrawValue,
    setWithdrawValue,
    selectedTokenBalance,
    selectedPrivateTokenBalance,
    isLoadingPrivateBalance,
    selectedTokenInfo,
    processedTokens,
    handleSliderChange,
    handleDepositChange,
    handleWithdrawChange
  };
} 