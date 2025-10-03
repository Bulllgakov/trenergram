#!/usr/bin/env python3
"""
Простой скрипт для проверки базы данных без использования сложных моделей
"""

import asyncio
import sys
import os
sys.path.append('.')

from db.base import async_session
from sqlalchemy import text

async def check_users_simple():
    """Простая проверка пользователей через SQL"""
    print("=== ПРОВЕРКА ПОЛЬЗОВАТЕЛЕЙ ЧЕРЕЗ SQL ===")

    async with async_session() as session:
        try:
            # Проверяем структуру таблиц
            print("\n--- Список таблиц ---")
            result = await session.execute(text("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"))
            tables = result.fetchall()
            table_names = [t[0] for t in tables]
            print(f"Таблицы: {table_names}")

            # Проверяем таблицу users (если есть)
            if 'users' in table_names:
                print("\n--- Таблица users ---")
                result = await session.execute(text("SELECT COUNT(*) FROM users"))
                count = result.scalar()
                print(f"Всего записей в users: {count}")

                # Ищем конкретных пользователей
                result = await session.execute(text("""
                    SELECT id, telegram_id, name, role
                    FROM users
                    WHERE telegram_id IN ('236692046', '8384084241')
                """))
                users = result.fetchall()
                print("Пользователи:")
                for user in users:
                    print(f"  - ID: {user[0]}, Telegram ID: {user[1]}, Имя: {user[2]}, Роль: {user[3]}")

            # Проверяем таблицы trainers и clients (если есть)
            if 'trainers' in table_names:
                print("\n--- Таблица trainers ---")
                result = await session.execute(text("SELECT COUNT(*) FROM trainers"))
                count = result.scalar()
                print(f"Всего тренеров: {count}")

                result = await session.execute(text("""
                    SELECT id, telegram_id, name
                    FROM trainers
                    WHERE telegram_id = '236692046'
                """))
                trainer = result.fetchone()
                if trainer:
                    print(f"Тренер найден: ID={trainer[0]}, Telegram ID={trainer[1]}, Имя={trainer[2]}")
                else:
                    print("Тренер 236692046 не найден")

            if 'clients' in table_names:
                print("\n--- Таблица clients ---")
                result = await session.execute(text("SELECT COUNT(*) FROM clients"))
                count = result.scalar()
                print(f"Всего клиентов: {count}")

                result = await session.execute(text("""
                    SELECT id, telegram_id, name
                    FROM clients
                    WHERE telegram_id = '8384084241'
                """))
                client = result.fetchone()
                if client:
                    print(f"Клиент найден: ID={client[0]}, Telegram ID={client[1]}, Имя={client[2]}")
                else:
                    print("Клиент 8384084241 не найден")

            # Проверяем связи trainer_clients (если есть)
            if 'trainer_clients' in table_names:
                print("\n--- Таблица trainer_clients ---")
                result = await session.execute(text("SELECT COUNT(*) FROM trainer_clients"))
                count = result.scalar()
                print(f"Всего связей тренер-клиент: {count}")

                # Проверяем структуру таблицы trainer_clients
                result = await session.execute(text("PRAGMA table_info(trainer_clients)"))
                columns = result.fetchall()
                print("Столбцы в trainer_clients:")
                for col in columns:
                    print(f"  - {col[1]} ({col[2]})")

                # Ищем связь между нашими пользователями (через таблицу users)
                result = await session.execute(text("""
                    SELECT tc.*,
                           u1.telegram_id as trainer_telegram_id, u1.name as trainer_name,
                           u2.telegram_id as client_telegram_id, u2.name as client_name
                    FROM trainer_clients tc
                    LEFT JOIN users u1 ON tc.trainer_id = u1.id
                    LEFT JOIN users u2 ON tc.client_id = u2.id
                    WHERE u1.telegram_id = '236692046' AND u2.telegram_id = '8384084241'
                """))
                specific_relation = result.fetchone()

                if specific_relation:
                    print(f"\n✅ СВЯЗЬ НАЙДЕНА между тренером 236692046 и клиентом 8384084241:")
                    print(f"  - ID связи: {specific_relation[0]}")
                    print(f"  - Тренер ID: {specific_relation[1]} ({specific_relation[6]} - {specific_relation[7]})")
                    print(f"  - Клиент ID: {specific_relation[2]} ({specific_relation[8]} - {specific_relation[9]})")
                    if len(specific_relation) > 3:
                        print(f"  - Дополнительные данные: {specific_relation[3:]}")
                else:
                    print(f"\n❌ СВЯЗЬ НЕ НАЙДЕНА между тренером 236692046 и клиентом 8384084241")

                # Показываем все связи для наглядности
                result = await session.execute(text("""
                    SELECT tc.*,
                           u1.telegram_id as trainer_telegram_id, u1.name as trainer_name,
                           u2.telegram_id as client_telegram_id, u2.name as client_name
                    FROM trainer_clients tc
                    LEFT JOIN users u1 ON tc.trainer_id = u1.id
                    LEFT JOIN users u2 ON tc.client_id = u2.id
                """))
                all_relations = result.fetchall()
                print(f"\nВсе связи в системе ({len(all_relations)}):")
                for rel in all_relations:
                    print(f"  - ID: {rel[0]}, Тренер: {rel[7]} (TG: {rel[6]}), Клиент: {rel[9]} (TG: {rel[8]})")

            # Проверяем таблицу bookings
            if 'bookings' in table_names:
                print("\n--- Таблица bookings ---")
                result = await session.execute(text("SELECT COUNT(*) FROM bookings"))
                count = result.scalar()
                print(f"Всего бронирований: {count}")

                # Ищем бронирования связанные с нашими пользователями
                if 'trainers' in table_names and 'clients' in table_names:
                    result = await session.execute(text("""
                        SELECT b.id, b.trainer_id, b.client_id, b.datetime, b.status,
                               t.telegram_id as trainer_tg, c.telegram_id as client_tg
                        FROM bookings b
                        LEFT JOIN trainers t ON b.trainer_id = t.id
                        LEFT JOIN clients c ON b.client_id = c.id
                        WHERE t.telegram_id = '236692046' OR c.telegram_id = '8384084241'
                        ORDER BY b.datetime DESC
                        LIMIT 10
                    """))
                    bookings = result.fetchall()
                    print("Последние бронирования:")
                    for booking in bookings:
                        print(f"  - ID: {booking[0]}, Дата: {booking[3]}, Статус: {booking[4]}")
                        print(f"    Тренер TG: {booking[5]}, Клиент TG: {booking[6]}")

        except Exception as e:
            print(f"Ошибка: {e}")
            import traceback
            traceback.print_exc()

async def main():
    """Основная функция"""
    await check_users_simple()

if __name__ == "__main__":
    asyncio.run(main())