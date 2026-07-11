"""Polars service for fast, memory-efficient data processing."""

import polars as pl
from typing import Dict, List, Optional, Any
from pathlib import Path


class PolarsDataProcessor:
    """Service for high-performance data processing using Polars."""
    
    @staticmethod
    def read_csv(file_path: str) -> pl.DataFrame:
        """Read CSV efficiently using Polars."""
        return pl.read_csv(file_path)
    
    @staticmethod
    def filter_data(df: pl.DataFrame, column: str, value: Any) -> pl.DataFrame:
        """Filter data efficiently."""
        return df.filter(pl.col(column) == value)
    
    @staticmethod
    def aggregate_data(df: pl.DataFrame, group_by: List[str], 
                      agg_dict: Dict[str, str]) -> pl.DataFrame:
        """Aggregate data with multiple operations."""
        agg_exprs = [
            pl.col(col).apply(op).alias(f"{col}_{op}")
            for col, op in agg_dict.items()
        ]
        return df.groupby(group_by).agg(agg_exprs)
    
    @staticmethod
    def time_series_resample(df: pl.DataFrame, date_column: str, 
                            freq: str) -> pl.DataFrame:
        """Resample time series data efficiently."""
        return df.with_columns(
            pl.col(date_column).dt.truncate(freq).alias("_period")
        ).groupby("_period").agg(pl.all().mean())
    
    @staticmethod
    def join_dataframes(left: pl.DataFrame, right: pl.DataFrame, 
                       on: str, how: str = "inner") -> pl.DataFrame:
        """Join dataframes efficiently."""
        return left.join(right, on=on, how=how)
    
    @staticmethod
    def pivot_data(df: pl.DataFrame, values: str, index: str, 
                  columns: str) -> pl.DataFrame:
        """Pivot data for cross-tabulation."""
        return df.pivot(values=values, index=index, columns=columns)
    
    @staticmethod
    def select_columns(df: pl.DataFrame, columns: List[str]) -> pl.DataFrame:
        """Select specific columns efficiently."""
        return df.select(columns)
    
    @staticmethod
    def sort_data(df: pl.DataFrame, by: List[str], 
                 descending: bool = False) -> pl.DataFrame:
        """Sort data efficiently."""
        return df.sort(by=by, descending=descending)
    
    @staticmethod
    def get_statistics(df: pl.DataFrame) -> Dict[str, Any]:
        """Get quick statistics on dataframe."""
        return {
            "shape": df.shape,
            "columns": df.columns,
            "dtypes": {col: str(dtype) for col, dtype in zip(df.columns, df.dtypes)},
            "describe": df.describe().to_dict(as_series=False)
        }
    
    @staticmethod
    def write_csv(df: pl.DataFrame, output_path: str):
        """Write dataframe to CSV efficiently."""
        df.write_csv(output_path)
    
    @staticmethod
    def write_parquet(df: pl.DataFrame, output_path: str):
        """Write dataframe to Parquet (more efficient for large datasets)."""
        df.write_parquet(output_path)
    
    @staticmethod
    def chain_operations(df: pl.DataFrame, operations: List[Dict]) -> pl.DataFrame:
        """Chain multiple operations together."""
        for op in operations:
            op_type = op.get("type")
            
            if op_type == "filter":
                df = PolarsDataProcessor.filter_data(
                    df, op["column"], op["value"]
                )
            elif op_type == "aggregate":
                df = PolarsDataProcessor.aggregate_data(
                    df, op["group_by"], op["agg_dict"]
                )
            elif op_type == "select":
                df = PolarsDataProcessor.select_columns(df, op["columns"])
            elif op_type == "sort":
                df = PolarsDataProcessor.sort_data(
                    df, op["by"], op.get("descending", False)
                )
            elif op_type == "pivot":
                df = PolarsDataProcessor.pivot_data(
                    df, op["values"], op["index"], op["columns"]
                )
        
        return df


def get_polars_processor() -> PolarsDataProcessor:
    """Get Polars data processor."""
    return PolarsDataProcessor()
