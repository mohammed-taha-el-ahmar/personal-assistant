"""Completeness checks for sensor time series, in plain DuckDB SQL.

Used by the article "Measuring completeness of sensor time series".
The article shows the regions marked below; test_completeness.py runs them.
"""

from __future__ import annotations

from datetime import datetime


# region completeness
COMPLETENESS_SQL = """
WITH received AS (
    SELECT sensor_id,
           COUNT(DISTINCT time_bucket(to_seconds($interval_s), ts)) AS received
    FROM readings
    WHERE ts >= $start AND ts < $end
    GROUP BY sensor_id
)
SELECT s.sensor_id,
       COALESCE(r.received, 0)                        AS received,
       $expected                                      AS expected,
       ROUND(COALESCE(r.received, 0) / $expected, 4)  AS completeness
-- Start from the inventory, not the data: a silent sensor must show up as 0.
FROM sensors AS s
LEFT JOIN received AS r USING (sensor_id)
ORDER BY completeness, s.sensor_id
"""


def completeness(con, start: datetime, end: datetime, interval_s: int):
    """Per sensor: share of expected time slots with at least one reading."""
    expected = int((end - start).total_seconds() // interval_s)
    params = {"interval_s": interval_s, "start": start, "end": end,
              "expected": expected}
    return con.execute(COMPLETENESS_SQL, params).fetchall()
# endregion


# region gaps
GAPS_SQL = """
SELECT sensor_id, prev_ts AS gap_start, ts AS gap_end
FROM (
    SELECT sensor_id, ts,
           LAG(ts) OVER (PARTITION BY sensor_id ORDER BY ts) AS prev_ts
    FROM readings
    WHERE ts >= $start AND ts < $end
)
WHERE ts - prev_ts > to_seconds($max_gap_s)
ORDER BY sensor_id, gap_start
"""


def gaps(con, start: datetime, end: datetime, max_gap_s: int):
    """Silences longer than max_gap_s between two readings of a sensor."""
    params = {"start": start, "end": end, "max_gap_s": max_gap_s}
    return con.execute(GAPS_SQL, params).fetchall()
# endregion
