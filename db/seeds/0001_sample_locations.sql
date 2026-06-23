-- Small sample of the India location hierarchy for local development and
-- demos. Production would load the full Census/LGD dataset via a one-time
-- import script instead of hand-written rows like this.

BEGIN;

WITH ts AS (
  INSERT INTO locations (name, type) VALUES ('Telangana', 'state') RETURNING id
), hyd_dist AS (
  INSERT INTO locations (name, type, parent_id) SELECT 'Hyderabad', 'district', id FROM ts RETURNING id
), hyd_city AS (
  INSERT INTO locations (name, type, parent_id) SELECT 'Hyderabad', 'city', id FROM hyd_dist RETURNING id
), kukatpally_mandal AS (
  INSERT INTO locations (name, type, parent_id) SELECT 'Kukatpally', 'mandal', id FROM hyd_city RETURNING id
), kukatpally_area AS (
  INSERT INTO locations (name, type, parent_id, lat, lng)
    SELECT 'Kukatpally', 'area', id, 17.4849, 78.4138 FROM kukatpally_mandal RETURNING id
), secunderabad_mandal AS (
  INSERT INTO locations (name, type, parent_id) SELECT 'Secunderabad', 'mandal', id FROM hyd_city RETURNING id
), marredpally_area AS (
  INSERT INTO locations (name, type, parent_id, lat, lng)
    SELECT 'Marredpally', 'area', id, 17.4448, 78.4983 FROM secunderabad_mandal RETURNING id
), ap AS (
  INSERT INTO locations (name, type) VALUES ('Andhra Pradesh', 'state') RETURNING id
), vij_dist AS (
  INSERT INTO locations (name, type, parent_id) SELECT 'Visakhapatnam', 'district', id FROM ap RETURNING id
), vij_city AS (
  INSERT INTO locations (name, type, parent_id) SELECT 'Visakhapatnam', 'city', id FROM vij_dist RETURNING id
), vij_mandal AS (
  INSERT INTO locations (name, type, parent_id) SELECT 'Gajuwaka', 'mandal', id FROM vij_city RETURNING id
)
INSERT INTO locations (name, type, parent_id, lat, lng)
  SELECT 'Gajuwaka', 'area', id, 17.6868, 83.2185 FROM vij_mandal;

COMMIT;
