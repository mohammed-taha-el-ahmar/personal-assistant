-- Which wrong answers attract players? A distractor that beats the correct answer
-- usually means a misconception or an ambiguous question.
CREATE OR REPLACE VIEW `your-project.quizlive_analytics.distractor_analysis` AS
WITH picks AS (
  SELECT quiz_id, question_index, question_text, answer_options, correct_choices, choice
  FROM `your-project.quizlive_analytics.stg_answer_events`
  WHERE answered
),
counts AS (
  SELECT
    quiz_id, question_index, question_text,
    ANY_VALUE(answer_options)  AS answer_options,
    ANY_VALUE(correct_choices) AS correct_choices,
    choice,
    COUNT(*) AS picks
  FROM picks
  GROUP BY quiz_id, question_index, question_text, choice
)
SELECT
  quiz_id,
  question_index,
  question_text,
  choice,
  answer_options[SAFE_OFFSET(choice)]                                   AS answer_text,
  choice IN UNNEST(correct_choices)                                     AS is_correct_option,
  picks,
  ROUND(picks / SUM(picks) OVER (PARTITION BY quiz_id, question_index, question_text) * 100, 1) AS pct_of_answers,
  NOT (choice IN UNNEST(correct_choices))
    AND picks > MAX(IF(choice IN UNNEST(correct_choices), picks, 0))
                OVER (PARTITION BY quiz_id, question_index, question_text) AS beats_correct_answer
FROM counts;
