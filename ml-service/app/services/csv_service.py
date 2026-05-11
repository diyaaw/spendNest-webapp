"""
csv_service.py
──────────────
Pre-processing helper: reads CSV bytes → normalized DataFrame.
Used by legacy /api/upload-csv endpoint (kept for backward compat).
"""

import io
import logging

import pandas as pd

from app.utils.normalizer import normalize_dataframe
from app.utils.categorizer import categorize_dataframe
from app.services.store import current_data

logger = logging.getLogger(__name__)


def process_csv_file(file_content: bytes, filename: str) -> dict:
    """
    Reads CSV bytes, normalizes the data, and returns standard preview information.
    Raises ValueError on unrecoverable errors (caller should turn into HTTP 400).
    """
    try:
        try:
            raw_df = pd.read_csv(io.BytesIO(file_content), encoding="utf-8", skipinitialspace=True)
        except UnicodeDecodeError:
            raw_df = pd.read_csv(io.BytesIO(file_content), encoding="latin-1", skipinitialspace=True)

        if raw_df.empty:
            raise ValueError("The uploaded CSV file contains no data rows.")

        # Normalize → standard schema
        df = normalize_dataframe(raw_df)

        # Categorize transactions
        df = categorize_dataframe(df)

        # Store in memory for analytics endpoints
        current_data["df"] = df
        current_data["filename"] = filename

        row_count    = len(df)
        column_names = df.columns.tolist()

        total_income  = float(df["credit"].sum())
        total_expense = float(df["debit"].sum())

        if total_income == 0 and total_expense == 0:
            logger.warning(
                "No financial values found in '%s' — income=0, expense=0", filename
            )

        preview_data = df.head(10).where(pd.notnull(df.head(10)), None).to_dict(orient="records")

        return {
            "filename":  filename,
            "row_count": row_count,
            "columns":   column_names,
            "metrics": {
                "total_income":  round(total_income, 2),
                "total_expense": round(total_expense, 2),
            },
            "preview": preview_data,
        }

    except pd.errors.EmptyDataError:
        raise ValueError("The uploaded CSV file is completely empty or invalid.")
    except ValueError:
        raise
    except Exception as exc:
        logger.error("csv_service error: %s", exc, exc_info=True)
        raise ValueError(f"Error reading or normalizing CSV: {exc}")
