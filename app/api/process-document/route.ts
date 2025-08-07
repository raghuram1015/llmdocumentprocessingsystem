import { generateText } from "ai";
import { xai } from "@ai-sdk/xai";
import { NextResponse } from "next/server";

const systemPrompt = `You are a powerful Document Reasoning Engine designed to answer natural language insurance-related queries using clause-based reasoning from unstructured documents (PDFs, Word files, emails). You support customers, agents, and auditors in evaluating coverage decisions, claim eligibility, or policy interpretation.

You must:

1. Parse and extract structured data from the input query
Identify key fields from natural language queries such as:
- Age
- Gender
- Medical procedure
- Location
- Insurance provider
- Policy duration
- Any constraints (e.g., co-payment, exclusions, pre-existing conditions)

2. Perform semantic document search
Search across multiple documents using vector embeddings (via Sentence-BERT).
Match meaning, not just keywords (e.g., "knee surgery" ≈ "orthopedic procedure").

3. Conduct clause-level reasoning
Retrieve relevant clauses.
Interpret conditions, exclusions, time-bound limitations.
Resolve conflicts between documents or clauses.
Apply logic (e.g., waiting period, location-based exclusions, claim timelines).

4. Generate an output with full transparency
Return a structured JSON containing:
{
  "Decision": "Approved | Rejected | Needs Clarification",
  "Amount": "<Payout amount or limit, if any>",
  "Justification": "<Summary of reasoning>",
  "Clause_References": [
    {
      "Document": "<Filename or policy number>",
      "Clause_Snippet": "<Exact clause used>",
      "Page": "<Page number or approximate location>",
      "Matched_Concept": "<E.g., waiting period, covered treatment>"
    }
  ],
  "Confidence": "<0 to 1 score based on clause match strength>"
}

If input query is incomplete, respond with:
{
  "Decision": "Needs Clarification",
  "Missing": ["Policy Provider", "Exact Procedure Name"],
  "Suggested_Follow_up": "Please confirm if it's Bajaj Allianz or HDFC Ergo. Also specify if it's arthroscopic or open knee surgery."
}

Always return valid JSON format. Be thorough in your analysis and provide specific clause references when possible.`;

export async function POST(req: Request) {
  try {
    const { query, documents } = await req.json();

    if (!query || !documents) {
      return NextResponse.json(
        { error: "Query and documents are required" },
        { status: 400 }
      );
    }

    const prompt = `
User Query: ${query}

Available Documents:
${documents}

Please analyze the query against the provided documents and return a structured JSON response following the specified format. Focus on insurance policy analysis, coverage decisions, and clause-based reasoning.
`;

    const { text } = await generateText({
      model: xai("grok-3"),
      system: systemPrompt,
      prompt,
      maxTokens: 2000,
    });

    return NextResponse.json({ text });
  } catch (error) {
    console.error("Error processing document:", error);
    return NextResponse.json(
      { error: "Failed to process document. Please try again." },
      { status: 500 }
    );
  }
}
