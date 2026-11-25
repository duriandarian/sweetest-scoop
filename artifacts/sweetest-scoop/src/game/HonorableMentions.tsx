import type { HonorableMention } from '@workspace/api-client-react';
import { Clock3, Sparkles, Zap } from 'lucide-react';
import { BobiAvatar } from './BobiAvatar';
import './honorable-mentions.css';

const awards = {
  fastest: { title: 'Fastest Reply', icon: Zap, accent: 'mango' },
  'just-in-time': { title: 'Just in Time', icon: Clock3, accent: 'pomelo' },
  'rare-finds': { title: 'Rare Find Collector', icon: Sparkles, accent: 'matcha' },
} as const;

export function HonorableMentions({ mentions }: { mentions: HonorableMention[] }) {
  return <aside className="g-card final-mentions" aria-labelledby="mentions-title" data-testid="section-honorable-mentions">
    <div>
      <h2 id="mentions-title">Honorable mentions</h2>
      <p className="g-sub">A few highlights from the whole game.</p>
    </div>
    <ul className="mention-list">
      {mentions.map(mention => {
        const { title, icon: Icon, accent } = awards[mention.category];
        const value = mention.category === 'rare-finds'
          ? `${mention.value} rare ${mention.value === 1 ? 'find' : 'finds'}`
          : `${(mention.value / 1000).toFixed(2)}s`;
        return <li className={`mention-ticket tone-${accent}`} key={mention.category} data-testid={`award-${mention.category}`}>
          <BobiAvatar avatar={mention.avatar} size={47}/>
          <div className="mention-winner">
            <h3><Icon size={14} aria-hidden="true"/>{title}</h3>
            <strong>{mention.displayName}</strong>
            <span>{value}</span>
          </div>
        </li>;
      })}
    </ul>
  </aside>;
}
