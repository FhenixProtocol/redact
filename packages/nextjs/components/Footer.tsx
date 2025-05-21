import React from "react";
import { FaTelegramPlane } from "react-icons/fa";
import { FaDiscord, FaXTwitter } from "react-icons/fa6";

export const Footer = () => {
  return (
    <footer className="p-4 flex items-center justify-end space-x-4 text-xs text-blue-900">
      <div className="flex gap-4">
        <a href="https://discord.com/invite/FuVgxrvJMY" target="_blank" rel="noopener noreferrer">
          <FaDiscord title="Discord" />
        </a>
        <a href="https://x.com/FhenixIO" target="_blank" rel="noopener noreferrer">
          <FaXTwitter title="X (Twitter)" />
        </a>
        <a href="https://t.me/+237VUa7c6v1jZmFh" target="_blank" rel="noopener noreferrer">
          <FaTelegramPlane title="Telegram" />
        </a>
      </div>
      <div className="w-px h-4 bg-blue-900"></div>
      <span className="ml-2">Powered by Fhenix</span>
    </footer>
  );
};
