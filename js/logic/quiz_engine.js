// Question generator: every word is asked exactly once per session,
// distractors are sampled from the user's other cards.

export const QuizKind = Object.freeze({
  wordToTranslation: 'wordToTranslation',
  translationToWord: 'translationToWord',
  audioToTranslation: 'audioToTranslation',
});

function shuffle(list, rng) {
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}

export class QuizEngine {
  constructor(pool, kind, { optionCount = 4, rng = Math.random } = {}) {
    this.kind = kind;
    this._rng = rng;
    this._all = [...pool];
    this._optionCount = Math.min(optionCount, pool.length);
    this._queue = shuffle([...pool], rng);
  }

  get remaining() {
    return this._queue.length;
  }

  get isFinished() {
    return this._queue.length === 0;
  }

  next() {
    if (this._queue.length === 0) return null;
    const pair = this._queue.pop();

    const asksTranslation = this.kind !== QuizKind.translationToWord;
    const answerOf = (p) => (asksTranslation ? p.translation : p.word);

    const distractors = shuffle(
      this._all.filter((p) => p !== pair),
      this._rng,
    );
    const options = new Set([answerOf(pair)]);
    for (const d of distractors) {
      if (options.size >= this._optionCount) break;
      options.add(answerOf(d));
    }
    const shuffled = shuffle([...options], this._rng);

    let prompt = '';
    if (this.kind === QuizKind.wordToTranslation) prompt = pair.word;
    else if (this.kind === QuizKind.translationToWord) prompt = pair.translation;

    return { pair, prompt, correct: answerOf(pair), options: shuffled };
  }
}
