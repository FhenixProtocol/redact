import React from "react";

export function SendPage() {
  return (
    <div>
      <h1>Send Page</h1>
    </div>
  );
  // const [switcherValue, setSwitcherValue] = useState(0);
  // const [toAddress, setToAddress] = useState<string>("");
  // const [gasPrice, setGasPrice] = useState<string>("0 ETH");

  // const chainId = useChainId();
  // console.log(chainId);

  // useEffect(() => {
  //   const timeoutId = setTimeout(async () => {
  //     try {
  //       const raw = await getGasPrice();
  //       const gasAsBigInt = typeof raw === "number" ? BigInt(raw) : raw;
  //       setGasPrice(customFormatEther(gasAsBigInt, 8, "ceil") + " ETH");
  //     } catch (error) {
  //       console.error(error);
  //     }
  //   }, 500); // 500ms debounce

  //   return () => clearTimeout(timeoutId);
  // }, [sliderValue, depositValue]);

  // return (
  //   <div className="p-4 flex flex-col gap-4">
  //     <Switcher
  //       label="Mode"
  //       options={[
  //         { description: "Public", icon: Eye },
  //         { description: "Confidential", icon: EyeOff },
  //       ]}
  //       value={switcherValue}
  //       onValueChange={val => setSwitcherValue(val)}
  //       className=""
  //     />

  //     <div className="flex justify-between rounded-full p-0 m-0 bg-white">
  //       <FnxInput
  //         type="number"
  //         value={depositValue}
  //         onChange={e => handleDepositChange(e.target.value)}
  //         placeholder="Amount"
  //         noSpinner={true}
  //         rightElement={
  //           <FnxSelect
  //             value={token}
  //             onChange={(val: string) => setToken(val)}
  //             items={processedTokens}
  //             placeholder="Select Token"
  //             className="h-full w-[130px] rounded-l-lg bg-surface text-primary-accent text-sm"
  //           />
  //         }
  //       />
  //     </div>

  //     <div className="flex flex-row justify-start -mt-2 px-2">
  //       <div className="font-reddit-sans text-xs">
  //         Encrypted Balance: {selectedTokenInfo == null && <span className="font-reddit-mono font-bold">...</span>}
  //         {selectedTokenInfo != null && (
  //           <span className="font-reddit-mono font-bold">
  //             {selectedPrivateTokenBalance} {selectedTokenInfo?.symbol}
  //           </span>
  //         )}
  //       </div>
  //     </div>

  //     <Slider
  //       className="w-[95%] self-center"
  //       value={sliderValue}
  //       onValueChange={val => {
  //         if (val[0] !== undefined) {
  //           handleSliderChange(val[0]);
  //         }
  //       }}
  //       max={100}
  //       step={1}
  //       showMarkers={true}
  //       showMaxButton={false}
  //     />

  //     <div>
  //       <FnxInput type="text" value={toAddress} onChange={e => setToAddress(e.target.value)} placeholder="To:" />
  //     </div>

  //     <div className="font-reddit-sans text-xs">
  //       Gas Price: <span className="font-reddit-mono font-bold">{gasPrice}</span>
  //     </div>

  //     <Button className="bg-primary-accent text-white font-bold text-sm" icon={MoveUpRight}>
  //       Send
  //     </Button>
  //   </div>
  // );
}
