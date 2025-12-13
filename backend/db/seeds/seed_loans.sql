-- Loan curriculum seed (run after schema.sql)

INSERT INTO lessons (slug, title, description, body, xp, difficulty, category, image_url)
SELECT slug, title, description, body, xp, difficulty, category, image_url
FROM (
  SELECT 'loan-basics' AS slug,
         'Loan Basics' AS title,
         'What are loans, interest, EMI, and common lending terms.' AS description,
         'Loans allow borrowers to access capital today and repay it over time with interest. This lesson covers principal, interest, EMI, amortisation, and key vocabulary you should know before speaking with a lender.' AS body,
         15 AS xp,
         1 AS difficulty,
         'Loans' AS category,
         '/images/loan-basics.png' AS image_url
  UNION ALL
  SELECT 'loan-types',
         'Types of Loans in India',
         'Home, personal, education, vehicle, and gold loans explained with pros/cons.',
         'India offers a variety of loan products. Understand secured vs unsecured loans, typical eligibility criteria, interest-rate regimes, and documentation requirements.',
         18,
         1,
         'Loans',
         '/images/loan-types.png'
  UNION ALL
  SELECT 'emi-calculation',
         'EMI Calculation & Amortisation',
         'How lenders compute EMIs, amortisation schedules, and interest burden in the first years.',
         'Equated Monthly Instalments (EMIs) make loan repayment predictable. Learn how EMIs are derived, why interest dominates early payments, and how part-prepayment alters the schedule.',
         22,
         2,
         'Loans',
         '/images/emi.png'
  UNION ALL
  SELECT 'loan-credit-score',
         'Credit Score & Lending Decisions',
         'Understand how CIBIL and other credit reports affect loan approvals and rates.',
         'Your credit score summarises repayment behaviour. Discover report components, how hard enquiries impact scores, and tips to improve creditworthiness before loan applications.',
         22,
         2,
         'Loans',
         '/images/credit-score.png'
  UNION ALL
  SELECT 'secured-vs-unsecured',
         'Secured vs Unsecured Loans',
         'Collateral requirements, risk to borrowers, and impact on interest rates.',
         'Compare secured loans (home, auto, gold) with unsecured products (personal, credit line). Understand collateral valuation, loan-to-value ratios, and foreclosure implications.',
         20,
         2,
         'Loans',
         '/images/secured-unsecured.png'
  UNION ALL
  SELECT 'loan-defaults',
         'Loan Defaults & Recovery Process',
         'What happens when EMIs are missed: penalties, collections, SARFAESI, and settlement options.',
         'Explore legal processes that lenders follow during defaults, from reminder calls to repossession, restructuring, or settlements. Learn rights borrowers retain during recovery.',
         28,
         3,
         'Loans',
         '/images/defaults.png'
) AS seed
WHERE NOT EXISTS(SELECT 1 FROM lessons WHERE lessons.slug = seed.slug);

-- Quiz JSON payloads
INSERT INTO quizzes (lesson_id, questions, passing_percent)
SELECT l.id,
       JSON_ARRAY(
         JSON_OBJECT(
           'q', 'What does EMI stand for?',
           'options', JSON_ARRAY('Equated Monthly Instalment', 'Estimated Mortgage Indicator', 'Equal Margin Interest'),
           'answer', 0
         ),
         JSON_OBJECT(
           'q', 'Which component of a loan reduces with every EMI payment?',
           'options', JSON_ARRAY('Principal outstanding', 'Processing fee', 'Property value'),
           'answer', 0
         )
       ),
       70
FROM lessons l
WHERE l.slug = 'loan-basics'
  AND NOT EXISTS (SELECT 1 FROM quizzes q WHERE q.lesson_id = l.id);

INSERT INTO quizzes (lesson_id, questions, passing_percent)
SELECT l.id,
       JSON_ARRAY(
         JSON_OBJECT(
           'q', 'Which loan usually requires collateral?',
           'options', JSON_ARRAY('Personal loan', 'Credit-card loan', 'Home loan'),
           'answer', 2
         ),
         JSON_OBJECT(
           'q', 'Gold loans are typically classified as?',
           'options', JSON_ARRAY('Secured', 'Unsecured', 'Hybrid'),
           'answer', 0
         ),
         JSON_OBJECT(
           'q', 'What is the main benefit of education loans?',
           'options', JSON_ARRAY('Lower interest forever', 'Moratorium during study period', 'No documentation required'),
           'answer', 1
         )
       ),
       70
FROM lessons l
WHERE l.slug = 'loan-types'
  AND NOT EXISTS (SELECT 1 FROM quizzes q WHERE q.lesson_id = l.id);

INSERT INTO quizzes (lesson_id, questions, passing_percent)
SELECT l.id,
       JSON_ARRAY(
         JSON_OBJECT(
           'q', 'EMI for a fixed-rate loan remains the same because?',
           'options', JSON_ARRAY('Principal stays constant', 'Interest rate keeps changing', 'Total payment is level but composition changes'),
           'answer', 2
         ),
         JSON_OBJECT(
           'q', 'Prepaying your loan early typically saves most on?',
           'options', JSON_ARRAY('Processing fees', 'Interest cost', 'Principal amount owed'),
           'answer', 1
         ),
         JSON_OBJECT(
           'q', 'An amortisation schedule shows?',
           'options', JSON_ARRAY('Only interest payments', 'Breakdown of each EMI into interest & principal', 'Stock market forecasts'),
           'answer', 1
         )
       ),
       75
