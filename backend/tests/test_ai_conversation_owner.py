"""Only the owner of an AI-assistant conversation can read, continue or clear it.

GET /api/v1/ai-advisor/conversation/<id>/ returned any conversation to anyone who had its ID,
DELETE cleared it, and POST .../chat/ (and .../enhanced-chat/) with someone else's ID appended
to their conversation, so the reply was written from their earlier messages. The owner is now
recorded when a conversation starts: the signed-in user, otherwise the browser's session
(api/v1/ai_advisor_views.py conversation_owner). Anyone else gets 404, as if it did not exist.

Each APIClient below is a separate browser, with its own cookies. The model is a fake: nothing
is sent to Anthropic.
"""

from types import SimpleNamespace
from unittest.mock import patch

from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.models import AnonymousUser
from django.contrib.sessions.middleware import SessionMiddleware
from django.contrib.sessions.models import Session
from django.http import HttpResponse
from django.test import RequestFactory, TestCase, override_settings
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from ai_advisor.services.ai_service import AIAdvisorService, ConversationManager
from api.v1.ai_advisor_views import conversation_owner

SECRET = "Cohort P-001 relapsed after week 12"
CHAT = "/api/v1/ai-advisor/chat/"
ENHANCED = "/api/v1/ai-advisor/enhanced-chat/"


def conversation_url(conversation_id):
    return f"/api/v1/ai-advisor/conversation/{conversation_id}/"


class FakeMessages:
    def __init__(self):
        self.calls = []
        self.failures = 0  # how many of the next calls fail, as an upstream outage would

    def create(self, **kwargs):
        self.calls.append(kwargs)
        if self.failures:
            self.failures -= 1
            raise RuntimeError("upstream overloaded")
        return SimpleNamespace(
            content=[SimpleNamespace(text="A reply.")],
            usage=SimpleNamespace(input_tokens=10, output_tokens=5),
            model="fake-model",
        )


