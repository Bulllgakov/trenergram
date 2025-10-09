#!/usr/bin/env python3
"""
Cleanup test data before production launch
Removes test trainer (236692046) and test client (8384084241)
"""

import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session
from core.config import settings

def cleanup_test_data():
    """Remove test trainer and client with all related data"""

    engine = create_engine(settings.DATABASE_URL)

    with Session(engine) as session:
        try:
            # Step 1: Find user IDs
            print("🔍 Finding test users...")
            trainer = session.execute(
                text("SELECT id, telegram_id, name FROM users WHERE telegram_id = :tid"),
                {"tid": "236692046"}
            ).fetchone()

            client = session.execute(
                text("SELECT id, telegram_id, name FROM users WHERE telegram_id = :cid"),
                {"cid": "8384084241"}
            ).fetchone()

            if not trainer:
                print("❌ Test trainer (236692046) not found")
                return

            if not client:
                print("❌ Test client (8384084241) not found")
                return

            print(f"✅ Found trainer: {trainer.name} (ID: {trainer.id})")
            print(f"✅ Found client: {client.name} (ID: {client.id})")

            # Step 2: Count what will be deleted
            bookings_count = session.execute(
                text("""
                    SELECT COUNT(*)
                    FROM bookings
                    WHERE trainer_id = :tid AND client_id = :cid
                """),
                {"tid": trainer.id, "cid": client.id}
            ).scalar()

            relations_count = session.execute(
                text("""
                    SELECT COUNT(*)
                    FROM trainer_clients
                    WHERE trainer_id = :tid AND client_id = :cid
                """),
                {"tid": trainer.id, "cid": client.id}
            ).scalar()

            print(f"\n📊 Will delete:")
            print(f"   - {bookings_count} bookings")
            print(f"   - {relations_count} trainer-client relationships")
            print(f"   - 1 client user")
            print(f"   - 1 trainer user")

            # Step 3: Confirm (check for --confirm flag)
            if "--confirm" not in sys.argv:
                print("\n⚠️  To proceed, run with --confirm flag:")
                print(f"   python {sys.argv[0]} --confirm")
                print("❌ Cancelled")
                return

            print("\n⚠️  Proceeding with deletion (--confirm flag provided)...")

            # Step 4: Delete in correct order (foreign keys)
            print("\n🗑️  Deleting data...")

            # Delete bookings first
            deleted_bookings = session.execute(
                text("""
                    DELETE FROM bookings
                    WHERE trainer_id = :tid AND client_id = :cid
                """),
                {"tid": trainer.id, "cid": client.id}
            )
            print(f"   ✅ Deleted {deleted_bookings.rowcount} bookings")

            # Delete trainer_clients relationship
            deleted_relations = session.execute(
                text("""
                    DELETE FROM trainer_clients
                    WHERE trainer_id = :tid AND client_id = :cid
                """),
                {"tid": trainer.id, "cid": client.id}
            )
            print(f"   ✅ Deleted {deleted_relations.rowcount} relationships")

            # Delete client user
            deleted_client = session.execute(
                text("DELETE FROM users WHERE id = :cid"),
                {"cid": client.id}
            )
            print(f"   ✅ Deleted client user")

            # Delete trainer user
            deleted_trainer = session.execute(
                text("DELETE FROM users WHERE id = :tid"),
                {"tid": trainer.id}
            )
            print(f"   ✅ Deleted trainer user")

            # Commit transaction
            session.commit()
            print("\n✅ Test data cleanup completed successfully!")

            # Verify
            remaining_users = session.execute(text("SELECT COUNT(*) FROM users")).scalar()
            remaining_bookings = session.execute(text("SELECT COUNT(*) FROM bookings")).scalar()
            print(f"\n📊 Database status:")
            print(f"   - Remaining users: {remaining_users}")
            print(f"   - Remaining bookings: {remaining_bookings}")

        except Exception as e:
            session.rollback()
            print(f"\n❌ Error during cleanup: {e}")
            raise

if __name__ == "__main__":
    cleanup_test_data()
