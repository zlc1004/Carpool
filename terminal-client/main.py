#!/usr/bin/env python3
"""
CarpSchool Terminal Client
A command-line interface for interacting with the Supabase CarpSchool API
"""

import os
import sys
import json
from datetime import datetime, timedelta
from typing import Optional, Dict, Any

from supabase_client import SupabaseClient
from auth_manager import AuthManager
from config import Config


class CarpSchoolTerminal:
    def __init__(self):
        self.config = Config()
        self.client = SupabaseClient(self.config.supabase_url, self.config.anon_key)
        self.auth_manager = AuthManager(self.client)
        self.current_user = None
        
    def print_banner(self):
        """Print the application banner"""
        print("\n" + "="*60)
        print("🚗  CarpSchool Terminal Client")
        print("    Supabase API Command Line Interface")
        print("="*60)
        
    def print_menu(self):
        """Print the main menu"""
        print("\n📋 MAIN MENU")
        print("-" * 30)
        
        if not self.current_user:
            print("1.  🔐 Login")
            print("2.  👥 Sign Up")
            print("3.  🏫 List Schools")
        else:
            user_name = self.current_user.get('user_metadata', {}).get('name', 'User')
            print(f"👋 Welcome, {user_name}!")
            print()
            print("1.  👤 View Profile")
            print("2.  ✏️  Edit Profile")
            print("3.  🚗 My Rides")
            print("4.  ➕ Create Ride")
            print("5.  🔍 Find Rides")
            print("6.  🏫 School Info")
            print("7.  📍 Places")
            print("8.  💬 Recent Messages")
            print("9.  🔔 Notifications")
            print("10. 📊 Analytics (Admin)")
            print("11. 🔧 Admin Tools")
            print("12. 🔄 Refresh Token")
            print("13. 🚪 Logout")
            
        print("0.  ❌ Exit")
        print()
        
    def handle_auth_menu(self, choice: str):
        """Handle authentication menu choices"""
        if choice == "1":
            self.login()
        elif choice == "2":
            self.signup()
        elif choice == "3":
            self.list_schools()
            
    def handle_main_menu(self, choice: str):
        """Handle main menu choices when authenticated"""
        if choice == "1":
            self.view_profile()
        elif choice == "2":
            self.edit_profile()
        elif choice == "3":
            self.view_my_rides()
        elif choice == "4":
            self.create_ride()
        elif choice == "5":
            self.find_rides()
        elif choice == "6":
            self.view_school_info()
        elif choice == "7":
            self.manage_places()
        elif choice == "8":
            self.view_messages()
        elif choice == "9":
            self.view_notifications()
        elif choice == "10":
            self.analytics_menu()
        elif choice == "11":
            self.admin_menu()
        elif choice == "12":
            self.refresh_token()
        elif choice == "13":
            self.logout()
            
    def login(self):
        """Handle user login"""
        print("\n🔐 LOGIN")
        print("-" * 20)
        
        email = input("Email: ")
        password = input("Password: ")
        
        try:
            user = self.auth_manager.login(email, password)
            if user:
                self.current_user = user
                print(f"✅ Login successful! Welcome, {email}")
            else:
                print("❌ Login failed. Please check your credentials.")
        except Exception as e:
            print(f"❌ Login error: {str(e)}")
            
    def signup(self):
        """Handle user signup"""
        print("\n👥 SIGN UP")
        print("-" * 20)
        
        email = input("Email: ")
        password = input("Password: ")
        name = input("Full Name: ")
        
        # Get available schools
        schools = self.list_schools(return_data=True)
        if not schools:
            print("❌ No schools available. Please contact administrator.")
            return
            
        print("\nAvailable Schools:")
        for i, school in enumerate(schools, 1):
            print(f"{i}. {school['name']}")
            
        try:
            school_choice = int(input("Select school (number): ")) - 1
            if school_choice < 0 or school_choice >= len(schools):
                print("❌ Invalid school selection")
                return
                
            selected_school = schools[school_choice]
            
            user = self.auth_manager.signup(email, password, {
                'name': name,
                'school_id': selected_school['id'],
                'school_name': selected_school['name']
            })
            
            if user:
                print("✅ Signup successful! Please check your email for verification.")
            else:
                print("❌ Signup failed.")
        except (ValueError, Exception) as e:
            print(f"❌ Signup error: {str(e)}")
            
    def logout(self):
        """Handle user logout"""
        try:
            self.auth_manager.logout()
            self.current_user = None
            print("✅ Logged out successfully")
        except Exception as e:
            print(f"❌ Logout error: {str(e)}")
            
    def list_schools(self, return_data=False):
        """List all available schools"""
        try:
            response = self.client.get('/rest/v1/schools')
            if response and 'data' in response:
                schools = response['data']
                
                if not return_data:
                    print("\n🏫 SCHOOLS")
                    print("-" * 30)
                    for school in schools:
                        print(f"• {school['name']}")
                        if 'address' in school:
                            print(f"  📍 {school['address']}")
                        print()
                        
                return schools
            else:
                print("❌ Failed to load schools")
                return []
        except Exception as e:
            print(f"❌ Error loading schools: {str(e)}")
            return []
            
    def view_profile(self):
        """View current user profile"""
        if not self.current_user:
            print("❌ Not logged in")
            return
            
        try:
            user_id = self.current_user['id']
            response = self.client.get(f'/rest/v1/profiles?user_id=eq.{user_id}')
            
            if response and 'data' in response and response['data']:
                profile = response['data'][0]
                print("\n👤 YOUR PROFILE")
                print("-" * 30)
                print(f"Name: {profile.get('name', 'N/A')}")
                print(f"Email: {self.current_user.get('email', 'N/A')}")
                print(f"Phone: {profile.get('phone', 'Not set')}")
                print(f"School: {profile.get('school_name', 'N/A')}")
                print(f"Role: {profile.get('role', 'user')}")
                print(f"Joined: {profile.get('created_at', 'N/A')}")
            else:
                print("❌ Profile not found")
        except Exception as e:
            print(f"❌ Error loading profile: {str(e)}")
            
    def edit_profile(self):
        """Edit current user profile"""
        if not self.current_user:
            print("❌ Not logged in")
            return
            
        print("\n✏️ EDIT PROFILE")
        print("-" * 30)
        print("Leave blank to keep current value")
        
        name = input("Name: ")
        phone = input("Phone: ")
        
        try:
            user_id = self.current_user['id']
            update_data = {}
            
            if name.strip():
                update_data['name'] = name.strip()
            if phone.strip():
                update_data['phone'] = phone.strip()
                
            if update_data:
                response = self.client.patch(f'/rest/v1/profiles?user_id=eq.{user_id}', update_data)
                print("✅ Profile updated successfully")
            else:
                print("ℹ️ No changes made")
        except Exception as e:
            print(f"❌ Error updating profile: {str(e)}")
            
    def view_my_rides(self):
        """View rides created by current user"""
        if not self.current_user:
            print("❌ Not logged in")
            return
            
        try:
            user_id = self.current_user['id']
            
            # Get rides as driver
            driver_rides = self.client.get(f'/rest/v1/rides?driver_id=eq.{user_id}&select=*,pickup_place:places!pickup_place_id(*),dropoff_place:places!dropoff_place_id(*)')
            
            # Get rides as participant
            participant_rides = self.client.get(f'/rest/v1/ride_participants?user_id=eq.{user_id}&select=*,ride:rides(*,pickup_place:places!pickup_place_id(*),dropoff_place:places!dropoff_place_id(*))')
            
            print("\n🚗 MY RIDES")
            print("-" * 30)
            
            if driver_rides and 'data' in driver_rides and driver_rides['data']:
                print("As Driver:")
                for ride in driver_rides['data']:
                    self._print_ride_info(ride)
                    
            if participant_rides and 'data' in participant_rides and participant_rides['data']:
                print("\nAs Passenger:")
                for participant in participant_rides['data']:
                    self._print_ride_info(participant['ride'])
                    
            if (not driver_rides or not driver_rides.get('data')) and (not participant_rides or not participant_rides.get('data')):
                print("No rides found")
                
        except Exception as e:
            print(f"❌ Error loading rides: {str(e)}")
            
    def _print_ride_info(self, ride):
        """Helper to print ride information"""
        pickup = ride.get('pickup_place', {}).get('name', 'Unknown')
        dropoff = ride.get('dropoff_place', {}).get('name', 'Unknown')
        departure = ride.get('departure_time', 'Unknown')
        seats = ride.get('available_seats', 0)
        
        print(f"  🚗 {pickup} → {dropoff}")
        print(f"     ⏰ {departure}")
        print(f"     💺 {seats} seats available")
        print(f"     📋 Status: {ride.get('status', 'unknown')}")
        print()
        
    def create_ride(self):
        """Create a new ride"""
        if not self.current_user:
            print("❌ Not logged in")
            return
            
        print("\n➕ CREATE NEW RIDE")
        print("-" * 30)
        
        # Get user's school places
        try:
            user_id = self.current_user['id']
            profile_response = self.client.get(f'/rest/v1/profiles?user_id=eq.{user_id}')
            
            if not profile_response or not profile_response.get('data'):
                print("❌ Profile not found")
                return
                
            school_id = profile_response['data'][0].get('school_id')
            places_response = self.client.get(f'/rest/v1/places?school_id=eq.{school_id}')
            
            if not places_response or not places_response.get('data'):
                print("❌ No places available for your school")
                return
                
            places = places_response['data']
            
            print("Available Places:")
            for i, place in enumerate(places, 1):
                print(f"{i}. {place['name']} - {place['address']}")
                
            pickup_idx = int(input("Select pickup place (number): ")) - 1
            dropoff_idx = int(input("Select dropoff place (number): ")) - 1
            
            if pickup_idx < 0 or pickup_idx >= len(places) or dropoff_idx < 0 or dropoff_idx >= len(places):
                print("❌ Invalid place selection")
                return
                
            departure_time = input("Departure time (YYYY-MM-DD HH:MM): ")
            seats = int(input("Available seats: "))
            description = input("Description (optional): ")
            
            ride_data = {
                'driver_id': user_id,
                'school_id': school_id,
                'pickup_place_id': places[pickup_idx]['id'],
                'dropoff_place_id': places[dropoff_idx]['id'],
                'departure_time': departure_time,
                'available_seats': seats,
                'total_seats': seats,
                'description': description,
                'status': 'active'
            }
            
            response = self.client.post('/rest/v1/rides', ride_data)
            if response:
                print("✅ Ride created successfully!")
            else:
                print("❌ Failed to create ride")
                
        except (ValueError, Exception) as e:
            print(f"❌ Error creating ride: {str(e)}")
            
    def find_rides(self):
        """Find available rides"""
        if not self.current_user:
            print("❌ Not logged in")
            return
            
        try:
            # Get user's school
            user_id = self.current_user['id']
            profile_response = self.client.get(f'/rest/v1/profiles?user_id=eq.{user_id}')
            school_id = profile_response['data'][0].get('school_id')
            
            # Get active rides for school
            rides_response = self.client.get(f'/rest/v1/rides?school_id=eq.{school_id}&status=eq.active&available_seats=gt.0&select=*,pickup_place:places!pickup_place_id(*),dropoff_place:places!dropoff_place_id(*),driver:profiles!driver_id(*)')
            
            print("\n🔍 AVAILABLE RIDES")
            print("-" * 30)
            
            if rides_response and 'data' in rides_response and rides_response['data']:
                for i, ride in enumerate(rides_response['data'], 1):
                    pickup = ride.get('pickup_place', {}).get('name', 'Unknown')
                    dropoff = ride.get('dropoff_place', {}).get('name', 'Unknown')
                    driver_name = ride.get('driver', {}).get('name', 'Unknown')
                    departure = ride.get('departure_time', 'Unknown')
                    seats = ride.get('available_seats', 0)
                    
                    print(f"{i}. 🚗 {pickup} → {dropoff}")
                    print(f"    👤 Driver: {driver_name}")
                    print(f"    ⏰ {departure}")
                    print(f"    💺 {seats} seats available")
                    print()
                    
                choice = input("Select ride to join (number, or 0 to cancel): ")
                if choice and choice != "0":
                    try:
                        ride_idx = int(choice) - 1
                        if 0 <= ride_idx < len(rides_response['data']):
                            self._join_ride(rides_response['data'][ride_idx]['id'])
                        else:
                            print("❌ Invalid selection")
                    except ValueError:
                        print("❌ Invalid input")
            else:
                print("No available rides found")
                
        except Exception as e:
            print(f"❌ Error finding rides: {str(e)}")
            
    def _join_ride(self, ride_id: str):
        """Join a specific ride"""
        try:
            user_id = self.current_user['id']
            
            participant_data = {
                'ride_id': ride_id,
                'user_id': user_id,
                'status': 'pending'
            }
            
            response = self.client.post('/rest/v1/ride_participants', participant_data)
            if response:
                print("✅ Ride join request sent!")
            else:
                print("❌ Failed to join ride")
                
        except Exception as e:
            print(f"❌ Error joining ride: {str(e)}")
            
    def view_school_info(self):
        """View information about user's school"""
        if not self.current_user:
            print("❌ Not logged in")
            return
            
        try:
            user_id = self.current_user['id']
            profile_response = self.client.get(f'/rest/v1/profiles?user_id=eq.{user_id}')
            school_id = profile_response['data'][0].get('school_id')
            
            school_response = self.client.get(f'/rest/v1/schools?id=eq.{school_id}')
            
            if school_response and 'data' in school_response and school_response['data']:
                school = school_response['data'][0]
                print("\n🏫 SCHOOL INFO")
                print("-" * 30)
                print(f"Name: {school.get('name', 'N/A')}")
                print(f"Address: {school.get('address', 'N/A')}")
                print(f"Phone: {school.get('phone', 'N/A')}")
                print(f"Email: {school.get('email', 'N/A')}")
                
        except Exception as e:
            print(f"❌ Error loading school info: {str(e)}")
            
    def manage_places(self):
        """Manage pickup/dropoff places"""
        print("\n📍 PLACES MANAGEMENT")
        print("-" * 30)
        print("1. List Places")
        print("2. Add Place")
        print("0. Back")
        
        choice = input("Choice: ")
        if choice == "1":
            self._list_places()
        elif choice == "2":
            self._add_place()
            
    def _list_places(self):
        """List all places for user's school"""
        try:
            user_id = self.current_user['id']
            profile_response = self.client.get(f'/rest/v1/profiles?user_id=eq.{user_id}')
            school_id = profile_response['data'][0].get('school_id')
            
            places_response = self.client.get(f'/rest/v1/places?school_id=eq.{school_id}')
            
            if places_response and 'data' in places_response:
                print("\nPlaces for your school:")
                for place in places_response['data']:
                    print(f"📍 {place['name']}")
                    print(f"   Address: {place['address']}")
                    print(f"   Type: {place.get('type', 'general')}")
                    print()
            else:
                print("No places found")
                
        except Exception as e:
            print(f"❌ Error loading places: {str(e)}")
            
    def _add_place(self):
        """Add a new place"""
        try:
            user_id = self.current_user['id']
            profile_response = self.client.get(f'/rest/v1/profiles?user_id=eq.{user_id}')
            school_id = profile_response['data'][0].get('school_id')
            
            name = input("Place name: ")
            address = input("Address: ")
            place_type = input("Type (pickup/dropoff/both) [both]: ") or "both"
            
            place_data = {
                'school_id': school_id,
                'name': name,
                'address': address,
                'type': place_type,
                'created_by': user_id
            }
            
            response = self.client.post('/rest/v1/places', place_data)
            if response:
                print("✅ Place added successfully!")
            else:
                print("❌ Failed to add place")
                
        except Exception as e:
            print(f"❌ Error adding place: {str(e)}")
            
    def view_messages(self):
        """View recent chat messages"""
        print("\n💬 Recent Messages")
        print("-" * 30)
        print("Feature coming soon...")
        
    def view_notifications(self):
        """View user notifications"""
        if not self.current_user:
            print("❌ Not logged in")
            return
            
        try:
            user_id = self.current_user['id']
            response = self.client.get(f'/rest/v1/notifications?user_id=eq.{user_id}&order=created_at.desc&limit=10')
            
            if response and 'data' in response and response['data']:
                print("\n🔔 NOTIFICATIONS")
                print("-" * 30)
                for notification in response['data']:
                    status = "🔵" if notification.get('read', False) else "🔴"
                    print(f"{status} {notification.get('title', 'No title')}")
                    print(f"   {notification.get('message', 'No message')}")
                    print(f"   {notification.get('created_at', 'No date')}")
                    print()
            else:
                print("No notifications found")
                
        except Exception as e:
            print(f"❌ Error loading notifications: {str(e)}")
            
    def analytics_menu(self):
        """Analytics menu for admins"""
        print("\n📊 ANALYTICS")
        print("-" * 30)
        print("Feature available for admins only...")
        
    def admin_menu(self):
        """Admin tools menu"""
        print("\n🔧 ADMIN TOOLS")
        print("-" * 30)
        print("1. View All Users")
        print("2. View All Rides")
        print("3. System Status")
        print("0. Back")
        
        choice = input("Choice: ")
        if choice == "1":
            self._view_all_users()
        elif choice == "2":
            self._view_all_rides()
        elif choice == "3":
            self._system_status()
            
    def _view_all_users(self):
        """View all users (admin only)"""
        try:
            response = self.client.get('/rest/v1/profiles?select=*,school:schools(*)')
            if response and 'data' in response:
                print("\n👥 ALL USERS")
                print("-" * 30)
                for profile in response['data']:
                    print(f"• {profile.get('name', 'No name')} ({profile.get('email', 'No email')})")
                    print(f"  School: {profile.get('school', {}).get('name', 'No school')}")
                    print(f"  Role: {profile.get('role', 'user')}")
                    print()
        except Exception as e:
            print(f"❌ Error: {str(e)}")
            
    def _view_all_rides(self):
        """View all rides (admin only)"""
        try:
            response = self.client.get('/rest/v1/rides?select=*,driver:profiles!driver_id(name),pickup_place:places!pickup_place_id(name),dropoff_place:places!dropoff_place_id(name)')
            if response and 'data' in response:
                print("\n🚗 ALL RIDES")
                print("-" * 30)
                for ride in response['data']:
                    driver = ride.get('driver', {}).get('name', 'Unknown')
                    pickup = ride.get('pickup_place', {}).get('name', 'Unknown')
                    dropoff = ride.get('dropoff_place', {}).get('name', 'Unknown')
                    print(f"• {driver}: {pickup} → {dropoff}")
                    print(f"  Status: {ride.get('status', 'unknown')}")
                    print(f"  Seats: {ride.get('available_seats', 0)}/{ride.get('total_seats', 0)}")
                    print()
        except Exception as e:
            print(f"❌ Error: {str(e)}")
            
    def _system_status(self):
        """Show system status"""
        print("\n⚙️ SYSTEM STATUS")
        print("-" * 30)
        try:
            # Test database connection
            response = self.client.get('/rest/v1/schools?limit=1')
            db_status = "✅ Connected" if response else "❌ Failed"
            
            print(f"Database: {db_status}")
            print(f"API URL: {self.config.supabase_url}")
            print(f"Current User: {self.current_user.get('email', 'None') if self.current_user else 'None'}")
            
        except Exception as e:
            print(f"❌ Error checking status: {str(e)}")
            
    def refresh_token(self):
        """Refresh authentication token"""
        try:
            new_user = self.auth_manager.refresh_session()
            if new_user:
                self.current_user = new_user
                print("✅ Token refreshed successfully")
            else:
                print("❌ Failed to refresh token")
        except Exception as e:
            print(f"❌ Refresh error: {str(e)}")
            
    def run(self):
        """Main application loop"""
        self.print_banner()
        
        while True:
            self.print_menu()
            choice = input("Enter your choice: ").strip()
            
            if choice == "0":
                print("\n👋 Goodbye!")
                break
                
            if not self.current_user:
                self.handle_auth_menu(choice)
            else:
                self.handle_main_menu(choice)
                
            if choice not in ["0"]:
                input("\nPress Enter to continue...")


if __name__ == "__main__":
    try:
        app = CarpSchoolTerminal()
        app.run()
    except KeyboardInterrupt:
        print("\n\n👋 Goodbye!")
        sys.exit(0)
    except Exception as e:
        print(f"\n❌ Application error: {str(e)}")
        sys.exit(1)
