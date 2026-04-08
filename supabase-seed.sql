-- Concerns
INSERT INTO concerns (id, name, icon, procedure_count, description, image) VALUES
('face', 'Face', 'smile', 12, 'Facial rejuvenation and contouring procedures', ''),
('nose', 'Nose', 'wind', 4, 'Rhinoplasty and non-surgical nose reshaping', ''),
('skin', 'Skin', 'sparkles', 8, 'Skin rejuvenation, resurfacing, and treatments', ''),
('body', 'Body', 'heart', 10, 'Body contouring and sculpting procedures', ''),
('eyes', 'Eyes', 'eye', 5, 'Eyelid surgery and under-eye treatments', ''),
('lips', 'Lips', 'syringe', 3, 'Lip augmentation and enhancement', ''),
('hair', 'Hair', 'waves', 4, 'Hair restoration and transplant procedures', ''),
('breast', 'Breast', 'star', 6, 'Breast augmentation, lift, and reduction', '');

-- Procedures
INSERT INTO procedures (id, concern_id, name, type, cost_min, cost_max, recovery_days, rating, popularity, overview, how_it_works, recovery_timeline, expected_results) VALUES
('rhinoplasty', 'nose', 'Rhinoplasty', 'surgical', 8000, 15000, 14, 4.7, 95,
 'Rhinoplasty reshapes the nose to improve its appearance and proportion with the rest of the face. It can also correct breathing difficulties caused by structural defects.',
 'The surgeon makes incisions inside the nose or across the columella. Bone and cartilage are then reshaped to achieve the desired contour. The procedure typically takes 2–3 hours under general anesthesia.',
 '[{"day":"Day 1–3","description":"Swelling and bruising around the eyes. Nasal splint in place."},{"day":"Day 7","description":"Splint removed. Most bruising fades."},{"day":"Week 2–3","description":"Return to work/school. Avoid strenuous activity."},{"day":"Month 3–6","description":"Swelling continues to resolve. Shape refines."},{"day":"Year 1","description":"Final results visible."}]',
 'A more balanced, proportionate nose that complements your facial features. Results are permanent.'),

('nose-filler', 'nose', 'Non-Surgical Nose Job', 'non-surgical', 800, 2000, 1, 4.3, 80,
 'Uses dermal fillers to smooth bumps, lift the tip, or improve symmetry without surgery.',
 'Hyaluronic acid filler is strategically injected into specific areas of the nose. The procedure takes 15–30 minutes with topical numbing.',
 '[{"day":"Day 1","description":"Minor swelling. Resume normal activities."},{"day":"Week 1","description":"Final results visible."},{"day":"Month 12–18","description":"Results fade; maintenance needed."}]',
 'Subtle improvements to nose shape. Results last 12–18 months.'),

('facelift', 'face', 'Facelift', 'surgical', 12000, 25000, 21, 4.8, 88,
 'A facelift tightens sagging skin and repositions deeper tissues to restore a youthful facial contour.',
 'Incisions are made along the hairline and around the ears. Underlying muscles are tightened, excess skin removed, and the remaining skin re-draped smoothly.',
 '[{"day":"Day 1–3","description":"Moderate swelling and tightness. Drains may be placed."},{"day":"Week 1","description":"Stitches removed. Swelling begins to subside."},{"day":"Week 2–3","description":"Return to non-strenuous work."},{"day":"Month 3","description":"Most swelling resolved. Results becoming apparent."}]',
 'A naturally refreshed appearance that can take 10+ years off your look. Results last 7–10 years.'),

('botox', 'face', 'Botox', 'non-surgical', 200, 600, 0, 4.6, 98,
 'Botulinum toxin injections temporarily relax facial muscles to smooth wrinkles and fine lines.',
 'Small amounts of botulinum toxin are injected into targeted muscles using a fine needle. The procedure takes 10–15 minutes with no anesthesia needed.',
 '[{"day":"Day 1","description":"Tiny bumps at injection sites resolve within hours."},{"day":"Day 3–5","description":"Effects begin to appear."},{"day":"Day 14","description":"Full results visible."},{"day":"Month 3–4","description":"Effects wear off; retreatment recommended."}]',
 'Smoother skin with reduced fine lines and wrinkles. Results last 3–4 months.'),

