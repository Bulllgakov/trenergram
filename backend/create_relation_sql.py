#!/usr/bin/env python3
"""
Простой SQL скрипт для создания связи между тренером и клиентом
Не зависит от ORM моделей
"""

import asyncio
import sys
import os
sys.path.append('.')

from db.base import async_session
from sqlalchemy import text
from datetime import datetime

async def create_trainer_client_relation_sql():
    """Создает связь между тренером 236692046 и клиентом 8384084241 через SQL"""
    trainer_telegram_id = "236692046"
    client_telegram_id = "8384084241"

    print(f"=== СОЗДАНИЕ СВЯЗИ ТРЕНЕР-КЛИЕНТ ЧЕРЕЗ SQL ===")
    print(f"Тренер: {trainer_telegram_id}")
    print(f"Клиент: {client_telegram_id}")

    async with async_session() as session:
        try:
            # Найти тренера
            trainer_result = await session.execute(text("""
                SELECT id, name, role FROM users
                WHERE telegram_id = :telegram_id AND role = 'TRAINER'
            """), {"telegram_id": trainer_telegram_id})
            trainer = trainer_result.fetchone()

            # Найти клиента
            client_result = await session.execute(text("""
                SELECT id, name, role FROM users
                WHERE telegram_id = :telegram_id AND role = 'CLIENT'
            """), {"telegram_id": client_telegram_id})
            client = client_result.fetchone()

            if not trainer:
                print(f"❌ ОШИБКА: Тренер {trainer_telegram_id} не найден в базе данных")
                return False

            if not client:
                print(f"❌ ОШИБКА: Клиент {client_telegram_id} не найден в базе данных")
                return False

            trainer_id = trainer[0]
            trainer_name = trainer[1]
            client_id = client[0]
            client_name = client[1]

            print(f"✅ Тренер найден: {trainer_name} (ID: {trainer_id})")
            print(f"✅ Клиент найден: {client_name} (ID: {client_id})")

            # Проверить, есть ли уже связь
            existing_result = await session.execute(text("""
                SELECT id, is_active FROM trainer_clients
                WHERE trainer_id = :trainer_id AND client_id = :client_id
            """), {"trainer_id": trainer_id, "client_id": client_id})
            existing = existing_result.fetchone()

            if existing:
                relation_id = existing[0]
                is_active = existing[1]
                if is_active:
                    print(f"✅ Связь уже существует и активна (ID: {relation_id})")
                    return True
                else:
                    # Активировать существующую связь
                    await session.execute(text("""
                        UPDATE trainer_clients
                        SET is_active = true, updated_at = :updated_at
                        WHERE id = :relation_id
                    """), {"relation_id": relation_id, "updated_at": datetime.utcnow()})
                    await session.commit()
                    print(f"✅ Существующая связь активирована (ID: {relation_id})")
                    return True

            # Создать новую связь
            await session.execute(text("""
                INSERT INTO trainer_clients
                (trainer_id, client_id, is_active, created_at, updated_at, source, total_bookings, completed_bookings, cancelled_bookings, balance)
                VALUES (:trainer_id, :client_id, true, :created_at, :updated_at, 'manual', 0, 0, 0, 0)
            """), {
                "trainer_id": trainer_id,
                "client_id": client_id,
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            })

            await session.commit()

            # Получить ID созданной связи
            new_relation_result = await session.execute(text("""
                SELECT id FROM trainer_clients
                WHERE trainer_id = :trainer_id AND client_id = :client_id AND is_active = true
                ORDER BY created_at DESC LIMIT 1
            """), {"trainer_id": trainer_id, "client_id": client_id})
            new_relation = new_relation_result.fetchone()
            new_relation_id = new_relation[0] if new_relation else "Unknown"

            print(f"✅ УСПЕШНО: Создана новая связь тренер-клиент (ID: {new_relation_id})")
            print(f"   - Тренер ID: {trainer_id} ({trainer_name})")
            print(f"   - Клиент ID: {client_id} ({client_name})")
            print(f"   - Статус: активна")

            return True

        except Exception as e:
            print(f"❌ ОШИБКА при создании связи: {e}")
            import traceback
            traceback.print_exc()
            await session.rollback()
            return False

async def verify_relation_sql():
    """Проверяет созданную связь через SQL"""
    trainer_telegram_id = "236692046"
    client_telegram_id = "8384084241"

    print(f"\n=== ПРОВЕРКА СОЗДАННОЙ СВЯЗИ ===")

    async with async_session() as session:
        try:
            # Проверить связь
            result = await session.execute(text("""
                SELECT tc.id, tc.is_active, tc.created_at,
                       u1.name as trainer_name, u1.telegram_id as trainer_tg,
                       u2.name as client_name, u2.telegram_id as client_tg
                FROM trainer_clients tc
                JOIN users u1 ON tc.trainer_id = u1.id
                JOIN users u2 ON tc.client_id = u2.id
                WHERE u1.telegram_id = :trainer_tg AND u2.telegram_id = :client_tg AND tc.is_active = true
            """), {"trainer_tg": trainer_telegram_id, "client_tg": client_telegram_id})

            relation = result.fetchone()

            if relation:
                print(f"✅ СВЯЗЬ ПОДТВЕРЖДЕНА:")
                print(f"   - ID связи: {relation[0]}")
                print(f"   - Тренер: {relation[3]} (TG: {relation[4]})")
                print(f"   - Клиент: {relation[5]} (TG: {relation[6]})")
                print(f"   - Активна: {relation[1]}")
                print(f"   - Создана: {relation[2]}")
                return True
            else:
                print("❌ СВЯЗЬ НЕ НАЙДЕНА")
                return False

        except Exception as e:
            print(f"❌ ОШИБКА при проверке: {e}")
            return False

async def main():
    """Основная функция"""
    print("🚀 ЗАПУСК SQL СКРИПТА СОЗДАНИЯ СВЯЗИ ТРЕНЕР-КЛИЕНТ")
    print("=" * 50)

    # Создать связь
    success = await create_trainer_client_relation_sql()

    if success:
        # Проверить созданную связь
        await verify_relation_sql()
        print("\n🎉 СКРИПТ ВЫПОЛНЕН УСПЕШНО!")
        print("💡 Теперь можно тестировать Mini App:")
        print("   - Тренер 236692046 должен видеть клиента в разделе 'Мои клиенты'")
        print("   - Клиент 8384084241 должен видеть тренера в своем списке")
    else:
        print("\n❌ СКРИПТ ЗАВЕРШИЛСЯ С ОШИБКОЙ")
        print("🔧 Проверьте подключение к базе данных и наличие пользователей")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())