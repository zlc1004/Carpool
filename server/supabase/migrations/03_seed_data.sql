-- Insert sample school
INSERT INTO schools (id, name, domain, address, city, state, zip, settings) VALUES 
(uuid_generate_v4(), 'Sample University', 'sample.edu', '123 University Ave', 'College Town', 'CA', '12345', 
 '{"features": {"carpooling": true, "verification_required": true}, "limits": {"max_ride_seats": 6}}'),
(uuid_generate_v4(), 'Test College', 'test.edu', '456 College St', 'Test City', 'NY', '67890',
 '{"features": {"carpooling": true, "verification_required": false}, "limits": {"max_ride_seats": 4}}');

-- Insert sample places for the schools
WITH sample_school AS (SELECT id FROM schools WHERE domain = 'sample.edu' LIMIT 1),
     test_school AS (SELECT id FROM schools WHERE domain = 'test.edu' LIMIT 1)

INSERT INTO places (school_id, name, address, city, state, zip, latitude, longitude, place_type, verified) VALUES
-- Sample University places
((SELECT id FROM sample_school), 'Main Campus', '123 University Ave', 'College Town', 'CA', '12345', 37.7749, -122.4194, 'school', true),
((SELECT id FROM sample_school), 'Student Parking Lot A', '125 University Ave', 'College Town', 'CA', '12345', 37.7751, -122.4190, 'school', true),
((SELECT id FROM sample_school), 'Library', '130 University Ave', 'College Town', 'CA', '12345', 37.7755, -122.4200, 'school', true),
((SELECT id FROM sample_school), 'Downtown Plaza', '200 Main St', 'College Town', 'CA', '12345', 37.7760, -122.4180, 'popular', true),
((SELECT id FROM sample_school), 'Airport Shuttle Stop', '500 Airport Rd', 'College Town', 'CA', '12345', 37.7800, -122.4000, 'popular', true),

-- Test College places  
((SELECT id FROM test_school), 'Test Campus Center', '456 College St', 'Test City', 'NY', '67890', 40.7128, -74.0060, 'school', true),
((SELECT id FROM test_school), 'North Parking', '460 College St', 'Test City', 'NY', '67890', 40.7130, -74.0055, 'school', true),
((SELECT id FROM test_school), 'Student Union', '470 College St', 'Test City', 'NY', '67890', 40.7135, -74.0070, 'school', true),
((SELECT id FROM test_school), 'City Center', '100 Main Ave', 'Test City', 'NY', '67890', 40.7150, -74.0040, 'popular', true),
((SELECT id FROM test_school), 'Train Station', '300 Rail St', 'Test City', 'NY', '67890', 40.7100, -74.0020, 'popular', true);

-- Insert system settings
INSERT INTO system_settings (key, value, description) VALUES
('app_version', '"1.0.0"', 'Current app version'),
('maintenance_mode', 'false', 'Whether the app is in maintenance mode'),
('max_ride_seats', '6', 'Maximum number of seats allowed per ride'),
('captcha_enabled', 'true', 'Whether CAPTCHA verification is enabled'),
('email_verification_required', 'true', 'Whether email verification is required for new users'),
('push_notifications_enabled', 'true', 'Whether push notifications are enabled'),
('rate_limit_requests_per_minute', '60', 'Rate limit for API requests per minute'),
('file_upload_max_size_mb', '10', 'Maximum file upload size in MB'),
('ride_advance_booking_days', '30', 'Maximum days in advance rides can be booked'),
('ride_cancellation_hours', '2', 'Minimum hours before departure to cancel a ride');

-- Insert sample captcha sessions (for testing)
INSERT INTO captcha_sessions (id, text, solved, used, expires_at) VALUES
(uuid_generate_v4(), 'TEST123', false, false, NOW() + INTERVAL '10 minutes'),
(uuid_generate_v4(), 'SAMPLE', true, false, NOW() + INTERVAL '5 minutes'),
(uuid_generate_v4(), 'EXPIRED', false, false, NOW() - INTERVAL '1 minute');
