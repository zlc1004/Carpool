"""
Configuration Management
Handles application configuration and environment variables
"""

import os
from typing import Optional


class Config:
    def __init__(self):
        # Default configuration for local development
        self.supabase_url = os.getenv('SUPABASE_URL', 'http://localhost:8000')
        self.anon_key = os.getenv('SUPABASE_ANON_KEY', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJhbm9uIiwKICAgICJpc3MiOiAic3VwYWJhc2UtZGVtbyIsCiAgICAiaWF0IjogMTY0MTc2OTIwMCwKICAgICJleHAiOiAxNzk5NTM1NjAwCn0.dc_X5iR_VP_qT0zsiyj_I_OZ2T9FtRU2BBNWN8Bu4GE')
        self.service_role_key = os.getenv('SUPABASE_SERVICE_ROLE_KEY', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJzZXJ2aWNlX3JvbGUiLAogICAgImlzcyI6ICJzdXBhYmFzZS1kZW1vIiwKICAgICJpYXQiOiAxNjQxNzY5MjAwLAogICAgImV4cCI6IDE3OTk1MzU2MDAKfQ.DaYlNEoUrrEn2Ig7tqibS-PHK5vgusbcbo7X36XVt4Q')
        
        # API Configuration
        self.timeout = int(os.getenv('API_TIMEOUT', '30'))
        self.max_retries = int(os.getenv('MAX_RETRIES', '3'))
        
        # Application Configuration
        self.debug = os.getenv('DEBUG', 'false').lower() == 'true'
        self.log_level = os.getenv('LOG_LEVEL', 'INFO').upper()
        
        # File paths
        self.data_dir = os.path.expanduser(os.getenv('CARPSCHOOL_DATA_DIR', '~/.carpschool'))
        
        # Ensure data directory exists
        os.makedirs(self.data_dir, exist_ok=True)
        
    def get_database_url(self) -> str:
        """Get database connection URL"""
        return f"{self.supabase_url}/rest/v1"
        
    def get_auth_url(self) -> str:
        """Get authentication URL"""
        return f"{self.supabase_url}/auth/v1"
        
    def get_storage_url(self) -> str:
        """Get storage URL"""
        return f"{self.supabase_url}/storage/v1"
        
    def get_functions_url(self) -> str:
        """Get edge functions URL"""
        return f"{self.supabase_url}/functions/v1"
        
    def get_realtime_url(self) -> str:
        """Get realtime URL"""
        return f"{self.supabase_url}/realtime/v1"
        
    def is_local_development(self) -> bool:
        """Check if running against local development server"""
        return 'localhost' in self.supabase_url or '127.0.0.1' in self.supabase_url
        
    def validate_config(self) -> bool:
        """Validate configuration"""
        required_fields = ['supabase_url', 'anon_key']
        
        for field in required_fields:
            if not getattr(self, field):
                print(f"❌ Missing required configuration: {field}")
                return False
                
        # Validate URL format
        if not self.supabase_url.startswith(('http://', 'https://')):
            print("❌ Invalid Supabase URL format")
            return False
            
        return True
        
    def print_config(self):
        """Print current configuration (safe for logging)"""
        print("\n⚙️ CONFIGURATION")
        print("-" * 30)
        print(f"Supabase URL: {self.supabase_url}")
        print(f"Environment: {'Development' if self.is_local_development() else 'Production'}")
        print(f"Data Directory: {self.data_dir}")
        print(f"Debug Mode: {self.debug}")
        print(f"Timeout: {self.timeout}s")
        print(f"Max Retries: {self.max_retries}")
        
        # Only show first/last few characters of keys for security
        anon_preview = f"{self.anon_key[:10]}...{self.anon_key[-10:]}" if self.anon_key else "Not set"
        print(f"Anon Key: {anon_preview}")
        
        service_preview = f"{self.service_role_key[:10]}...{self.service_role_key[-10:]}" if self.service_role_key else "Not set"
        print(f"Service Key: {service_preview}")
        
    @classmethod
    def from_env_file(cls, env_file_path: str):
        """Create config from .env file"""
        if os.path.exists(env_file_path):
            with open(env_file_path, 'r') as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith('#') and '=' in line:
                        key, value = line.split('=', 1)
                        os.environ[key.strip()] = value.strip()
                        
        return cls()
        
    def save_config(self, file_path: Optional[str] = None):
        """Save current configuration to file"""
        if not file_path:
            file_path = os.path.join(self.data_dir, 'config.env')
            
        try:
            with open(file_path, 'w') as f:
                f.write(f"# CarpSchool Terminal Client Configuration\n")
                f.write(f"# Generated on {os.popen('date').read().strip()}\n\n")
                
                f.write(f"SUPABASE_URL={self.supabase_url}\n")
                f.write(f"SUPABASE_ANON_KEY={self.anon_key}\n")
                f.write(f"SUPABASE_SERVICE_ROLE_KEY={self.service_role_key}\n")
                f.write(f"API_TIMEOUT={self.timeout}\n")
                f.write(f"MAX_RETRIES={self.max_retries}\n")
                f.write(f"DEBUG={str(self.debug).lower()}\n")
                f.write(f"LOG_LEVEL={self.log_level}\n")
                
            print(f"✅ Configuration saved to {file_path}")
            
        except Exception as e:
            print(f"❌ Failed to save configuration: {e}")


# Environment-specific configurations
class DevelopmentConfig(Config):
    def __init__(self):
        super().__init__()
        self.debug = True
        self.supabase_url = 'http://localhost:8000'


class ProductionConfig(Config):
    def __init__(self):
        super().__init__()
        self.debug = False
        # Override with production values
        if not self.supabase_url.startswith('http'):
            raise ValueError("Production requires valid Supabase URL")


def get_config() -> Config:
    """Get appropriate configuration based on environment"""
    env = os.getenv('ENVIRONMENT', 'development').lower()
    
    if env == 'production':
        return ProductionConfig()
    else:
        return DevelopmentConfig()
