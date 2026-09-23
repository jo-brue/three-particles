export default function PanelHeader({ title, collapsed, onToggle }: { title: string; collapsed: boolean; onToggle: () => void }) {
  return (
    <button type="button" className="stack-panel-header" onClick={onToggle}>
      <span className={`stack-panel-chevron${collapsed ? ' collapsed' : ''}`}>▾</span>
      <span className="stack-panel-title">{title}</span>
    </button>
  );
}
