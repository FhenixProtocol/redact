"use client";

import type { NextPage } from "next";
import { MainTokenSwapping } from "~~/components/MainTokenSwapping";

const Home: NextPage = () => {
  return (
    <>
      <div className="flex gap-20">
        <div className="hidden md:flex flex-col items-center justify-center">
          <div className="flex flex-col gap-4">
            <div>
              <h1 className="text-primary-accent text-5xl font-bold">Redact Money.</h1>
              <h2 className="text-primary text-5xl font-bold leading-tight">
                Encrypt Your Tokens
                <br />
                To Discover FHE
              </h2>
            </div>

            <p className="text-primary text-lg">
              Confidential transaction amounts & wallet balances
              <br />
              through the power of Fully Homomorphic Encryption (FHE)
            </p>
          </div>
        </div>
        <div className="">
          <MainTokenSwapping />
        </div>
      </div>
    </>
  );
};

export default Home;
