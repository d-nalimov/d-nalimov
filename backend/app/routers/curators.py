from fastapi import APIRouter
from sqlalchemy import select

from ..deps import CurrentUser, SessionDep
from ..models import Curator
from ..schemas import CuratorOut

router = APIRouter(tags=["curators"])


@router.get("/curators", response_model=list[CuratorOut])
async def list_curators(session: SessionDep, _: CurrentUser) -> list[CuratorOut]:
    curators = (
        await session.scalars(select(Curator).where(Curator.active).order_by(Curator.sort_order))
    ).all()
    return [CuratorOut.model_validate(curator) for curator in curators]
