from fastapi import APIRouter
from apps.api.app.api.v1.endpoints import (
    auth,
    vocabulary,
    recognition,
    tutor,
    lessons,
    admin,
)

api_router = APIRouter()

api_router.include_router(auth.router)
api_router.include_router(vocabulary.router)
api_router.include_router(recognition.router)
api_router.include_router(tutor.router)
api_router.include_router(lessons.router)
api_router.include_router(admin.router)
