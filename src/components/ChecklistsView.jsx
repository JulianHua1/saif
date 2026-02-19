import { useMemo, useState } from "react";

const SECTIONS = [
  {
    category: "morning",
    label: "Morning",
    title: "Specific for the Morning",
    resetHint: "Daily sections reset automatically each day."
  },
  {
    category: "daily",
    label: "Day",
    title: "Achievements During the Day",
    resetHint: "Daily sections reset automatically each day."
  },
  {
    category: "evening",
    label: "Evening",
    title: "Specific for the Evening",
    resetHint: "Daily sections reset automatically each day."
  },
  {
    category: "weekly",
    label: "Weekly",
    title: "Weekly Achievements",
    resetHint: "Weekly section resets automatically each week."
  }
];

function doneCount(items) {
  return items.filter((item) => item.done).length;
}

export function ChecklistsView({ checklists, onToggleItem }) {
  const [activeCategory, setActiveCategory] = useState("morning");

  const activeItems = checklists[activeCategory] || [];
  const activeMeta = SECTIONS.find((section) => section.category === activeCategory) || SECTIONS[0];
  const activeDone = doneCount(activeItems);
  const activeProgress = activeItems.length > 0 ? (activeDone / activeItems.length) * 100 : 0;

  const sectionStats = useMemo(
    () =>
      SECTIONS.map((section) => {
        const items = checklists[section.category] || [];
        return {
          category: section.category,
          done: doneCount(items),
          total: items.length
        };
      }),
    [checklists]
  );

  return (
    <>
      <div className="bg-white rounded-2xl border border-[#e6e2d6] shadow-sm p-1.5 grid grid-cols-4 gap-1.5">
        {SECTIONS.map((section) => {
          const stat = sectionStats.find((entry) => entry.category === section.category);
          const isActive = section.category === activeCategory;

          return (
            <button
              key={section.category}
              type="button"
              onClick={() => setActiveCategory(section.category)}
              className={
                isActive
                  ? "flex flex-col items-center justify-center py-3 px-2 bg-[#eaf4f2] rounded-xl text-[#143d34] transition-all border border-[#d1e0dd] shadow-sm"
                  : "flex flex-col items-center justify-center py-3 px-2 hover:bg-stone-50 text-stone-500 hover:text-[#143d34] rounded-xl transition-all"
              }
            >
              <span className={isActive ? "text-sm font-semibold tracking-tight" : "text-sm font-medium tracking-tight"}>{section.label}</span>
              <span className={isActive ? "text-[10px] font-medium opacity-60 mt-0.5" : "text-[10px] font-medium opacity-40 mt-0.5"}>
                {stat?.done || 0}/{stat?.total || 0}
              </span>
            </button>
          );
        })}
      </div>

      <div className="bg-white rounded-2xl border border-[#e6e2d6] shadow-sm overflow-hidden flex flex-col">
        <div className="px-6 pt-6 pb-2">
          <h3 className="text-lg font-normal text-[#143d34] serif-font mb-1">{activeMeta.title}</h3>

          <div className="w-full bg-stone-100 h-1 rounded-full mt-3 mb-2 relative overflow-visible">
            <div className="h-1 rounded-full bg-emerald-500" style={{ width: `${activeProgress}%` }} />
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-2 h-2 bg-emerald-600 rounded-full shadow-sm ring-2 ring-white" />
          </div>
          <p className="text-[10px] font-medium text-stone-400">
            {activeDone} of {activeItems.length} completed
          </p>
        </div>

        <div className="p-4 space-y-1.5">
          {activeItems.map((item) => (
            <label
              key={item.id}
              className="flex items-center gap-4 px-4 py-3.5 rounded-xl bg-stone-50/40 border border-transparent hover:bg-stone-50 hover:border-[#e6e2d6] transition-all cursor-pointer group"
            >
              <div className="relative flex-shrink-0">
                <input
                  type="checkbox"
                  className="peer sr-only"
                  checked={item.done}
                  onChange={() => onToggleItem(activeCategory, item.id)}
                />
                <div className="w-5 h-5 rounded-full border border-stone-300 bg-white group-hover:border-emerald-500 transition-colors peer-checked:bg-emerald-600 peer-checked:border-emerald-600" />
              </div>
              <span className="text-sm text-stone-600 font-medium group-hover:text-[#143d34] transition-colors select-none">{item.title}</span>
            </label>
          ))}
        </div>

        <div className="px-6 py-4 border-t border-[#f0ebe0] bg-[#faf9f6]">
          <p className="text-[10px] text-stone-400 font-medium tracking-wide">{activeMeta.resetHint}</p>
        </div>
      </div>

      <div className="h-4" />
    </>
  );
}
