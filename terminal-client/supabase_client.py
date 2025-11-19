"""
Supabase API Client
A wrapper for making HTTP requests to Supabase REST API
"""

import requests
import json
from typing import Optional, Dict, Any, Union


class SupabaseClient:
    def __init__(self, url: str, anon_key: str):
        self.base_url = url.rstrip('/')
        self.anon_key = anon_key
        self.access_token = None
        self.session = requests.Session()
        
        # Set default headers
        self.session.headers.update({
            'apikey': anon_key,
            'Authorization': f'Bearer {anon_key}',
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
        })
        
    def set_auth_token(self, token: Optional[str]):
        """Set the JWT token for authenticated requests"""
        self.access_token = token
        if token:
            self.session.headers.update({
                'Authorization': f'Bearer {token}'
            })
        else:
            # Fall back to anon key
            self.session.headers.update({
                'Authorization': f'Bearer {self.anon_key}'
            })
            
    def _make_request(self, method: str, endpoint: str, data: Optional[Dict] = None, params: Optional[Dict] = None) -> Optional[Dict]:
        """Make HTTP request to Supabase API"""
        url = f"{self.base_url}{endpoint}"
        
        try:
            if method.upper() == 'GET':
                response = self.session.get(url, params=params)
            elif method.upper() == 'POST':
                response = self.session.post(url, json=data, params=params)
            elif method.upper() == 'PATCH':
                response = self.session.patch(url, json=data, params=params)
            elif method.upper() == 'DELETE':
                response = self.session.delete(url, params=params)
            else:
                raise ValueError(f"Unsupported HTTP method: {method}")
                
            # Handle different response codes
            if response.status_code == 200:
                try:
                    return {'success': True, 'data': response.json()}
                except json.JSONDecodeError:
                    return {'success': True, 'data': response.text}
            elif response.status_code == 201:
                try:
                    return {'success': True, 'data': response.json()}
                except json.JSONDecodeError:
                    return {'success': True, 'data': None}
            elif response.status_code == 204:
                return {'success': True, 'data': None}
            else:
                error_msg = f"HTTP {response.status_code}"
                try:
                    error_data = response.json()
                    error_msg = error_data.get('message', error_msg)
                except:
                    pass
                return {'success': False, 'error': error_msg, 'status_code': response.status_code}
                
        except requests.exceptions.RequestException as e:
            return {'success': False, 'error': f"Request failed: {str(e)}"}
        except Exception as e:
            return {'success': False, 'error': f"Unexpected error: {str(e)}"}
            
    def get(self, endpoint: str, params: Optional[Dict] = None) -> Optional[Dict]:
        """Make GET request"""
        return self._make_request('GET', endpoint, params=params)
        
    def post(self, endpoint: str, data: Dict, params: Optional[Dict] = None) -> Optional[Dict]:
        """Make POST request"""
        return self._make_request('POST', endpoint, data=data, params=params)
        
    def patch(self, endpoint: str, data: Dict, params: Optional[Dict] = None) -> Optional[Dict]:
        """Make PATCH request"""
        return self._make_request('PATCH', endpoint, data=data, params=params)
        
    def delete(self, endpoint: str, params: Optional[Dict] = None) -> Optional[Dict]:
        """Make DELETE request"""
        return self._make_request('DELETE', endpoint, params=params)
        
    def auth_request(self, endpoint: str, data: Dict) -> Optional[Dict]:
        """Make authentication request to GoTrue"""
        url = f"{self.base_url}/auth/v1{endpoint}"
        
        try:
            response = self.session.post(url, json=data)
            
            if response.status_code in [200, 201]:
                return {'success': True, 'data': response.json()}
            else:
                error_msg = f"HTTP {response.status_code}"
                try:
                    error_data = response.json()
                    error_msg = error_data.get('message', error_data.get('msg', error_msg))
                except:
                    pass
                return {'success': False, 'error': error_msg}
                
        except Exception as e:
            return {'success': False, 'error': str(e)}
            
    def storage_upload(self, bucket: str, path: str, file_data: bytes, content_type: str = 'application/octet-stream') -> Optional[Dict]:
        """Upload file to Supabase Storage"""
        url = f"{self.base_url}/storage/v1/object/{bucket}/{path}"
        
        headers = {
            'Authorization': f'Bearer {self.access_token or self.anon_key}',
            'Content-Type': content_type
        }
        
        try:
            response = requests.post(url, data=file_data, headers=headers)
            
            if response.status_code in [200, 201]:
                return {'success': True, 'data': response.json()}
            else:
                return {'success': False, 'error': f"Upload failed: HTTP {response.status_code}"}
                
        except Exception as e:
            return {'success': False, 'error': str(e)}
            
    def storage_download(self, bucket: str, path: str) -> Optional[bytes]:
        """Download file from Supabase Storage"""
        url = f"{self.base_url}/storage/v1/object/{bucket}/{path}"
        
        headers = {
            'Authorization': f'Bearer {self.access_token or self.anon_key}'
        }
        
        try:
            response = requests.get(url, headers=headers)
            
            if response.status_code == 200:
                return response.content
            else:
                return None
                
        except Exception as e:
            return None
            
    def realtime_connect(self, channel: str, callback: callable):
        """Connect to Realtime (WebSocket) - Basic implementation"""
        print(f"Realtime connection to {channel} would be established here...")
        print("For full WebSocket support, consider using the official Supabase Python client")
        
    def edge_function_call(self, function_name: str, data: Dict) -> Optional[Dict]:
        """Call Supabase Edge Function"""
        endpoint = f"/functions/v1/{function_name}"
        return self.post(endpoint, data)
        
    def rpc_call(self, function_name: str, params: Dict) -> Optional[Dict]:
        """Call PostgreSQL stored procedure via PostgREST"""
        endpoint = f"/rest/v1/rpc/{function_name}"
        return self.post(endpoint, params)
        
    def health_check(self) -> Dict[str, Any]:
        """Check API health status"""
        health_status = {
            'rest_api': False,
            'auth_api': False,
            'storage_api': False,
            'functions_api': False
        }
        
        # Test REST API
        try:
            response = self.get('/rest/v1/')
            health_status['rest_api'] = response and response.get('success', False)
        except:
            pass
            
        # Test Auth API
        try:
            response = self.auth_request('/settings', {})
            health_status['auth_api'] = response and response.get('success', False)
        except:
            pass
            
        # Test Storage API
        try:
            url = f"{self.base_url}/storage/v1/bucket"
            response = requests.get(url, headers={'Authorization': f'Bearer {self.anon_key}'})
            health_status['storage_api'] = response.status_code in [200, 401, 403]  # 401/403 means API is responding
        except:
            pass
            
        return health_status
