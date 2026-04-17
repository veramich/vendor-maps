-- 001_extensions.sql
-- Created: 2026-04-17
-- Description: Enable required PostgreSQL extensions

-- Core location and map functionality
CREATE EXTENSION IF NOT EXISTS postgis;

-- Fuzzy text search for business names and descriptions
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- UUID generation
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Semantic search -- enable after launch
-- CREATE EXTENSION IF NOT EXISTS vector;