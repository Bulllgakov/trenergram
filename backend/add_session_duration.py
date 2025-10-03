#!/usr/bin/env python3
"""
Добавляет поле session_duration в таблицу users продакшн БД
"""

import asyncio
import sys
import os
sys.path.append('.')

from db.base import async_session
from sqlalchemy import text

async def add_session_duration_column():
    """Добавляет поле session_duration в таблицу users"""
    print("=== ДОБАВЛЕНИЕ ПОЛЯ session_duration ===")

    async with async_session() as session:
        try:
            # Проверить, есть ли уже поле session_duration
            result = await session.execute(text("""
                SELECT column_name
                FROM information_schema.columns
                WHERE table_name = 'users' AND column_name = 'session_duration'
            """))
            existing = result.fetchone()

            if existing:
                print("✅ Поле session_duration уже существует")
                return True

            # Добавить поле session_duration
            print("➕ Добавляем поле session_duration...")
            await session.execute(text("""
                ALTER TABLE users
                ADD COLUMN session_duration INTEGER DEFAULT 60
            """))

            # Установить значения по умолчанию для существующих тренеров
            print("🔧 Устанавливаем значения по умолчанию для тренеров...")
            result = await session.execute(text("""
                UPDATE users
                SET session_duration = 60
                WHERE role = 'TRAINER' AND session_duration IS NULL
            """))

            await session.commit()

            # Проверить результат
            updated_count = result.rowcount
            print(f"✅ Поле session_duration добавлено успешно")
            print(f"📊 Обновлено тренеров: {updated_count}")

            return True

        except Exception as e:
            print(f"❌ ОШИБКА при добавлении поля: {e}")
            import traceback
            traceback.print_exc()
            await session.rollback()
            return False

async def verify_session_duration():
    """Проверяет добавленное поле"""
    print("\n=== ПРОВЕРКА ПОЛЯ session_duration ===")

    async with async_session() as session:
        try:
            # Проверить структуру
            result = await session.execute(text("""
                SELECT column_name, data_type, column_default, is_nullable
                FROM information_schema.columns
                WHERE table_name = 'users' AND column_name = 'session_duration'
            """))
            column_info = result.fetchone()

            if column_info:
                print("✅ Поле session_duration найдено:")
                print(f"   - Тип: {column_info[1]}")
                print(f"   - По умолчанию: {column_info[2]}")
                print(f"   - Может быть NULL: {column_info[3]}")
            else:
                print("❌ Поле session_duration не найдено")
                return False

            # Проверить данные тренеров
            result = await session.execute(text("""
                SELECT telegram_id, name, session_duration
                FROM users
                WHERE role = 'TRAINER'
            """))
            trainers = result.fetchall()

            print(f"\nТренеры с session_duration:")
            for trainer in trainers:
                duration = trainer[2] if trainer[2] is not None else "NULL"
                print(f"   - {trainer[1]} (TG: {trainer[0]}): {duration} мин")

            return True

        except Exception as e:
            print(f"❌ ОШИБКА при проверке: {e}")
            return False

async def main():
    """Основная функция"""
    print("🚀 ДОБАВЛЕНИЕ ПОЛЯ session_duration В ПРОДАКШН БД")
    print("=" * 55)

    # Добавить поле
    success = await add_session_duration_column()

    if success:
        # Проверить результат
        await verify_session_duration()
        print("\n🎉 МИГРАЦИЯ ВЫПОЛНЕНА УСПЕШНО!")
        print("💡 Теперь API должен работать без ошибок")
    else:
        print("\n❌ МИГРАЦИЯ ЗАВЕРШИЛАСЬ С ОШИБКОЙ")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())