# Gridify Backend

A FastAPI-based backend for the Gridify dashboard application with PostgreSQL database support.

## Project Structure

```
backend/
├── config/
│   └── database.py          # SQLAlchemy configuration and session management
├── models/
│   └── database.py          # SQLAlchemy ORM models
├── schemas/
│   └── database.py          # Pydantic validation schemas
├── database/
│   ├── schema.sql           # PostgreSQL table definitions
│   └── init.sql             # Database initialization with sample data
├── docker-compose.yml       # Docker composition for backend + PostgreSQL
├── .env.database            # Database environment variables template
├── requirements.txt         # Python dependencies
└── main.py                  # FastAPI application entry point
```

## Database Setup

### Prerequisites
- Python 3.9+
- PostgreSQL 15+ (or use Docker)
- pip or conda for package management

### Local Development

1. **Install Dependencies**
   ```bash
   pip install -r requirements.txt
   ```

2. **Configure Environment**
   ```bash
   cp .env.database .env
   # Edit .env with your PostgreSQL credentials if needed
   ```

3. **Start PostgreSQL**
   
   Option A: Using Docker Compose
   ```bash
   docker-compose up -d
   ```
   
   Option B: Local PostgreSQL server
   ```bash
   # Ensure PostgreSQL is running and accessible
   # Create database and run initialization script
   psql -U postgres -f database/init.sql
   ```

4. **Initialize Database**
   ```bash
   python -c "from config.database import init_db; init_db()"
   ```

5. **Run Development Server**
   ```bash
   uvicorn main:app --host 0.0.0.0 --port 8000 --reload
   ```

### Docker Setup

1. **Build and Run**
   ```bash
   docker-compose up --build
   ```

2. **Access Services**
   - Backend API: `http://localhost:8000`
   - PostgreSQL: `localhost:5432`
   - API Documentation: `http://localhost:8000/docs`

3. **View Logs**
   ```bash
   docker-compose logs -f backend
   docker-compose logs -f postgres
   ```

## Database Models

### Users
Stores user account information.
- `id`: Primary key
- `username`: Unique username
- `email`: Unique email address
- `created_at`, `updated_at`: Timestamps

### Dashboards
User-created dashboard configurations.
- `id`: Primary key
- `user_id`: Foreign key to users
- `name`: Dashboard name (unique per user)
- `description`: Optional dashboard description
- `layout`: JSONB array of widget configurations
- `created_at`, `updated_at`: Timestamps

### Widgets
Individual dashboard widgets/charts.
- `id`: Primary key
- `dashboard_id`: Foreign key to dashboards
- `widget_id`: Unique widget identifier
- `title`, `subtitle`: Widget labels
- `type`: Widget type (e.g., 'custom_chart', 'table', 'gauge')
- `width`, `height`: Dimensions
- `order`: Display order
- `custom_data`: JSONB for chart data and configuration
- `created_at`, `updated_at`: Timestamps

### TelemetryData
Device telemetry readings.
- `id`: Primary key
- `device_id`: Device identifier
- `device_name`: Human-readable name
- `device_type`: Type of device (Node, Host, Proxy)
- `status`: Current status
- `score`, `uptime`, `load`: Telemetry metrics
- `active`: Boolean active status
- `recorded_at`: Timestamp of reading

### QueryHistory
AI-generated query tracking.
- `id`: Primary key
- `user_id`: Foreign key to users
- `dashboard_id`: Foreign key to dashboards (optional)
- `query_text`: The natural language query
- `ai_response`: Full AI response as JSONB
- `status`: Query execution status
- `created_at`: Timestamp

## Environment Variables

See `.env.database` for configuration:

```
DATABASE_URL=postgresql://gridify:gridify_password@postgres:5432/gridify
SQL_ECHO=false
DATABASE_POOL_SIZE=10
DATABASE_MAX_OVERFLOW=20
```

## API Endpoints (Examples)

### Health Check
```bash
GET /health/db
```

### Users
```bash
GET /api/users/{user_id}
POST /api/users
```

### Dashboards
```bash
GET /api/dashboards
POST /api/dashboards
GET /api/dashboards/{dashboard_id}
PUT /api/dashboards/{dashboard_id}
DELETE /api/dashboards/{dashboard_id}
```

### Widgets
```bash
GET /api/dashboards/{dashboard_id}/widgets
POST /api/dashboards/{dashboard_id}/widgets
PUT /api/widgets/{widget_id}
DELETE /api/widgets/{widget_id}
```

### Telemetry
```bash
GET /api/telemetry
GET /api/telemetry/devices/{device_id}
POST /api/telemetry
```

## Sample Data

The database initialization includes:
- 2 sample users (admin, demo_user)
- 2 sample dashboards
- 10 sample devices with telemetry data

## Dependencies

See `requirements.txt` for full list. Key packages:
- `fastapi` - Web framework
- `sqlalchemy` - ORM
- `psycopg2-binary` - PostgreSQL adapter
- `pydantic` - Data validation
- `python-dotenv` - Environment variables

## Development Notes

- Use `SQL_ECHO=true` in `.env` to log all SQL queries
- The `get_db()` dependency provides session injection for endpoints
- Models use relationships for efficient data loading
- JSONB columns support complex nested data structures

## Production Considerations

- Use connection pooling (configured in `database.py`)
- Enable SSL for PostgreSQL connections
- Set appropriate database backups
- Use environment-specific credentials
- Consider read replicas for scaling
- Implement query caching strategies

## Troubleshooting

### Connection Refused
- Ensure PostgreSQL is running
- Check DATABASE_URL in .env
- Verify network connectivity for Docker containers

### Database Locked
- Check for long-running transactions
- Restart PostgreSQL if necessary

### Migration Issues
- Run `init_db()` to create tables
- Check schema.sql for any syntax errors
