#!/usr/bin/env python3
"""
Скрипт для создания связи между тренером и клиентом в продакшн базе данных
"""

import asyncio
import sys
import os
sys.path.append('.')

from db.base import async_session
from models.user_v2 import User, UserRole, TrainerClient
from sqlalchemy import select
from datetime import datetime

async def create_trainer_client_relation():
    """Создает связь между тренером 236692046 и клиентом 8384084241"""
    trainer_telegram_id = "236692046"
    client_telegram_id = "8384084241"

    print(f"=== СОЗДАНИЕ СВЯЗИ ТРЕНЕР-КЛИЕНТ ===")
    print(f"Тренер: {trainer_telegram_id}")
    print(f"Клиент: {client_telegram_id}")

    async with async_session() as session:
        try:
            # Найти тренера
            trainer_result = await session.execute(
                select(User).where(
                    User.telegram_id == trainer_telegram_id,
                    User.role == UserRole.TRAINER
                )
            )
            trainer = trainer_result.scalar_one_or_none()

            # Найти клиента
            client_result = await session.execute(
                select(User).where(
                    User.telegram_id == client_telegram_id,
                    User.role == UserRole.CLIENT
                )
            )
            client = client_result.scalar_one_or_none()

            if not trainer:
                print(f"❌ ОШИБКА: Тренер {trainer_telegram_id} не найден в базе данных")
                return False

            if not client:
                print(f"❌ ОШИБКА: Клиент {client_telegram_id} не найден в базе данных")
                return False

            print(f"✅ Тренер найден: {trainer.name} (ID: {trainer.id})")
            print(f"✅ Клиент найден: {client.name} (ID: {client.id})")

            # Проверить, есть ли уже связь
            existing_relation = await session.execute(
                select(TrainerClient).where(
                    TrainerClient.trainer_id == trainer.id,
                    TrainerClient.client_id == client.id
                )
            )
            existing = existing_relation.scalar_one_or_none()

            if existing:
                if existing.is_active:
                    print(f"✅ Связь уже существует и активна (ID: {existing.id})")
                    return True
                else:
                    # Активировать существующую связь
                    existing.is_active = True
                    existing.updated_at = datetime.utcnow()
                    await session.commit()
                    print(f"✅ Существующая связь активирована (ID: {existing.id})")
                    return True

            # Создать новую связь
            new_relation = TrainerClient(
                trainer_id=trainer.id,
                client_id=client.id,
                is_active=True,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )

            session.add(new_relation)
            await session.commit()
            await session.refresh(new_relation)

            print(f"✅ УСПЕШНО: Создана новая связь тренер-клиент (ID: {new_relation.id})")
            print(f"   - Тренер ID: {trainer.id} ({trainer.name})")
            print(f"   - Клиент ID: {client.id} ({client.name})")
            print(f"   - Статус: активна")
            print(f"   - Дата создания: {new_relation.created_at}")

            return True

        except Exception as e:
            print(f"❌ ОШИБКА при создании связи: {e}")
            import traceback
            traceback.print_exc()
            await session.rollback()
            return False

async def verify_relation():
    """Проверяет созданную связь"""
    trainer_telegram_id = "236692046"
    client_telegram_id = "8384084241"

    print(f"\n=== ПРОВЕРКА СОЗДАННОЙ СВЯЗИ ===")

    async with async_session() as session:
        try:
            # Найти пользователей
            trainer_result = await session.execute(
                select(User).where(User.telegram_id == trainer_telegram_id)
            )
            trainer = trainer_result.scalar_one_or_none()

            client_result = await session.execute(
                select(User).where(User.telegram_id == client_telegram_id)
            )
            client = client_result.scalar_one_or_none()

            if not trainer or not client:
                print("❌ Пользователи не найдены")
                return False

            # Проверить связь
            relation_result = await session.execute(
                select(TrainerClient).where(
                    TrainerClient.trainer_id == trainer.id,
                    TrainerClient.client_id == client.id,
                    TrainerClient.is_active == True
                )
            )
            relation = relation_result.scalar_one_or_none()

            if relation:
                print(f"✅ СВЯЗЬ ПОДТВЕРЖДЕНА:")
                print(f"   - ID связи: {relation.id}")
                print(f"   - Тренер: {trainer.name} (TG: {trainer.telegram_id})")
                print(f"   - Клиент: {client.name} (TG: {client.telegram_id})")
                print(f"   - Активна: {relation.is_active}")
                print(f"   - Создана: {relation.created_at}")
                return True
            else:
                print("❌ СВЯЗЬ НЕ НАЙДЕНА")
                return False

        except Exception as e:
            print(f"❌ ОШИБКА при проверке: {e}")
            return False

async def main():
    """Основная функция"""
    print("🚀 ЗАПУСК СКРИПТА СОЗДАНИЯ СВЯЗИ ТРЕНЕР-КЛИЕНТ")
    print("=" * 50)

    # Создать связь
    success = await create_trainer_client_relation()

    if success:
        # Проверить созданную связь
        await verify_relation()
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