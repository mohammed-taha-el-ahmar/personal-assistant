from datetime import datetime, timedelta

import duckdb
import pytest

from completeness import completeness, gaps

START = datetime(2026, 1, 1, 0, 0)
END = START + timedelta(hours=1)          # one hour, one reading expected per minute


@pytest.fixture()
def con():
    con = duckdb.connect()
    con.execute("CREATE TABLE sensors (sensor_id VARCHAR)")
    con.execute("CREATE TABLE readings (sensor_id VARCHAR, ts TIMESTAMP, value DOUBLE)")
    con.executemany("INSERT INTO sensors VALUES (?)", [("pump-1",), ("pump-2",), ("valve-9",)])
    rows = []
    for minute in range(60):
        ts = START + timedelta(minutes=minute)
        rows.append(("pump-1", ts, 1.0))                       # complete
        rows.append(("pump-1", ts + timedelta(seconds=30), 1.0))  # duplicate slot: counted once
        if not 20 <= minute < 35:                               # 15-minute outage
            rows.append(("pump-2", ts, 2.0))
    # valve-9 never reports
    rows.append(("pump-2", END + timedelta(minutes=5), 2.0))    # outside the window: ignored
    con.executemany("INSERT INTO readings VALUES (?, ?, ?)", rows)
    return con


def test_completeness_counts_slots_and_silent_sensors(con):
    result = {r[0]: r[1:] for r in completeness(con, START, END, interval_s=60)}
    assert result["pump-1"] == (60, 60, 1.0)
    assert result["pump-2"] == (45, 60, 0.75)
    assert result["valve-9"] == (0, 60, 0.0)


def test_completeness_orders_worst_first(con):
    assert [r[0] for r in completeness(con, START, END, interval_s=60)] == ["valve-9", "pump-2", "pump-1"]


def test_gaps_finds_the_outage(con):
    found = gaps(con, START, END, max_gap_s=120)
    assert found == [("pump-2", START + timedelta(minutes=19), START + timedelta(minutes=35))]


def test_gaps_ignores_normal_cadence(con):
    assert gaps(con, START, END, max_gap_s=20 * 60) == []
