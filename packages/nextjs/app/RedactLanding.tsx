"use client";

import { useEffect, useState } from "react";
import { Inter, JetBrains_Mono, Space_Grotesk } from "next/font/google";
import "~~/styles/fhenix-ds.css";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter",
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "700"],
  variable: "--font-space-grotesk",
  display: "swap",
});

const jetBrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

const HEADLINE = "Something bigger is coming";
const DECRYPT_DURATION_MS = 2200;
const DECRYPT_POOL = "0123456789ABCDEF#$%&@*+=";
const AMBIENT_POOL = "0123456789ABCDEF#$%&@*+=?<>";
const HEX = "0123456789ABCDEF";
const CIPHER_LENGTH = 200;

const FHENIX_MARK_PATH =
  "M1182.47 120.139L1161.75 107.411L1180.1 80.4746L1147.84 80.7706V54.4266L1180.1 54.7226L1161.75 27.7866L1182.47 15.0586L1199.93 43.4746L1217.4 15.0586L1238.12 27.7866L1219.76 54.7226L1252.03 54.4266V80.7706L1219.76 80.4746L1238.12 107.411L1217.4 120.139L1199.93 91.7226L1182.47 120.139Z";

const pick = (pool: string) => pool[Math.floor(Math.random() * pool.length)];

/**
 * Splits the headline across two lines at its first space, keeping the
 * decrypted prefix and the still-encrypted remainder separate so each line can
 * render the two in different colours.
 */
const splitLines = (done: string, noise: string) => {
  const breakAt = HEADLINE.indexOf(" ");
  if (breakAt < 0) return { l1done: done, l1noise: noise, l2done: "", l2noise: "" };

  const doneLength = done.length;
  return {
    l1done: done.slice(0, Math.min(doneLength, breakAt)),
    l1noise: noise.slice(0, Math.max(0, breakAt - doneLength)),
    l2done: doneLength > breakAt + 1 ? done.slice(breakAt + 1) : "",
    l2noise: noise.slice(Math.max(0, breakAt + 1 - doneLength)),
  };
};

