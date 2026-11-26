const icons: Record<string, string> = {
  zap: '⚡',
  droplets: '🔧',
  wrench: '🛠',
  thermometer: '❄️',
  paintbrush: '🎨',
  hammer: '🔨',
  scissors: '✂️',
  truck: '🚚',
  home: '🏠',
  sparkles: '✨',
}

export function CategoryIcon({ name, label, className }: { name: string | null; label?: string; className?: string }) {
  return (
    <span className={className} role="img" aria-label={label ?? name ?? 'категорія'}>
      {name ? icons[name] ?? '📋' : '📋'}
    </span>
  )
}
