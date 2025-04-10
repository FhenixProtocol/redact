import { useState } from "react";
import { Button } from "~~/components/ui/Button";
import { Slider } from "~~/components/ui/FnxSlider";
import { FnxSelect } from "~~/components/ui/FnxSelect";
import Image from "next/image";
// import { Glow, GlowArea } from "~~/components/glow";
import { RadioButtonGroup } from "~~/components/ui/FnxRadioGroup";
import { useTokenSelector } from "~~/hooks/useTokenSelector";
import { Eye, EyeOff, PlusIcon } from "lucide-react";
import {
  CardFooter,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "~~/components/ui/FnxCard";
import { useAccount } from 'wagmi';
import { useCofhe } from "~~/hooks/useCofhe";
import { getPublicClient, getWalletClient } from '@wagmi/core'
import { wagmiConfig } from '~~/services/web3/wagmiConfig'  // Adjust this import path as needed
import { useReadContract } from 'wagmi'
import { erc20Abi, parseUnits } from "viem";
import { ConfidentialERC20Abi } from "~~/lib/abis";
import { Spinner } from "./ui/Spinner";
import { useTokenBalance } from "~~/hooks/useTokenBalance";
type ActionType = "Encrypt" | "Decrypt";

interface MainTokenSwappingProps {
  setIsModalOpen: (isOpen: boolean) => void;
}

export function MainTokenSwapping({ setIsModalOpen }: MainTokenSwappingProps) {
  const [selectedAction, setSelectedAction] = useState<ActionType | string>("Encrypt");
  const { isConnected, address } = useAccount();
  const { isInitialized, isInitializing } = useCofhe();

  const [isEncrypting, setIsEncrypting] = useState(false);
  const [isDecrypting, setIsDecrypting] = useState(false);

  const {
    token,
    setToken,
    sliderValue,
    depositValue,
    selectedTokenBalance,
    processedTokens,
    selectedTokenInfo,
    handleSliderChange,
    handleDepositChange
  } = useTokenSelector();

  // Get the token balance and refresh function at the component level
  const { balance: tokenBalance, refreshBalance } = useTokenBalance({
    tokenAddress: selectedTokenInfo?.address || "",
    userAddress: address
  });

  const availableActions: Record<ActionType, { icon: React.ComponentType<{ size?: number }> }> = {
    Encrypt: { icon: EyeOff },
    Decrypt: { icon: Eye },
  };

  const ActionIcon = availableActions[selectedAction as ActionType].icon;


  // TODO: Move to other file
  const handleAction = () => {
    if (selectedAction === "Encrypt") {
      handleEncrypt();
    } else {
      handleDecrypt();
    }
  }

  const handleEncrypt = async () => {
    console.log("Encrypt");
    console.log(depositValue);
    console.log(token);
    console.log(selectedTokenInfo);
    if (selectedTokenInfo) {
      setIsEncrypting(true);
      const publicClient = getPublicClient(wagmiConfig)
      const walletClient = await getWalletClient(wagmiConfig);

      const allowance = await publicClient.readContract({
        address: selectedTokenInfo.address as `0x${string}`,
        abi: erc20Abi,
        functionName: 'allowance',
        args: [
          address as `0x${string}`, 
          selectedTokenInfo.confidentialAddress as `0x${string}`
        ]
      })
      console.log(allowance);

      const amount = parseUnits(depositValue.toString(), selectedTokenInfo.decimals)
      if (allowance < amount) {
        console.log(`Not enough allowance for ${depositValue} ${selectedTokenInfo.symbol}`);
        try {
          const hash = await walletClient.writeContract({
            address: selectedTokenInfo.address as `0x${string}`,
            abi: erc20Abi,
            functionName: 'approve',
            args: [selectedTokenInfo.confidentialAddress, amount]
          })
          const receipt = await publicClient.waitForTransactionReceipt({ hash });
          console.log("---- receipt ----");
          console.log(receipt);
          console.log("---- receipt ----");
        } catch (error) {
          console.log(error);
          setIsEncrypting(false);
          return;
        }
      }

      try {
        console.log(`Encrypting ${amount} ${selectedTokenInfo.symbol} for ${address}`);
        const hash = await walletClient.writeContract({
          address: selectedTokenInfo.confidentialAddress as `0x${string}`,
          abi: ConfidentialERC20Abi,
          functionName: 'encrypt',
          args: [address, amount]
        })

        console.log(hash);
  
        const receipt = await publicClient.waitForTransactionReceipt({ hash });
        console.log("---- receipt ----");
        console.log(receipt);
        console.log("---- receipt ----");
        console.log("Transaction successful, refreshing balance");
        refreshBalance();

      
      } catch (error) {
        console.log(error);
      }

      setIsEncrypting(false);



      // writeContract({
      //   address: selectedTokenInfo.address as `0x${string}`,
      //   abi: erc20Abi,
      //   functionName: 'approve',
      //   args: [selectedTokenInfo.confidentialAddress as `0x${string}`, amount]
      // });

    }
  
  }

  const handleDecrypt = () => {
    setIsDecrypting(true);
    console.log("Decrypt");
    setIsDecrypting(false);
  }

  return (
    <div className="text-center inline-block">
      {/* <GlowArea className="flex gap-8 items-center justify-center p-20">
        <Glow color="teal" className="rounded-3xl drop-shadow-xl"> */}
        <div className=" flex gap-8 items-center justify-center w-[450px] rounded-3xl drop-shadow-xl">
          <Card className="rounded-[inherit] w-[450px] bg-background/60 border-component-stroke backdrop-blur-xs">
            {!isConnected ? 
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-background/80 backdrop-blur-sm w-[99%] h-[99%] z-200 rounded-[inherit] flex items-center justify-center [background-image:repeating-linear-gradient(45deg,#FFFFFF15,#FFFFFF15_10px,transparent_10px,transparent_25px)]">
              <div className="text-lg font-semibold text-theme-black">
                Connect your wallet to start swapping
              </div>
            </div> : <></>
            }
            {isConnected && !isInitialized ? 
            <div className="absolute flex-col gap-4 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-background/80 backdrop-blur-sm w-[99%] h-[99%] z-200 rounded-[inherit] flex items-center justify-center [background-image:repeating-linear-gradient(45deg,#FFFFFF15,#FFFFFF15_10px,transparent_10px,transparent_25px)]">
              <div className="text-lg font-semibold text-theme-black">
                Waiting for Cofhe to initialize...
              </div>
              <div>
                <Image src="/loading-cofhe.gif" alt="Loading Cofhe" width={300} height={100} className="mix-blend-multiply" />
              </div>
            </div> : <></>
            }
            <CardHeader>
              <CardTitle className="flex justify-between text-primary-accent text-xl">
                <div>{selectedAction}</div>
                <div><ActionIcon size={24} /></div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div>
                <RadioButtonGroup
                  labels={["Encrypt", "Decrypt"]}
                  Icons={[EyeOff, Eye]}
                  value={selectedAction}
                  onChange={(val: string) => setSelectedAction(val)}
                />

                <hr className="border-t border-gray-300 my-4" />

                <div className="mb-5 w-full flex content-stretch rounded-2xl border border-[#3399FF] p-4">
                  <div className="flex flex-col items-start flex-1">
                    <div className="text-sm text-[#336699] font-semibold">You Deposit</div>
                    <input
                      type="number"
                      value={depositValue}
                      onChange={(e) => handleDepositChange(e.target.value)}
                      className="w-20 text-lg text-primary-accent font-bold outline-none no-spinner"
                    />
                    <div className="text-xs text-[#336699]">$ Fiat amount</div>
                  </div>
                  <div className="flex flex-col items-end flex-none justify-between">
                    <FnxSelect
                      value={token}
                      onChange={(val: string) => setToken(val)}
                      items={processedTokens}
                      placeholder="Select Token"
                      className="z-100 text-sm w-[130px]"
                      fixedFooter={(close) => (
                        <div className="px-0 py-0 bg-transparent hover:bg-white/50">
                          <Button 
                            variant="ghost2"
                            icon={PlusIcon}
                            noOutline={true}
                            onClick={() => { 
                              setIsModalOpen(true); 
                              close(); 
                            }} 
                            className="w-full text-left font-semibold text-md text-primary-accent"
                          >
                            Add Token
                          </Button>
                        </div>
                      )}
                    />
                    <div className="flex justify-between items-center w-full">
                      <div className="text-xs text-[#336699]">
                        Balance: {selectedTokenBalance}
                      </div>
                      <Button
                        onClick={() => handleSliderChange(100)}
                        uppercase={true}
                        noOutline={true}
                        className="py-[1px]"
                        size="xs">
                        Max
                      </Button>
                    </div>
                  </div>
                </div>

                <Slider
                  value={sliderValue}
                  onValueChange={(val) => {
                    if (val[0] !== undefined) {
                      handleSliderChange(val[0]);
                    }
                  }}
                  max={100}
                  step={1}
                  showMarkers={true}
                  showMaxButton={false}
                  disabled={isEncrypting || isDecrypting}
                />
              </div>
            </CardContent>
            <CardFooter className="flex justify-center">
              <Button className="w-full" icon={ActionIcon} onClick={handleAction} disabled={isEncrypting || isDecrypting}>
                {isEncrypting || isDecrypting ? "Please wait..." : selectedAction}
                {isEncrypting || isDecrypting && <Spinner />}
              </Button>
            </CardFooter>
          </Card>
        </div>
      {/* </Glow>
      </GlowArea> */}
    </div>
  );
}
