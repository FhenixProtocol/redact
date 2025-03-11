"use client";

import { Button } from "~~/components/ui/Button";
import { useConnect } from 'wagmi';
import Image from 'next/image';
import { useState, useEffect } from 'react';

const excludeConnectors = ["keplr"];

export const WalletLister = () => {
    const { connect, connectors } = useConnect();
    
    // Use this to prevent hydration errors
    const [mounted, setMounted] = useState(false);
    useEffect(() => {
        setMounted(true);
    }, []);

    // Don't render anything until client-side
    if (!mounted) {
        return <div className="p-4">Loading wallet options...</div>;
    }

    return (
        <div className="p-4">
            <h2 className="text-xl font-bold mb-4">Connect your wallet</h2>
            <div className="flex flex-wrap gap-4">
                {connectors.map((connector, index) => {
                    if (excludeConnectors.includes(connector.name.toLocaleLowerCase())) {
                        return null;
                    }

                    return (
                        <Button
                            key={`${connector.id}-${index}`}
                            onClick={() => connect({ connector })}
                            style={{ marginRight: '1rem', padding: '0.5rem 1rem' }}
                            variant="outline"
                            className="flex items-center gap-2"
                        >
                            {connector.id === 'metaMask' && (
                                <img 
                                    src="/metamask-icon.png" 
                                    alt="MetaMask" 
                                    className="w-6 h-6" 
                                    width={24} 
                                    height={24}
                                />
                            )}
                            {connector.id === 'walletConnect' && (
                                <img 
                                    src="/walletconnect-icon.png" 
                                    alt="WalletConnect" 
                                    className="w-6 h-6" 
                                    width={24} 
                                    height={24}
                                />
                            )}
                            {connector.id !== 'metaMask' && connector.id !== 'walletConnect' && (
                                <img 
                                    src="/default-wallet-icon.png" 
                                    alt={connector.name} 
                                    className="w-6 h-6" 
                                    width={24} 
                                    height={24}
                                />
                            )}
                            {connector.name}
                        </Button>
                    );
                })}
            </div>
        </div>
    );
};
