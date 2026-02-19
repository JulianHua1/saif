import { useMemo, useState } from "react";

export function QuotesView({ featuredQuote, quotes, favoriteQuoteIds, onToggleFavorite }) {
  const themes = useMemo(() => ["All", ...new Set(quotes.map((quote) => quote.theme))], [quotes]);
  const [themeFilter, setThemeFilter] = useState("All");

  const visibleQuotes = useMemo(() => {
    if (themeFilter === "All") return quotes;
    return quotes.filter((quote) => quote.theme === themeFilter);
  }, [quotes, themeFilter]);

  return (
    <div className="stacked-layout">
      <article className="card">
        <div className="card-header">
          <h3>Daily Rotating Motivational Quote</h3>
          <span>{featuredQuote?.theme || "Theme"}</span>
        </div>
        <p className="quote-text">{featuredQuote?.text || "Keep your heart attached to Quran and Salah."}</p>
      </article>

      <article className="card">
        <div className="card-header">
          <h3>Quote Library</h3>
          <select value={themeFilter} onChange={(event) => setThemeFilter(event.target.value)}>
            {themes.map((theme) => (
              <option key={theme} value={theme}>
                {theme}
              </option>
            ))}
          </select>
        </div>

        <ul className="quote-list">
          {visibleQuotes.map((quote) => {
            const favorite = favoriteQuoteIds.includes(quote.id);
            return (
              <li key={quote.id} className="quote-item">
                <p className="note-intention">{quote.theme}</p>
                <p>{quote.text}</p>
                <button type="button" className={favorite ? "accent" : ""} onClick={() => onToggleFavorite(quote.id)}>
                  {favorite ? "Favorited" : "Save Favorite"}
                </button>
              </li>
            );
          })}
        </ul>
      </article>
    </div>
  );
}
