"""Apache Arrow serialization for zero-copy telemetry handoff.

The dashboard backend already uses Apache Arrow as the in-process interchange
format between DuckDB and the LLM. This module extends that boundary all the way
to the browser:

* ``telemetry_to_table`` converts the canonical telemetry dict into one or more
  :class:`pyarrow.Table` objects (one per analytical dataset).
* ``serialize_ipc`` writes a table as an Arrow IPC *stream* (the format the
  native JavaScript ``apache-arrow`` library can deserialize directly with
  ``tableFromIPC``), so the frontend never has to run ``JSON.parse`` over a big
  matrix.
* :class:`GridifyFlightServer` optionally exposes the same datasets over an
  Arrow Flight server for tooling / Python-to-Python consumers that want the
  full Flight protocol (``do_get`` / ``list_flights``) instead of HTTP.

The HTTP path is preferred for the browser (fetch + binary stream); Flight is the
high-throughput alternative for backend-to-backend analytical workloads.
"""

from __future__ import annotations

import io
from typing import Any, Callable, Dict, List, Optional

import pyarrow as pa

# IANA-registered media type for Arrow IPC streams.
ARROW_STREAM_MEDIA_TYPE = "application/vnd.apache.arrow.stream"

# Datasets the telemetry payload is split into for columnar streaming.
DATASETS: List[str] = ["devices", "temperature", "humidity"]

_DEVICE_SCHEMA = pa.schema(
    [
        ("id", pa.string()),
        ("score", pa.float64()),
        ("uptime", pa.float64()),
        ("load", pa.string()),
        ("status", pa.string()),
        ("type", pa.string()),
        ("active", pa.bool_()),
    ]
)

_SERIES_SCHEMA = pa.schema(
    [
        ("label", pa.string()),
        ("value", pa.float64()),
    ]
)


def _coerce_device_rows(devices: List[Dict[str, Any]]) -> pa.Table:
    """Build a columnar table from a list of device dicts."""
    rows: List[Dict[str, Any]] = devices or []
    cols: Dict[str, Any] = {
        name: [row.get(name) for row in rows] for name in _DEVICE_SCHEMA.names
    }
    return pa.table(cols, schema=_DEVICE_SCHEMA)


def _coerce_series(rows: List[Dict[str, Any]]) -> pa.Table:
    """Build a (label, value) columnar table from a metrics history list."""
    series: List[Dict[str, Any]] = rows or []
    return pa.table(
        {
            "label": [row.get("label") for row in series],
            "value": [row.get("value") for row in series],
        },
        schema=_SERIES_SCHEMA,
    )


def telemetry_to_table(telemetry: Dict[str, Any], dataset: str = "devices") -> pa.Table:
    """Return an Arrow table for one telemetry ``dataset``.

    Args:
        telemetry: Canonical telemetry payload (see ``telemetry_data``).
        dataset: One of ``"devices"``, ``"temperature"``, ``"humidity"``.

    Raises:
        ValueError: If ``dataset`` is unknown.
    """
    if dataset == "devices":
        return _coerce_device_rows(telemetry.get("devices", []))
    if dataset == "temperature":
        return _coerce_series(telemetry.get("temperatureHistory", []))
    if dataset == "humidity":
        return _coerce_series(telemetry.get("humidityHistory", []))
    raise ValueError(
        f"Unknown Arrow dataset {dataset!r}; expected one of {DATASETS!r}"
    )


def serialize_ipc(table: pa.Table) -> bytes:
    """Serialize a table to an Arrow IPC *stream* as raw bytes.

    The output is self-describing (it embeds the schema) so the JS client can
    reconstruct the table with a single ``tableFromIPC`` call.
    """
    sink = pa.BufferOutputStream()
    with pa.ipc.new_stream(sink, table.schema) as writer:
        writer.write_table(table)
    return sink.getvalue().to_pybytes()


def serialize_dataset(telemetry: Dict[str, Any], dataset: str = "devices") -> bytes:
    """Convenience: convert ``dataset`` from ``telemetry`` to IPC bytes."""
    return serialize_ipc(telemetry_to_table(telemetry, dataset))


