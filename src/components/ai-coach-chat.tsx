"use client";

import { useState, type FormEvent } from "react";
import { askAiCoach } from "@/app/dashboard/actions";

type Message = { role: "user" | "assistant"; text: string };

export default function AiCoachChat({ entryCount }: { entryCount: number }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const question = input.trim();
    if (!question || pending) return;

    setMessages((prev) => [...prev, { role: "user", text: question }]);
    setInput("");
    setPending(true);

    try {
      const answer = await askAiCoach(question);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: answer || "No response from the AI coach." },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: "Something went wrong asking the AI coach. Try again." },
      ]);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="rounded-2xl border border-neutral-800 bg-gradient-to-b from-red-950/20 to-neutral-900 p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-600">
          <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5 text-white" aria-hidden>
            <path d="M12 2l1.8 5.6L19 9l-5.2 1.4L12 16l-1.8-5.6L5 9l5.2-1.4L12 2z" />
          </svg>
        </span>
        <div>
          <p className="text-sm font-semibold tracking-wide text-white">AI ASSISTANT</p>
          <p className="text-xs text-neutral-500">Your karting co-pilot</p>
        </div>
      </div>

      <div className="mb-4 flex min-h-[100px] flex-col gap-3">
        {messages.length === 0 ? (
          <p className="text-sm text-neutral-400">
            {entryCount > 0
              ? `You have feedback logged for ${entryCount} ${
                  entryCount === 1 ? "day" : "days"
                }. Ask a question below.`
              : "No setup feedback logged yet. Ask a question below."}
          </p>
        ) : (
          messages.map((message, index) => (
            <div
              key={index}
              className={`max-w-[85%] animate-[fadeIn_0.2s_ease-out] rounded-xl px-4 py-3 text-sm leading-relaxed ${
                message.role === "user"
                  ? "self-end bg-red-600 text-white shadow-sm"
                  : "self-start bg-neutral-800 text-neutral-100"
              }`}
            >
              {message.text}
            </div>
          ))
        )}
        {pending && (
          <div className="self-start rounded-xl bg-neutral-800 px-4 py-3 text-sm text-neutral-400">
            Thinking…
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <input
          type="text"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Ask anything…"
          disabled={pending}
          className="flex-1 rounded-full border border-neutral-700 bg-neutral-800/80 px-4 py-3 text-sm text-white placeholder:text-neutral-500 shadow-sm transition-colors focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500 disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={pending}
          aria-label="Ask the coach"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-red-600 text-white shadow-sm transition-all duration-200 hover:scale-[1.05] hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-neutral-900 active:scale-[0.95] disabled:opacity-60 disabled:hover:scale-100"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden>
            <path d="M22 2L11 13" />
            <path d="M22 2l-7 20-4-9-9-4 20-7z" />
          </svg>
        </button>
      </form>
      <p className="mt-2 text-center text-[11px] text-neutral-600">
        AI can make mistakes. Verify important info.
      </p>
    </div>
  );
}
