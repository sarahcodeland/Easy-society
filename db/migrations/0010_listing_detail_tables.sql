-- ── Buy / Sell ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS buy_sell_details (
  id            serial PRIMARY KEY,
  listing_id    uuid NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  subcategory   text,
  brand         text,
  model         text,
  year          int,
  condition     text CHECK (condition IN ('new','like_new','used','refurbished')),
  price_type    text NOT NULL DEFAULT 'fixed'
    CHECK (price_type IN ('fixed','negotiable','free')),
  extra_details jsonb NOT NULL DEFAULT '{}'
);

-- ── Rent ──────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS rent_details (
  id               serial PRIMARY KEY,
  listing_id       uuid NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  property_type    text,
  bedrooms         text,
  furnishing       text CHECK (furnishing IN ('unfurnished','semi_furnished','fully_furnished')),
  deposit_amount   numeric(12,2),
  amenities        text[] NOT NULL DEFAULT '{}',
  available_from   date,
  preferred_tenant text NOT NULL DEFAULT 'any'
    CHECK (preferred_tenant IN ('any','family','bachelor','female'))
);

-- ── Services ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS service_details (
  id               serial PRIMARY KEY,
  listing_id       uuid NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  service_type     text,
  experience_years int,
  availability     text,
  area_coverage    text,
  price_type       text CHECK (price_type IN ('per_hour','per_day','per_job','monthly'))
);

-- ── Jobs ──────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS job_details (
  id                serial PRIMARY KEY,
  listing_id        uuid NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  company_name      text,
  job_type          text CHECK (job_type IN ('full_time','part_time','daily_wage','contract')),
  experience_level  text CHECK (experience_level IN ('fresher','1_2_years','3_5_years','expert')),
  salary_min        numeric(10,2),
  salary_max        numeric(10,2),
  salary_type       text NOT NULL DEFAULT 'monthly'
    CHECK (salary_type IN ('monthly','daily','hourly')),
  is_urgent         boolean NOT NULL DEFAULT false,
  openings          int NOT NULL DEFAULT 1,
  skills_required   text[] NOT NULL DEFAULT '{}',
  gender_preference text NOT NULL DEFAULT 'any'
    CHECK (gender_preference IN ('any','male','female'))
);

-- ── Business listings ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS business_listing_details (
  id                serial PRIMARY KEY,
  listing_id        uuid NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  business_name     text NOT NULL,
  business_category text,
  address           text,
  working_hours     jsonb NOT NULL DEFAULT '{}',
  website           text,
  amenities         text[] NOT NULL DEFAULT '{}',
  established_year  int
);
