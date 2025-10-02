import os
import logging
import jwt
import hashlib
import uuid
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, Tuple, List
import json
from pathlib import Path

from django.conf import settings
from django.contrib.auth.hashers import make_password, check_password
from django.core.cache import cache
from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed

from core.services.error_handler import safe_operation, try_except

logger = logging.getLogger(__name__)

class AuthService:
    """
    Handles user authentication, authorization, and user management.
    
    This service provides methods for:
    - User registration and login
    - Token generation and validation
    - Permission management
    - User preferences storage
    """
    
    def __init__(self):
        """Initialize auth service with storage paths."""
        self._ensure_storage_directories()
        self._load_users()
        self.token_validity_days = 7
        self.secret_key = self._get_jwt_secret_key()
        
    def _ensure_storage_directories(self):
        """Ensure required storage directories exist."""
        users_dir = os.path.join(settings.BASE_DIR, "data", "users")
        Path(users_dir).mkdir(parents=True, exist_ok=True)
        
    def _get_jwt_secret_key(self) -> str:
        """Get or create JWT secret key."""
        # First try to get from Django settings
        if hasattr(settings, 'JWT_SECRET_KEY'):
            return settings.JWT_SECRET_KEY
            
        # Next, try to get from environment
        env_secret = os.environ.get('JWT_SECRET_KEY')
        if env_secret:
            return env_secret
            
        # Finally, use Django secret key with a prefix
        return f"jwt_{settings.SECRET_KEY}"
        
    def _get_users_file_path(self) -> str:
        """Get path to users JSON file."""
        return os.path.join(settings.BASE_DIR, "data", "users", "users.json")
        
    def _load_users(self):
        """Load users from storage."""
        users_file = self._get_users_file_path()
        self.users = {}
        
        if os.path.exists(users_file):
            try:
                with open(users_file, 'r') as f:
                    self.users = json.load(f)
            except json.JSONDecodeError:
                logger.error("Error loading users file. Starting with empty users database.")
                self.users = {}
                
    def _save_users(self):
        """Save users to storage."""
        users_file = self._get_users_file_path()
        
        # Save atomically to prevent corruption
        tmp_file = f"{users_file}.tmp"
        with open(tmp_file, 'w') as f:
            json.dump(self.users, f, indent=2)
            
        os.replace(tmp_file, users_file)
        
    @safe_operation
    def register_user(self, username: str, password: str, email: str, 
                     full_name: str = "", role: str = "user") -> Dict[str, Any]:
        """
        Register a new user.
        
        Args:
            username: Unique username
            password: User password
            email: User email
            full_name: User's full name
            role: User role (user, admin, etc.)
            
        Returns:
            User info dict or error message
        """
        # Validate inputs
        if not username or not password or not email:
            return {'error': 'Missing required fields'}
            
        # Check if username exists
        if username in self.users:
            return {'error': 'Username already exists'}
            
        # Check if email exists
        if any(user['email'] == email for user in self.users.values()):
            return {'error': 'Email already registered'}
            
        # Create user record
        user_id = str(uuid.uuid4())
        user_record = {
            'id': user_id,
            'username': username,
            'password': make_password(password),  # Hash the password
            'email': email,
            'full_name': full_name,
            'role': role,
            'date_created': datetime.now().isoformat(),
            'last_login': None,
            'is_active': True,
            'preferences': {},
            'permissions': self._get_default_permissions(role)
        }
        
        # Save user
        self.users[username] = user_record
        self._save_users()
        
        # Create and return a JWT token
        user_info = self._create_user_info(user_record)
        token = self.generate_token(user_info)
        
        return {
            'user': user_info,
            'token': token
        }
        
    def _get_default_permissions(self, role: str) -> List[str]:
        """Get default permissions for a role."""
        if role == "admin":
            return ["*"]  # All permissions
        elif role == "user":
            return [
                "analysis:read",
                "analysis:create",
                "data:read",
                "data:create",
                "visualization:read",
                "visualization:create",
                "report:read",
                "report:create"
            ]
        else:
            return []  # No permissions
        
    def _create_user_info(self, user_record: Dict[str, Any]) -> Dict[str, Any]:
        """Create user info dict from user record."""
        # Exclude sensitive information
        return {
            'id': user_record['id'],
            'username': user_record['username'],
            'email': user_record['email'],
            'full_name': user_record['full_name'],
            'role': user_record['role'],
            'is_active': user_record['is_active'],
            'permissions': user_record['permissions']
        }
        
    @safe_operation
    def login_user(self, username: str, password: str) -> Dict[str, Any]:
        """
        Authenticate a user and generate a token.
        
        Args:
            username: User's username
            password: User's password
            
        Returns:
            Dict with token and user info on success, error message on failure
        """
        # Check if user exists
        if username not in self.users:
            return {'error': 'Invalid username or password'}
            
        user_record = self.users[username]
        
        # Check if user is active
        if not user_record.get('is_active', True):
            return {'error': 'Account is inactive'}
            
        # Check password
        if not check_password(password, user_record['password']):
            return {'error': 'Invalid username or password'}
            
        # Update last login
        user_record['last_login'] = datetime.now().isoformat()
        self.users[username] = user_record
        self._save_users()
        
        # Generate token
        user_info = self._create_user_info(user_record)
        token = self.generate_token(user_info)
        
        return {
            'user': user_info,
            'token': token
        }
        
    @safe_operation
    def generate_token(self, user_info: Dict[str, Any]) -> str:
        """
        Generate a JWT token for a user.
        
        Args:
            user_info: User information to encode in token
            
        Returns:
            JWT token string
        """
        payload = {
            'sub': user_info['username'],
            'id': user_info['id'],
            'role': user_info['role'],
            'iat': datetime.utcnow(),
            'exp': datetime.utcnow() + timedelta(days=self.token_validity_days)
        }
        
        token = jwt.encode(payload, self.secret_key, algorithm='HS256')
        
        # Store in cache for quick validation
        cache_key = f"auth_token_{payload['id']}"
        cache.set(cache_key, token, timeout=self.token_validity_days * 86400)
        
        return token
        
    @safe_operation
    def validate_token(self, token: str) -> Tuple[bool, Optional[Dict[str, Any]]]:
        """
        Validate a JWT token.
        
        Args:
            token: JWT token string
            
        Returns:
            Tuple of (is_valid, user_info)
        """
        try:
            # Decode token
            payload = jwt.decode(token, self.secret_key, algorithms=['HS256'])
            
            # Check if user exists
            username = payload.get('sub')
            if username not in self.users:
                return False, None
                
            # Check if user is active
            user_record = self.users[username]
            if not user_record.get('is_active', True):
                return False, None
                
            # Return user info
            user_info = self._create_user_info(user_record)
            return True, user_info
            
        except jwt.ExpiredSignatureError:
            logger.info("Token expired")
            return False, None
        except jwt.InvalidTokenError:
            logger.info("Invalid token")
            return False, None
            
    @safe_operation
    def update_user(self, username: str, updates: Dict[str, Any]) -> Dict[str, Any]:
        """
        Update user information.
        
        Args:
            username: Username to update
            updates: Dictionary of fields to update
            
        Returns:
            Updated user info dict
        """
        # Check if user exists
        if username not in self.users:
            return {'error': 'User not found'}
            
        user_record = self.users[username]
        
        # Apply updates
        allowed_fields = ['email', 'full_name', 'is_active', 'preferences']
        for field, value in updates.items():
            if field in allowed_fields:
                user_record[field] = value
                
        # Special handling for password
        if 'password' in updates and updates['password']:
            user_record['password'] = make_password(updates['password'])
            
        # Save user
        self.users[username] = user_record
        self._save_users()
        
        # Return updated user info
        return self._create_user_info(user_record)
        
    @safe_operation
    def get_user_info(self, username: str) -> Dict[str, Any]:
        """
        Get user information.
        
        Args:
            username: Username to retrieve
            
        Returns:
            User info dict
        """
        # Check if user exists
        if username not in self.users:
            return {'error': 'User not found'}
            
        user_record = self.users[username]
        return self._create_user_info(user_record)
        
    @safe_operation
    def delete_user(self, username: str) -> bool:
        """
        Delete a user.
        
        Args:
            username: Username to delete
            
        Returns:
            True if deleted, False otherwise
        """
        # Check if user exists
        if username not in self.users:
            return False
            
        # Delete user
        del self.users[username]
        self._save_users()
        
        # Invalidate cache
        user_id = self.users.get(username, {}).get('id')
        if user_id:
            cache.delete(f"auth_token_{user_id}")
            
        return True
        
    @safe_operation
    def update_user_preferences(self, username: str, 
                              preferences: Dict[str, Any]) -> Dict[str, Any]:
        """
        Update user preferences.
        
        Args:
            username: Username to update
            preferences: New preferences dict
            
        Returns:
            Updated preferences dict
        """
        # Check if user exists
        if username not in self.users:
            return {'error': 'User not found'}
            
        user_record = self.users[username]
        
        # Update preferences
        user_record['preferences'] = {
            **user_record.get('preferences', {}),
            **preferences
        }
        
        # Save user
        self.users[username] = user_record
        self._save_users()
        
        return user_record['preferences']
        
    @safe_operation
    def has_permission(self, username: str, permission: str) -> bool:
        """
        Check if a user has a specific permission.
        
        Args:
            username: Username to check
            permission: Permission to check
            
        Returns:
            True if user has permission, False otherwise
        """
        # Check if user exists
        if username not in self.users:
            return False
            
        user_record = self.users[username]
        permissions = user_record.get('permissions', [])
        
        # Admin role has all permissions
        if user_record.get('role') == 'admin' or '*' in permissions:
            return True
            
        # Check specific permission
        return permission in permissions

class JWTAuthentication(BaseAuthentication):
    """
    JWT authentication for Django Rest Framework.
    """
    
    def authenticate(self, request):
        """Authenticate the request and return a two-tuple of (user, token)."""
        auth_header = request.META.get('HTTP_AUTHORIZATION')
        if not auth_header:
            return None
            
        # Check for Bearer token
        auth_parts = auth_header.split()
        if len(auth_parts) != 2 or auth_parts[0].lower() != 'bearer':
            return None
            
        token = auth_parts[1]
        
        # Validate token
        auth_service = get_auth_service()
        is_valid, user_info = auth_service.validate_token(token)
        
        if not is_valid or not user_info:
            raise AuthenticationFailed('Invalid token')
            
        # Create a simple user object
        user = type('User', (), {
            'username': user_info['username'],
            'user_id': user_info['id'],
            'role': user_info['role'],
            'permissions': user_info['permissions'],
            'is_authenticated': True
        })
        
        return (user, token)
        
    def authenticate_header(self, request):
        """Return the authentication header for 401 responses."""
        return 'Bearer'

# Initialize global auth service
auth_service = AuthService()

def get_auth_service() -> AuthService:
    """Get the global auth service instance."""
    return auth_service