('blepharoplasty', 'eyes', 'Blepharoplasty', 'surgical', 4000, 8000, 10, 4.7, 75,
 'Eyelid surgery removes excess skin, muscle, and fat from the upper and/or lower eyelids.',
 'Incisions are hidden in the natural creases of the eyelids. Excess tissue is removed or repositioned for a refreshed look.',
 '[{"day":"Day 1–3","description":"Cold compresses to manage swelling."},{"day":"Week 1","description":"Stitches removed. Bruising fades."},{"day":"Week 2","description":"Return to normal activities."}]',
 'More alert, youthful-looking eyes. Results last many years.'),

('lip-filler', 'lips', 'Lip Filler', 'non-surgical', 500, 1200, 2, 4.5, 92,
 'Hyaluronic acid fillers add volume, shape, and definition to the lips.',
 'Filler is injected into the lips using a fine needle or cannula. Topical numbing is applied beforehand. Takes 15–30 minutes.',
 '[{"day":"Day 1–2","description":"Swelling and mild bruising."},{"day":"Day 3–5","description":"Swelling subsides. Shape settles."},{"day":"Week 2","description":"Final results visible."}]',
 'Fuller, more defined lips. Results last 6–12 months.'),

('liposuction', 'body', 'Liposuction', 'surgical', 5000, 12000, 14, 4.6, 85,
 'Liposuction removes stubborn fat deposits to contour and reshape specific body areas.',
 'A thin cannula is inserted through small incisions. Fat is loosened and suctioned out. May be combined with tumescent technique for comfort.',
 '[{"day":"Day 1–3","description":"Compression garment worn. Moderate soreness."},{"day":"Week 1–2","description":"Swelling peaks then begins to subside."},{"day":"Month 1","description":"Return to exercise. Visible improvement."},{"day":"Month 3–6","description":"Final contour emerges."}]',
 'Slimmer, more defined body contour. Results are permanent with stable weight.'),

('chemical-peel', 'skin', 'Chemical Peel', 'non-surgical', 150, 800, 7, 4.4, 70,
 'A chemical solution is applied to the skin to remove damaged outer layers and reveal smoother, healthier skin.',
 'The provider applies a chemical solution (glycolic, salicylic, or TCA acid) to the treatment area. The skin peels over several days.',
 '[{"day":"Day 1–2","description":"Redness and tightness. Skin begins to peel."},{"day":"Day 3–5","description":"Active peeling. Avoid sun exposure."},{"day":"Week 1–2","description":"New skin revealed. Apply SPF diligently."}]',
 'Improved skin texture, reduced fine lines, and more even tone. Multiple sessions recommended.');

-- Providers
INSERT INTO providers (id, name, photo, specialty, rating, review_count, distance, response_time, years_experience, gender, certifications, bio, location, consultation_type, status, subscription_tier) VALUES
('dr-chen', 'Dr. Sarah Chen', '', ARRAY['Rhinoplasty','Facelift','Blepharoplasty'], 4.9, 234, 3.2, '< 2 hours', 15, 'Female',
 ARRAY['Board Certified Plastic Surgeon','ABPS','Fellow AACS'],
 'Dr. Chen is a double board-certified plastic surgeon specializing in facial procedures. She trained at Johns Hopkins and has been practicing in Beverly Hills for 15 years.',
 'Beverly Hills, CA', ARRAY['In-Person','Virtual'], 'approved', 'premium'),

('dr-martinez', 'Dr. James Martinez', '', ARRAY['Botox','Lip Filler','Chemical Peel'], 4.7, 189, 5.1, '< 4 hours', 10, 'Male',
 ARRAY['Board Certified Dermatologist','AAD Member'],
 'Dr. Martinez focuses on non-surgical aesthetics and has a reputation for natural-looking results. His clinic in West Hollywood is known for its relaxing atmosphere.',
 'West Hollywood, CA', ARRAY['In-Person'], 'approved', 'free'),

('dr-patel', 'Dr. Priya Patel', '', ARRAY['Rhinoplasty','Nose Filler','Botox'], 4.8, 312, 7.8, '< 1 hour', 12, 'Female',
 ARRAY['Board Certified Facial Plastic Surgeon','AAFPRS Fellow'],
 'Dr. Patel is one of LA''s top facial plastic surgeons, known for her expertise in ethnic rhinoplasty and minimally invasive facial rejuvenation.',
 'Santa Monica, CA', ARRAY['In-Person','Virtual'], 'approved', 'premium'),

