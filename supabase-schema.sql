DROP TABLE IF EXISTS analytics_events CASCADE;
DROP TABLE IF EXISTS consultations CASCADE;
DROP TABLE IF EXISTS reviews CASCADE;
DROP TABLE IF EXISTS review_requests CASCADE;
DROP TABLE IF EXISTS provider_whitelist CASCADE;
DROP TABLE IF EXISTS admins CASCADE;
DROP TABLE IF EXISTS provider_procedures CASCADE;
DROP TABLE IF EXISTS providers CASCADE;
DROP TABLE IF EXISTS procedures CASCADE;
DROP TABLE IF EXISTS concerns CASCADE;

CREATE TABLE concerns (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  icon TEXT NOT NULL,
  procedure_count INT NOT NULL DEFAULT 0,
  description TEXT NOT NULL,
  image TEXT DEFAULT ''
);

CREATE TABLE procedures (
  id TEXT PRIMARY KEY,
  concern_id TEXT NOT NULL REFERENCES concerns(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('surgical', 'non-surgical')),
  cost_min INT NOT NULL,
  cost_max INT NOT NULL,
  recovery_days INT NOT NULL,
  rating NUMERIC(2,1) NOT NULL,
  popularity INT NOT NULL DEFAULT 0,
  overview TEXT NOT NULL,
  how_it_works TEXT NOT NULL,
  recovery_timeline JSONB NOT NULL DEFAULT '[]',
  expected_results TEXT NOT NULL
);

CREATE TABLE providers (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  photo TEXT DEFAULT '',
  specialty TEXT[] NOT NULL DEFAULT '{}',
  rating NUMERIC(2,1) NOT NULL DEFAULT 0,
  review_count INT NOT NULL DEFAULT 0,
  distance NUMERIC(4,1) NOT NULL DEFAULT 0,
  response_time TEXT DEFAULT '< 24 hours',
  years_experience INT NOT NULL DEFAULT 0,
  gender TEXT DEFAULT '',
  certifications TEXT[] NOT NULL DEFAULT '{}',
  bio TEXT DEFAULT '',
  location TEXT DEFAULT '',
  consultation_type TEXT[] NOT NULL DEFAULT '{}',
  practice_name TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  address TEXT DEFAULT '',
  city_state TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'approved' CHECK (status IN ('pending', 'approved', 'rejected')),
  subscription_tier TEXT NOT NULL DEFAULT 'premium' CHECK (subscription_tier IN ('free', 'premium')),
  created_at TIMESTAMPTZ DEFAULT now(),
  languages TEXT[] DEFAULT '{}',
  notification_preferences JSONB DEFAULT '{"sms": false, "email": true, "weekly_digest": true}',
  composio_connection_status JSONB DEFAULT '{"calendar": "not_connected", "email": "not_connected", "provider": "composio"}',
  instagram_url TEXT DEFAULT '',
  email TEXT DEFAULT ''
);

CREATE TABLE provider_procedures (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  provider_id TEXT NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  procedure_id TEXT NOT NULL REFERENCES procedures(id) ON DELETE CASCADE,
  price INT NOT NULL,
  UNIQUE(provider_id, procedure_id)
);

CREATE TABLE reviews (
  id TEXT PRIMARY KEY,
  provider_id TEXT NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  procedure_id TEXT NOT NULL REFERENCES procedures(id) ON DELETE CASCADE,
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  body TEXT NOT NULL,
  patient_name TEXT NOT NULL,
  date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  stage TEXT CHECK (stage IN ('consultation', 'procedure', 'follow_up')),
  consult_rating INT,
  results_rating INT,
  recovery_rating INT
);

CREATE TABLE admins (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE provider_whitelist (
  email TEXT PRIMARY KEY,
  note TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  invited_by UUID REFERENCES admins(user_id) ON DELETE SET NULL
);

CREATE TABLE consultations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  access_token TEXT NOT NULL UNIQUE DEFAULT gen_random_uuid()::text,
  provider_id TEXT NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  patient_name TEXT NOT NULL,
  phone TEXT DEFAULT '',
  email TEXT NOT NULL,
  preferred_date DATE,
  message TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'replied', 'booked', 'cancelled')),
  scheduled_at TIMESTAMPTZ,
  meeting_mode TEXT DEFAULT '' CHECK (meeting_mode IN ('', 'virtual', 'in_person', 'phone')),
  meeting_location TEXT DEFAULT '',
  booking_notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE review_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT NOT NULL UNIQUE DEFAULT gen_random_uuid()::text,
  consultation_id UUID NOT NULL REFERENCES consultations(id) ON DELETE CASCADE,
  provider_id TEXT NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  procedure_id TEXT NOT NULL REFERENCES procedures(id) ON DELETE CASCADE,
  patient_email TEXT NOT NULL,
  patient_name TEXT NOT NULL,
  stage TEXT NOT NULL DEFAULT 'consultation' CHECK (stage IN ('consultation', 'procedure', 'follow_up')),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT now() + interval '30 days',
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);


CREATE TABLE analytics_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  provider_id TEXT REFERENCES providers(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('profile_view', 'procedure_click', 'compare_view', 'consultation_request')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);
