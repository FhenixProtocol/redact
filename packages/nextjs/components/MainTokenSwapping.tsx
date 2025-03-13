import { useState } from "react";
import { Button } from "~~/components/ui/Button";
import { Slider } from "~~/components/ui/FnxSlider";
import { FnxSelect } from "~~/components/ui/FnxSelect";
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

type ActionType = "Encrypt" | "Decrypt";

interface MainTokenSwappingProps {
  setIsModalOpen: (isOpen: boolean) => void;
}

export function MainTokenSwapping({ setIsModalOpen }: MainTokenSwappingProps) {
  const [selectedAction, setSelectedAction] = useState<ActionType | string>("Encrypt");
  const { isConnected } = useAccount();

  const {
    token,
    setToken,
    sliderValue,
    depositValue,
    selectedTokenBalance,
    processedTokens,
    handleSliderChange,
    handleDepositChange
  } = useTokenSelector();

  const availableActions: Record<ActionType, { icon: React.ComponentType<{ size?: number }> }> = {
    Encrypt: { icon: EyeOff },
    Decrypt: { icon: Eye },
  };

  const ActionIcon = availableActions[selectedAction as ActionType].icon;


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
                />
              </div>
            </CardContent>
            <CardFooter className="flex justify-center">
              <Button className="w-full" icon={ActionIcon}>{selectedAction}</Button>
            </CardFooter>
          </Card>
        </div>
      {/* </Glow>
      </GlowArea> */}
    </div>
  );
}
