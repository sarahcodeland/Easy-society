-- "Area/village group chat auto-created for every registered area" is
-- enforced at the database level via trigger, not application code, so it
-- holds no matter how an area row is created (seed script, admin panel,
-- future self-service "add my village" flow, etc).

BEGIN;

CREATE OR REPLACE FUNCTION create_chat_group_for_area()
RETURNS trigger AS $$
BEGIN
    IF NEW.type = 'area' THEN
        INSERT INTO chat_groups (location_id, name)
        VALUES (NEW.id, NEW.name || ' Community')
        ON CONFLICT (location_id) DO NOTHING;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_locations_create_chat_group
    AFTER INSERT ON locations
    FOR EACH ROW EXECUTE FUNCTION create_chat_group_for_area();

COMMIT;
