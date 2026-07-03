-- Initialization script for Gridify database
-- This script runs automatically when the PostgreSQL container starts

-- Create schema
\i /docker-entrypoint-initdb.d/schema.sql

-- Insert sample data
INSERT INTO users (username, email) VALUES 
  ('admin', 'admin@gridify.local'),
  ('demo_user', 'demo@gridify.local')
ON CONFLICT (email) DO NOTHING;

-- Insert sample dashboards
INSERT INTO dashboards (user_id, name, description, layout) VALUES 
  ((SELECT id FROM users WHERE username = 'admin'), 'System Monitoring', 'Main system telemetry dashboard', 
   '[{"id":"device_status","type":"table","w":2},{"id":"temp_history","type":"chart","w":2}]'),
  ((SELECT id FROM users WHERE username = 'demo_user'), 'IoT Devices', 'IoT device telemetry and status',
   '[{"id":"device_status","type":"table","w":3}]')
ON CONFLICT (user_id, name) DO NOTHING;

-- Insert sample telemetry data
INSERT INTO telemetry_data 
  (device_id, device_name, device_type, status, score, uptime, load, active) 
VALUES
  ('marchival_arc', 'Marchival Arc', 'Node', 'alert', 41.53, 42, '4.8K', true),
  ('device_07', 'Device 07', 'Node', 'alert', 41.53, 42, '4.8K', true),
  ('home_hub', 'Home Hub', 'Host', 'operational', 28.78, 48, '2.3K', true),
  ('device_01', 'Device 01', 'Host', 'operational', 28.78, 88, '2.3K', true),
  ('device_04', 'Device 04', 'Host', 'operational', 28.78, 88, '2.3K', true),
  ('device_02', 'Device 02', 'Proxy', 'flow_controller', 27.73, 93, '6.7K', true),
  ('device_05', 'Device 05', 'Proxy', 'flow_controller', 27.73, 93, '2.3K', true),
  ('main_server', 'Main Server', 'Host', 'operational', 27.53, 93, '6.7K', true),
  ('device_03', 'Device 03', 'Node', 'alert', 27.53, 93, '2.3K', true),
  ('device_06', 'Device 06', 'Proxy', 'flow_controller', 27.53, 93, '6.7K', true);
