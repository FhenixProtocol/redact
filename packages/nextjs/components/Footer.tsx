import React from "react";
import { FaDiscord, FaGithub, FaTelegramPlane } from "react-icons/fa";
import { FaXTwitter } from "react-icons/fa6";
import { PiGlobe } from "react-icons/pi";
import { TbLibrary } from "react-icons/tb";

export const Footer = () => {
  const iconSize = 16;
  return (
    <footer className="p-4 flex items-center justify-end space-x-4 text-xs text-blue-900">
      <div className="flex gap-4">
        <a
          href="https://discord.com/invite/FuVgxrvJMY"
          target="_blank"
          rel="noopener noreferrer"
          className="dark:text-white"
        >
          <FaDiscord title="Discord" size={iconSize} />
        </a>
        <a href="https://x.com/FhenixIO" target="_blank" rel="noopener noreferrer" className="dark:text-white">
          <FaXTwitter title="X (Twitter)" size={iconSize} />
        </a>
        <a href="https://t.me/+Cpn0CAifhUYwNTMx" target="_blank" rel="noopener noreferrer" className="dark:text-white">
          <FaTelegramPlane title="Telegram" size={iconSize} />
        </a>
        <a
          href="https://github.com/fhenixProtocol/redact"
          target="_blank"
          rel="noopener noreferrer"
          className="dark:text-white"
        >
          <FaGithub title="GitHub" size={iconSize} />
        </a>
      </div>
      <div className="w-px h-4 bg-blue-900"></div>
      <a href="https://fhenix.io" target="_blank" rel="noopener noreferrer" className="dark:text-white">
        <PiGlobe title="Fhenix Website" size={iconSize} />
      </a>
      <a href="https://docs.fhenix.zone" target="_blank" rel="noopener noreferrer" className="dark:text-white">
        <TbLibrary title="Documents" size={iconSize} />
      </a>
      <span className="ml-2">Powered by Fhenix</span>
    </footer>
  );
};
