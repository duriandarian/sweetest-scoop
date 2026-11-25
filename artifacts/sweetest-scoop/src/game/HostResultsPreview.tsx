import { Link, useLocation, useSearch } from 'wouter';
import { ArrowLeft } from 'lucide-react';
import { Finished, Revealed } from './Round';
import { questionPreviewState } from './question-preview-state';
import { GAME_TITLE, PRIZES, type Room } from './theme';
import { useMusicScene } from './MusicProvider';
import './question-preview.css';

// Deliberately illustrative data, not a copy of the party's prepared answer bank.
const sampleAnswers = [
  ['Mini mochi', 'Toasted coconut'],
  ['Mango cubes', 'Strawberry pieces'],
  ['Pomelo jewels', 'Lychee jelly'],
  ['Osmanthus jelly', 'Taro pudding'],
  ['Brown-sugar brûlée', 'Golden sesame crunch'],
] as const;
const guests = [
  { playerId: 'sample-1', displayName: 'Mango fan', avatar: 'b1:0:2:1:1', depth: 4, speedBonus: 18, elapsedMs: 2500 },
  { playerId: 'sample-2', displayName: 'Pomelo pal', avatar: 'b1:1:4:2:2', depth: 3, speedBonus: 14, elapsedMs: 7500 },
  { playerId: 'sample-3', displayName: 'Sago scout', avatar: 'b1:3:1:3:3', depth: 2, speedBonus: 9, elapsedMs: 13750 },
  { playerId: 'sample-4', displayName: 'Mochi buddy', avatar: 'b1:6:11:9:12', depth: 0, speedBonus: 8, elapsedMs: 15000 },
  { playerId: 'sample-5', displayName: 'Berry baker', avatar: 'b1:11:21:23:13', depth: 1, speedBonus: 5, elapsedMs: 18750 },
];
const roundStandings = guests.map(guest => ({
  ...guest, answer: sampleAnswers[guest.depth][0], basePoints: PRIZES[guest.depth].base,
  points: PRIZES[guest.depth].base + guest.speedBonus, discoveries: 1,
}));
// Sample round three: the overall leader is deliberately not this round's winner.
const previousPoints = [102, 180, 90, 100, 64];
const standings = roundStandings.map((guest, i) => ({
  ...guest, points: guest.points + previousPoints[i], discoveries: 3,
}));

export const HOST_RESULTS_SAMPLE: Room = {
  ...questionPreviewState({ index: 0, host: true, answer: null, avatar: 'mango' }),
  phase: 'revealed',
  round: 3,
  currentQuestion: 'Name a dessert topping',
  submittedCount: guests.length,
  players: [
    { id: 'preview-host', displayName: 'Preview host', isHost: true, avatar: 'mango', hasAnswered: false },
    ...guests.map(guest => ({
      id: guest.playerId, displayName: guest.displayName, avatar: guest.avatar, isHost: false, hasAnswered: true,
    })),
  ],
  standings,
  roundStandings,
  possibleAnswers: sampleAnswers.flatMap((answers, depth) => answers.map((answer, index) => ({
    answer, tier: PRIZES[depth].name, depth, basePoints: PRIZES[depth].base,
    submitted: index === 0, submittedCount: index === 0 ? 1 : 0,
  }))),
};

export const HOST_FINAL_SAMPLE: Room = {
  ...HOST_RESULTS_SAMPLE,
  phase: 'finished',
  round: HOST_RESULTS_SAMPLE.questionCount,
  standings: standings.map((guest, index) => ({
    ...guest, points: guest.points + [291, 329, 278, 230, 190][index], discoveries: HOST_RESULTS_SAMPLE.questionCount,
  })),
  honorableMentions: [
    { ...guests[0], category: 'fastest', value: 1520 },
    { ...guests[2], category: 'just-in-time', value: 24730 },
    { ...guests[1], category: 'rare-finds', value: 5 },
  ],
};

/** Same results UI as a real host room, with explicitly labeled, unsaved sample data. */
export function HostResultsPreview() {
  const [, navigate] = useLocation();
  const final = new URLSearchParams(useSearch()).get('view') === 'final';
  useMusicScene('cafe');
  return <div className={`g-screen question-preview phase-${final ? 'finished' : 'revealed'}`}>
    <header className="g-bar">
      <span className="g-brand">{GAME_TITLE}</span>
      <Link href="/solo" className="g-link" data-testid="link-results-practice"><ArrowLeft size={14}/> Practice</Link>
    </header>
    <p className="qp-example" role="note" data-testid="note-sample-results">
      <b>Host results preview</b> · {final
        ? <>Five sample Bobis and honorable mentions. Nothing is saved. <Link href="/preview/results">View round results</Link></>
        : <>Five sample Bobis, scores and illustrative answers. Nothing is saved.
          {' '}“Next question” opens practice; in a real room, it starts the next multiplayer round.
          {' '}<Link href="/preview/results?view=final">View final podium</Link></>}
    </p>
    <main className="g-main">
      {final ? <Finished room={HOST_FINAL_SAMPLE}/>
        : <Revealed room={HOST_RESULTS_SAMPLE} avatar="mango" onNext={() => navigate('/solo')} nexting={false}/>}
    </main>
  </div>;
}
