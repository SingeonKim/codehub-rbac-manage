"""인메모리 캐시 관리

CodeHub BE가 페이지네이션을 지원하지 않아 전체 데이터를 한 번에 가져온다.
가져온 데이터를 TTL 기반으로 캐시하여 반복 요청 시 CodeHub BE 호출을 최소화한다.
CUD(생성/수정/삭제) 요청 성공 시 해당 엔티티 캐시를 즉시 무효화한다.
"""

import time
from typing import Any

_cache: dict[str, dict[str, Any]] = {}


def get(key: str) -> list | None:
    """캐시에서 데이터 조회. TTL 만료 시 None 반환."""
    entry = _cache.get(key)
    if entry is None:
        return None
    if time.time() > entry["expires_at"]:
        del _cache[key]
        return None
    return entry["data"]


def set(key: str, data: list, ttl: int) -> None:
    """캐시에 데이터 저장."""
    _cache[key] = {
        "data": data,
        "expires_at": time.time() + ttl,
    }


def invalidate(key: str) -> None:
    """특정 캐시 키 무효화."""
    _cache.pop(key, None)
