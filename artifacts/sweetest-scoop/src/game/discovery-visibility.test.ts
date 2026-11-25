import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createElement, type ReactElement } from 'react';
import { renderToStaticMarkup as renderMarkup } from 'react-dom/server';
import { Router } from 'wouter';
import { Answering, Finished, Revealed } from './Round';
import { Podium } from './Results';
import { QuestionPreview } from './QuestionPreview';
import { HostResultsPreview, HOST_RESULTS_SAMPLE, HOST_FINAL_SAMPLE } from './HostResultsPreview';
import { Lobby } from './Lobby';
import { RoomSetup } from './Home';
import { RoomEntryField, RoomNameField } from './RoomEntryField';
import { roomCodeProblem, roomEntryFailure } from './room-entry';
import { PhotoMenu } from './PhotoMenu';
import { BobiAvatar } from './BobiAvatar';
import { previewPartyBobi } from './PartyBobiArt';
import { PRIZES } from './theme';
import { crowdPreviewState, hostLobbyPreviewState, questionPreviewState } from './question-preview-state';
import { roomPollingInterval } from './room-polling';
import { MusicProvider } from './MusicProvider';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { IngredientArt, INGREDIENT_KINDS, kindForDepth } from './IngredientArt';
import { openingLayout } from '../components/story/storyOpening';
import { BackArt, HatArt, OutfitArt } from './WardrobeArt';
import { WARDROBE_HATS, WARDROBE_OUTFITS } from './wardrobe';

const renderToStaticMarkup = (element: ReactElement) =>
  renderMarkup(createElement(QueryClientProvider, { client: new QueryClient() },
    createElement(MusicProvider, { children: element })));

const avatar = 'b1:0:2:1:1';

