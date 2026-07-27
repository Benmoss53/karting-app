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
    <div className="rounded-2xl border border-blue-100 bg-white p-6 shadow-sm sm:p-8">
      <div className="mb-5 flex min-h-[100px] flex-col gap-3">
        {messages.length === 0 ? (
          <p className="text-base text-slate-500">
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
              className={`max-w-[85%] animate-[fadeIn_0.2s_ease-out] rounded-xl px-4 py-3 text-base leading-relaxed ${
                message.role === "user"
                  ? "self-end bg-blue-600 text-white shadow-sm"
                  : "self-start bg-slate-100 text-slate-900 ring-1 ring-inset ring-slate-200"
              }`}
            >
              {message.text}
            </div>
          ))
        )}
        {pending && (
          <div className="self-start rounded-xl bg-slate-100 px-4 py-3 text-base text-slate-500 ring-1 ring-inset ring-slate-200">
            Thinking…
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row">
        <input
          type="text"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="e.g. Should I add more camber for a wet track?"
          disabled={pending}
          className="flex-1 rounded-xl border border-slate-300 bg-slate-50 px-4 py-3.5 text-base text-slate-900 shadow-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-6 py-3.5 text-base font-semibold text-white shadow-sm transition-all duration-200 hover:scale-[1.02] hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-white active:scale-[0.98] disabled:opacity-60 disabled:hover:scale-100"
        >
          {pending ? "Asking…" : "Ask the coach"}
        </button>
      </form>
    </div>
  );
}
