#!/usr/bin/env python3
"""
Test script for the admin notification endpoint
"""
import asyncio
import httpx
import json

# Test configuration
BASE_URL = "http://localhost:3004"
ADMIN_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImFkbWluLTEiLCJyb2xlIjoiYWRtaW4iLCJleHAiOjk5OTk5OTk5OTl9.8XvS_7Nod_euT8SY25GDVahl4GoJADzAUsArUJvGfgk"

async def test_admin_notification():
    """Test the admin notification endpoint"""
    
    # Test data
    notification_data = {
        "user_id": "user-123",
        "user_email": "test@example.com",
        "type": "manual_announcement",
        "title": "System Maintenance",
        "message": "The system will be under maintenance from 2AM to 4AM tomorrow.",
        "send_email": False,
        "metadata": {
            "priority": "high",
            "category": "system"
        }
    }
    
    async with httpx.AsyncClient() as client:
        try:
            # Test admin endpoint
            response = await client.post(
                f"{BASE_URL}/api/notifications/admin/send",
                json=notification_data,
                headers={"Authorization": f"Bearer {ADMIN_TOKEN}"}
            )
            
            if response.status_code == 201:
                result = response.json()
                print("✅ Admin notification created successfully!")
                print(f"Notification ID: {result['id']}")
                print(f"Title: {result['title']}")
                print(f"Message: {result['message']}")
                return result
            else:
                print(f"❌ Failed to create notification: {response.status_code}")
                print(f"Error: {response.text}")
                return None
                
        except httpx.ConnectError:
            print("❌ Cannot connect to the service. Make sure it's running on port 3004")
            return None
        except Exception as e:
            print(f"❌ Unexpected error: {e}")
            return None

if __name__ == "__main__":
    print("🚀 Testing admin notification endpoint...")
    asyncio.run(test_admin_notification())