FROM lessons l
WHERE l.slug = 'emi-calculation'
  AND NOT EXISTS (SELECT 1 FROM quizzes q WHERE q.lesson_id = l.id);

INSERT INTO quizzes (lesson_id, questions, passing_percent)
SELECT l.id,
       JSON_ARRAY(
         JSON_OBJECT(
           'q', 'Which bureau is widely used in India for credit scores?',
           'options', JSON_ARRAY('TransUnion CIBIL', 'FICO', 'Experian US only'),
           'answer', 0
         ),
         JSON_OBJECT(
           'q', 'A hard enquiry typically occurs when?',
           'options', JSON_ARRAY('You review your own report', 'A lender checks your report for new credit', 'Utility company updates address'),
           'answer', 1
         ),
         JSON_OBJECT(
           'q', 'Maintaining credit utilisation below what percent is often recommended?',
           'options', JSON_ARRAY('10%', '30%', '80%'),
           'answer', 1
         )
       ),
       75
FROM lessons l
WHERE l.slug = 'loan-credit-score'
  AND NOT EXISTS (SELECT 1 FROM quizzes q WHERE q.lesson_id = l.id);

INSERT INTO quizzes (lesson_id, questions, passing_percent)
SELECT l.id,
       JSON_ARRAY(
         JSON_OBJECT(
           'q', 'Secured loans usually offer?',
           'options', JSON_ARRAY('Higher interest due to collateral', 'Lower interest because lender has claim on asset', 'No collateral requirement'),
           'answer', 1
         ),
         JSON_OBJECT(
           'q', 'Loan-to-value (LTV) represents?',
           'options', JSON_ARRAY('Borrower income divided by EMI', 'Loan amount versus collateral value', 'Interest rate multiplied by tenure'),
           'answer', 1
         ),
         JSON_OBJECT(
           'q', 'Unsecured personal loans rely heavily on?',
           'options', JSON_ARRAY('Collateral quality', 'Credit score & income proof', 'Property valuation'),
           'answer', 1
         )
       ),
       75
FROM lessons l
WHERE l.slug = 'secured-vs-unsecured'
  AND NOT EXISTS (SELECT 1 FROM quizzes q WHERE q.lesson_id = l.id);

INSERT INTO quizzes (lesson_id, questions, passing_percent)
SELECT l.id,
       JSON_ARRAY(
         JSON_OBJECT(
           'q', 'How many EMIs typically classify an account as NPA (non-performing asset) in India?',
           'options', JSON_ARRAY('1 missed EMI', '3 consecutive missed EMIs', '10 EMIs missed'),
           'answer', 1
         ),
         JSON_OBJECT(
           'q', 'SARFAESI Act empowers lenders to?',
           'options', JSON_ARRAY('Arrest borrowers', 'Seize and auction secured assets', 'Waive interest automatically'),
           'answer', 1
         ),
         JSON_OBJECT(
           'q', 'Loan restructuring usually aims to?',
           'options', JSON_ARRAY('Increase EMI to close faster', 'Modify tenure/interest to make EMIs affordable', 'Write off entire principal'),
           'answer', 1
         )
       ),
       80
FROM lessons l
WHERE l.slug = 'loan-defaults'
  AND NOT EXISTS (SELECT 1 FROM quizzes q WHERE q.lesson_id = l.id);

INSERT INTO quests (title, description, reward_xp, reward_coins, target_type, target_value, criteria)
SELECT title, description, reward_xp, reward_coins, target_type, target_value, criteria
FROM (
  SELECT 'Loan Rookie' AS title,
         'Complete the first two lessons in the Loan module.' AS description,
         50 AS reward_xp,
         75 AS reward_coins,
         'lesson_category' AS target_type,
         2 AS target_value,
         JSON_OBJECT('type', 'lesson_category', 'category', 'Loans', 'count', 2) AS criteria
  UNION ALL
  SELECT 'EMI Expert',
         'Score at least 80% on the EMI calculation quiz.',
         80,
         90,
         'quiz_slug',
         1,
         JSON_OBJECT('type', 'quiz_slug', 'slug', 'emi-calculation', 'score', 80)
  UNION ALL
  SELECT 'Credit Guardian',
         'Log in and review your knowledge score after completing the credit-score lesson.',
         60,
         70,
         'lesson_slug',
         1,
         JSON_OBJECT('type', 'lesson_slug', 'slug', 'loan-credit-score', 'completed', true)
  UNION ALL
  SELECT 'Collateral Commander',
         'Finish "Secured vs Unsecured" and execute one timeline trade in Time Travel.',
         100,
         120,
         'mixed',
         1,
         JSON_OBJECT('type', 'mixed', 'requirements', JSON_ARRAY(
           JSON_OBJECT('kind', 'lesson_slug', 'slug', 'secured-vs-unsecured', 'completed', true),
           JSON_OBJECT('kind', 'timeline_trades', 'count', 1)
         ))
) AS seed
WHERE NOT EXISTS (
  SELECT 1
  FROM quests q
  WHERE q.title = seed.title
);

