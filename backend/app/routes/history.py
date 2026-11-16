from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import delete, func, or_, select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import TranslationRecord
from app.schemas import DeleteResponse, HistoryItemResponse, HistoryListResponse

router = APIRouter(tags=["History"])


@router.get("/history", response_model=HistoryListResponse)
def get_translation_history(
    q: Optional[str] = Query(default=None, description="Search source or translated text"),
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
):
    query = select(TranslationRecord)
    count_query = select(func.count(TranslationRecord.id))

    if q and q.strip():
        pattern = f"%{q.strip()}%"
        condition = or_(
            TranslationRecord.source_text.ilike(pattern),
            TranslationRecord.translated_text.ilike(pattern),
            TranslationRecord.source_language_name.ilike(pattern),
            TranslationRecord.target_language_name.ilike(pattern),
            TranslationRecord.source_language.ilike(pattern),
            TranslationRecord.target_language.ilike(pattern),
        )
        query = query.where(condition)
        count_query = count_query.where(condition)

    total = db.scalar(count_query) or 0
    rows = db.scalars(
        query.order_by(TranslationRecord.created_at.desc(), TranslationRecord.id.desc())
        .offset(offset)
        .limit(limit)
    ).all()

    return HistoryListResponse(
        total=total,
        items=[HistoryItemResponse.model_validate(row) for row in rows],
    )


@router.delete("/history/{record_id}", response_model=DeleteResponse)
def delete_history_item(record_id: int, db: Session = Depends(get_db)):
    record = db.get(TranslationRecord, record_id)
    if record is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "error_code": "HISTORY_RECORD_NOT_FOUND",
                "message": f"Translation history record #{record_id} was not found.",
            },
        )
    db.delete(record)
    db.commit()
    return DeleteResponse(
        deleted=True,
        deleted_count=1,
        message=f"Deleted translation record #{record_id}.",
    )


@router.delete("/history", response_model=DeleteResponse)
def clear_translation_history(db: Session = Depends(get_db)):
    result = db.execute(delete(TranslationRecord))
    db.commit()
    count = int(result.rowcount or 0)
    return DeleteResponse(
        deleted=True,
        deleted_count=count,
        message=f"Cleared {count} translation history record(s).",
    )
