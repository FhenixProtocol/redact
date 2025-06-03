"use client";

import Image from "next/image";
import { useTheme } from "next-themes";

export default function FAQPage() {
  const { theme } = useTheme();
  const imageSize = 420;
  const imageSrc = theme === "dark" ? "/maintenance-dark.svg" : "/maintenance-light.svg";

  return (
    <div className="flex flex-col items-center justify-center -mt-50 ">
      <Image src={imageSrc} alt="Maintenance" width={imageSize} height={imageSize} />
      <div className="text-center text-2xl font-bold mt-5">
        <span className="text-primary-accent">CoFHE is under maintenance</span>
        <br />
        <span className="text-primary">We&apos;ll be back shortly</span>
      </div>
    </div>
  );
}
