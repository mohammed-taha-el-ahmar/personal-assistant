-- Difficulty per question version (index + text, so edited questions stay separate).
CREATE OR REPLACE VIEW `your-project.quizlive_analytics.question_difficulty` AS
SELECT
  quiz_id,
  ANY_VALUE(quiz_title)                                        AS quiz_title,
  question_index,
  question_text,
  COUNT(*)                                                     AS responses,
  COUNT(DISTINCT session_id)                                   AS sessions,
  ROUND(AVG(IF(is_correct, 1, 0)) * 100, 1)                    AS pct_correct,
  ROUND(AVG(IF(answered, 0, 1)) * 100, 1)                      AS pct_no_answer,
  APPROX_QUANTILES(IF(answered, response_ms, NULL), 100 IGNORE NULLS)[OFFSET(50)] AS median_response_ms,
  ROUND(AVG(IF(answered, response_ms / time_limit_ms, NULL)), 2)     AS avg_time_used_ratio,
  CASE
    WHEN COUNT(*) < 5                     THEN 'not enough data'
    WHEN AVG(IF(is_correct, 1, 0)) < 0.35 THEN 'too hard'
    WHEN AVG(IF(is_correct, 1, 0)) >= 0.9 THEN 'too easy'
    ELSE 'ok'
  END                                                          AS difficulty_flag
FROM `your-project.quizlive_analytics.stg_answer_events`
GROUP BY quiz_id, question_index, question_text;
