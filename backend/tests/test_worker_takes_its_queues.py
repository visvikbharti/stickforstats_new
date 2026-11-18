"""The worker that docker-compose.yml starts takes every queue a scheduled task is sent to.

Celery Beat sends the scheduled tasks through the routes of stickforstats/celery.py: the hourly aggregation and
the daily session clean-up go to the queue "default", the journal analytics to "analytics", and the
subscription check, which has no route, to Celery's own default queue, "celery". The compose file started the
worker without naming queues, and such a worker takes "celery" only. Run that way, it took one of the four
scheduled tasks; the other three stayed in their queues, among them the task that deletes expired session
records.
"""
import re
from pathlib import Path

from django.conf import settings
from django.test import SimpleTestCase

from stickforstats.celery import app

COMPOSE = Path(settings.BASE_DIR).parent / "docker-compose.yml"
SCHEDULED = {
    "core.tasks.sync_usage_aggregates": "default",
    "core.tasks.cleanup_expired_sessions": "default",
    "core.tasks.compute_journal_analytics": "analytics",
    "core.tasks.check_subscription_expirations": "celery",
}


def worker_commands(text):
    """The command lines of the compose file that start a Celery worker."""
    return [line.strip()[len("command:"):].strip() for line in text.split("\n")
            if re.match(r"\s*command:\s*celery\b.*\bworker\b", line)]


def queues_taken(command):
    """The queues a worker started with this command takes: those named with -Q, or Celery's default queue."""
    named = re.search(r"(?:^|\s)(?:-Q|--queues)(?:\s+|=)([^\s]+)", command)
    return {q for q in named.group(1).split(",") if q} if named else {app.conf.task_default_queue}


def queue_of(task_name):
    """Where a task sent by its name goes, as Celery's own router decides it."""
    queue = app.amqp.router.route({}, task_name)["queue"]
    return getattr(queue, "name", queue)


class TheWorkerTakesItsQueuesTest(SimpleTestCase):
    def test_the_scheduled_tasks_and_the_queues_they_are_sent_to(self):
        scheduled = sorted(entry["task"] for entry in app.conf.beat_schedule.values())
        self.assertEqual(scheduled, sorted(SCHEDULED))
        self.assertEqual({name: queue_of(name) for name in scheduled}, SCHEDULED)

    def test_the_worker_of_the_compose_file_takes_each_of_them(self):
        commands = worker_commands(COMPOSE.read_text(encoding="utf-8"))
        self.assertEqual(len(commands), 1, commands)
        taken = queues_taken(commands[0])
        for entry in app.conf.beat_schedule.values():
            with self.subTest(task=entry["task"]):
                self.assertIn(queue_of(entry["task"]), taken,
                              f"{entry['task']} is sent to a queue that the worker of docker-compose.yml does not take")

    def test_what_the_two_helpers_read(self):
        before = "celery -A stickforstats worker -l ${LOG_LEVEL:-INFO} --concurrency=${WORKER_CONCURRENCY:-4}"
        self.assertEqual(queues_taken(before), {"celery"})          # no queue named: Celery's default queue only
        self.assertEqual(queues_taken(before + " -Q celery,default,analytics"), {"celery", "default", "analytics"})
        self.assertEqual(queues_taken(before + " --queues=default"), {"default"})
        self.assertEqual(queues_taken("celery -A stickforstats worker -Q default -l INFO"), {"default"})
        text = ("  celery:\n    command: " + before + "\n  celery-beat:\n    command: celery -A stickforstats beat -l INFO\n"
                "  redis:\n    command: >\n      redis-server\n")
        self.assertEqual(worker_commands(text), [before])
