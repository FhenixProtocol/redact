"use client";

import Image from "next/image";

export default function FAQPage() {
  const imageSize = 420;
  return (
    <div className="flex flex-col items-center justify-center -mt-50 ">
      <Image src="/maintenance.png" alt="Maintenance" width={imageSize} height={imageSize} />
      <div className="text-center text-2xl font-bold">
        CoFHE is under maintenance
        <br />
        We&apos;ll be back shortly
      </div>
    </div>
  );
}