('dr-thompson', 'Dr. Michael Thompson', '', ARRAY['Liposuction','Facelift','Blepharoplasty'], 4.6, 156, 4.5, '< 6 hours', 20, 'Male',
 ARRAY['Board Certified Plastic Surgeon','ASPS Member'],
 'With 20 years of experience, Dr. Thompson specializes in body contouring and facial rejuvenation. He has performed over 5,000 successful procedures.',
 'Brentwood, CA', ARRAY['In-Person'], 'approved', 'free'),

('dr-kim', 'Dr. Julie Kim', '', ARRAY['Lip Filler','Botox','Chemical Peel','Nose Filler'], 4.8, 278, 2.1, '< 30 min', 8, 'Female',
 ARRAY['Board Certified Dermatologist','Allergan Trainer'],
 'Dr. Kim is a leading injector in LA, known for her artistic eye and conservative approach. She believes in enhancing natural beauty.',
 'Beverly Hills, CA', ARRAY['In-Person','Virtual'], 'approved', 'premium'),

('dr-rodriguez', 'Dr. Carlos Rodriguez', '', ARRAY['Rhinoplasty','Facelift','Liposuction'], 4.5, 98, 9.3, '< 8 hours', 18, 'Male',
 ARRAY['Board Certified Plastic Surgeon','ABPS'],
 'Dr. Rodriguez brings nearly two decades of surgical experience to his Pasadena practice, specializing in transformative facial and body procedures.',
 'Pasadena, CA', ARRAY['In-Person'], 'approved', 'free');

-- Provider-Procedure pricing
INSERT INTO provider_procedures (provider_id, procedure_id, price) VALUES
('dr-chen', 'rhinoplasty', 12000),
('dr-chen', 'facelift', 18000),
('dr-chen', 'blepharoplasty', 6000),
('dr-martinez', 'botox', 400),
('dr-martinez', 'lip-filler', 800),
('dr-martinez', 'chemical-peel', 350),
('dr-patel', 'rhinoplasty', 10500),
('dr-patel', 'nose-filler', 1200),
('dr-patel', 'botox', 350),
('dr-thompson', 'liposuction', 8500),
('dr-thompson', 'facelift', 20000),
('dr-thompson', 'blepharoplasty', 5500),
('dr-kim', 'lip-filler', 950),
('dr-kim', 'botox', 450),
('dr-kim', 'chemical-peel', 500),
('dr-kim', 'nose-filler', 1500),
('dr-rodriguez', 'rhinoplasty', 9000),
('dr-rodriguez', 'facelift', 16000),
('dr-rodriguez', 'liposuction', 7000);

-- Reviews
INSERT INTO reviews (id, provider_id, procedure_id, rating, body, patient_name, date) VALUES
('r1', 'dr-chen', 'rhinoplasty', 5, 'Dr. Chen completely transformed my nose. The results are so natural — people can tell something is different but can''t pinpoint what. Recovery was smooth and the team was incredibly supportive.', 'Jessica M.', '2024-11-15'),
('r2', 'dr-chen', 'rhinoplasty', 5, 'Best decision I ever made. Dr. Chen took the time to understand exactly what I wanted. My nose fits my face perfectly now.', 'Amanda R.', '2024-10-22'),
('r3', 'dr-martinez', 'botox', 4, 'Very natural results. Dr. Martinez has a great eye for balance. Will definitely come back for my next appointment.', 'Rachel K.', '2024-12-01'),
('r4', 'dr-patel', 'rhinoplasty', 5, 'Dr. Patel is an artist. She understood the nuances of ethnic rhinoplasty and gave me results that look natural and beautiful.', 'Priya S.', '2024-09-30'),
('r5', 'dr-kim', 'lip-filler', 5, 'So natural! Dr. Kim knows exactly how to enhance without overdoing it. My lips look fuller but still very much like me.', 'Taylor W.', '2024-11-28'),
('r6', 'dr-thompson', 'liposuction', 4, 'Great results on my flanks. Recovery was longer than expected but the final contour is exactly what I wanted.', 'Michael B.', '2024-10-15'),
('r7', 'dr-patel', 'botox', 5, 'Quick, painless, and perfect results every time. Dr. Patel''s clinic is my go-to for all injectables.', 'Sarah L.', '2024-12-10'),
('r8', 'dr-kim', 'botox', 5, 'I''ve been going to Dr. Kim for 3 years. Consistently excellent results and the most welcoming staff.', 'Lauren D.', '2024-11-05');
