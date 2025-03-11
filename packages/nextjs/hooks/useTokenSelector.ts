import { useState, useEffect, useMemo } from 'react';
import { useAccount } from 'wagmi';
import { Address } from 'viem';
import { TokenListItem, useTokenStore } from '~~/services/store/tokenStore';
import { useTokenBalance } from '~~/hooks/useTokenBalance';
import { getTokenLogo } from '~~/lib/tokenUtils';

export interface UseTokenSelectorReturn {
  token: string;
  setToken: (val: string) => void;
  sliderValue: number[];
  setSliderValue: (val: number[]) => void;
  depositValue: number;
  setDepositValue: (val: number) => void;
  selectedTokenBalance: string;
  processedTokens: Array<{
    value: string;
    name: string;
    logo: string;
  }>;
  handleSliderChange: (value: number) => void;
  handleDepositChange: (value: string) => void;
}

export function useTokenSelector(): UseTokenSelectorReturn {
  const { address } = useAccount();
  const { tokens } = useTokenStore();
  const [sliderValue, setSliderValue] = useState([50]);
  const [token, setToken] = useState<string>(tokens[0]?.symbol || '');

  const selectedTokenInfo = tokens.find((t: TokenListItem) => t.symbol === token);
  const { balance: selectedTokenBalance } = useTokenBalance({
    tokenAddress: selectedTokenInfo?.address as Address,
    userAddress: address,
    decimals: selectedTokenInfo?.decimals
  });

  const [depositValue, setDepositValue] = useState(() => {
    const initialBalance = Number(selectedTokenBalance);
    return (initialBalance * 50) / 100;
  });

  const handleSliderChange = (value: number) => {
    const newDepositValue = Math.round((Number(selectedTokenBalance) * value) / 100);
    setSliderValue([value]);
    setDepositValue(newDepositValue);
  };

  const handleDepositChange = (value: string) => {
    let newDeposit = parseFloat(value);
    if (isNaN(newDeposit)) newDeposit = 0;
    const currentBalance = Number(selectedTokenBalance);
    newDeposit = Math.min(Math.max(newDeposit, 0), currentBalance);
    const newSliderValue = Math.round((newDeposit / currentBalance) * 100);

    setDepositValue(newDeposit);
    setSliderValue([newSliderValue]);
  };

  useEffect(() => {
    const newBalance = Number(selectedTokenBalance);
    const percentage = sliderValue[0]!;
    setDepositValue((newBalance * percentage) / 100);
  }, [selectedTokenBalance, sliderValue]);

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
    selectedTokenBalance,
    processedTokens,
    handleSliderChange,
    handleDepositChange
  };
} 