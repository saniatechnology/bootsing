const LEGEND_ITEMS = [
  { icon: "\u{1F534}", label: "Last chance" },
  { icon: "⭐", label: "One-off / rare" },
  { icon: "\u{1F389}", label: "Season finale" },
] as const;

export function Legend() {
  return (
    <div className="legend">
      <div className="legend-group">
        {LEGEND_ITEMS.map((item) => (
          <div className="legend-item" key={item.label}>
            {item.icon} {item.label}
          </div>
        ))}
      </div>
    </div>
  );
}
