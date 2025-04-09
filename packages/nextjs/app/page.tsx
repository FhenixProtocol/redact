"use client";

import Link from "next/link";
import type { NextPage } from "next";
import { useAccount } from "wagmi";
import { BugAntIcon, MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { Address } from "~~/components/scaffold-eth";
import { Modal } from "~~/components/ui/Modal";
import { AddToken } from "~~/components/AddToken";
import { MainTokenSwapping } from "~~/components/MainTokenSwapping";
import { useState } from "react";
import { useCofhe } from "~~/hooks/useCofhe";

const Home: NextPage = () => {
  const { address: connectedAddress } = useAccount();
  const [isModalOpen, setIsModalOpen] = useState(false);
  useCofhe(); // initialize the cofhejs instance

  return (
    <>
      <div className="flex gap-20">
        <div className=" flex flex-col items-center justify-center">
          <div className="flex flex-col gap-4">
            <div>
              <h1 className="text-primary-accent text-5xl font-bold">
                Redact Money.
              </h1>
              <h2 className="text-primary text-5xl font-bold leading-tight">
                Encrypt Your Tokens<br />
                To Discover FHE
              </h2>
            </div>
            
            <p className="text-primary text-lg">
              Confidential transaction amounts & wallet balances<br/>
              through the power of Fully Homomorphic Encryption (FHE)
            </p>
          </div>
        </div>
        <div className="">
          <MainTokenSwapping setIsModalOpen={setIsModalOpen} />
        </div>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Add Token"
        duration="slow"  // or "normal" or "slow"
      >
        <div className="flex flex-col gap-4">
          <AddToken 
            onClose={() => setIsModalOpen(false)}
            onAddToken={() => {
              setIsModalOpen(false);
            }}
          />
        </div>
      </Modal>

    </>
  );
};

export default Home;