test('the floating photo menu preserves five personal photos, Bobi and both direct room choices', () => {
  const markup = renderToStaticMarkup(createElement(PhotoMenu, { onChoose: () => {} }));
  assert.match(markup, /<h1[^>]*>Here’s to Daniel &amp; Amy!<\/h1>.*The Daniel \+ Amy Menu/);
  assert.match(markup, /<h2>Ready to play\?<\/h2>/);
  assert.equal((markup.match(/data-testid="img-collage-/g) ?? []).length, 5);
  assert.deepEqual([...markup.matchAll(/data-testid="text-photo-tier-\d+">([^<]+)<\/span>/g)].map(match => match[1]),
    PRIZES.map(prize => prize.name));
  assert.deepEqual([...markup.matchAll(/data-testid="text-photo-points-\d+">(\d+) base pts<\/span>/g)].map(match => Number(match[1])),
    PRIZES.map(prize => prize.base));
  assert.match(markup, /Rarer answers earn more points\. Fast answers get a bonus\./);
  assert.deepEqual([...markup.matchAll(/class="oc-tier-icon"[^>]*><svg[^>]*data-art="([^"]+)"/g)].map(match => match[1]),
    PRIZES.map(prize => kindForDepth(prize.depth)));
  assert.match(markup, /data-testid="button-choose-create"/);
  assert.match(markup, /data-testid="button-choose-join"/);
  assert.match(markup, /Hi, I&#x27;m Bobi!/);
  assert.match(markup, /class="pm-toppings" aria-hidden="true"/);
  assert.doesNotMatch(markup, /class="oc-cup"|Pause motion|Mute music/);
  for (const [, d] of markup.matchAll(/\sd="([^"]*)"/g)) assert.doesNotMatch(d, /--|NaN|undefined/);
});

test('every wardrobe hat and outfit has distinct art; none remains truly empty', () => {
  const hats = WARDROBE_HATS.filter(id => id !== 'none').map(id =>
    renderMarkup(createElement(HatArt, { id })));
  const outfits = WARDROBE_OUTFITS.filter(id => id !== 'none').map(id =>
    renderMarkup(createElement(OutfitArt, { id })));
  assert.ok([...hats, ...outfits].every(markup => /<(g|path|rect|circle|ellipse)/.test(markup)));
  assert.equal(new Set(hats).size, 21);
  assert.equal(new Set(outfits).size, 23);
  assert.equal(renderMarkup(createElement(HatArt, { id: 'none' })), '');
  assert.equal(renderMarkup(createElement(OutfitArt, { id: 'none' })), '');
  const backs = WARDROBE_OUTFITS.map(outfit => renderMarkup(createElement(BackArt, { outfit })));
  for (const markup of [...hats, ...outfits, ...backs]) {
    for (const [, d] of markup.matchAll(/\sd="([^"]*)"/g)) {
      assert.doesNotMatch(d, /--|NaN|undefined/, 'Mirrored SVG coordinates must not emit invalid double negatives.');
    }
  }
});
test('each companion renders as distinct pixel art alongside the existing Bobi outfit', () => {
  const dog = renderMarkup(createElement(BobiAvatar, { avatar: 'b1:0:2:1:12' }));
  const turtle = renderMarkup(createElement(BobiAvatar, { avatar: 'b1:0:2:1:13' }));
  for (const [markup, animal] of [[dog, 'schnauzer'], [turtle, 'turtle']]) {
    assert.match(markup, /Bobi wearing Mango, Ribbon bow, Café apron/);
    assert.match(markup, new RegExp(`shape-rendering="crispEdges" data-pet="${animal}"`));
    assert.match(markup, /bobi-dressup-base\.webp/);
  }
  assert.notEqual(dog.match(/data-pet="schnauzer"[^>]*>(.*?)<\/g>/)?.[1],
    turtle.match(/data-pet="turtle"[^>]*>(.*?)<\/g>/)?.[1]);
});

const exampleReward = (tier: number) => {
  const prize = PRIZES[tier];
  return { matched: true, tier: prize.name, ingredient: prize.name, depth: prize.depth,
    basePoints: prize.base, speedBonus: 0, points: prize.base, elapsedMs: 0 };
};
const room = (answer: string | null = null, tier = 2) =>
  questionPreviewState({ index: 0, host: false, answer, reward: answer ? exampleReward(tier) : null, avatar });

test('crowd polling is staggered, host updates stay fast, and finished rooms stop polling', () => {
  assert.equal(roomPollingInterval('finished', false, 400), false);
  assert.equal(roomPollingInterval('finished', true), false);
  assert.equal(roomPollingInterval('answering', true), 1000);
  assert.equal(roomPollingInterval('answering', false), 1500);
  assert.equal(roomPollingInterval('answering', false, 399), 1899);
  assert.equal(roomPollingInterval('lobby', false), 2500);
  assert.equal(roomPollingInterval('revealed', false), 2500);
});

test('the garnished forty-player cup retains every guest and keeps answers private', () => {
  const base = questionPreviewState({ index: 0, host: true, answer: null, avatar });
  for (const count of [0, 26, 27, 40]) {
    const sample = crowdPreviewState(base, count);
    const markup = renderToStaticMarkup(createElement(Answering, {
      room: sample, avatar, remainingMs: 25000, onSubmit: () => {}, submitting: false,
    }));
    assert.equal(sample.players.filter(p => !p.isHost).length, 40);
    assert.match(markup, new RegExp(`data-testid="text-submitted-count">${count} / 40`));
    const sequence = ['text-question', 'text-host-countdown', 'text-submitted-count', 'Who has answered'];
    assert.deepEqual(sequence.map(label => markup.indexOf(label)).sort((a, b) => a - b),
      sequence.map(label => markup.indexOf(label)));
    assert.deepEqual([...markup.matchAll(/data-testid="status-answered-crowd-(\d+)"/g)].map(m => Number(m[1])),
      Array.from({ length: count }, (_, i) => i + 1));
    assert.equal((markup.match(/data-testid="status-waiting-crowd-/g) ?? []).length, 40 - count);
    assert.match(markup, /class="mt is-many"/);
    assert.match(markup, /class="mt-foam is-creamy" aria-hidden="true"/);
    assert.match(markup, /class="hr-garnish"[^>]*aria-hidden="true"/);
    assert.match(markup, /class="mt-spoon"[^>]*aria-hidden="true"/);
    assert.doesNotMatch(markup, /mt-straw/);
    noTierSpoilers(markup);
  }
  assert.equal(crowdPreviewState(room()).players.length, 2, 'Crowd fixtures never replace a phone roster.');
});

test('the host countdown displays seconds and becomes urgent only in the final ten', () => {
  const state = questionPreviewState({ index: 0, host: true, answer: null, avatar });
  for (const [remainingMs, seconds, urgent] of [[10_001, 11, false], [10_000, 10, true], [0, 0, true]] as const) {
    const markup = renderToStaticMarkup(createElement(Answering, {
      room: state, avatar, remainingMs, onSubmit: () => {}, submitting: false,
    }));
    assert.match(markup, new RegExp(`aria-label="${seconds} seconds remaining" data-testid="text-host-countdown">${seconds}<small>Seconds left`));
    assert.equal(markup.includes('is-urgent'), urgent);
  }
});

function noTierSpoilers(markup: string) {
  for (const prize of PRIZES) assert.ok(!markup.includes(prize.name), `Premature reward spoiler: ${prize.name}`);
  assert.ok(!/Bobi found/i.test(markup));
}

test('the cupless photo menu keeps Bobi and his bubble aligned and inside phone and desktop widths', () => {
  for (const [width, height] of [[320, 640], [390, 844], [768, 1024], [1024, 768], [1440, 1000]]) {
    const { bobi, bubble } = openingLayout(width, height, true);
    assert.ok(bubble);
    assert.ok(bobi.x >= 16);
    assert.ok(bubble.x + bubble.w <= width - 16 + .01);
    assert.ok(bubble.x - (bobi.x + bobi.size) >= 12);
    assert.ok(bubble.x - (bobi.x + bobi.size) <= 18);
    assert.ok(Math.abs(bubble.y + 29 - (bobi.y + bobi.size / 2)) < .01);
  }
});

test('five distinct pixel ingredient sprites share the same depth mapping without leaking tier captions', () => {
  const sprites = INGREDIENT_KINDS.map((kind, depth) => {
    assert.equal(kindForDepth(depth), kind);
    const markup = renderToStaticMarkup(createElement(IngredientArt, { depth, size: 48 }));
    assert.match(markup, new RegExp(`data-art="${kind}"`));
    assert.match(markup, /aria-hidden="true"/);
    assert.ok(markup.includes('<rect'));
    noTierSpoilers(markup);
    return markup;
  });
  assert.equal(new Set(sprites).size, 5);
});

test('unchecked practice text cannot create a default Pomelo Gem or points', () => {
  const unchecked = questionPreviewState({ index: 0, host: false, answer: 'anything at all', avatar });
  assert.equal(unchecked.submitted, false);
  assert.equal(unchecked.myAnswer, null);
  assert.equal(unchecked.myReward, null);
  assert.equal(unchecked.myTotalPoints, 0);
});

const retryProps = {
    room: room(), avatar, remainingMs: 20000, onSubmit: () => {},
    submitting: false, error: '', feedback: "Not on this question's menu. Try another answer.",
};

test('an unlisted answer shows a coral retry banner immediately above the answer bar in practice and live play', () => {
  for (const practice of [false, true]) {
    const markup = renderToStaticMarkup(createElement(Answering, { ...retryProps, practice }));
    assert.match(markup, /id="answer-retry-hint" role="status" aria-atomic="true">.*?data-testid="status-answer-feedback"/);
    assert.match(markup, /class="g-feedback-coral pd-retry-banner"/);
    assert.match(markup, /Not on the menu\.<\/strong> Try another answer\./);
    assert.ok(markup.indexOf('status-answer-feedback') < markup.indexOf('text-answer-timer'));
    assert.ok(markup.indexOf('status-answer-feedback') < markup.indexOf('input-answer'));
    assert.match(markup, /class="pd-dock"><div class="pd-entry"><div class="pd-retry-status".*?<\/div><form class="dock-form pd-form"/);
    assert.ok(!markup.includes('role="alert"'));
    assert.ok(!markup.includes('status-answer-locked'));
    const input = markup.match(/<input\b[^>]*data-testid="input-answer"[^>]*>/)?.[0];
    assert.ok(input && !/\b(disabled|readOnly)\b/.test(input));
    assert.match(input, /aria-describedby="answer-retry-hint"/);
    noTierSpoilers(markup);
  }
});

test('duplicate room names get actionable feedback beside the input even without a field hint', () => {
  for (const failure of [
    { status: 409, data: { field: 'name', error: 'Conflict' } },
    { status: 409, data: { error: 'That name is already in this room.' } },
    new Error('HTTP: 409 Conflict: Display name is already taken.'),
    { status: 409, data: 'That name is already in use.' },
  ]) {
    const result = roomEntryFailure(failure);
    assert.equal(result.field, 'name');
    assert.match(result.error, /^That name is already taken\./);
    assert.doesNotMatch(result.error, /HTTP|409/);
    const markup = renderMarkup(createElement(RoomNameField, {
      value: 'Guest', error: result.error,
      inputTestId: 'join-name', errorTestId: 'status-name-error', onChange: () => {},
    }));
    assert.match(markup, /aria-invalid="true" aria-describedby="join-name-error"/);
    assert.match(markup, /value="Guest"\/><p class="g-feedback-coral" role="alert" id="join-name-error"/);
  }
  const started = { error: 'This game has started. Ask the host for the next room.' };
  assert.deepEqual(roomEntryFailure({ status: 409, data: started }).error, started.error);
  assert.doesNotMatch(roomEntryFailure(new Error('HTTP:409')).error, /HTTP|409|name/i);
});

test('bad room codes get a coral warning attached to the code field', () => {
  for (const code of ['MK', 'MKO', '4827', 'MANG27']) assert.equal(roomCodeProblem(code), null);
  for (const code of ['M', 'M3', '42', 'MK3', '48271', 'MANG', 'MK\n']) assert.equal(roomCodeProblem(code)?.field, 'code');
  for (const problem of [
    roomCodeProblem('SHORT'),
    roomEntryFailure({ status: 404, data: { error: 'Room not found. Check the code.', field: 'code' } }),
    roomEntryFailure(new Error('HTTP 404 Not Found: Room not found. Check the code.')),
  ]) {
    assert.equal(problem?.field, 'code');
    const markup = renderMarkup(createElement(RoomEntryField, {
      label: 'Room code', value: 'SHORT', error: problem?.error,
      inputTestId: 'input-room-code', errorTestId: 'status-home-error', onChange: () => {},
    }));
    assert.match(markup, /<label for="input-room-code">Room code<\/label>/);
    assert.match(markup, /aria-invalid="true" aria-describedby="input-room-code-error"/);
    assert.match(markup, /value="SHORT"\/><p class="g-feedback-coral" role="alert" id="input-room-code-error"/);
  }
});

test('the retry banner does not compete with timeout, connection errors, corrections or a new attempt', () => {
  for (const state of [{ remainingMs: 0 }, { error: 'Connection lost' }, { submitting: true }, { feedback: '' },
    { correction: { originalAnswer: 'Bruno Mras', correctedAnswer: 'Bruno Mars' } }, { room: room('Locked answer') }]) {
    const markup = renderToStaticMarkup(createElement(Answering, { ...retryProps, ...state }));
    assert.doesNotMatch(markup, /data-testid="status-answer-feedback"/);
  }
});

test('a spelling correction is shown privately for confirmation without awarding or revealing a tier', () => {
  const markup = renderToStaticMarkup(createElement(Answering, {
    room: room(), avatar, remainingMs: 20000, onSubmit: () => {},
    submitting: false, error: '', correction: { originalAnswer: 'Bruno Mras', correctedAnswer: 'Bruno Mars' },
  }));
  assert.match(markup, /data-testid="status-answer-correction"/);
  assert.match(markup, /Bruno Mras/);
  assert.match(markup, /Bruno Mars/);
  assert.match(markup, /Submit again to confirm/);
  assert.match(markup, /Confirm/);
  assert.ok(!markup.includes('status-answer-locked'));
  assert.ok(!markup.includes('text-my-round-points'));
  noTierSpoilers(markup);
});

test('waiting player sees the prompt and answer timer, not a labeled reward ladder', () => {
  const markup = renderToStaticMarkup(createElement(Answering, {
    room: room(), avatar, remainingMs: 25_000, onSubmit: () => {}, submitting: false, error: '',
  }));
  noTierSpoilers(markup);
  assert.match(markup, /data-testid="text-question"/);
  assert.match(markup, /class="pd-game-title">The Sweetest Scoop<\/span>/);
  assert.match(markup, /data-testid="input-answer"/);
  assert.match(markup, /data-testid="text-answer-timer"/);
});

test('the HUD puts the dessert meter and current prompt between Depth and Score', () => {
  const markup = renderToStaticMarkup(createElement(Answering, {
    room: { ...room(), round: 2, questionCount: 8 },
    avatar, remainingMs: 13_000, onSubmit: () => {}, submitting: false, error: '',
  }));
  assert.match(markup, /class="pd-meter-icon"/);
  const segments = markup.match(/<ol class="pd-segments" aria-hidden="true">(.*?)<\/ol>/)?.[1] ?? '';
  assert.equal(segments.match(/<li /g)?.length, 8);
  assert.match(segments, /^<li class="done"><\/li><li class="on"><\/li>(<li class=""><\/li>){6}$/);
  const depth = markup.indexOf('data-testid="text-dive-depth"');
  const progress = markup.indexOf('data-testid="text-prompt-progress">Prompt 2 of 8');
  const score = markup.indexOf('data-testid="text-dive-score"');
  assert.ok(depth >= 0 && depth < progress && progress < score);
});

test('a submitted server reward is not named before the landing animation completes', () => {
  for (const prize of PRIZES) {
    const markup = renderToStaticMarkup(createElement(Answering, {
      room: room('Private submitted answer', prize.depth), avatar,
      remainingMs: 20_000, onSubmit: () => {}, submitting: false, error: '',
    }));
    noTierSpoilers(markup);
    assert.match(markup, /Private submitted answer/);
  }
});

test('practice options do not reveal the ingredient tiers in their initial markup', () => {
  const markup = renderToStaticMarkup(createElement(Router, { ssrPath: '/solo' }, createElement(QuestionPreview, { practice: true })));
  noTierSpoilers(markup);
  const input = markup.match(/<input\b[^>]*data-testid="input-answer"[^>]*>/)?.[0];
  assert.ok(input, 'The real practice answer input is present');
  assert.doesNotMatch(input, /\sdisabled(?:=|\s|>)/);
  assert.match(markup, /countdown starts automatically after a one-second pause/);
});

test('expired multiplayer rounds still disable answer entry', () => {
  const markup = renderToStaticMarkup(createElement(Answering, {
    room: room(), avatar, remainingMs: 0, onSubmit: () => {}, submitting: false, error: '',
  }));
  const input = markup.match(/<input\b[^>]*data-testid="input-answer"[^>]*>/)?.[0];
  assert.ok(input);
  assert.match(input, /\sdisabled(?:=|\s|>)/);
  assert.match(markup, /Time&#x27;s up/);
});

test('expired practice preserves the draft but requires an explicit retry', () => {
  const markup = renderToStaticMarkup(createElement(Answering, {
    room: room(), avatar, remainingMs: 0, practice: true,
    onSubmit: () => {}, submitting: false, error: '',
  }));
  const input = markup.match(/<input\b[^>]*data-testid="input-answer"[^>]*>/)?.[0];
  assert.ok(input);
  assert.doesNotMatch(input, /\sdisabled(?:=|\s|>)/);
  assert.match(input, /\sreadOnly(?:=|\s|>)/);
  assert.match(markup, /Try again or choose the next question/);
});

test('the default phone preview is playable practice, not a silent paused screen', () => {
  const markup = renderToStaticMarkup(createElement(Router, { ssrPath: '/preview/question' }, createElement(QuestionPreview)));
  assert.match(markup, /Practice · not saved/);
  assert.match(markup, /countdown starts automatically after a one-second pause/);
  assert.match(markup, /data-testid="input-answer"/);
  noTierSpoilers(markup);
});

test('celebratory results and next action are enabled for hosts, not guests', () => {
  for (const host of [true, false]) {
    const state = { ...room('Bruno Mars'), phase: 'revealed' as const, isHost: host };
    const markup = renderToStaticMarkup(createElement(Revealed, {
      room: state, avatar, onNext: () => {}, nexting: false,
    }));
    assert.equal(markup.includes('is-host-results'), host);
    assert.equal(markup.includes('data-testid="button-next-round"'), host);
    assert.equal(markup.includes('Next round is ready when you are'), host);
  }
});

test('host results preview reuses the real podium and catalog with five clearly labeled sample guests', () => {
  const markup = renderToStaticMarkup(createElement(Router, { ssrPath: '/preview/results' }, createElement(HostResultsPreview)));
  assert.match(markup, /Host results preview/);
  assert.match(markup, /class="g-brand">The Sweetest Scoop<\/span>/);
  assert.match(markup, /Five sample Bobis/);
  assert.match(markup, /Nothing is saved/);
  assert.match(markup, /data-testid="podium-round"/);
  assert.match(markup, /data-testid="section-catalog"/);
  assert.match(markup, /data-testid="input-catalog-search"/);
  assert.match(markup, /data-testid="button-next-round"/);
  assert.equal(HOST_RESULTS_SAMPLE.roundStandings?.length, 5);
  assert.equal(HOST_RESULTS_SAMPLE.possibleAnswers?.length, 10);
  for (const guest of HOST_RESULTS_SAMPLE.roundStandings ?? []) {
    assert.match(markup, new RegExp(`data-testid="podium-round-${guest.playerId}"`));
    assert.equal(guest.points, (guest.basePoints ?? 0) + (guest.speedBonus ?? 0));
  }
  for (const prize of PRIZES) assert.ok(markup.includes(prize.name));
});

test('both host and phone podiums rank cumulative totals, not the latest round points', () => {
  for (const host of [true, false]) {
    const markup = renderToStaticMarkup(createElement(Revealed, {
      room: { ...HOST_RESULTS_SAMPLE, isHost: host }, avatar, onNext: () => {}, nexting: false,
    }));
    assert.match(markup, /Overall top five · total points/);
    assert.match(markup, /class="podium-step step-1" data-testid="podium-round-sample-2"/);
    const podium = markup.split('data-testid="podium-round"')[1].split('</section>')[0];
    assert.match(podium, />274<small>pts<\/small>/);
    assert.ok(!podium.includes('>94<small>pts</small>'));
    assert.ok(markup.includes('list-round-standings'));
    assert.ok(markup.includes('section-catalog'));
  }
});

test('the final screen shows the cumulative podium and honorable mentions without the last-question catalog or standings list', () => {
  for (const host of [true, false]) {
    const markup = renderToStaticMarkup(createElement(Finished, {
      room: { ...HOST_FINAL_SAMPLE, isHost: host },
    }));
    assert.match(markup, /data-testid="podium-final"/);
    assert.match(markup, /class="podium-step step-1" data-testid="podium-final-sample-2"/);
    assert.match(markup, /data-places="5"/);
    assert.match(markup, /<span class="podium-rank">4th<\/span>/);
    assert.match(markup, /<span class="podium-rank">5th<\/span>/);
    assert.ok(markup.includes('>603<small>pts</small>'));
    for (const category of ['fastest', 'just-in-time', 'rare-finds']) {
      assert.ok(markup.includes(`data-testid="award-${category}"`));
    }
    assert.match(markup, /24\.73s/);
    assert.match(markup, /5 rare finds/);
    assert.ok(!markup.includes('section-catalog'));
    assert.ok(!markup.includes('list-total-standings'));
    assert.ok(!markup.includes('list-round-standings'));
    assert.ok(!markup.includes('Last question'));
    assert.ok(!markup.includes(HOST_RESULTS_SAMPLE.currentQuestion!));
  }
});

test('the podium only renders real guests and keeps all three medal places distinct', () => {
  for (let count = 0; count <= 5; count++) {
    const markup = renderMarkup(createElement(Podium, {
      title: 'Test podium', testId: 'test-podium', standings: HOST_RESULTS_SAMPLE.standings.slice(0, count),
    }));
    if (count === 0) assert.match(markup, /data-testid="test-podium-empty"/);
    else assert.match(markup, new RegExp(`data-places="${count}"`));
    assert.equal((markup.match(/class="podium-step step-/g) ?? []).length, count);
    assert.equal((markup.match(/class="podium-medal"/g) ?? []).length, Math.min(count, 3));
    assert.doesNotMatch(markup, /is-blank/);
  }
});

test('the podium caps a larger room at five without dropping guests from the standings', () => {
  const entry = (playerId: string, displayName: string, points: number, elapsedMs = 1000) =>
    ({ playerId, displayName, points, elapsedMs, avatar, discoveries: 1 });
  const standings = [entry('6', 'Guest outside the podium', 10), entry('3', 'Ben', 50),
    entry('2', 'Ana', 50), entry('5', 'Mo', 20), entry('4', 'Tim', 50, 2000), entry('1', 'Lee', 100)];
  const markup = renderToStaticMarkup(createElement(Revealed, {
    room: { ...HOST_RESULTS_SAMPLE, standings, roundStandings: standings }, avatar, onNext: () => {}, nexting: false,
  }));
  const ranks = [...markup.matchAll(/class="podium-step step-(\d)" data-testid="podium-round-(\d)"/g)].map(([, rank, id]) => [rank, id]);
  assert.deepEqual(ranks, [['1', '1'], ['2', '2'], ['3', '3'], ['4', '4'], ['5', '5']]);
  assert.match(markup, /data-testid="row-round-6"/);
  assert.match(markup.split('data-testid="list-total-standings"')[1], /Guest outside the podium/);
});

test('no honorable mention panel appears without eligible awards', () => {
  const markup = renderToStaticMarkup(createElement(Finished, { room: { ...HOST_FINAL_SAMPLE, honorableMentions: [] } }));
  assert.match(markup, /data-testid="podium-final"/);
  assert.doesNotMatch(markup, /section-honorable-mentions/);
});

test('guest lobby keeps customization without a question list or long rules', () => {
  const markup = renderToStaticMarkup(createElement(Lobby, {
    room: { ...room(), phase: 'lobby' }, avatar, onAvatar: () => {}, savingAvatar: false,
    onStart: () => {}, starting: false,
  }));
  assert.doesNotMatch(markup, /host-lobby-join-code|is-lobby-host/);
  noTierSpoilers(markup);
  assert.ok(markup.includes('Dress your Bobi for the party.'));
  assert.ok(!markup.includes("Tonight&#x27;s seven"));
  assert.ok(!markup.includes('prompt-list'));
  assert.ok(!markup.includes('One answer each, locked on send.'));
  assert.ok(markup.includes('The mango sago cup'));
  assert.ok(markup.includes('data-theme="mango-sago"'));
  assert.ok(!/milk tea|steeping|The tea is/.test(markup));
});

test('only Daniel and Amy see the surprise look and it replaces their wardrobe', () => {
  assert.equal(previewPartyBobi('  dAnIeL  '), 'party-daniel');
  assert.equal(previewPartyBobi('AMY'), 'party-amy');
  for (const name of ['', 'Dan', 'Amy 2', 'Daniel Chen']) assert.equal(previewPartyBobi(name), undefined);
  for (const [look, label] of [
    ['party-daniel', 'Main Character Bobi'],
    ['party-amy', 'Sweetheart Bobi'],
  ]) {
    const state = room();
    const guest = { ...state.players[0], isHost: false, avatar: look };
    const markup = renderToStaticMarkup(createElement(Lobby, {
      room: { ...state, phase: 'lobby', players: [guest] }, avatar: look, onAvatar: () => {}, savingAvatar: false,
      onStart: () => {}, starting: false,
    }));
    assert.match(markup, /data-testid="status-party-bobi"/);
    assert.ok(markup.includes(`<h2 class="g-title">${label}</h2>`));
    assert.ok((markup.match(new RegExp(`aria-label="${label}"`, 'g')) ?? []).length >= 2);
    assert.ok(markup.includes(`data-party-variant="${look}"`));
    assert.match(markup, /data-party-volleyball=""/);
    assert.equal(markup.includes('data-party-matcha=""'), look === 'party-amy');
    assert.equal(markup.includes('Bruno Mars fan with a cup of matcha and a volleyball.'), look === 'party-amy');
    assert.equal(markup.includes('data-party-kart=""'), look === 'party-daniel');
    assert.equal(markup.includes('data-kart-monogram="D"'), look === 'party-daniel');
    assert.equal(markup.includes('data-party-peace-hand=""'), look === 'party-amy');
    assert.equal(markup.includes('data-party-curls=""'), look === 'party-amy');
    assert.equal(markup.includes('data-party-sunglasses=""'), look === 'party-amy');
    assert.doesNotMatch(markup, /data-party-hoodie|data-jacket-monogram|Disneyland/);
    assert.doesNotMatch(markup, /data-testid="wardrobe"/);
  }
});

test('host lobby shows only guest Bobis and keeps the start control without a host wardrobe or question list', () => {
  const state = room();
  const host = { ...state.players[0], id: 'host-only', displayName: 'Moderator only', isHost: true };
  const guest = { ...state.players[0], id: 'guest-only', displayName: 'Guest Bobi', isHost: false };
  const markup = renderToStaticMarkup(createElement(Lobby, {
    room: { ...state, phase: 'lobby', isHost: true, players: [host, guest] }, avatar,
    onAvatar: () => {}, savingAvatar: false, onStart: () => {}, starting: false,
  }));
  assert.ok(!markup.includes('Dress your Bobi'));
  assert.ok(!markup.includes('data-testid="player-host-only"'));
  assert.ok(markup.includes('data-testid="player-guest-only"'));
  assert.ok(markup.includes('data-testid="button-start-game"'));
  assert.match(markup, /data-testid="host-lobby-join-code"/);
  assert.match(markup, /data-testid="text-room-code">PREVIEW/);
  assert.match(markup, /class="mt-spoon"[^>]*aria-hidden="true"/);
  assert.ok(!markup.includes('prompt-list'));
  assert.ok(!markup.includes('One answer each, locked on send.'));
});

test('the host lobby renders the full lineup with either one or forty guests', () => {
  for (const count of [1, 40] as const) {
    const markup = renderToStaticMarkup(createElement(Lobby, {
      room: hostLobbyPreviewState(count), avatar, onAvatar: () => {}, savingAvatar: false, onStart: () => {}, starting: false,
    }));
    assert.match(markup, /is-lobby-host/);
    assert.match(markup, /data-testid="text-room-code">MK/);
    assert.equal((markup.match(/data-testid="tea-bobi-crowd-/g) ?? []).length, count);
    assert.ok(markup.indexOf('button-start-game') < markup.indexOf('At the table'));
  }
});

test('only guests choose a personal Bobi during room setup', () => {
  for (const initial of ['host', 'join'] as const) {
    const markup = renderToStaticMarkup(createElement(Router, { ssrPath: '/' },
      createElement(RoomSetup, { initial, onBack: () => {} })));
    assert.equal(markup.includes('data-testid="wardrobe"'), initial === 'join');
    assert.equal(markup.includes('Your Bobi style'), initial === 'join');
    assert.doesNotMatch(markup, /Custom game|radio-game-custom|input-custom-bank|Preview questions/);
    assert.ok(markup.includes(`data-testid="button-${initial === 'host' ? 'create' : 'join'}-room"`));
    if (initial === 'join') {
      const code = markup.indexOf('data-testid="input-room-code"');
      const name = markup.indexOf('data-testid="input-guest-name"');
      const join = markup.indexOf('data-testid="button-join-room"');
      const wardrobe = markup.indexOf('data-testid="wardrobe"');
      assert.ok(code >= 0 && code < name && name < join && join < wardrobe);
      assert.match(markup, /placeholder="Code on host screen"/);
      assert.doesNotMatch(markup, /\b(?:DAN|AMY|RBF)\b/);
    }
  }
});

for (const answered of [false, true]) {
  test(`the watercolor shared cup keeps ${answered ? 'answered' : 'waiting'} players and answers private`, () => {
    const state = questionPreviewState({
      index: 0, host: true, answer: answered ? 'This answer stays private' : null, reward: answered ? exampleReward(2) : null, avatar,
    });
    const markup = renderToStaticMarkup(createElement(Answering, {
      room: state, avatar, remainingMs: 15_000, onSubmit: () => {}, submitting: false, error: '',
    }));
    assert.match(markup, /data-theme="mango-sago"/);
    assert.ok(!markup.includes('watercolor-shared-tea.webp'));
    assert.match(markup, new RegExp(`data-testid="status-${answered ? 'answered' : 'waiting'}-preview-player"`));
    assert.match(markup, /Preview player/);
    assert.ok(!markup.includes('This answer stays private'));
    assert.ok(!markup.includes('mt-pearls'));
    noTierSpoilers(markup);
  });
}