# --------------------------------------------------------------------------- #
# Arrow Flight server (alternative transport for backend/tooling consumers).
# --------------------------------------------------------------------------- #

try:  # pyarrow.flight is a separate, heavier submodule; import defensively.
    from pyarrow import flight as _flight  # type: ignore

    FLIGHT_AVAILABLE = True
except Exception:  # pragma: no cover - depends on pyarrow build
    _flight = None  # type: ignore
    FLIGHT_AVAILABLE = False


class GridifyFlightServer:
    """Arrow Flight server exposing telemetry datasets over ``do_get``.

    Each dataset is published under a Flight ``descriptor`` whose command is the
    dataset name (e.g. ``b"devices"``). Consumers call ``get_flight_info`` then
    ``do_get`` to stream the columnar data with zero JSON serialization.

    Flight SQL support
    ------------------
    When a client sends a SQL statement as the ticket (or as a Flight
    descriptor command starting with ``b"SQL "``), the server executes the
    query against DuckDB and streams the resulting record batch back as an
    Arrow stream. This lets any Arrow Flight SQL client query the telemetry
    catalog directly without hitting the HTTP REST layer.
    """

    def __init__(
        self,
        uri: str = "grpc://0.0.0.0:8815",
        telemetry_provider: Optional[Callable[[], Dict[str, Any]]] = None,
    ) -> None:
        if not FLIGHT_AVAILABLE:
            raise RuntimeError("pyarrow.flight is not available in this build")
        self._uri = uri
        self._telemetry_provider = telemetry_provider or (lambda: {})

    def _build_server(self) -> "_flight.FlightServerBase":
        provider = self._telemetry_provider

        class _Server(_flight.FlightServerBase):
            def list_flights(self, context, criteria):  # noqa: D401, ANN001
                for ds in DATASETS:
                    yield _flight.FlightInfo(
                        telemetry_to_table(provider(), ds).schema,
                        _flight.FlightDescriptor.for_command(ds.encode()),
                        [],
                        -1,
                        -1,
                    )

            def get_flight_info(self, context, descriptor):  # noqa: ANN001
                command = descriptor.command
                if command and command.startswith(b"SQL "):
                    sql = command[4:].decode("utf-8", errors="replace").strip()
                    if not sql:
                        raise ValueError("Empty SQL command")
                    from app.services.duckdb_service import get_duckdb_service
                    db = get_duckdb_service()
                    table = db.query_to_arrow(sql)
                    endpoint = _flight.FlightEndpoint(
                        command,
                        [_flight.Location.for_grpc_tcp("0.0.0.0", 8815)],
                    )
                    return _flight.FlightInfo(
                        table.schema, descriptor, [endpoint], table.num_rows, -1
                    )

                ds = descriptor.command.decode() if descriptor.command else "devices"
                table = telemetry_to_table(provider(), ds)
                endpoint = _flight.FlightEndpoint(
                    ds.encode(),
                    [_flight.Location.for_grpc_tcp("0.0.0.0", 8815)],
                )
                return _flight.FlightInfo(
                    table.schema, descriptor, [endpoint], table.num_rows, -1
                )

            def do_get(self, context, ticket):  # noqa: ANN001
                ticket_str = ticket.ticket.decode("utf-8", errors="replace")

                if ticket_str.startswith("SQL "):
                    sql = ticket_str[4:].strip()
                    if not sql:
                        raise ValueError("Empty SQL ticket")
                    from app.services.duckdb_service import get_duckdb_service
                    db = get_duckdb_service()
                    table = db.query_to_arrow(sql)
                    return _flight.RecordBatchStream(table)

                ds = ticket_str
                if ds not in DATASETS:
                    raise ValueError(
                        f"Unknown dataset {ds!r}; expected one of {DATASETS!r}"
                    )
                table = telemetry_to_table(provider(), ds)
                return _flight.RecordBatchStream(table)

            def do_put(self, context, descriptor, reader):  # noqa: ANN001
                for _ in reader:
                    pass

        return _Server(self._uri)

    def serve(self) -> None:  # pragma: no cover - requires a live server
        """Block and serve Flight requests (intended for a worker process)."""
        server = self._build_server()
        server.serve()
