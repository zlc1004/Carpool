# CarpSchool Terminal Client

A command-line interface for interacting with the CarpSchool Supabase API. This terminal client demonstrates how to use all the available endpoints and provides a user-friendly interface for testing and managing the carpooling system.

## Features

### 🔐 Authentication
- User registration and login
- Session management with automatic token refresh
- Secure session storage
- Password reset functionality

### 👤 User Management
- View and edit user profiles
- School association
- Role-based access control

### 🚗 Ride Management
- Create new rides
- Find available rides
- Join rides as passenger
- View ride history
- Manage ride participants

### 📍 Location Management
- List pickup/dropoff places
- Add new locations
- School-specific place management

### 💬 Communication
- View recent chat messages
- Notification management
- Real-time updates (basic support)

### 🔧 Admin Tools
- User administration
- Ride oversight
- System status monitoring
- Analytics access

## Installation

### Prerequisites
- Python 3.7 or higher
- Access to a running Supabase instance (local or remote)

### Setup

1. **Clone or navigate to the terminal-client directory:**
   ```bash
   cd terminal-client
   ```

2. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

3. **Configure environment variables (optional):**
   
   Create a `.env` file or set environment variables:
   ```bash
   export SUPABASE_URL="http://localhost:8000"
   export SUPABASE_ANON_KEY="your-anon-key"
   export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
   ```

   Or for local development with default keys:
   ```bash
   # No configuration needed - defaults to localhost:8000
   ```

4. **Make the script executable (optional):**
   ```bash
   chmod +x main.py
   ```

## Usage

### Starting the Application

```bash
python main.py
```

Or if made executable:
```bash
./main.py
```

### First Time Setup

1. **Start the application**
2. **Sign up for a new account** (option 2)
3. **Provide your details:**
   - Email address
   - Password
   - Full name
   - Select your school from the list

4. **Login** (option 1) with your credentials

### Main Features

#### Authentication Flow
```
🔐 LOGIN
Email: john@example.com
Password: ********
✅ Login successful! Welcome, john@example.com
```

#### Creating a Ride
```
➕ CREATE NEW RIDE
Available Places:
1. Main School Entrance - 123 School St
2. North Parking Lot - 456 North Ave
3. South Gate - 789 South Rd

Select pickup place (number): 1
Select dropoff place (number): 2
Departure time (YYYY-MM-DD HH:MM): 2024-01-15 08:00
Available seats: 3
Description (optional): Morning school run
✅ Ride created successfully!
```

#### Finding Rides
```
🔍 AVAILABLE RIDES
1. 🚗 Main School Entrance → North Parking Lot
   👤 Driver: Jane Smith
   ⏰ 2024-01-15 08:00
   💺 2 seats available

2. 🚗 South Gate → Main School Entrance
   👤 Driver: Bob Johnson  
   ⏰ 2024-01-15 15:30
   💺 1 seats available

Select ride to join (number, or 0 to cancel): 1
✅ Ride join request sent!
```

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `SUPABASE_URL` | Supabase API URL | `http://localhost:8000` |
| `SUPABASE_ANON_KEY` | Anonymous access key | Local dev key |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key | Local dev key |
| `API_TIMEOUT` | Request timeout in seconds | `30` |
| `MAX_RETRIES` | Maximum retry attempts | `3` |
| `DEBUG` | Enable debug mode | `false` |
| `CARPSCHOOL_DATA_DIR` | Data storage directory | `~/.carpschool` |

### Configuration File

The application can save and load configuration:

```python
from config import Config

# Load from .env file
config = Config.from_env_file('.env')

# Save current config
config.save_config('my_config.env')
```

### Local Development

For local development with the Docker Compose Supabase setup:

```bash
# No additional configuration needed
python main.py
```

The client will automatically connect to:
- **URL**: `http://localhost:8000`
- **Database**: Local PostgreSQL via Supabase
- **Auth**: Local GoTrue instance
- **Storage**: Local file storage

## Architecture

### Project Structure

```
terminal-client/
├── main.py              # Main application entry point
├── supabase_client.py   # Supabase API wrapper
├── auth_manager.py      # Authentication handling  
├── config.py           # Configuration management
├── requirements.txt    # Python dependencies
└── README.md          # This file
```

### Key Components

#### SupabaseClient
- HTTP client wrapper for Supabase REST API
- Handles authentication headers
- Provides methods for CRUD operations
- Supports file uploads/downloads
- Edge function calls

