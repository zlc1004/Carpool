"""
Authentication Manager
Handles user authentication with Supabase GoTrue
"""

import json
import os
from typing import Optional, Dict, Any
from datetime import datetime, timedelta


class AuthManager:
    def __init__(self, client):
        self.client = client
        self.session_file = os.path.expanduser('~/.carpschool_session.json')
        self.current_session = None
        
        # Try to load existing session
        self.load_session()
        
    def save_session(self, session_data: Dict):
        """Save session data to file"""
        try:
            with open(self.session_file, 'w') as f:
                json.dump(session_data, f, indent=2)
            os.chmod(self.session_file, 0o600)  # Secure file permissions
        except Exception as e:
            print(f"Warning: Could not save session: {e}")
            
    def load_session(self):
        """Load session data from file"""
        try:
            if os.path.exists(self.session_file):
                with open(self.session_file, 'r') as f:
                    session_data = json.load(f)
                    
                # Check if session is still valid
                if self._is_session_valid(session_data):
                    self.current_session = session_data
                    self.client.set_auth_token(session_data.get('access_token'))
                    return session_data.get('user')
                else:
                    # Try to refresh token
                    refreshed = self._refresh_token(session_data)
                    if refreshed:
                        return refreshed.get('user')
                    else:
                        # Clean up invalid session
                        self.clear_session()
        except Exception as e:
            print(f"Warning: Could not load session: {e}")
            
        return None
        
    def _is_session_valid(self, session_data: Dict) -> bool:
        """Check if session is still valid"""
        if not session_data or 'expires_at' not in session_data:
            return False
            
        try:
            expires_at = datetime.fromtimestamp(session_data['expires_at'])
            # Add 5 minute buffer
            return datetime.now() < expires_at - timedelta(minutes=5)
        except:
            return False
            
    def _refresh_token(self, session_data: Dict) -> Optional[Dict]:
        """Refresh access token using refresh token"""
        if not session_data.get('refresh_token'):
            return None
            
        try:
            response = self.client.auth_request('/token?grant_type=refresh_token', {
                'refresh_token': session_data['refresh_token']
            })
            
            if response and response.get('success') and 'data' in response:
                data = response['data']
                new_session = {
                    'access_token': data.get('access_token'),
                    'refresh_token': data.get('refresh_token'),
                    'expires_at': data.get('expires_at'),
                    'user': data.get('user')
                }
                
                self.current_session = new_session
                self.client.set_auth_token(new_session['access_token'])
                self.save_session(new_session)
                
                return new_session
                
        except Exception as e:
            print(f"Token refresh failed: {e}")
            
        return None
        
    def signup(self, email: str, password: str, metadata: Optional[Dict] = None) -> Optional[Dict]:
        """Sign up a new user"""
        signup_data = {
            'email': email,
            'password': password
        }
        
        if metadata:
            signup_data['data'] = metadata
            
        try:
            response = self.client.auth_request('/signup', signup_data)
            
            if response and response.get('success') and 'data' in response:
                data = response['data']
                
                # If email confirmation is disabled, we get a session immediately
                if data.get('access_token'):
                    session_data = {
                        'access_token': data.get('access_token'),
                        'refresh_token': data.get('refresh_token'),
                        'expires_at': data.get('expires_at'),
                        'user': data.get('user')
                    }
                    
                    self.current_session = session_data
                    self.client.set_auth_token(session_data['access_token'])
                    self.save_session(session_data)
                    
                    # Create user profile
                    self._create_user_profile(data.get('user'), metadata)
                    
                return data.get('user')
            else:
                print(f"Signup failed: {response.get('error', 'Unknown error')}")
                return None
                
        except Exception as e:
            print(f"Signup error: {e}")
            return None
            
    def login(self, email: str, password: str) -> Optional[Dict]:
        """Login with email and password"""
        login_data = {
            'email': email,
            'password': password
        }
        
        try:
            response = self.client.auth_request('/token?grant_type=password', login_data)
            
            if response and response.get('success') and 'data' in response:
                data = response['data']
                session_data = {
                    'access_token': data.get('access_token'),
                    'refresh_token': data.get('refresh_token'),
                    'expires_at': data.get('expires_at'),
                    'user': data.get('user')
                }
                
                self.current_session = session_data
                self.client.set_auth_token(session_data['access_token'])
                self.save_session(session_data)
                
                return data.get('user')
            else:
                print(f"Login failed: {response.get('error', 'Invalid credentials')}")
                return None
                
        except Exception as e:
            print(f"Login error: {e}")
            return None
            
    def logout(self):
        """Logout current user"""
        try:
            # Call logout endpoint
            if self.current_session:
                self.client.auth_request('/logout', {})
                
        except:
            pass  # Ignore logout API errors
        finally:
            # Always clear local session
            self.clear_session()
            
    def clear_session(self):
        """Clear current session"""
        self.current_session = None
        self.client.set_auth_token(None)
        
        try:
            if os.path.exists(self.session_file):
                os.remove(self.session_file)
        except:
            pass
            
    def refresh_session(self) -> Optional[Dict]:
        """Manually refresh current session"""
        if not self.current_session:
            return None
            
        return self._refresh_token(self.current_session)
        
    def get_current_user(self) -> Optional[Dict]:
        """Get current authenticated user"""
        if self.current_session:
            return self.current_session.get('user')
        return None
        
    def is_authenticated(self) -> bool:
        """Check if user is currently authenticated"""
        return self.current_session is not None and self._is_session_valid(self.current_session)
        
    def _create_user_profile(self, user: Dict, metadata: Optional[Dict] = None):
        """Create user profile in profiles table"""
        if not user or not metadata:
            return
            
        try:
            profile_data = {
                'user_id': user.get('id'),
                'email': user.get('email'),
                'name': metadata.get('name'),
                'school_id': metadata.get('school_id'),
                'school_name': metadata.get('school_name'),
                'role': 'user'
            }
            
            # Remove None values
            profile_data = {k: v for k, v in profile_data.items() if v is not None}
            
            response = self.client.post('/rest/v1/profiles', profile_data)
            
            if response and response.get('success'):
                print("✅ Profile created successfully")
            else:
                print(f"⚠️ Profile creation failed: {response.get('error', 'Unknown error')}")
                
        except Exception as e:
            print(f"⚠️ Profile creation error: {e}")
            
    def update_profile(self, updates: Dict) -> bool:
        """Update current user's profile"""
        if not self.is_authenticated():
            return False
            
        try:
            user_id = self.current_session['user']['id']
            response = self.client.patch(f'/rest/v1/profiles?user_id=eq.{user_id}', updates)
            
            return response and response.get('success', False)
            
        except Exception as e:
            print(f"Profile update error: {e}")
            return False
            
    def change_password(self, new_password: str) -> bool:
        """Change user password"""
        if not self.is_authenticated():
            return False
            
        try:
            response = self.client.auth_request('/user', {
                'password': new_password
            })
            
            return response and response.get('success', False)
            
        except Exception as e:
            print(f"Password change error: {e}")
            return False
            
    def request_password_reset(self, email: str) -> bool:
        """Request password reset email"""
        try:
            response = self.client.auth_request('/recover', {
                'email': email
            })
            
            return response and response.get('success', False)
            
        except Exception as e:
            print(f"Password reset request error: {e}")
            return False
