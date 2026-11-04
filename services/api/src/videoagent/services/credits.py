from uuid import UUID, uuid4

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from videoagent.config import Settings
from videoagent.errors import AppError
from videoagent.models import CreditAccount, CreditEntry


async def get_or_create_account(
    session: AsyncSession,
    *,
    user_id: UUID,
    settings: Settings,
) -> CreditAccount:
    account = await session.scalar(select(CreditAccount).where(CreditAccount.user_id == user_id))
    if account is None:
        account = CreditAccount(
            user_id=user_id,
            balance=settings.starting_user_credits,
        )
        session.add(account)
        await session.commit()
        await session.refresh(account)
    return account


async def reserve_credits(
    session: AsyncSession,
    *,
    user_id: UUID,
    amount: int,
    reference_id: str,
    settings: Settings,
) -> CreditAccount:
    existing = await session.scalar(
        select(CreditEntry).where(
            CreditEntry.reason == "generation_reserve",
            CreditEntry.reference_id == reference_id,
        )
    )
    account = await get_or_create_account(session, user_id=user_id, settings=settings)
    if existing is not None:
        return account
    if account.balance < amount:
        raise AppError(
            status_code=402,
            code="INSUFFICIENT_CREDITS",
            message="The account does not have enough credits.",
        )
    account.balance -= amount
    session.add(
        CreditEntry(
            user_id=user_id,
            amount=-amount,
            reason="generation_reserve",
            reference_id=reference_id,
        )
    )
    await session.commit()
    await session.refresh(account)
    return account


async def refund_credits(
    session: AsyncSession,
    *,
    user_id: UUID,
    reference_id: str,
    settings: Settings,
) -> CreditAccount:
    reservation = await session.scalar(
        select(CreditEntry).where(
            CreditEntry.reason == "generation_reserve",
            CreditEntry.reference_id == reference_id,
        )
    )
    account = await get_or_create_account(session, user_id=user_id, settings=settings)
    if reservation is None:
        return account
    existing_refund = await session.scalar(
        select(CreditEntry).where(
            CreditEntry.reason == "generation_refund",
            CreditEntry.reference_id == reference_id,
        )
    )
    if existing_refund is not None:
        return account
    refund_amount = abs(reservation.amount)
    account.balance += refund_amount
    session.add(
        CreditEntry(
            user_id=user_id,
            amount=refund_amount,
            reason="generation_refund",
            reference_id=reference_id,
        )
    )
    await session.commit()
    await session.refresh(account)
    return account


async def credit_balance(
    session: AsyncSession,
    *,
    user_id: UUID,
    settings: Settings,
) -> int:
    account = await get_or_create_account(
        session,
        user_id=user_id,
        settings=settings,
    )
    return account.balance


async def admin_adjust_credits(
    session: AsyncSession,
    *,
    user_id: UUID,
    amount: int,
    reason: str,
    settings: Settings,
) -> CreditAccount:
    account = await get_or_create_account(session, user_id=user_id, settings=settings)
    if account.balance + amount < 0:
        raise AppError(
            status_code=409,
            code="CREDIT_BALANCE_WOULD_BE_NEGATIVE",
            message="The adjustment would make the balance negative.",
        )
    account.balance += amount
    session.add(
        CreditEntry(
            user_id=user_id,
            amount=amount,
            reason="admin_adjustment",
            reference_id=f"{uuid4()}:{reason[:120]}",
        )
    )
    await session.commit()
    await session.refresh(account)
    return account
