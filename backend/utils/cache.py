import time
from functools import wraps

from backend import config

_store: dict = {}


def ttl_cache(fn):
    """Cache by positional args for CACHE_TTL_SECONDS. Cached values must not be mutated."""
    @wraps(fn)
    def wrapper(*args):
        key = (fn.__module__, fn.__name__, args)
        hit = _store.get(key)
        if hit and time.time() - hit[0] < config.CACHE_TTL:
            return hit[1]
        value = fn(*args)
        _store[key] = (time.time(), value)
        return value
    return wrapper


def clear_cache():
    _store.clear()