export const QUOTES = [
  {
    id: "sabr-1",
    theme: "Patience (Sabr)",
    text: "Allah is with those who are patient. Build your day with steady worship, even if small."
  },
  {
    id: "sabr-2",
    theme: "Patience (Sabr)",
    text: "Discomfort in discipline today can become light and ease in your akhirah."
  },
  {
    id: "shukr-1",
    theme: "Gratitude (Shukr)",
    text: "Thank Allah for the ability to pray, read, and repent. Gratitude multiplies barakah."
  },
  {
    id: "shukr-2",
    theme: "Gratitude (Shukr)",
    text: "A grateful heart sees every prayer time as a gift, not an interruption."
  },
  {
    id: "discipline-1",
    theme: "Discipline",
    text: "Consistency beats intensity. One sincere page daily can transform a year."
  },
  {
    id: "discipline-2",
    theme: "Discipline",
    text: "Set your worship blocks before your day sets your priorities for you."
  },
  {
    id: "teaching-1",
    theme: "Teaching as service",
    text: "Teaching with mercy is da'wah in action. Your calm conduct is part of the lesson."
  },
  {
    id: "teaching-2",
    theme: "Teaching as service",
    text: "Every sincere reminder to others should begin with a reminder to yourself."
  },
  {
    id: "ramadan-1",
    theme: "Virtues of Ramadan",
    text: "Ramadan is a school of taqwa: guard your eyes, tongue, and heart before your stomach."
  },
  {
    id: "ramadan-2",
    theme: "Virtues of Ramadan",
    text: "Make your private deeds stronger than your public ones, especially in Ramadan."
  },
  {
    id: "ramadan-3",
    theme: "Virtues of Ramadan",
    text: "A small deed done only for Allah can outweigh large deeds done for attention."
  }
];

export function quoteOfTheDay(dayKey) {
  const key = String(dayKey || "");
  if (!key || QUOTES.length === 0) return null;

  const hash = key.split("").reduce((sum, character) => sum + character.charCodeAt(0), 0);
  return QUOTES[hash % QUOTES.length];
}

export function normalizeFavoriteQuoteIds(input) {
  if (!Array.isArray(input)) return [];
  const validIds = new Set(QUOTES.map((quote) => quote.id));
  return [...new Set(input.filter((id) => typeof id === "string" && validIds.has(id)))];
}
