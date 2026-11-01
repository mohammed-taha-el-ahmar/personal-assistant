-- One row per player per game session.
CREATE OR REPLACE VIEW `your-project.quizlive_analytics.player_session_stats` AS
SELECT
  session_id,
  quiz_id,
  player_id,
  ANY_VALUE(nickname)                                        AS nickname,
  COUNT(*)                                                   AS questions_seen,
  COUNTIF(answered)                                          AS questions_answered,
  COUNTIF(is_correct)                                        AS correct_answers,
  ROUND(SAFE_DIVIDE(COUNTIF(is_correct), COUNT(*)) * 100, 1) AS pct_correct,
  MAX(streak_after)                                          AS best_streak,
  SUM(points_earned)                                         AS total_points,
  ARRAY_AGG(rank_after ORDER BY question_index DESC LIMIT 1)[OFFSET(0)] AS final_rank,
  APPROX_QUANTILES(response_ms, 100 IGNORE NULLS)[OFFSET(50)] AS median_response_ms,
  MIN(question_started_at)                                   AS first_question_at
FROM `your-project.quizlive_analytics.stg_answer_events`
GROUP BY session_id, quiz_id, player_id;
