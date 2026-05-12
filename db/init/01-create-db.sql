-- Create AppDB
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_database WHERE datname = 'AppDB') THEN
    CREATE DATABASE "AppDB";
  END IF;
END
$$;