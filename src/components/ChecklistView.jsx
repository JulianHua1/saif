import { useState } from "react";

const CATEGORIES = [
  { key: "daily", label: "Daily Checklist" },
  { key: "weekly", label: "Weekly Checklist" }
];

export function ChecklistView({ checklists, onToggleItem, onDeleteItem, onAddItem }) {
  const [drafts, setDrafts] = useState({ daily: "", weekly: "" });

  const setDraft = (category, value) => {
    setDrafts((current) => ({ ...current, [category]: value }));
  };

  const submit = (event, category) => {
    event.preventDefault();
    onAddItem(category, drafts[category]);
    setDraft(category, "");
  };

  return (
    <div className="checklist-grid">
      {CATEGORIES.map((category) => {
        const items = checklists[category.key] || [];
        const doneCount = items.filter((item) => item.done).length;

        return (
          <article key={category.key} className="card">
            <div className="card-header">
              <h3>{category.label}</h3>
              <span>
                {doneCount}/{items.length}
              </span>
            </div>

            <ul className="task-list">
              {items.map((item) => (
                <li key={item.id}>
                  <label>
                    <input
                      type="checkbox"
                      checked={item.done}
                      onChange={() => onToggleItem(category.key, item.id)}
                    />
                    <span className={item.done ? "done" : ""}>{item.title}</span>
                  </label>
                  <button type="button" className="icon-btn" onClick={() => onDeleteItem(category.key, item.id)}>
                    Remove
                  </button>
                </li>
              ))}
            </ul>

            <form onSubmit={(event) => submit(event, category.key)} className="add-row">
              <input
                type="text"
                placeholder="Add an item"
                value={drafts[category.key]}
                onChange={(event) => setDraft(category.key, event.target.value)}
              />
              <button type="submit">Add</button>
            </form>
          </article>
        );
      })}
    </div>
  );
}
