"""
The question route analyses nothing: this version cannot read a question.

POST /api/v1/autonomous/query/ was meant to read a question in plain English and choose the
analysis that answers it. The part of the server that reads a question has never been loaded
(core/services/autonomous_query_handler.py imports it by a path that does not exist, and catches
the failure), so the route profiled the file and ran the first test the profile suggested, whatever
had been asked. On a file with two groups and two columns of numbers, a question about the relation
of the two columns of numbers was answered with a t-test of the two groups, and nothing in the
answer said which question the test belonged to.

Until a question can be read, the route answers every request with status 501 and one sentence. It
reads no file and runs no test.
"""

import json
from pathlib import Path
from unittest import mock

from django.conf import settings
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import SimpleTestCase, override_settings
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.test import APIClient

from api.v1 import autonomous_views
from api.v1.autonomous_views import THE_QUESTION_IS_NOT_READ, AutonomousQueryView

URL = "/api/v1/autonomous/query/"
ROOT = Path(settings.BASE_DIR).parent
ROWS = [{"group": "a" if i < 6 else "b", "weight": 5.0 + 0.3 * i, "height": 150.0 + 2.0 * i} for i in range(12)]
CSV = "group,weight,height\n" + "".join(f"{r['group']},{r['weight']},{r['height']}\n" for r in ROWS)


def post(body, **how):
    return APIClient().post(URL, body, **how)


@override_settings(RATE_LIMIT_ENABLED=False, SECURE_SSL_REDIRECT=False)
class TheAnswerTest(SimpleTestCase):
    def test_the_sentence(self):
        self.assertEqual(THE_QUESTION_IS_NOT_READ,
                         "This version cannot read a question, so nothing was analysed. Run the test you want on its own page.")

    def test_every_request_gets_the_sentence_and_status_501(self):
        requests = {
            "the page: a file and a question": (
                {"file": SimpleUploadedFile("d.csv", CSV.encode(), content_type="text/csv"),
                 "query": "Is weight different between the two groups?", "mode": "plain_english", "alpha": "0.05"}, {"format": "multipart"}),
            "rows and a question": ({"query": "Is there a relationship between weight and height?", "data": ROWS}, {"format": "json"}),
            "the two clients: the question under another name": ({"question": "Is weight different?", "data": ROWS, "alpha": 0.05}, {"format": "json"}),
            "a question and no data": ({"query": "What is the mean?"}, {"format": "json"}),
            "data and no question": ({"data": ROWS}, {"format": "json"}),
            "an empty body": ({}, {"format": "json"}),
            "a file that is no table": (
                {"file": SimpleUploadedFile("d.csv", b"\x00\xff\x00 not a table", content_type="text/csv"), "query": "anything"}, {"format": "multipart"}),
        }
        for what, (body, how) in requests.items():
            with self.subTest(what):
                response = post(body, **how)
                self.assertEqual(response.status_code, 501)
                self.assertEqual(response.json(), {"error": THE_QUESTION_IS_NOT_READ})

    def test_a_body_that_is_not_json_gets_it_too(self):
        # The body is not parsed, so a body that cannot be parsed is not an error of its own.
        response = APIClient().post(URL, data="{not json", content_type="application/json")
        self.assertEqual((response.status_code, response.json()), (501, {"error": THE_QUESTION_IS_NOT_READ}))

    def test_the_other_methods_are_not_offered(self):
        self.assertEqual(APIClient().get(URL).status_code, 405)


@override_settings(RATE_LIMIT_ENABLED=False, SECURE_SSL_REDIRECT=False)
class NothingIsReadAndNothingIsRunTest(SimpleTestCase):
    def test_the_body_of_the_request_is_not_parsed(self):
        refuse = AssertionError("the body of the request was parsed")
        with mock.patch.object(MultiPartParser, "parse", side_effect=refuse) as multipart, \
                mock.patch.object(FormParser, "parse", side_effect=refuse) as form, \
                mock.patch.object(JSONParser, "parse", side_effect=refuse) as as_json:
            upload = post({"file": SimpleUploadedFile("d.csv", CSV.encode(), content_type="text/csv"), "query": "Is weight different?"},
                          format="multipart")
            rows = post({"query": "Is weight different?", "data": ROWS}, format="json")
        self.assertEqual((upload.status_code, rows.status_code), (501, 501))
        for parser in (multipart, form, as_json):
            parser.assert_not_called()

    def test_no_file_is_read_no_profile_is_made_and_no_test_is_run(self):
        from core.services.cascade_engine import AutonomousCascadeEngine
        from core.services.smart_profiler import SmartProfiler

        with mock.patch.object(autonomous_views, "_parse_dataframe") as read_table, \
                mock.patch.object(autonomous_views, "AutonomousQueryHandler") as handler, \
                mock.patch.object(SmartProfiler, "profile_and_recommend") as profile, \
                mock.patch.object(AutonomousCascadeEngine, "execute_with_cascade") as engine, \
                mock.patch("pandas.read_csv") as read_csv:
            response = post({"file": SimpleUploadedFile("d.csv", CSV.encode(), content_type="text/csv"),
                             "query": "Is there a relationship between weight and height?"}, format="multipart")
        self.assertEqual(response.status_code, 501)
        for called in (read_table, handler, profile, engine, read_csv):
            called.assert_not_called()

    def test_the_handler_of_the_route_touches_nothing_of_the_request(self):
        # The whole handler: one answer, built from the sentence.
        import ast
        import inspect
        import textwrap

        tree = ast.parse(textwrap.dedent(inspect.getsource(AutonomousQueryView.post)))
        function = tree.body[0]
        self.assertEqual(len(function.body), 1)
        self.assertIsInstance(function.body[0], ast.Return)
        names = {node.attr for node in ast.walk(function) if isinstance(node, ast.Attribute)}
        self.assertEqual(names, {"HTTP_501_NOT_IMPLEMENTED"})
        loaded = {node.id for node in ast.walk(function) if isinstance(node, ast.Name)}
        self.assertEqual(loaded, {"Response", "THE_QUESTION_IS_NOT_READ", "status"})


