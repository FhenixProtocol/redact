"use client";

import { useEffect } from "react";
import FAQPage from "./FAQPage";
import MaintenancePage from "./MaintenancePage";
import type { NextPage } from "next";
import { MainTokenSwapping } from "~~/components/MainTokenSwapping";
import { useGlobalState } from "~~/services/store/store";

const Home: NextPage = () => {
  const isFAQOpen = useGlobalState(state => state.isFAQOpen);
  const isMaintenanceMode = useGlobalState(state => state.isMaintenanceMode);
  const fetchMaintenanceMode = useGlobalState(state => state.fetchMaintenanceMode);

  useEffect(() => {
    fetchMaintenanceMode();
  }, [fetchMaintenanceMode]);

  if (isMaintenanceMode) {
    return <MaintenancePage />;
  }

  if (isFAQOpen) {
    return <FAQPage />;
  }

  return (
    <>
      <div className="flex flex-col md:flex-row gap-8 md:gap-20 md:p-8">
        <div className="hidden md:flex flex-col items-center justify-center">
          <div className="flex flex-col gap-4">
            <div>
              <h1 className="text-primary-accent text-5xl font-bold">Redact Money.</h1>
              <h2 className="text-primary text-5xl font-bold leading-tight">Shield Your Assets</h2>
            </div>

            <p className="text-primary text-lg">Discover confidential assets and transactions</p>
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
