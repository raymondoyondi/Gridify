-- Gridify PostgreSQL Schema
-- Tables for storing dashboard configurations, user data, and telemetry

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Dashboards table
CREATE TABLE IF NOT EXISTS dashboards (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  layout JSONB DEFAULT '[]',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, name)
);

-- Widgets table
CREATE TABLE IF NOT EXISTS widgets (
  id SERIAL PRIMARY KEY,
  dashboard_id INTEGER NOT NULL REFERENCES dashboards(id) ON DELETE CASCADE,
  widget_id VARCHAR(255) UNIQUE NOT NULL,
  title VARCHAR(255) NOT NULL,
  subtitle VARCHAR(255),
  type VARCHAR(50) NOT NULL,
  width INTEGER DEFAULT 2,
  height INTEGER DEFAULT 300,
  "order" INTEGER,
  custom_data JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Telemetry data table
CREATE TABLE IF NOT EXISTS telemetry_data (
  id SERIAL PRIMARY KEY,
  device_id VARCHAR(255) NOT NULL,
  device_name VARCHAR(255),
  device_type VARCHAR(100),
  status VARCHAR(100),
  score DECIMAL(5, 2),
  uptime INTEGER,
  load VARCHAR(50),
  active BOOLEAN DEFAULT true,
  recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Query history table (for tracking AI-generated queries)
CREATE TABLE IF NOT EXISTS query_history (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  dashboard_id INTEGER REFERENCES dashboards(id) ON DELETE SET NULL,
  query_text TEXT NOT NULL,
  ai_response JSONB,
  status VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for better query performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_dashboards_user_id ON dashboards(user_id);
CREATE INDEX idx_widgets_dashboard_id ON widgets(dashboard_id);
CREATE INDEX idx_telemetry_device_id ON telemetry_data(device_id);
CREATE INDEX idx_telemetry_recorded_at ON telemetry_data(recorded_at);
CREATE INDEX idx_query_history_user_id ON query_history(user_id);
CREATE INDEX idx_query_history_dashboard_id ON query_history(dashboard_id);
