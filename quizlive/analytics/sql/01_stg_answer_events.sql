-- Staging view: one typed row per player per question.
-- Source: view created by the "Stream Firestore to BigQuery" extension for the
-- answerEvents collection (table prefix: answer_events).
-- Replace `your-project` with your GCP project id.
CREATE OR REPLACE VIEW `your-project.quizlive_analytics.stg_answer_events` AS
SELECT
  document_id                                                         AS event_id,
  SAFE_CAST(JSON_VALUE(data, '$.schemaVersion') AS INT64)             AS schema_version,
  JSON_VALUE(data, '$.ownerUid')                                      AS owner_uid,
  JSON_VALUE(data, '$.sessionId')                                     AS session_id,
  JSON_VALUE(data, '$.quizId')                                        AS quiz_id,
  JSON_VALUE(data, '$.quizTitle')                                     AS quiz_title,
  SAFE_CAST(JSON_VALUE(data, '$.questionIndex') AS INT64)             AS question_index,
  JSON_VALUE(data, '$.questionText')                                  AS question_text,
  ARRAY(SELECT JSON_VALUE(o) FROM UNNEST(JSON_QUERY_ARRAY(data, '$.answerOptions')) AS o) AS answer_options,
  ARRAY(SELECT SAFE_CAST(JSON_VALUE(c) AS INT64)
        FROM UNNEST(JSON_QUERY_ARRAY(data, '$.correctChoices')) AS c) AS correct_choices,
  SAFE_CAST(JSON_VALUE(data, '$.timeLimitMs') AS INT64)               AS time_limit_ms,
  SAFE_CAST(JSON_VALUE(data, '$.pointsValue') AS INT64)               AS points_value,
  JSON_VALUE(data, '$.playerId')                                      AS player_id,
  JSON_VALUE(data, '$.nickname')                                      AS nickname,
  SAFE_CAST(JSON_VALUE(data, '$.answered') AS BOOL)                   AS answered,
  SAFE_CAST(JSON_VALUE(data, '$.choice') AS INT64)                    AS choice,
  SAFE_CAST(JSON_VALUE(data, '$.correct') AS BOOL)                    AS is_correct,
  SAFE_CAST(JSON_VALUE(data, '$.responseMs') AS INT64)                AS response_ms,
  SAFE_CAST(JSON_VALUE(data, '$.pointsEarned') AS INT64)              AS points_earned,
  SAFE_CAST(JSON_VALUE(data, '$.streakAfter') AS INT64)               AS streak_after,
  SAFE_CAST(JSON_VALUE(data, '$.rankAfter') AS INT64)                 AS rank_after,
  SAFE_CAST(JSON_VALUE(data, '$.scoreAfter') AS INT64)                AS score_after,
  TIMESTAMP_MILLIS(SAFE_CAST(JSON_VALUE(data, '$.questionStartedAt') AS INT64)) AS question_started_at,
  `timestamp`                                                         AS ingested_at
FROM `your-project.firestore_export.answer_events_raw_latest`;
