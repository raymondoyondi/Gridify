"""Tests for Arrow serialization of telemetry data."""

import pytest

from app.services import arrow_service as arrow
from app.utils.telemetry_data import get_default_telemetry


@pytest.fixture()
def telemetry() -> dict:
    return get_default_telemetry()


def test_telemetry_to_table_devices(telemetry):
    table = arrow.telemetry_to_table(telemetry, "devices")
    assert table.num_rows == len(telemetry["devices"])
    assert set(table.column_names) >= {
        "id",
        "score",
        "uptime",
        "status",
        "type",
        "active",
    }


def test_telemetry_to_table_series(telemetry):
    for ds in ("temperature", "humidity"):
        table = arrow.telemetry_to_table(telemetry, ds)
        expected = len(telemetry[f"{ds}History"])
        assert table.num_rows == expected
        assert table.column_names == ["label", "value"]


def test_unknown_dataset_raises(telemetry):
    with pytest.raises(ValueError):
        arrow.telemetry_to_table(telemetry, "nope")


def test_serialize_ipc_roundtrips():
    import pyarrow as pa

    table = pa.table({"x": [1, 2, 3], "y": ["a", "b", "c"]})
    payload = arrow.serialize_ipc(table)
    assert isinstance(payload, (bytes, bytearray))
    # The JS client reconstructs a table from exactly this byte layout.
    restored = pa.ipc.open_stream(pa.BufferReader(payload)).read_all()
    assert restored.equals(table)


def test_serialize_dataset_uses_ipc(telemetry):
    import pyarrow as pa

    payload = arrow.serialize_dataset(telemetry, "temperature")
    assert isinstance(payload, bytes)
    assert len(payload) > 0
    restored = pa.ipc.open_stream(pa.BufferReader(payload)).read_all()
    assert restored.num_rows == len(telemetry["temperatureHistory"])


def test_datasets_constant_is_stable():
    assert arrow.DATASETS == ["devices", "temperature", "humidity"]
    assert arrow.ARROW_STREAM_MEDIA_TYPE == "application/vnd.apache.arrow.stream"
