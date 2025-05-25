"use client";

import { ArrowBack } from "@mui/icons-material";
import { Button } from "~~/components/ui/Button";
import { FAQAccordion } from "~~/components/ui/FAQAccordion";
import { useGlobalState } from "~~/services/store/store";

export default function FAQPage() {
  const setFAQOpen = useGlobalState(state => state.setFAQOpen);
  return (
    <div className="flex flex-col md:flex-row gap-8 md:gap-20 md:p-8">
      <div className="flex flex-col gap-4 w-full">
        <h1 className="text-primary-accent text-5xl font-bold">F.A.Q</h1>
        <FAQAccordion />
        <Button
          size="md"
          iconSize="lg"
          variant="surface"
          className="w-full"
          icon={ArrowBack}
          onClick={() => setFAQOpen(false)}
        >
          Back
        </Button>
      </div>
    </div>
  );
}
