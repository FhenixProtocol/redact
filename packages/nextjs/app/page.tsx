import RedactLanding from "./RedactLanding";
import type { NextPage } from "next";

// The Redact app is switched off; "/" serves the sunset landing page.
const Home: NextPage = () => {
  return <RedactLanding />;
};

export default Home;
