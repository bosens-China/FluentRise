"""
Pytest 全局测试配置。
"""

from __future__ import annotations

import os

os.environ.setdefault("OPENAI_API_KEY", "dummy")
