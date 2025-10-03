#!/usr/bin/env python3
"""
Скрипт для проверки связи между тренером и клиентом в базе данных
"""

import asyncio
import sys
import os
sys.path.append('.')

from db.base import async_session
from models.user import Trainer, Client, TrainerClient
from models.club import Club  # Добавляем импорт Club
from sqlalchemy import select, text
from sqlalchemy.orm import selectinload

async def check_database_structure():
    """Проверка структуры базы данных"""
    print("=== ПРОВЕРКА СТРУКТУРЫ БД ===")

    async with async_session() as session:
        # Проверим какие таблицы есть
        try:
            result = await session.execute(text("""
                SELECT name FROM sqlite_master WHERE type='table'
                UNION ALL
                SELECT tablename FROM pg_tables WHERE schemaname='public'
            """))
            tables = result.fetchall()
            print(f"Найденные таблицы: {[t[0] for t in tables]}")
        except Exception as e:
            print(f"Ошибка при получении списка таблиц: {e}")

async def check_all_users():
    """Проверка всех пользователей в системе"""
    print("\n=== ВСЕ ТРЕНЕРЫ ===")

    async with async_session() as session:
        # Найти всех тренеров
        trainers_result = await session.execute(select(Trainer))
        trainers = trainers_result.scalars().all()

        print(f"Всего тренеров: {len(trainers)}")
        for trainer in trainers:
            print(f"- ID: {trainer.id}, Telegram ID: {trainer.telegram_id}, Имя: {trainer.name}")

        print("\n=== ВСЕ КЛИЕНТЫ ===")
        # Найти всех клиентов
        clients_result = await session.execute(select(Client))
        clients = clients_result.scalars().all()

        print(f"Всего клиентов: {len(clients)}")
        for client in clients:
            print(f"- ID: {client.id}, Telegram ID: {client.telegram_id}, Имя: {client.name}")

async def check_trainer_client_relation():
    """Проверка связи между конкретным тренером и клиентом"""
    trainer_telegram_id = "236692046"
    client_telegram_id = "8384084241"

    print(f"\n=== ПРОВЕРКА СВЯЗИ ===")
    print(f"Тренер: {trainer_telegram_id}")
    print(f"Клиент: {client_telegram_id}")

    async with async_session() as session:
        # Найти тренера
        trainer_result = await session.execute(
            select(Trainer).where(Trainer.telegram_id == trainer_telegram_id)
        )
        trainer = trainer_result.scalar_one_or_none()

        # Найти клиента
        client_result = await session.execute(
            select(Client).where(Client.telegram_id == client_telegram_id)
        )
        client = client_result.scalar_one_or_none()

        print(f"\nТренер найден: {'ДА' if trainer else 'НЕТ'}")
        if trainer:
            print(f"  - ID: {trainer.id}")
            print(f"  - Имя: {trainer.name}")

        print(f"Клиент найден: {'ДА' if client else 'НЕТ'}")
        if client:
            print(f"  - ID: {client.id}")
            print(f"  - Имя: {client.name}")

        # Проверить связь если оба найдены
        if trainer and client:
            relation_result = await session.execute(
                select(TrainerClient).where(
                    TrainerClient.trainer_id == trainer.id,
                    TrainerClient.client_id == client.id
                )
            )
            relation = relation_result.scalar_one_or_none()

            print(f"\nСвязь в таблице trainer_clients: {'ДА' if relation else 'НЕТ'}")
            if relation:
                print(f"  - Статус: {relation.status}")
                print(f"  - Дата создания: {relation.created_at}")
                print(f"  - Дата подтверждения: {relation.confirmed_at}")
                print(f"  - Всего бронирований: {relation.total_bookings}")

        # Проверить все связи тренера
        if trainer:
            print(f"\n=== ВСЕ КЛИЕНТЫ ТРЕНЕРА {trainer.name} ===")
            trainer_relations = await session.execute(
                select(TrainerClient)
                .where(TrainerClient.trainer_id == trainer.id)
                .options(selectinload(TrainerClient.client))
            )
            relations = trainer_relations.scalars().all()

            print(f"Всего связей: {len(relations)}")
            for rel in relations:
                print(f"  - Клиент ID: {rel.client_id} ({rel.client.name if rel.client else 'Неизвестно'})")
                print(f"    Telegram ID: {rel.client.telegram_id if rel.client else 'N/A'}")
                print(f"    Статус: {rel.status}")

async def main():
    """Основная функция"""
    try:
        await check_database_structure()
        await check_all_users()
        await check_trainer_client_relation()
    except Exception as e:
        print(f"Ошибка: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main())