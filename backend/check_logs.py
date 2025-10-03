#!/usr/bin/env python3
"""
Check recent bot activity and user registrations
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from db.session import SessionLocal
from models import User, UserRole, TrainerClient
from datetime import datetime, timedelta

def check_recent_activity():
    """Check recent users and relationships"""
    db = SessionLocal()
    try:
        print("=== ПРОВЕРКА АКТИВНОСТИ ===\n")

        # Check if client 8384084241 exists
        client_id = '8384084241'
        client = db.query(User).filter_by(telegram_id=client_id).first()

        if client:
            print(f"✅ Клиент {client_id} НАЙДЕН:")
            print(f"  - ID в БД: {client.id}")
            print(f"  - Имя: {client.name}")
            print(f"  - Username: @{client.telegram_username or 'нет'}")
            print(f"  - Телефон: {client.phone}")
            print(f"  - Роль: {client.role}")
            print(f"  - Создан: {client.created_at}")

            # Check relationships
            relationships = db.query(TrainerClient).filter_by(client_id=client.id).all()
            if relationships:
                print(f"\n  Привязан к тренерам:")
                for rel in relationships:
                    trainer = db.query(User).filter_by(id=rel.trainer_id).first()
                    if trainer:
                        print(f"    - {trainer.name} (ID: {trainer.telegram_id})")
                        print(f"      Создана связь: {rel.created_at}")
            else:
                print(f"\n  ⚠️ НЕТ привязки к тренерам!")
        else:
            print(f"❌ Клиент {client_id} НЕ НАЙДЕН в базе данных")

        # Check recent registrations
        print("\n=== ПОСЛЕДНИЕ РЕГИСТРАЦИИ (24 часа) ===")
        yesterday = datetime.utcnow() - timedelta(hours=24)
        recent_users = db.query(User).filter(User.created_at >= yesterday).all()

        if recent_users:
            for user in recent_users:
                print(f"\n{user.role.upper()}: {user.name}")
                print(f"  - Telegram ID: {user.telegram_id}")
                print(f"  - Username: @{user.telegram_username or 'нет'}")
                print(f"  - Создан: {user.created_at}")
        else:
            print("Нет новых регистраций за последние 24 часа")

        # Check all trainer-client relationships
        print("\n=== ВСЕ СВЯЗИ ТРЕНЕР-КЛИЕНТ ===")
        all_relationships = db.query(TrainerClient).all()

        if all_relationships:
            for rel in all_relationships:
                trainer = db.query(User).filter_by(id=rel.trainer_id).first()
                client_rel = db.query(User).filter_by(id=rel.client_id).first()
                if trainer and client_rel:
                    print(f"  - Тренер: {trainer.name} ({trainer.telegram_id}) -> Клиент: {client_rel.name} ({client_rel.telegram_id})")
        else:
            print("Нет связей между тренерами и клиентами")

    finally:
        db.close()

if __name__ == "__main__":
    check_recent_activity()