const XIcon = () => (
  <svg viewBox="0 0 24 24" width={15} height={15} fill="currentColor" aria-hidden="true">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

export default function RedactLanding() {
  const [shielded, setShielded] = useState(true);
  const [done, setDone] = useState("");
  const [noise, setNoise] = useState("");
  const [decrypting, setDecrypting] = useState(true);
  const [cipher, setCipher] = useState("");

  // The scrolling ciphertext strip along the bottom edge.
  useEffect(() => {
    const roll = () => {
      let next = "";
      for (let i = 0; i < CIPHER_LENGTH; i++) next += i % 5 === 4 ? " " : pick(HEX);
      setCipher(next);
    };

    roll();
    const timer = setInterval(roll, 120);
    return () => clearInterval(timer);
  }, []);

  // The headline decrypts once on load, then glitches a few characters at
  // random intervals so the page never settles completely.
  useEffect(() => {
    let ambientTimer: ReturnType<typeof setTimeout> | undefined;
    let glitchTimer: ReturnType<typeof setInterval> | undefined;

    const scheduleAmbient = () => {
      ambientTimer = setTimeout(
        () => {
          const indexes: number[] = [];
          while (indexes.length < 4) {
            const index = Math.floor(Math.random() * HEADLINE.length);
            if (HEADLINE[index] !== " " && !indexes.includes(index)) indexes.push(index);
          }

          const startedAt = performance.now();
          glitchTimer = setInterval(() => {
            if (performance.now() - startedAt > 450) {
              clearInterval(glitchTimer);
              setDone(HEADLINE);
              scheduleAmbient();
              return;
            }

            const characters = HEADLINE.split("");
            for (const index of indexes) characters[index] = pick(AMBIENT_POOL);
            setDone(characters.join(""));
          }, 55);
        },
        1100 + Math.random() * 1800,
      );
    };

    const startedAt = performance.now();
    const decryptTimer = setInterval(() => {
      const progress = Math.min(1, (performance.now() - startedAt) / DECRYPT_DURATION_MS);
      const revealed = Math.floor(progress * HEADLINE.length);

      let encrypted = "";
      for (let i = revealed; i < HEADLINE.length; i++) encrypted += HEADLINE[i] === " " ? " " : pick(DECRYPT_POOL);

      setDone(HEADLINE.slice(0, revealed));
      setNoise(encrypted);

      if (progress >= 1) {
        clearInterval(decryptTimer);
        setNoise("");
        setDecrypting(false);
        scheduleAmbient();
      }
    }, 40);

    return () => {
      clearInterval(decryptTimer);
      clearTimeout(ambientTimer);
      clearInterval(glitchTimer);
    };
  }, []);

  const { l1done, l1noise, l2done, l2noise } = splitLines(done, noise);

  return (
    <div
      className={`fx-root ${inter.variable} ${spaceGrotesk.variable} ${jetBrainsMono.variable}`}
      data-theme={shielded ? "dark" : "light"}
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        padding: "clamp(24px, 3.5vw, 48px)",
        transition: "background .35s ease, color .35s ease",
        position: "relative",
        overflowX: "hidden",
      }}
    >
      <svg
        viewBox="1147 15 106 106"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        style={{
          position: "absolute",
          top: "50%",
          right: "-12%",
          transform: "translateY(-50%)",
          width: "min(58vw, 780px)",
          height: "auto",
          opacity: 0.05,
          pointerEvents: "none",
          animation: "fxSpin 240s linear infinite",
        }}
      >
        <path d={FHENIX_MARK_PATH} fill="var(--fx-accent)" />
      </svg>

      <header
        style={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "var(--fx-space-5)",
          animation: "fxFadeUp .6s ease both",
        }}
      >
        <a
          href="https://x.com/fhenix"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Fhenix on X"
          style={{ color: "var(--fx-ink)" }}
        >
          <svg
            viewBox="0 0 1406 262"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            style={{ display: "block", width: "clamp(110px, 9vw, 150px)", height: "auto" }}
          >
            <path
              d="M998.438 64.4727V104.433L1020.59 126.745H1044.87L1067.02 104.433V64.4727H1102.84V110.944L1073.37 143.068L1102.84 181.097V227.568H1067.02V191.457L1044.87 162.192H1020.59L998.438 191.457V227.568H962.621V181.097L992.09 143.068L962.621 110.944V64.4727H998.438Z"
              fill="currentColor"
            />
            <path
              d="M1365.28 261.033H1325.62C1349.59 218.409 1361.43 176.081 1361.43 133.753C1361.43 91.4247 1349.59 48.8007 1325.62 6.47266H1365.28C1391.62 47.9127 1405.24 90.8327 1405.24 133.753C1405.24 176.673 1391.62 219.593 1365.28 261.033Z"
              fill="var(--fx-ink-3)"
            />
            <path d={FHENIX_MARK_PATH} fill="#0AD9DC" />
            <path
              d="M857.691 50.2815V15.3535H898.539V50.2815H857.691ZM799.971 228.474V196.506H858.875V101.786H802.931V69.8175H899.131V196.506H949.155V228.474H799.971Z"
              fill="currentColor"
            />
            <path
              d="M631.662 65.377H667.478V75.145L683.758 65.377H747.99L774.63 104.745V228.473H738.814V111.257L730.23 98.529H672.806L667.478 104.745V228.473H631.662V65.377Z"
              fill="currentColor"
            />
            <path
              d="M492.84 64.7852H582.16L605.84 94.2252V155.913H500.536V180.225L510.008 194.137H568.84L585.12 177.265L605.84 203.313L581.568 228.473H492.248L466.496 189.993V92.0172L492.84 64.7852ZM500.536 103.225V128.017H574.584V102.929L569.848 96.1212H507.344L500.536 103.225Z"
              fill="currentColor"
            />
            <path
              d="M300.373 0.849609H336.189V75.1456L352.173 65.3776H415.813L443.341 104.154V228.474H407.525V110.962L398.941 98.5296H342.109L336.189 104.154V228.474H300.373V0.849609Z"
              fill="currentColor"
            />
            <path
              d="M176.169 228.474V101.786H136.209V69.8185H176.169V65.3785C176.169 33.4105 190.969 18.3145 223.529 18.3145H275.921V50.2824H232.705C221.161 50.2824 216.129 55.6104 216.129 65.6745V69.8185H274.737V101.786H216.129V228.474H176.169Z"
              fill="currentColor"
            />
            <path
              d="M40.7178 261.033C14.3738 219.593 0.757812 176.673 0.757812 133.753C0.757812 90.8327 14.3738 47.9127 40.7178 6.47266H80.3818C56.4058 48.8007 44.5658 91.4247 44.5658 133.753C44.5658 176.081 56.4058 218.409 80.3818 261.033H40.7178Z"
              fill="var(--fx-ink-3)"
            />
          </svg>
        </a>

        <label className="fx-toggle-row">
          <button
            type="button"
            role="switch"
            aria-checked={shielded}
            aria-label="Shielded mode"
            className={`fx-toggle${shielded ? " fx-toggle--on" : ""}`}
            onClick={() => setShielded(current => !current)}
          >
            <span className="fx-toggle__knob" />
          </button>
          <span className="fx-toggle-row__label">{shielded ? "Shielded" : "Public"}</span>
        </label>
      </header>

      <main
        style={{
          position: "relative",
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "var(--fx-space-5)",
          padding: "var(--fx-space-7) 0",
          textAlign: "center",
        }}
      >
        <h1
          style={{
            margin: 0,
            // No width cap and no lower bound on the type size: mid-decrypt the
            // headline is monospace, which runs ~9.6em wide on the second line
            // and would otherwise wrap to a third row.
            maxWidth: "none",
            fontFamily: "var(--fx-font-display)",
            fontWeight: 700,
            fontSize: "min(8.5vw, 124px)",
            lineHeight: 1.02,
            letterSpacing: "-.02em",
            color: "var(--fx-ink)",
            textWrap: "balance",
            minHeight: "1.02em",
          }}
        >
          <span style={{ display: "block", whiteSpace: "nowrap" }}>
            {l1done}
            <span className="fx-mono" style={{ color: "var(--fx-accent)", fontWeight: 500 }}>
              {l1noise}
            </span>
          </span>
          <span style={{ display: "block", whiteSpace: "nowrap" }}>
            {l2done}
            <span className="fx-mono" style={{ color: "var(--fx-accent)", fontWeight: 500 }}>
              {l2noise}
            </span>
            <span
              aria-hidden="true"
              style={{
                display: decrypting ? "none" : "inline-block",
                width: ".08em",
                height: ".82em",
                background: "var(--fx-accent)",
                verticalAlign: "-.06em",
                marginLeft: ".05em",
                animation: "fxCaret 1s steps(1) infinite",
              }}
            />
          </span>
        </h1>

        <p
          style={{
            margin: 0,
            maxWidth: 620,
            fontFamily: "var(--fx-font-sans)",
            fontSize: "clamp(15px, 1.2vw, 17px)",
            lineHeight: 1.6,
            color: "var(--fx-ink-2)",
            textWrap: "pretty",
            animation: "fxFadeUp .7s ease .25s both",
          }}
        >
          Redact was our demo of shielded ERC-20s sitting quietly in your wallet. It&rsquo;s switched off now, because
          the thing we&rsquo;re building next is bigger.
        </p>

        <div style={{ paddingTop: "var(--fx-space-2)", animation: "fxFadeUp .7s ease .45s both" }}>
          <a
            href="https://x.com/fhenix"
            target="_blank"
            rel="noopener noreferrer"
            className="fx-btn fx-btn--cta fx-btn--xl"
          >
            <XIcon />
            Follow @fhenix
          </a>
        </div>
      </main>

      <footer
        style={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          gap: "var(--fx-space-4)",
          borderTop: "1px solid var(--fx-border)",
          paddingTop: "var(--fx-space-4)",
          overflow: "hidden",
          whiteSpace: "nowrap",
          animation: "fxFadeUp .6s ease .2s both",
        }}
      >
        <span className="fx-lbl" style={{ flexShrink: 0 }}>
          enc
        </span>
        <span
          className="fx-mono"
          style={{ flex: 1, overflow: "hidden", fontSize: 11, letterSpacing: ".14em", color: "var(--fx-ink-3)" }}
        >
          {cipher}
        </span>
        <span className="fx-lbl" style={{ flexShrink: 0 }}>
          {shielded ? "MODE / SHIELDED" : "MODE / PUBLIC"}
        </span>
      </footer>
    </div>
  );
}
