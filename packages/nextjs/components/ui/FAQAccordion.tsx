import React, { useEffect, useState } from "react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "./Accordion";
import { Plus } from "lucide-react";

export function FAQAccordion() {
  const [faqs, setFaqs] = useState<{ question: string; answer: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // TODO: Move to S3 if needed
    fetch("/faq.json")
      .then(res => {
        if (!res.ok) throw new Error("Failed to fetch FAQ");
        return res.json();
      })
      .then(setFaqs)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div>Loading FAQ...</div>;
  if (error) return <div className="text-red-500">Error: {error}</div>;

  return (
    <div className="w-full flex flex-col items-center min-w-0 overflow-x-hidden">
      <Accordion
        type="single"
        collapsible
        className="w-full sm:w-[750px] flex-shrink-0 mx-auto rounded-2xl border border-blue-200 bg-background p-4"
      >
        {faqs.map((faq, idx) => (
          <AccordionItem key={idx} value={String(idx)}>
            <AccordionTrigger
              iconPosition="left"
              className="text-primary text-base font-semibold"
              icon={<Plus />}
              iconRotate="rotate-45"
            >
              {faq.question}
            </AccordionTrigger>
            <AccordionContent className="text-primary text-sm w-full min-w-0 pl-8">
              <div className="w-full min-w-0 break-words overflow-x-hidden">{faq.answer}</div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}
