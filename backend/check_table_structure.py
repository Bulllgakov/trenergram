#!/usr/bin/env python3
"""
Проверяет структуру таблицы users в продакшн БД
"""

import asyncio
import sys
import os
sys.path.append('.')

from db.base import async_session
from sqlalchemy import text

async def check_users_table_structure():
    """Проверяет структуру таблицы users"""
    print("=== СТРУКТУРА ТАБЛИЦЫ USERS ===")

    async with async_session() as session:
        try:
            # Получить информацию о столбцах таблицы users
            result = await session.execute(text("""
                SELECT column_name, data_type, is_nullable
                FROM information_schema.columns
                WHERE table_name = 'users'
                ORDER BY ordinal_position
            """))
            columns = result.fetchall()

            if columns:
                print("Столбцы в таблице users:")
                for col in columns:
                    print(f"  - {col[0]} ({col[1]}, nullable: {col[2]})")
            else:
                print("Таблица users не найдена или нет столбцов")

            print(f"\nВсего столбцов: {len(columns)}")

        except Exception as e:
            print(f"❌ ОШИБКА: {e}")
            import traceback
            traceback.print_exc()

async def check_sample_data():
    """Проверяет образец данных"""
    print("\n=== ОБРАЗЕЦ ДАННЫХ ===")

    async with async_session() as session:
        try:
            result = await session.execute(text("""
                SELECT telegram_id, name, role
                FROM users
                WHERE telegram_id IN ('236692046', '8384084241')
            """))
            users = result.fetchall()

            print("Найденные пользователи:")
            for user in users:
                print(f"  - TG ID: {user[0]}, Имя: {user[1]}, Роль: {user[2]}")

        except Exception as e:
            print(f"❌ ОШИБКА: {e}")

async def main():
    await check_users_table_structure()
    await check_sample_data()

if __name__ == "__main__":
    asyncio.run(main())