from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
from sqlalchemy import String, Float, BigInteger, Integer, Index, UniqueConstraint
from typing import AsyncGenerator

DATABASE_URL = "sqlite+aiosqlite:///./brokerdata.db"

engine = create_async_engine(DATABASE_URL, echo=False)
SessionLocal = async_sessionmaker(engine, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


class Candle(Base):
    """OHLCV candle data for any symbol and resolution."""
    __tablename__ = "candles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    symbol: Mapped[str] = mapped_column(String(50), nullable=False)
    resolution: Mapped[str] = mapped_column(String(10), nullable=False)
    timestamp: Mapped[int] = mapped_column(BigInteger, nullable=False)  # Unix epoch seconds
    open: Mapped[float] = mapped_column(Float, nullable=False)
    high: Mapped[float] = mapped_column(Float, nullable=False)
    low: Mapped[float] = mapped_column(Float, nullable=False)
    close: Mapped[float] = mapped_column(Float, nullable=False)
    volume: Mapped[float] = mapped_column(Float, nullable=False)
    broker: Mapped[str] = mapped_column(String(20), nullable=False, default="fyers")

    __table_args__ = (
        UniqueConstraint("symbol", "resolution", "timestamp", name="uq_candle"),
        Index("ix_candle_symbol_res_ts", "symbol", "resolution", "timestamp"),
    )


class StrategyRun(Base):
    """Stores strategy backtest results for later analysis."""
    __tablename__ = "strategy_runs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    symbol: Mapped[str] = mapped_column(String(50), nullable=False)
    resolution: Mapped[str] = mapped_column(String(10), nullable=False)
    from_ts: Mapped[int] = mapped_column(BigInteger, nullable=False)
    to_ts: Mapped[int] = mapped_column(BigInteger, nullable=False)
    params_json: Mapped[str] = mapped_column(String, nullable=False, default="{}")
    result_json: Mapped[str] = mapped_column(String, nullable=False, default="{}")
    created_at: Mapped[int] = mapped_column(BigInteger, nullable=False)


async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with SessionLocal() as session:
        yield session
