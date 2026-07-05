// A Duolingo-style "match the pairs" session. The pool is shuffled once
// and consumed without repeats; the board holds at most boardSize pairs.
// Pair identity is object identity (like Dart's identical()).

// Fisher–Yates using an injectable rng returning a float in [0, 1).
function shuffle(list, rng) {
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}

export class MatchingSession {
  constructor(pool, { boardSize = 5, rng = Math.random } = {}) {
    this.boardSize = boardSize;
    this._rng = rng;
    this._pool = shuffle([...pool], rng);
    /// Active pairs; order defines the left column (words).
    this.board = [];
    /// Right column order, kept as the pairs themselves.
    this.rightColumn = [];
    while (this.board.length < boardSize && this._pool.length > 0) {
      this._addPair(this._pool.pop());
    }
  }

  get remaining() {
    return this._pool.length + this.board.length;
  }

  get isFinished() {
    return this.board.length === 0;
  }

  _addPair(pair) {
    this.board.push(pair);
    const pos = Math.floor(this._rng() * (this.rightColumn.length + 1));
    this.rightColumn.splice(pos, 0, pair);
  }

  /// Checks a selection. On a match the pair leaves the board and, if the
  /// pool is not empty, the next pair is added.
  submit(left, right) {
    if (left !== right) return false;
    this.board.splice(this.board.indexOf(left), 1);
    this.rightColumn.splice(this.rightColumn.indexOf(left), 1);
    if (this._pool.length > 0) this._addPair(this._pool.pop());
    return true;
  }
}
