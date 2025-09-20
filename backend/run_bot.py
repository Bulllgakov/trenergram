#!/usr/bin/env python
"""
Run the Telegram bot
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.bot.main import main

if __name__ == "__main__":
    print("Starting Telegram bot...")
    main()