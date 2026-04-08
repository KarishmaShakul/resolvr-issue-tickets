import { supabase } from "@/integrations/supabase/client";

export interface ClassifyResult {
  category: string;
  category_confidence: number;
  priority: string;
  priority_confidence: number;
  reasoning: string;
}

export interface DuplicateResult {
  duplicates: {
    id: string;
    title: string;
    similarity: number;
    reason: string;
  }[];
}

export interface SolutionResult {
  solutions: {
    title: string;
    description: string;
    confidence: number;
  }[];
}

async function callAiFunction<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke("ai-ticket", {
    body,
  });
  if (error) throw new Error(error.message ?? "AI service error");
  if (data?.error) throw new Error(data.error);
  return data as T;
}

export async function classifyTicket(
  title: string,
  description: string,
): Promise<ClassifyResult> {
  return callAiFunction<ClassifyResult>({
    action: "classify",
    title,
    description,
  });
}

export async function detectDuplicates(
  title: string,
  description: string,
  existingTickets: { id: string; title: string; status: string }[],
): Promise<DuplicateResult> {
  return callAiFunction<DuplicateResult>({
    action: "duplicates",
    title,
    description,
    existingTickets,
  });
}

export async function suggestSolutions(
  title: string,
  description: string,
  ticketCategory?: string,
): Promise<SolutionResult> {
  return callAiFunction<SolutionResult>({
    action: "solutions",
    title,
    description,
    ticketCategory,
  });
}
