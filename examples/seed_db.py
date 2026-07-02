#!/usr/bin/env python3
"""Simple DB seed script for Gridify.

Usage:
  python3 examples/seed_db.py --init   # create schema
  python3 examples/seed_db.py         # insert sample rows
"""
import argparse
import os
import psycopg2
from psycopg2.extras import execute_values

DATABASE_URL = os.getenv('DATABASE_URL', 'postgresql://gridify:gridify_password@localhost:5432/gridify')

CREATE_TABLE_SQL = """
CREATE TABLE IF NOT EXISTS charts (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    data JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT now()
);
"""

SAMPLE_ROWS = [
    ("Monthly Sales", {"labels": ["Jan","Feb","Mar"], "values": [30,45,60]}),
    ("User Signups", {"labels": ["Jan","Feb","Mar"], "values": [10,20,40]}),
]


def init_db(conn):
    with conn.cursor() as cur:
        cur.execute(CREATE_TABLE_SQL)
    conn.commit()


def seed(conn):
    with conn.cursor() as cur:
        execute_values(cur,
                       "INSERT INTO charts (name, data) VALUES %s",
                       SAMPLE_ROWS)
    conn.commit()


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--init', action='store_true')
    args = parser.parse_args()

    conn = psycopg2.connect(DATABASE_URL)

    if args.init:
        print('Initializing DB schema...')
        init_db(conn)
        print('Done.')
    else:
        print('Seeding example data...')
        seed(conn)
        print('Done.')

    conn.close()
