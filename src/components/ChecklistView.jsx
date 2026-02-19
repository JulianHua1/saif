import { useState } from "react";

export function ChecklistView({ title, description, items, onToggleItem, onDeleteItem, onAddItem }) {
  const [draft, setDraft] = useState("");

  const submit = (event) => {
    event.preventDefault();
    onAddItem(draft);
    setDraft("");
  };

  const doneCount = items.filter((item) => item.done).length;

  return (
    <article className="card checklist-page">
      <div className="card-header">
        <h3>{title}</h3>
        <span>
          {doneCount}/{items.length}
        </span>
      </div>

      {description ? <p className="muted">{description}</p> : null}

      <ul className="task-list">
        {items.map((item) => (
          <li key={item.id}>
            <label>
              <input type="checkbox" checked={item.done} onChange={() => onToggleItem(item.id)} />
              <span className={item.done ? "done" : ""}>{item.title}</span>
            </label>
            <button type="button" className="icon-btn" onClick={() => onDeleteItem(item.id)}>
              Remove
            </button>
          </li>
        ))}
      </ul>

      <form onSubmit={submit} className="add-row">
        <input type="text" placeholder="Add an item" value={draft} onChange={(event) => setDraft(event.target.value)} />
        <button type="submit">Add</button>
      </form>
    </article>
  );
}
