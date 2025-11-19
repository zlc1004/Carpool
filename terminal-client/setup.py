#!/usr/bin/env python3
"""
Setup script for CarpSchool Terminal Client
"""

import os
import sys
import subprocess
from pathlib import Path

def check_python_version():
    """Check if Python version is compatible"""
    if sys.version_info < (3, 7):
        print("❌ Python 3.7 or higher is required")
        print(f"Current version: {sys.version}")
        return False
    print(f"✅ Python {sys.version.split()[0]} detected")
    return True

def install_requirements():
    """Install required Python packages"""
    print("\n📦 Installing dependencies...")
    
    try:
        subprocess.check_call([
            sys.executable, "-m", "pip", "install", "-r", "requirements.txt"
        ])
        print("✅ Dependencies installed successfully")
        return True
    except subprocess.CalledProcessError:
        print("❌ Failed to install dependencies")
        return False

def create_directories():
    """Create necessary directories"""
    print("\n📁 Creating directories...")
    
    # Create data directory
    data_dir = Path.home() / '.carpschool'
    data_dir.mkdir(exist_ok=True)
    print(f"✅ Created data directory: {data_dir}")
    
    return True

def check_supabase_connection():
    """Check if Supabase server is accessible"""
    print("\n🔗 Checking Supabase connection...")
    
    try:
        import requests
        response = requests.get('http://localhost:8000/rest/v1/', timeout=5)
        if response.status_code in [200, 401, 403]:  # 401/403 means API is responding
            print("✅ Supabase server is accessible")
            return True
        else:
            print("⚠️ Supabase server responded but may not be fully ready")
            return True
    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to Supabase server at localhost:8000")
        print("   Make sure Docker Compose services are running:")
        print("   cd ../server && docker compose up -d")
        return False
    except ImportError:
        print("⚠️ Cannot check connection (requests not installed yet)")
        return True

def create_launcher():
    """Create a launcher script"""
    print("\n🚀 Creating launcher script...")
    
    launcher_content = f"""#!/bin/bash
# CarpSchool Terminal Client Launcher

cd "{os.path.dirname(os.path.abspath(__file__))}"
python main.py "$@"
"""
    
    launcher_path = Path("carpschool-cli")
    launcher_path.write_text(launcher_content)
    launcher_path.chmod(0o755)
    
    print(f"✅ Created launcher: {launcher_path.absolute()}")
    print(f"   You can run: ./{launcher_path}")
    
    return True

def main():
    """Main setup function"""
    print("🚗 CarpSchool Terminal Client Setup")
    print("=" * 50)
    
    # Check Python version
    if not check_python_version():
        sys.exit(1)
    
    # Install dependencies
    if not install_requirements():
        print("\n❌ Setup failed during dependency installation")
        sys.exit(1)
    
    # Create directories
    if not create_directories():
        print("\n❌ Setup failed during directory creation")
        sys.exit(1)
    
    # Check Supabase connection
    check_supabase_connection()
    
    # Create launcher
    create_launcher()
    
    print("\n" + "=" * 50)
    print("✅ Setup completed successfully!")
    print("\n📋 Next steps:")
    print("1. Ensure Supabase server is running:")
    print("   cd ../server && docker compose up -d")
    print("\n2. Start the terminal client:")
    print("   python main.py")
    print("   # or")
    print("   ./carpschool-cli")
    print("\n3. Sign up for a new account or login with existing credentials")
    print("\n🎉 Happy carpooling!")

if __name__ == "__main__":
    main()
