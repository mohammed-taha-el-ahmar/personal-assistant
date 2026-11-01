-- Data quality checks: each row is one check; failing_rows should be 0.
-- Schedule it (BigQuery scheduled query) and alert when any check fails.
WITH e AS (SELECT * FROM `your-project.quizlive_analytics.stg_answer_events`)
SELECT 'event_id matches deterministic key' AS check_name,
       COUNTIF(event_id != CONCAT(session_id, '_q', CAST(question_index AS STRING), '_', player_id)) AS failing_rows
FROM e
UNION ALL
SELECT 'required fields not null',
       COUNTIF(session_id IS NULL OR quiz_id IS NULL OR player_id IS NULL
               OR question_index IS NULL OR answered IS NULL OR is_correct IS NULL)
FROM e
UNION ALL
SELECT 'answered rows have choice and response time',
       COUNTIF(answered AND (choice IS NULL OR response_ms IS NULL))
FROM e
UNION ALL
SELECT 'unanswered rows have no choice and are not correct',
       COUNTIF(NOT answered AND (choice IS NOT NULL OR is_correct))
FROM e
UNION ALL
SELECT 'choice within answer options',
       COUNTIF(answered AND (choice < 0 OR choice >= ARRAY_LENGTH(answer_options)))
FROM e
UNION ALL
SELECT 'is_correct consistent with correct_choices',
       COUNTIF(answered AND is_correct != (choice IN UNNEST(correct_choices)))
FROM e
UNION ALL
SELECT 'response time within limit (+1.5 s grace)',
       COUNTIF(answered AND (response_ms < 0 OR response_ms > time_limit_ms + 1500))
FROM e
UNION ALL
SELECT 'points between 0 and question value + max streak bonus',
       COUNTIF(points_earned < 0 OR points_earned > points_value + 500)
FROM e
UNION ALL
SELECT 'no duplicate player/question rows',
       COUNT(*) - COUNT(DISTINCT CONCAT(session_id, '|', CAST(question_index AS STRING), '|', player_id))
FROM e;
