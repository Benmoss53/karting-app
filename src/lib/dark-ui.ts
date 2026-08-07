// Shared Tailwind class fragments for the dark/red dashboard theme (forms,
// cards, buttons, banners) so every page under /dashboard stays visually
// consistent instead of each one inventing its own palette.

export const cardClass = "rounded-2xl border border-neutral-800 bg-neutral-900 p-6 shadow-sm";

export const inputClass =
  "w-full rounded-lg border border-neutral-700 bg-neutral-800/80 px-3 py-2.5 text-sm text-white placeholder:text-neutral-500 shadow-sm transition-colors focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500";

export const labelClass = "mb-1.5 block text-sm font-medium text-neutral-300";

export const primaryButtonClass =
  "inline-flex items-center justify-center rounded-lg bg-red-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:scale-[1.02] hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-neutral-900 active:scale-[0.98] disabled:opacity-50 disabled:hover:scale-100";

export const secondaryButtonClass =
  "inline-flex items-center justify-center rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-1.5 text-xs font-semibold text-neutral-300 transition-colors hover:border-red-500/50 hover:bg-red-600/10 hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-40";

export const errorBannerClass =
  "rounded-lg bg-red-950/40 px-3 py-2 text-sm text-red-300 ring-1 ring-inset ring-red-900";

export const infoBannerClass =
  "rounded-lg bg-neutral-800/80 px-3 py-2 text-sm text-neutral-300 ring-1 ring-inset ring-neutral-700";

export const backLinkClass =
  "mb-4 inline-block text-sm font-medium text-neutral-400 transition-colors hover:text-neutral-200";

export const pillClass =
  "inline-flex rounded-full bg-neutral-800 px-2 py-0.5 text-xs font-medium text-neutral-300 ring-1 ring-inset ring-neutral-700";
