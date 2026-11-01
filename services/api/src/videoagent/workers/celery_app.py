from celery import Celery  # type: ignore[import-untyped]

from videoagent.config import get_settings

settings = get_settings()

celery_app = Celery(
    "videoagent",
    broker=settings.celery_broker_url,
    backend=settings.celery_result_backend,
    include=["videoagent.workers.tasks"],
)

celery_app.conf.update(
    task_acks_late=True,
    task_reject_on_worker_lost=True,
    worker_prefetch_multiplier=1,
    task_track_started=True,
    broker_connection_retry_on_startup=True,
    timezone="UTC",
)
