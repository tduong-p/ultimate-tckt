from logging.config import fileConfig

from sqlalchemy import engine_from_config
from sqlalchemy import pool
from sqlalchemy import text

from alembic import context

from app.config import settings
from app.models.base import Base
# Import sổ đăng ký model — kéo theo mọi module model để Base.metadata biết
# đủ bảng trước khi autogenerate. KHÔNG liệt kê lại từng module ở đây: khi
# thêm model mới chỉ cần cập nhật app/models/__init__.py.
import app.models  # noqa: F401

# Tên khoá dùng với GET_LOCK() của MySQL — thay thế pg_advisory_xact_lock của
# PostgreSQL. Chống chạy migration song song khi nhiều instance cùng khởi động.
MIGRATION_LOCK_NAME = "ctd_migration_lock"
MIGRATION_LOCK_TIMEOUT = 30  # giây tối đa chờ lấy khoá

# this is the Alembic Config object, which provides
# access to the values within the .ini file in use.
config = context.config
config.set_main_option("sqlalchemy.url", settings.database_url)

# Interpret the config file for Python logging.
# This line sets up loggers basically.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# add your model's MetaData object here
# for 'autogenerate' support
target_metadata = Base.metadata

# other values from the config, defined by the needs of env.py,
# can be acquired:
# my_important_option = config.get_main_option("my_important_option")
# ... etc.


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode.

    This configures the context with just a URL
    and not an Engine, though an Engine is acceptable
    here as well.  By skipping the Engine creation
    we don't even need a DBAPI to be available.

    Calls to context.execute() here emit the given string to the
    script output.

    """
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode.

    In this scenario we need to create an Engine
    and associate a connection with the context.

    """
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        # GET_LOCK() là tương đương MySQL của pg_advisory_xact_lock: nếu nhiều
        # instance cùng khởi động, tiến trình thứ hai sẽ ĐỢI ở đây tối đa
        # MIGRATION_LOCK_TIMEOUT giây thay vì chạy migration song song.
        # Khác PostgreSQL: GET_LOCK() là connection-scoped, KHÔNG phải
        # transaction-scoped — phải RELEASE_LOCK() tường minh trong finally.
        result = connection.execute(
            text("SELECT GET_LOCK(:name, :timeout)"),
            {"name": MIGRATION_LOCK_NAME, "timeout": MIGRATION_LOCK_TIMEOUT},
        ).scalar()
        if not result:
            raise RuntimeError(
                f"Không lấy được migration lock '{MIGRATION_LOCK_NAME}' sau "
                f"{MIGRATION_LOCK_TIMEOUT}s. Kiểm tra xem có tiến trình khác "
                "đang chạy migration không."
            )
        try:
            context.configure(connection=connection, target_metadata=target_metadata)
            with context.begin_transaction():
                context.run_migrations()
        finally:
            # Luôn trả khoá — kể cả khi migration thất bại, tránh khoá treo.
            connection.execute(
                text("SELECT RELEASE_LOCK(:name)"),
                {"name": MIGRATION_LOCK_NAME},
            )


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
