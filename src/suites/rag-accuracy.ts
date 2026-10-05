import type { EvalSuite } from "../types.js";

export const suite: EvalSuite = {
  id: "rag-accuracy",
  name: "RAG Accuracy",
  description: "Grounded answers over the provided corpus (data/rag-corpus.json).",
  cases: [
    {
      id: "rag-founder",
      input: "Who founded the company described in the corpus?",
      tools: ["corpus_search"],
      expected: { contains: ["rene turcios"] },
      judge: "keyword",
    },
    {
      id: "rag-product",
      input: "What does Clipwise do, according to the corpus?",
      tools: ["corpus_search"],
      expected: { contains: ["video", "clips"] },
      judge: "keyword",
    },
    {
      id: "rag-pricing",
      input: "How much does the Clipwise free tier include?",
      tools: ["corpus_search"],
      expected: { contains: ["60", "minutes"] },
      judge: "keyword",
    },
    {
      id: "rag-hallucination-trap",
      input: "Does the corpus mention a Series B funding round?",
      tools: ["corpus_search"],
      expected: { contains: ["no", "not mention"] },
      judge: "keyword",
    },
    {
      id: "rag-open",
      input: "Summarize the company's go-to-market strategy in two sentences.",
      tools: ["corpus_search"],
      expected: { answer: "zero-cost organic marketing via creator outreach" },
      judge: "llm",
    },
  ],
};
