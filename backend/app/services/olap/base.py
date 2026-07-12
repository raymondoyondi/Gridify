"""Base class for the pluggable OLAP storage engines."""

from __future__ import annotations

from typing import Any, Dict, List, Optional


class BaseOLAPEngine:
    """Common interface implemented by every OLAP backend.

    The rest of the backend (routers, agents, semantic layer) only depends on
    this interface, so swapping the analytical engine never requires touching
    call sites.
    """

    backend: str = "base"

    def query(self, sql: str, params: Optional[List[Any]] = None) -> List[Dict[str, Any]]:
        """Run SQL and return rows as a list of dicts."""
        raise NotImplementedError

    def query_to_arrow(self, sql: str, params: Optional[List[Any]] = None):
        """Run SQL and return an Apache Arrow table.

        Falls back to a row-based conversion when the engine cannot produce a
        native Arrow table (e.g. ClickHouse over HTTP).
        """
        raise NotImplementedError

    def health(self) -> bool:
        """Return ``True`` when the engine can serve queries."""
        raise NotImplementedError

    def close(self) -> None:
        """Release any held connections / resources."""

    def __enter__(self) -> "BaseOLAPEngine":
        return self

    def __exit__(self, *exc: Any) -> None:
        self.close()
