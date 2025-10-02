#!/usr/bin/env python3
"""Add production data to local database"""

import sqlite3
from datetime import datetime

# Connect to database
conn = sqlite3.connect('trenergram.db')
cursor = conn.cursor()

# Create tables if they don't exist
cursor.execute('''
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    telegram_id TEXT UNIQUE NOT NULL,
    telegram_username TEXT,
    name TEXT,
    role TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    club_id INTEGER,
    specialization TEXT,
    price INTEGER,
    description TEXT,
    rating INTEGER,
    is_active BOOLEAN DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
''')

cursor.execute('''
CREATE TABLE IF NOT EXISTS trainer_client (
    trainer_id INTEGER,
    client_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (trainer_id, client_id),
    FOREIGN KEY (trainer_id) REFERENCES users(id),
    FOREIGN KEY (client_id) REFERENCES users(id)
)
''')

# Clear existing data
cursor.execute('DELETE FROM trainer_client')
cursor.execute('DELETE FROM users')

# Add trainer (Bulat)
cursor.execute('''
INSERT INTO users (telegram_id, telegram_username, name, role, phone, email,
                   specialization, price, description, rating, is_active, created_at)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
''', (
    '236692046',
    'bulat_coach',
    'Булат',
    'trainer',
    '+7 999 123-45-67',
    None,
    'Силовые тренировки',
    3000,
    'Опытный тренер',
    None,
    1,
    '2025-09-21T08:48:56.477806Z'
))

trainer_id = cursor.lastrowid

# Add client (Bulat Cvetov.Ru)
cursor.execute('''
INSERT INTO users (telegram_id, telegram_username, name, role, phone, email,
                   specialization, price, description, rating, is_active, created_at)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
''', (
    '8384084241',
    None,
    'Bulat Cvetov.Ru',
    'client',
    '79274449682',
    None,
    None,
    None,
    None,
    50,
    1,
    '2025-10-01T16:30:21.045103Z'
))

client_id = cursor.lastrowid

# Create connection between trainer and client
cursor.execute('''
INSERT INTO trainer_client (trainer_id, client_id, created_at)
VALUES (?, ?, ?)
''', (trainer_id, client_id, datetime.now()))

# Add booking if table exists
cursor.execute('''
CREATE TABLE IF NOT EXISTS bookings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    trainer_id INTEGER NOT NULL,
    client_id INTEGER NOT NULL,
    datetime TIMESTAMP NOT NULL,
    duration INTEGER DEFAULT 60,
    price INTEGER,
    status TEXT DEFAULT 'PENDING',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (trainer_id) REFERENCES users(id),
    FOREIGN KEY (client_id) REFERENCES users(id)
)
''')

# Add a booking between them
cursor.execute('''
INSERT INTO bookings (trainer_id, client_id, datetime, duration, price, status, notes)
VALUES (?, ?, ?, ?, ?, ?, ?)
''', (
    trainer_id,
    client_id,
    '2025-10-03T10:00:00',
    60,
    3000,
    'CONFIRMED',
    'Силовая тренировка'
))

# Commit changes
conn.commit()

# Verify data
print("Data added successfully!\n")

cursor.execute('SELECT * FROM users WHERE role="trainer"')
trainers = cursor.fetchall()
print('TRAINERS:')
for t in trainers:
    print(f'  ID: {t[0]}, TG_ID: {t[1]}, Username: {t[2]}, Name: {t[3]}')

cursor.execute('SELECT * FROM users WHERE role="client"')
clients = cursor.fetchall()
print('\nCLIENTS:')
for c in clients:
    print(f'  ID: {c[0]}, TG_ID: {c[1]}, Username: {c[2]}, Name: {c[3]}')

cursor.execute('''
SELECT t.name as trainer_name, c.name as client_name
FROM trainer_client tc
JOIN users t ON tc.trainer_id = t.id
JOIN users c ON tc.client_id = c.id
''')
connections = cursor.fetchall()
print('\nCONNECTIONS:')
for conn in connections:
    print(f'  Trainer "{conn[0]}" <-> Client "{conn[1]}"')

conn.close()