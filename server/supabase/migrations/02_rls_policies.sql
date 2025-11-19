-- Enable Row Level Security on all tables
ALTER TABLE schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE places ENABLE ROW LEVEL SECURITY;
ALTER TABLE rides ENABLE ROW LEVEL SECURITY;
ALTER TABLE ride_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE captcha_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE image_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

-- Helper function to get user's school ID
CREATE OR REPLACE FUNCTION get_user_school_id()
RETURNS UUID AS $$
  SELECT school_id FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- Helper function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT role IN ('admin', 'school_admin') FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- Helper function to check if user is system admin
CREATE OR REPLACE FUNCTION is_system_admin()
RETURNS BOOLEAN AS $$
  SELECT role = 'admin' FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- Schools policies
CREATE POLICY "Users can view their school" ON schools
    FOR SELECT USING (
        id = get_user_school_id() OR is_admin()
    );

CREATE POLICY "System admins can manage schools" ON schools
    FOR ALL USING (is_system_admin());

-- Profiles policies
CREATE POLICY "Users can view profiles in their school" ON profiles
    FOR SELECT USING (
        school_id = get_user_school_id() OR 
        id = auth.uid() OR 
        is_admin()
    );

CREATE POLICY "Users can update their own profile" ON profiles
    FOR UPDATE USING (id = auth.uid());

CREATE POLICY "Admins can update profiles in their school" ON profiles
    FOR UPDATE USING (
        is_admin() AND (
            school_id = get_user_school_id() OR 
            is_system_admin()
        )
    );

CREATE POLICY "Users can insert their own profile" ON profiles
    FOR INSERT WITH CHECK (id = auth.uid());

-- Places policies
CREATE POLICY "Users can view places in their school" ON places
    FOR SELECT USING (
        school_id = get_user_school_id() OR 
        is_admin()
    );

CREATE POLICY "Users can create places in their school" ON places
    FOR INSERT WITH CHECK (
        school_id = get_user_school_id() AND
        created_by = auth.uid()
    );

CREATE POLICY "Users can update their own places" ON places
    FOR UPDATE USING (
        created_by = auth.uid() OR 
        is_admin()
    );

CREATE POLICY "Admins can manage places" ON places
    FOR ALL USING (is_admin());

-- Rides policies
CREATE POLICY "Users can view rides in their school" ON rides
    FOR SELECT USING (
        school_id = get_user_school_id() OR 
        is_admin()
    );

CREATE POLICY "Users can create rides in their school" ON rides
    FOR INSERT WITH CHECK (
        school_id = get_user_school_id() AND
        driver_id = auth.uid()
    );

CREATE POLICY "Drivers can update their own rides" ON rides
    FOR UPDATE USING (
        driver_id = auth.uid() OR 
        is_admin()
    );

CREATE POLICY "Drivers can delete their own rides" ON rides
    FOR DELETE USING (
        driver_id = auth.uid() OR 
        is_admin()
    );

-- Ride participants policies
CREATE POLICY "Users can view participants for rides they're involved in" ON ride_participants
    FOR SELECT USING (
        user_id = auth.uid() OR
        ride_id IN (SELECT id FROM rides WHERE driver_id = auth.uid()) OR
        is_admin()
    );

CREATE POLICY "Users can join rides" ON ride_participants
    FOR INSERT WITH CHECK (
        user_id = auth.uid() AND
        ride_id IN (SELECT id FROM rides WHERE school_id = get_user_school_id())
    );

CREATE POLICY "Users can update their own participation" ON ride_participants
    FOR UPDATE USING (
        user_id = auth.uid() OR
        ride_id IN (SELECT id FROM rides WHERE driver_id = auth.uid()) OR
        is_admin()
    );

CREATE POLICY "Users can cancel their own participation" ON ride_participants
    FOR DELETE USING (
        user_id = auth.uid() OR
        ride_id IN (SELECT id FROM rides WHERE driver_id = auth.uid()) OR
        is_admin()
    );

-- Captcha policies (server-side only, no direct client access)
CREATE POLICY "No direct client access to captcha" ON captcha_sessions
    FOR ALL USING (false);

-- Chat messages policies
CREATE POLICY "Users can view messages for rides they're part of" ON chat_messages
    FOR SELECT USING (
        ride_id IN (
            SELECT r.id FROM rides r 
            LEFT JOIN ride_participants rp ON r.id = rp.ride_id 
            WHERE r.driver_id = auth.uid() OR rp.user_id = auth.uid()
        ) OR
        is_admin()
    );

CREATE POLICY "Users can send messages to rides they're part of" ON chat_messages
    FOR INSERT WITH CHECK (
        sender_id = auth.uid() AND
        ride_id IN (
            SELECT r.id FROM rides r 
            LEFT JOIN ride_participants rp ON r.id = rp.ride_id 
            WHERE r.driver_id = auth.uid() OR rp.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update their own messages" ON chat_messages
    FOR UPDATE USING (sender_id = auth.uid());

-- Notifications policies
CREATE POLICY "Users can view their own notifications" ON notifications
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update their own notifications" ON notifications
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "System can create notifications" ON notifications
    FOR INSERT WITH CHECK (true); -- Will be restricted via Edge Functions

-- Push subscriptions policies
CREATE POLICY "Users can manage their own subscriptions" ON push_subscriptions
    FOR ALL USING (user_id = auth.uid());

-- Image uploads policies
CREATE POLICY "Users can view their own images" ON image_uploads
    FOR SELECT USING (
        user_id = auth.uid() OR 
        is_admin()
    );

CREATE POLICY "Users can upload their own images" ON image_uploads
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own images" ON image_uploads
    FOR UPDATE USING (user_id = auth.uid());

-- System settings policies (admin only)
CREATE POLICY "Only admins can access system settings" ON system_settings
    FOR ALL USING (is_system_admin());

-- Rate limits policies (server-side only)
CREATE POLICY "No direct client access to rate limits" ON rate_limits
    FOR ALL USING (false);

-- Functions for server-side operations

-- Function to create a new user profile after signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    school_record schools%ROWTYPE;
    user_email TEXT;
    email_domain TEXT;
BEGIN
    -- Get the user's email
    user_email := NEW.email;
    
    IF user_email IS NOT NULL THEN
        -- Extract domain from email
        email_domain := split_part(user_email, '@', 2);
        
        -- Find school by domain
        SELECT * INTO school_record 
        FROM schools 
        WHERE domain = email_domain AND active = true;
        
        -- Create profile
        INSERT INTO public.profiles (
            id, 
            school_id,
            first_name, 
            last_name,
            created_at,
            updated_at
        ) VALUES (
            NEW.id,
            school_record.id,
            COALESCE(NEW.raw_user_meta_data->>'first_name', 'User'),
            COALESCE(NEW.raw_user_meta_data->>'last_name', 'Name'),
            NOW(),
            NOW()
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on user signup
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Function to generate share codes
CREATE OR REPLACE FUNCTION generate_share_code()
RETURNS TEXT AS $$
DECLARE
    chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    result TEXT := '';
    i INTEGER := 0;
    code_exists BOOLEAN := true;
BEGIN
    WHILE code_exists LOOP
        result := '';
        FOR i IN 1..8 LOOP
            IF i = 5 THEN
                result := result || '-';
            END IF;
            result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
        END LOOP;
        
        SELECT EXISTS(SELECT 1 FROM rides WHERE share_code = result) INTO code_exists;
    END LOOP;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;
