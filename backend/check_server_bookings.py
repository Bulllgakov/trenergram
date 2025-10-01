#!/usr/bin/env python3
"""
Check all bookings on server via API
"""
import requests
import json

API_URL = "https://trenergram.ru/api/v1"

def check_bookings():
    """Check bookings via API"""

    # Check health
    response = requests.get(f"{API_URL}/../health")
    print("Health:", response.json())
    print()

    # Get trainer info
    trainer_id = "236692046"
    response = requests.get(f"{API_URL}/users/trainer/{trainer_id}")
    if response.status_code == 200:
        trainer = response.json()
        print(f"Trainer: {trainer.get('name')} (ID: {trainer.get('id')})")
        print(f"  Telegram ID: {trainer.get('telegram_id')}")
        print(f"  Total bookings: {trainer.get('total_bookings', 0)}")
        print()

    # Get trainer bookings
    response = requests.get(f"{API_URL}/bookings/trainer/{trainer_id}")
    if response.status_code == 200:
        bookings = response.json()
        print(f"Trainer bookings: {len(bookings)}")
        for booking in bookings:
            print(f"  - {booking.get('datetime')} - {booking.get('client_name')} ({booking.get('status')})")
    else:
        print(f"Error getting trainer bookings: {response.status_code}")
        print(response.text)

    print()

    # Try to check as client (might fail)
    response = requests.get(f"{API_URL}/bookings/client/{trainer_id}")
    if response.status_code == 200:
        bookings = response.json()
        print(f"Client bookings (if any): {len(bookings)}")
        for booking in bookings:
            print(f"  - {booking.get('datetime')} - Trainer: {booking.get('trainer_name')} ({booking.get('status')})")
    else:
        print(f"Client bookings error: {response.json().get('detail', 'Unknown error')}")

if __name__ == "__main__":
    check_bookings()