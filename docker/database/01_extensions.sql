CREATE OR REPLACE FUNCTION immutable_array_to_string(text[], text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
	SELECT array_to_string($1, $2);
$$;

-- Setup extensions, but don't fail if they aren't available in the image. 
-- This allows us to use the same image for both development and production, 
-- even if the production image has additional extensions installed.
DO $$
BEGIN
	CREATE EXTENSION IF NOT EXISTS vector;
EXCEPTION
	WHEN undefined_file THEN
		RAISE WARNING 'Extension "vector" is not available in this image. Continuing without it.';
END $$;

DO $$
BEGIN
	CREATE EXTENSION IF NOT EXISTS postgis;
EXCEPTION
	WHEN undefined_file THEN
		RAISE WARNING 'Extension "postgis" is not available in this image. Continuing without it.';
END $$;

DO $$
BEGIN
	CREATE EXTENSION IF NOT EXISTS postgis_topology;
EXCEPTION
	WHEN undefined_file THEN
		RAISE WARNING 'Extension "postgis_topology" is not available in this image. Continuing without it.';
END $$;