#### AuthManager  
- JWT token management
- Session persistence
- Automatic token refresh
- User profile creation

#### Config
- Environment variable handling
- Multiple environment support
- Configuration validation
- Secure credential management

## API Endpoints Used

The terminal client demonstrates usage of all major Supabase endpoints:

### Authentication (`/auth/v1/*`)
- `POST /auth/v1/signup` - User registration
- `POST /auth/v1/token` - Login/token refresh  
- `POST /auth/v1/logout` - User logout
- `PUT /auth/v1/user` - Update user data

### Database (`/rest/v1/*`)
- `GET /rest/v1/schools` - List schools
- `GET /rest/v1/profiles` - User profiles
- `POST /rest/v1/rides` - Create rides
- `GET /rest/v1/rides` - List/search rides
- `POST /rest/v1/ride_participants` - Join rides
- `GET /rest/v1/places` - Location management
- `GET /rest/v1/notifications` - User notifications

### Storage (`/storage/v1/*`)
- File upload/download capabilities
- Bucket management

### Edge Functions (`/functions/v1/*`)
- Custom function calls
- Business logic execution

## Error Handling

The client includes comprehensive error handling:

```python
try:
    response = client.get('/rest/v1/rides')
    if response and response.get('success'):
        # Handle successful response
        data = response['data']
    else:
        # Handle API error
        error = response.get('error', 'Unknown error')
        print(f"❌ API Error: {error}")
except Exception as e:
    # Handle network/system error
    print(f"❌ System Error: {str(e)}")
```

## Security Features

### Session Management
- JWT tokens stored securely in `~/.carpschool_session.json`
- Automatic token refresh before expiration
- Secure file permissions (600)
- Session cleanup on logout

### Authentication
- Password masking in terminal input
- Secure credential storage
- Environment variable support for production
- No hardcoded secrets

### API Security
- Row Level Security (RLS) enforcement
- Role-based access control
- API key authentication
- Request validation

## Extending the Client

### Adding New Features

1. **Add menu item** in `main.py`:
   ```python
   def print_menu(self):
       # Add new option
       print("14. 🆕 New Feature")
   
   def handle_main_menu(self, choice: str):
       elif choice == "14":
           self.new_feature()
   ```

2. **Implement functionality**:
   ```python
   def new_feature(self):
       print("\n🆕 NEW FEATURE")
       # Implementation here
   ```

3. **Add API methods** in `supabase_client.py`:
   ```python
   def custom_endpoint(self, data: Dict) -> Optional[Dict]:
       return self.post('/rest/v1/custom', data)
   ```

### Custom Configuration

```python
# Custom config class
class CustomConfig(Config):
    def __init__(self):
        super().__init__()
        self.custom_setting = os.getenv('CUSTOM_SETTING', 'default')
```

## Troubleshooting

### Common Issues

1. **Connection Refused**
   ```
   ❌ System Error: requests.exceptions.ConnectionError
   ```
   **Solution**: Ensure Supabase server is running on `localhost:8000`

2. **Authentication Failed**
   ```
   ❌ Login failed. Please check your credentials.
   ```
   **Solution**: Verify email/password or check if email confirmation is required

3. **Permission Denied**
   ```
   ❌ API Error: permission denied
   ```
   **Solution**: Check Row Level Security policies and user permissions

4. **Token Expired**
   ```
   ❌ API Error: JWT expired
   ```
   **Solution**: Token refresh should happen automatically; try logout/login

### Debug Mode

Enable debug mode for detailed logging:

```bash
export DEBUG=true
python main.py
```

### Configuration Check

View current configuration:
```python
from config import Config
config = Config()
config.print_config()
```

## Development

### Running Tests

```bash
# Install test dependencies
pip install pytest

# Run tests (when implemented)
pytest tests/
```

### Code Formatting

```bash
# Install formatting tools
pip install black flake8

# Format code
black *.py

# Check style
flake8 *.py
```

## Contributing

1. Follow Python PEP 8 style guidelines
2. Add type hints for new functions
3. Include error handling for all API calls
4. Update this README for new features
5. Test with both local and remote Supabase instances

## License

This terminal client is part of the CarpSchool project and follows the same license terms.

## Support

For issues related to:
- **Supabase API**: Check the [Supabase documentation](https://supabase.com/docs)
- **Terminal Client**: Create an issue in the project repository
- **CarpSchool Features**: Refer to the main project documentation

---

**Happy Carpooling! 🚗**
