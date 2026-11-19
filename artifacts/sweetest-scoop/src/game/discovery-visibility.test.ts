import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createElement, type ReactElement } from 'react';
import { renderToStaticMarkup as renderMarkup } from 'react-dom/server';
import { Router } from 'wouter';
import { Answering, Revealed } from './Round';
import { QuestionPreview } from './QuestionPreview';
import { Lobby } from './Lobby';
import { PRIZES } from './theme';
import { questionPreviewState } from './question-preview-state';
import { MusicProvider } from './MusicProvider';

const renderToStaticMarkup = (element: ReactElement) =>
  renderMarkup(createElement(MusicProvider, { children: element }));

const avatar = 'b1:0:2:1:1';
const room = (answer: string | null = null, tier = 2) =>
  questionPreviewState({ index: 0, host: false, answer, tier, avatar });

function noTierSpoilers(markup: string) {
  for (const prize of PRIZES) assert.ok(!markup.includes(prize.name), `Premature reward spoiler: ${prize.name}`);
  assert.ok(!/Bobi found/i.test(markup));
}

test('waiting player sees the prompt and answer timer, not a labeled reward ladder', () => {
  const markup = renderToStaticMarkup(createElement(Answering, {
    room: room(), avatar, remainingMs: 25_000, onSubmit: () => {}, submitting: false, error: '',
  }));
  noTierSpoilers(markup);
  assert.match(markup, /data-testid="text-question"/);
  assert.match(markup, /data-testid="input-answer"/);
  assert.match(markup, /data-testid="text-answer-timer"/);
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
  assert.match(markup, /25 seconds start when you type/);
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

test('expired practice stays editable so a fresh nonblank edit can restart it', () => {
  const markup = renderToStaticMarkup(createElement(Answering, {
    room: room(), avatar, remainingMs: 0, practice: true,
    onSubmit: () => {}, submitting: false, error: '',
  }));
  const input = markup.match(/<input\b[^>]*data-testid="input-answer"[^>]*>/)?.[0];
  assert.ok(input);
  assert.doesNotMatch(input, /\sdisabled(?:=|\s|>)/);
  assert.match(markup, /Keep typing to start a fresh 25 seconds/);
});

test('the default phone preview is playable practice, not a silent paused screen', () => {
  const markup = renderToStaticMarkup(createElement(Router, { ssrPath: '/preview/question' }, createElement(QuestionPreview)));
  assert.match(markup, /Practice · unscored/);
  assert.match(markup, /25 seconds start when you type/);
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
    assert.equal(markup.includes('Next scoop is ready when you are'), host);
  }
});

test('lobby instructions preserve the discovery instead of listing every tier', () => {
  const markup = renderToStaticMarkup(createElement(Lobby, {
    room: { ...room(), phase: 'lobby' }, avatar, onAvatar: () => {}, savingAvatar: false,
    onStart: () => {}, starting: false,
  }));
  noTierSpoilers(markup);
});

for (const answered of [false, true]) {
  test(`the watercolor shared cup keeps ${answered ? 'answered' : 'waiting'} players and answers private`, () => {
    const state = questionPreviewState({
      index: 0, host: true, answer: answered ? 'This answer stays private' : null, tier: 2, avatar,
    });
    const markup = renderToStaticMarkup(createElement(Answering, {
      room: state, avatar, remainingMs: 15_000, onSubmit: () => {}, submitting: false, error: '',
    }));
    assert.match(markup, /watercolor-shared-tea\.webp/);
    assert.match(markup, new RegExp(`data-testid="status-${answered ? 'answered' : 'waiting'}-preview-player"`));
    assert.match(markup, /Preview player/);
    assert.ok(!markup.includes('This answer stays private'));
    assert.ok(!markup.includes('mt-pearls'));
    noTierSpoilers(markup);
  });
}
