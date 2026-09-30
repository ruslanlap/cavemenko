#!/usr/bin/env python3
"""cavemenko stats for Hermes — real numbers from Hermes' own token accounting.

Hermes already bills every call into /opt/data/state.db (table
session_model_usage: output_tokens, input_tokens, cache_read_tokens).
There is no need to estimate anything: this reads the provider-reported
counts. Nothing here is inferred, extrapolated or invented.

Usage:
  cavemenko-stats.py            # latest session
  cavemenko-stats.py --all     # per-session table
  cavemenko-stats.py --last N  # last N sessions
"""
import os
import sqlite3
import sys
import time

DB = os.environ.get("HERMES_STATE_DB", "/opt/data/state.db")


def load(db):
    if not os.path.exists(db):
        print(f"no Hermes state db at {db} — nothing measured yet")
        return None
    con = sqlite3.connect(f"file:{db}?mode=ro", uri=True)
    rows = con.execute(
        """
        SELECT session_id, model,
               SUM(input_tokens), SUM(output_tokens), SUM(cache_read_tokens),
               SUM(api_call_count), MAX(last_seen)
        FROM session_model_usage
        GROUP BY session_id, model
        ORDER BY MAX(last_seen) DESC
        """
    ).fetchall()
    con.close()
    return rows


def main():
    args = sys.argv[1:]
    rows = load(DB)
    if not rows:
        return 0

    if "--all" in args or "--last" in args:
        n = 10
        if "--last" in args:
            try:
                n = int(args[args.index("--last") + 1])
            except (IndexError, ValueError):
                pass
        print(f"{'session':28} {'model':26} {'calls':>6} {'out':>9} {'in':>10} {'cache_read':>12}")
        for sid, model, inp, out, cache, calls, last in rows[:n]:
            print(f"{sid[:28]:28} {model[:26]:26} {calls:>6} {out:>9,} {inp:>10,} {cache:>12,}")
        return 0

    if not rows:
        return 0
    sid, model, inp, out, cache, calls, last = rows[0]
    when = time.strftime("%Y-%m-%d %H:%M", time.localtime(last)) if last else "unknown"
    print("cavemenko — виміряно в Hermes (provider-reported, не оцінка)")
    print(f"  session    {sid}")
    print(f"  model      {model}")
    print(f"  остання    {when}")
    print(f"  api calls  {calls}")
    print(f"  output     {out:,} токенів")
    print(f"  input      {inp:,} токенів")
    print(f"  cache read {cache:,} токенів")
    if out:
        print(f"  avg out    {out // max(calls, 1):,} токенів на виклик")
    print()
    print("  Економія порівнюється з іншою сесією — подивись --last 5.")
    print("  Без базової сесії відсоток не рахується: краще 0, ніж вигадка.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