@override_settings(RATE_LIMIT_ENABLED=False, SECURE_SSL_REDIRECT=False)
class WhatIsLeftTest(SimpleTestCase):
    def test_the_reader_of_questions_is_still_not_loaded(self):
        # The day this fails, a question can be read, and what the route answers is to be decided
        # again: with tests of the reader, which has never run.
        from core.services import autonomous_query_handler

        self.assertIs(autonomous_query_handler.QUERY_PARSER_AVAILABLE, False)

    def test_the_profile_of_an_upload_is_answered_as_before(self):
        response = APIClient().post("/api/v1/autonomous/profile/",
                                    {"file": SimpleUploadedFile("d.csv", CSV.encode(), content_type="text/csv")}, format="multipart")
        self.assertEqual(response.status_code, 200, response.content[:300])
        self.assertEqual(sorted(response.json()["variables"]), ["group", "height", "weight"])

    def test_the_routes_beside_it_are_answered_as_before(self):
        steps = APIClient().post("/api/v1/autonomous/next-step/", {"has_data": True}, format="json")
        self.assertEqual(steps.status_code, 200)
        self.assertIn("next_steps", steps.json())


class WhereTheRouteIsDescribedTest(SimpleTestCase):
    @override_settings(RATE_LIMIT_ENABLED=False, SECURE_SSL_REDIRECT=False)     # the last lines send one request
    def test_the_four_documents_that_promise_a_question_say_that_it_is_not_read(self):
        # Each of these documents says in so many places that a question in plain English is read. The promise
        # stays where it stood, and one sentence stands beside it.
        sentence = "This version does not read the question: the route answers that it cannot. See KNOWN_ISSUES.md."
        places = {"README.md": 4, "sdk/python/README.md": 2, "sdk/r/README.md": 2, "docs/CLI_QUICKSTART.md": 1}
        for name, count in places.items():
            text = (ROOT / name).read_text(encoding="utf-8")
            self.assertEqual(text.count(sentence), count, name)
        readme = (ROOT / "README.md").read_text(encoding="utf-8")
        for promise in ("describe your research question in plain English, and receive validated results",
                        "ask a question in plain English -- get validated results and a report",
                        "Intent detection parses your query, maps it to the appropriate statistical test",
                        "# Autonomous analysis -- describe your question in plain English"):
            after = readme[readme.index(promise):]
            self.assertLess(after.index(sentence), 260, promise)
        # and the sentence is what the route does
        self.assertIn("### The question box answers no question: this version cannot read one",
                      (ROOT / "KNOWN_ISSUES.md").read_text(encoding="utf-8"))
        answer = APIClient().post(URL, {"query": "Is there a difference?", "data": ROWS}, format="json")
        self.assertEqual((answer.status_code, answer.json()), (501, {"error": THE_QUESTION_IS_NOT_READ}))

    def test_the_schema(self):
        from api.v1.schema_views import build_openapi_spec

        described = build_openapi_spec()["paths"]["/autonomous/query/"]["post"]
        self.assertEqual(described["summary"], "Answers 501: this version cannot read a question")
        self.assertEqual(list(described["responses"]), ["501"])

    def test_the_api_document_and_the_api_page(self):
        document = (ROOT / "docs/API_DOCUMENTATION.md").read_text(encoding="utf-8")
        section = document.split("### POST `/api/v1/autonomous/query/`\n", 1)[1].split("\n### ", 1)[0]
        self.assertIn("**Response** (501):", section)
        self.assertEqual(json.loads(section.split("```json\n", 1)[1].split("```", 1)[0]), {"error": THE_QUESTION_IS_NOT_READ})
        self.assertNotIn("parsed_intent", section)
        self.assertIn("| POST | `/api/v1/autonomous/query/` | Answers 501: this version cannot read a question | None |", document)
        page = (ROOT / "frontend/src/pages/APIDocsPage.jsx").read_text(encoding="utf-8")
        entry = page.split("path: '/api/v1/autonomous/query/'", 1)[1].split("\n  },", 1)[0]
        self.assertIn(f"response: {{ example: {{ error: '{THE_QUESTION_IS_NOT_READ}' }} }},", entry)
        self.assertIn("answers every request with status 501 and one sentence", entry)
        self.assertNotIn("interprets intent", entry)
