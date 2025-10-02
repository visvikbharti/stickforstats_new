"""
Simple test file to check if server starts
"""

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

@api_view(['GET'])
@permission_classes([AllowAny])
def simple_test(request):
    return Response({"message": "Server is running!"})