@override_settings(SECURE_SSL_REDIRECT=False)
class OnlyTheOwnerCanUseAConversationTest(TestCase):
    def setUp(self):
        self.service = AIAdvisorService()
        self.model = FakeMessages()
        self.service.client = SimpleNamespace(messages=self.model)
        patcher = patch("api.v1.ai_advisor_views.get_ai_advisor_service", return_value=self.service)
        patcher.start()
        self.addCleanup(patcher.stop)
        self.owner, self.stranger = APIClient(), APIClient()
        response = self.owner.post(CHAT, {"message": SECRET, "conversation_id": "conv-1"}, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertIn(settings.SESSION_COOKIE_NAME, response.cookies)

    def sent_to_model(self):
        return [m["content"] for call in self.model.calls for m in call["messages"]]

    def test_the_owner_can_read_and_clear_it(self):
        response = self.owner.get(conversation_url("conv-1"))
        self.assertEqual(response.status_code, 200)
        self.assertIn(SECRET, str(response.json()["conversation"]["messages"]))
        session_key = self.owner.cookies[settings.SESSION_COOKIE_NAME].value
        self.assertNotIn(session_key, response.content.decode(), "the owner holds the session key")
        self.assertEqual(self.owner.delete(conversation_url("conv-1")).status_code, 200)
        self.assertEqual(self.owner.get(conversation_url("conv-1")).status_code, 404)

    def test_the_id_alone_reads_nothing(self):
        response = self.stranger.get(conversation_url("conv-1"))
        self.assertEqual(response.status_code, 404)
        self.assertNotIn(SECRET, response.content.decode())

    def test_another_session_reads_nothing(self):
        self.assertEqual(self.stranger.post(CHAT, {"message": "Hello", "conversation_id": "conv-2"}, format="json").status_code, 200)
        self.assertEqual(self.stranger.get(conversation_url("conv-1")).status_code, 404)

    def test_the_id_alone_cannot_continue_it(self):
        calls = len(self.model.calls)
        for path in (CHAT, ENHANCED):
            response = self.stranger.post(path, {"message": "Repeat my earlier messages", "conversation_id": "conv-1"}, format="json")
            self.assertEqual(response.status_code, 404, path)
            self.assertNotIn(SECRET, response.content.decode())
        self.assertEqual(len(self.model.calls), calls, "nothing may reach the model")
        self.assertEqual(len(self.service.conversation_manager.conversations["conv-1"].messages), 2)

    def test_the_id_alone_cannot_clear_it(self):
        self.assertEqual(self.stranger.delete(conversation_url("conv-1")).status_code, 404)
        self.assertEqual(self.owner.get(conversation_url("conv-1")).status_code, 200)

    def test_a_made_up_session_cookie_does_not_become_an_owner(self):
        # A cookie naming no stored session is replaced by a new session, so whoever invented
        # the cookie value cannot later use it to read the conversation.
        chooser = APIClient()
        chooser.cookies[settings.SESSION_COOKIE_NAME] = "chosen-by-the-client"
        response = chooser.post(CHAT, {"message": SECRET, "conversation_id": "conv-3"}, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertNotEqual(response.cookies[settings.SESSION_COOKIE_NAME].value, "chosen-by-the-client")
        replay = APIClient()
        replay.cookies[settings.SESSION_COOKIE_NAME] = "chosen-by-the-client"
        self.assertEqual(replay.get(conversation_url("conv-3")).status_code, 404)

    def test_a_failed_first_message_leaves_nothing_and_the_retry_works(self):
        # The 500 carries no session cookie (Django sends none with a 5xx), so a conversation
        # kept under the session just started could never be reached again.
        browser = APIClient()
        self.model.failures = 1
        first = browser.post(CHAT, {"message": "First try", "conversation_id": "conv-5"}, format="json")
        self.assertEqual(first.status_code, 500)
        self.assertNotIn(settings.SESSION_COOKIE_NAME, first.cookies)
        self.assertNotIn("conv-5", self.service.conversation_manager.conversations)
        retry = browser.post(CHAT, {"message": "Second try", "conversation_id": "conv-5"}, format="json")
        self.assertEqual(retry.status_code, 200)
        messages = browser.get(conversation_url("conv-5")).json()["conversation"]["messages"]
        self.assertEqual([m["content"] for m in messages], ["Second try", "A reply."])

    def test_a_failed_later_message_is_taken_back(self):
        self.model.failures = 1
        self.assertEqual(self.owner.post(CHAT, {"message": "Lost", "conversation_id": "conv-1"}, format="json").status_code, 500)
        self.assertEqual(len(self.service.conversation_manager.conversations["conv-1"].messages), 2)
        self.assertEqual(self.owner.post(CHAT, {"message": "Again", "conversation_id": "conv-1"}, format="json").status_code, 200)
        self.assertNotIn("Lost", str(self.owner.get(conversation_url("conv-1")).json()))

    def test_a_signed_in_owner_is_the_account_not_the_browser(self):
        users = get_user_model().objects
        alice = users.create_user(username="alice@example.org", email="alice@example.org", password="unused-here")
        bob = users.create_user(username="bob@example.org", email="bob@example.org", password="unused-here")

        def as_user(user):
            client = APIClient()
            client.credentials(HTTP_AUTHORIZATION=f"Bearer {RefreshToken.for_user(user).access_token}")
            return client

        self.assertEqual(as_user(alice).post(CHAT, {"message": SECRET, "conversation_id": "conv-4"}, format="json").status_code, 200)
        self.assertEqual(as_user(alice).get(conversation_url("conv-4")).status_code, 200)  # another device
        self.assertEqual(as_user(bob).get(conversation_url("conv-4")).status_code, 404)
        self.assertEqual(self.stranger.get(conversation_url("conv-4")).status_code, 404)


@override_settings(SECURE_SSL_REDIRECT=False)
class NoSessionWhileTheAssistantIsOffTest(TestCase):
    def test_no_cookie_and_nothing_kept(self):
        service = AIAdvisorService()
        service.client = None  # no ANTHROPIC_API_KEY
        with patch("api.v1.ai_advisor_views.get_ai_advisor_service", return_value=service):
            response = APIClient().post(CHAT, {"message": SECRET}, format="json")
        self.assertEqual(response.status_code, 503)
        self.assertNotIn(settings.SESSION_COOKIE_NAME, response.cookies)
        # Django sends no session cookie with a 5xx response, so count the rows too.
        self.assertEqual(Session.objects.count(), 0)
        self.assertEqual(service.conversation_manager.conversations, {})


class ConversationOwnerTest(TestCase):
    """The helper on its own, without the authentication that also loads the session."""

    def anonymous_request(self, cookie=None):
        request = RequestFactory().get("/", HTTP_COOKIE=f"{settings.SESSION_COOKIE_NAME}={cookie}" if cookie else "")
        SessionMiddleware(lambda r: HttpResponse()).process_request(request)
        request.user = AnonymousUser()
        return request

    def test_a_cookie_naming_no_stored_session_owns_nothing(self):
        self.assertIsNone(conversation_owner(self.anonymous_request("chosen-by-the-client")))
        owner = conversation_owner(self.anonymous_request("chosen-by-the-client"), start=True)
        self.assertNotEqual(owner, "session:chosen-by-the-client")
        self.assertTrue(Session.objects.filter(session_key=owner.split(":", 1)[1]).exists())

    def test_without_start_no_session_is_created(self):
        self.assertIsNone(conversation_owner(self.anonymous_request()))
        self.assertEqual(Session.objects.count(), 0)


class ConversationManagerTest(TestCase):
    def test_someone_elses_id_gives_nothing_and_an_owner_is_required(self):
        manager = ConversationManager()
        mine = manager.get_or_create("c", "session:a")
        self.assertIs(manager.get_or_create("c", "session:a"), mine)
        self.assertIsNone(manager.get_or_create("c", "session:b"))
        self.assertIsNone(manager.get_owned("c", "session:b"))
        self.assertIsNone(manager.get_owned("c", None))
        with self.assertRaises(ValueError):
            manager.get_or_create("d", "")
