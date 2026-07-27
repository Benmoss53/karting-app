"use client";

import { useState, type FormEvent } from "react";
import { askAiCoach } from "@/app/dashboard/sessions/[id]/actions";

type Message = { role: "user" | "assistant"; text: string };

export default function AiCoachChat({
  sessionId,
  entryCount,
}: {
  sessionId: string;
  entryCount: number;
}) {
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
      const answer = await askAiCoach(sessionId, question);
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
    <div className="rounded-xl border border-white/10 bg-zinc-900/60 p-5 shadow-lg shadow-black/20 backdrop-blur-sm">
      <div className="mb-4 flex flex-col gap-3">
        {messages.length === 0 ? (
          <p className="text-sm text-zinc-500">
            {entryCount > 0
              ? `You have ${entryCount} Testing Setups ${
                  entryCount === 1 ? "entry" : "entries"
                } logged for this day. Ask a question below.`
              : "No Testing Setups entries logged for this day yet. Ask a question below."}
          </p>
        ) : (
          messages.map((message, index) => (
            <div
              key={index}
              className={`max-w-[85%] animate-[fadeIn_0.2s_ease-out] rounded-lg px-3 py-2 text-sm ${
                message.role === "user"
                  ? "self-end bg-blue-600 text-white shadow-[0_0_16px_-6px_rgba(37,99,235,0.8)]"
                  : "self-start bg-white/5 text-zinc-200 ring-1 ring-inset ring-white/10"
              }`}
            >
              {message.text}
            </div>
          ))
        )}
        {pending && (
          <div className="self-start rounded-lg bg-white/5 px-3 py-2 text-sm text-zinc-500 ring-1 ring-inset ring-white/10">
            Thinking…
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="e.g. Should I add more camber for a wet track?"
          disabled={pending}
          className="flex-1 rounded-lg border border-white/10 bg-zinc-950/60 px-3 py-2.5 text-sm text-zinc-100 shadow-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_0_20px_-6px_rgba(37,99,235,0.7)] transition-all duration-200 hover:scale-[1.03] hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-zinc-900 active:scale-[0.97] disabled:opacity-60 disabled:hover:scale-100"
        >
          {pending ? "Asking…" : "Ask"}
        </button>
      </form>
    </div>
  );
}
