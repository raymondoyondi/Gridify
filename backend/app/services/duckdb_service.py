"""DuckDB service for fast in-memory analytical queries."""

import os
from pathlib import Path
import duckdb
from typing import Any, List, Dict
from backend.app.config import settings


class DuckDBService:
    """Service for DuckDB analytical database operations."""
    
    def __init__(self):
        """Initialize DuckDB connection."""
        db_path = settings.DUCKDB_PATH
        Path(db_path).parent.mkdir(parents=True, exist_ok=True)
        self.conn = duckdb.connect(db_path)
        self._initialize_schema()
    
    def _initialize_schema(self):
        """Initialize DuckDB schema."""
        # Create tables for telemetry data
        self.conn.execute("""
            CREATE TABLE IF NOT EXISTS telemetry (
                id INTEGER PRIMARY KEY,
                device_id VARCHAR,
                metric_type VARCHAR,
                value DOUBLE,
                timestamp TIMESTAMP,
                metadata JSON
            )
        """)
        
        # Create table for events
        self.conn.execute("""
            CREATE TABLE IF NOT EXISTS events (
                id INTEGER PRIMARY KEY,
                event_type VARCHAR,
                source VARCHAR,
                details JSON,
                created_at TIMESTAMP
            )
        """)
    
    def query(self, sql: str, params: List[Any] = None) -> List[Dict]:
        """Execute SQL query and return results."""
        try:
            if params:
                result = self.conn.execute(sql, params).fetchall()
            else:
                result = self.conn.execute(sql).fetchall()
            return result
        except Exception as e:
            raise RuntimeError(f"DuckDB query failed: {str(e)}")
    
    def insert_telemetry(self, device_id: str, metric_type: str, 
                        value: float, metadata: Dict = None):
        """Insert telemetry data efficiently."""
        self.conn.execute(
            """
            INSERT INTO telemetry (device_id, metric_type, value, timestamp, metadata)
            VALUES (?, ?, ?, NOW(), ?)
            """,
            [device_id, metric_type, value, str(metadata or {})]
        )
    
    def get_device_metrics(self, device_id: str, limit: int = 1000) -> List[Dict]:
        """Get device metrics efficiently."""
        return self.conn.execute(
            """
            SELECT * FROM telemetry 
            WHERE device_id = ? 
            ORDER BY timestamp DESC 
            LIMIT ?
            """,
            [device_id, limit]
        ).fetchall()
    
    def aggregate_metrics(self, metric_type: str, 
                         group_by: str = "device_id") -> List[Dict]:
        """Aggregate metrics with grouping."""
        return self.conn.execute(
            f"""
            SELECT 
                {group_by},
                COUNT(*) as count,
                AVG(value) as avg_value,
                MIN(value) as min_value,
                MAX(value) as max_value
            FROM telemetry 
            WHERE metric_type = ?
            GROUP BY {group_by}
            ORDER BY avg_value DESC
            """,
            [metric_type]
        ).fetchall()
    
    def export_to_csv(self, query: str, output_path: str):
        """Export query results to CSV."""
        self.conn.execute(f"COPY ({query}) TO '{output_path}' (FORMAT CSV, HEADER TRUE)")
    
    def close(self):
        """Close database connection."""
        self.conn.close()


# Singleton instance
_duckdb_service = None

def get_duckdb_service() -> DuckDBService:
    """Get or create DuckDB service instance."""
    global _duckdb_service
    if _duckdb_service is None:
        _duckdb_service = DuckDBService()
    return _duckdb_service
