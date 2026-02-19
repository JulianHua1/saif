import { useMemo, useState } from "react";

const THEME_OPTIONS = ["All themes", "Patience (Sabr)", "Gratitude (Shukr)", "Ramadan Virtues"];

const QUOTE_CARDS = [
  {
    id: "sabr-1",
    theme: "Patience (Sabr)",
    text: '"Seek help through patience and prayer. Indeed, Allah is with the patient."',
    source: "Qur'an 2:153"
  },
  {
    id: "shukr-1",
    theme: "Gratitude (Shukr)",
    text: '"If you are grateful, I will surely increase you [in favor]."',
    source: "Qur'an 14:7"
  },
  {
    id: "discipline-1",
    theme: "Discipline",
    text: '"Fasting is a shield with which a servant protects himself from the Fire."',
    source: "Musnad Ahmad",
    defaultFavorite: true
  },
  {
    id: "ramadan-1",
    theme: "Charity",
    text: '"The best charity is that given in Ramadan."',
    source: "Tirmidhi"
  },
  {
    id: "ramadan-2",
    theme: "Reflection",
    text: '"Indeed, in the remembrance of Allah do hearts find rest."',
    source: "Qur'an 13:28"
  },
  {
    id: "sabr-2",
    theme: "Patience (Sabr)",
    text: '"So be patient with gracious patience."',
    source: "Qur'an 70:5"
  }
];

function matchesTheme(card, selectedTheme) {
  if (selectedTheme === "All themes") return true;
  if (selectedTheme === "Ramadan Virtues") {
    return card.theme === "Discipline" || card.theme === "Charity" || card.theme === "Reflection";
  }
  return card.theme === selectedTheme;
}

export function QuotesView({ favoriteQuoteIds = [], onToggleFavorite }) {
  const [themeFilter, setThemeFilter] = useState("All themes");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const hasExplicitFavorites = favoriteQuoteIds.length > 0;

  const visibleCards = useMemo(
    () =>
      QUOTE_CARDS.filter((card) => {
        const favorite = favoriteQuoteIds.includes(card.id) || (!hasExplicitFavorites && card.defaultFavorite);
        if (!matchesTheme(card, themeFilter)) return false;
        if (favoritesOnly && !favorite) return false;
        return true;
      }),
    [themeFilter, favoritesOnly, favoriteQuoteIds, hasExplicitFavorites]
  );

  return (
    <>
      <div className="bg-white rounded-xl border border-[#e6e2d6] shadow-sm px-4 py-3 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-6">
          <div className="relative">
            <select
              value={themeFilter}
              onChange={(event) => setThemeFilter(event.target.value)}
              className="pl-3 pr-8 py-1.5 bg-stone-50 border border-stone-200 rounded-lg text-xs font-medium text-stone-600 focus:outline-none focus:ring-1 focus:ring-[#143d34] focus:border-[#143d34] cursor-pointer hover:bg-stone-100 transition-colors appearance-none bg-no-repeat bg-[position:right_0.5rem_center] bg-[length:1em]"
              style={{
                backgroundImage:
                  "url(\"data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2357534e' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e\")"
              }}
            >
              {THEME_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          <label className="flex items-center gap-2 cursor-pointer group select-none">
            <div className="relative flex items-center">
              <input
                type="checkbox"
                className="peer sr-only"
                checked={favoritesOnly}
                onChange={(event) => setFavoritesOnly(event.target.checked)}
              />
              <div className="w-4 h-4 rounded border border-stone-300 bg-white group-hover:border-emerald-500 transition-all peer-checked:bg-[#143d34] peer-checked:border-[#143d34] flex items-center justify-center">
                <iconify-icon
                  icon="solar:check-read-linear"
                  className="text-white opacity-0 peer-checked:opacity-100 transform scale-75"
                  width="12"
                />
              </div>
            </div>
            <span className="text-xs font-medium text-stone-500 group-hover:text-stone-700 transition-colors">Favorites only</span>
          </label>
        </div>

        <div className="flex items-center">
          <span className="text-xs font-medium text-stone-400">15 quotes</span>
        </div>
      </div>

      <div className="w-full bg-white rounded-2xl border border-[#e6e2d6] shadow-sm p-8 relative overflow-hidden group">
        <div className="absolute -top-10 -right-10 text-stone-50 opacity-50 group-hover:scale-110 transition-transform duration-700 ease-out">
          <iconify-icon icon="solar:quote-up-square-bold" width="200" />
        </div>

        <div className="relative z-10 flex flex-col h-full min-h-[220px] justify-between">
          <span className="text-[10px] uppercase tracking-widest font-semibold text-stone-400">Featured</span>

          <h3 className="text-3xl md:text-4xl leading-tight text-[#143d34] serif-font max-w-4xl mt-4 mb-8">
            "In Ramadan, the gates of mercy are opened, and the gates of Hell are locked and the devils are chained."
          </h3>

          <div className="flex items-end justify-between border-t border-stone-100 pt-4 mt-auto">
            <span className="text-xs font-medium text-stone-500">Sahih Muslim</span>
            <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-1 rounded tracking-wide uppercase">
              Virtues of Ramadan
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {visibleCards.map((card) => {
          const favorite = favoriteQuoteIds.includes(card.id) || (!hasExplicitFavorites && card.defaultFavorite);
          return (
            <div
              key={card.id}
              className="bg-white rounded-xl border border-[#e6e2d6] shadow-sm hover:shadow-md transition-all duration-300 p-6 flex flex-col justify-between min-h-[200px] group"
            >
              <div className="flex justify-between items-start mb-4">
                <span className="text-[10px] font-semibold tracking-wide text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded uppercase">
                  {card.theme}
                </span>
                <button
                  type="button"
                  onClick={() => onToggleFavorite?.(card.id)}
                  className={
                    favorite
                      ? "text-[#d4af37] transition-colors focus:outline-none border-0 bg-transparent p-0"
                      : "text-stone-300 hover:text-[#d4af37] transition-colors focus:outline-none border-0 bg-transparent p-0"
                  }
                  aria-label={favorite ? "Unfavorite quote" : "Favorite quote"}
                >
                  <iconify-icon icon={favorite ? "solar:heart-bold" : "solar:heart-linear"} width="18" />
                </button>
              </div>
              <p className="text-lg text-[#143d34] serif-font leading-relaxed mb-6">{card.text}</p>
              <div className="pt-4 border-t border-stone-50">
                <span className="text-[10px] font-medium text-stone-400">{card.source}</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="h-8" />
    </>
  );
}
