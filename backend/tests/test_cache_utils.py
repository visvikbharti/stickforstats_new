"""
Tests for the statistical-result response cache key.

Two properties matter, and neither held before:

1. The key must identify the *endpoint*. Every decorated handler is a method
   called ``post``, so keying on ``func.__name__`` let two different endpoints
   that happened to receive the same request body read each other's cached
   responses.

2. The key must change when a fix changes what a request computes. The key is
   derived from the request body alone, so without a schema version a corrected
   endpoint keeps serving the old, wrong answer out of Redis until the entry
   expires -- for up to an hour after the deploy that fixed it.
"""

from django.test import TestCase

from api.v1.cache_utils import CACHE_SCHEMA_VERSION, generate_cache_key


class GenerateCacheKeyTests(TestCase):
    BODY = {"test_type": "two_sample", "data1": [1, 2, 3], "equal_variance": False}

    def test_same_endpoint_and_body_is_stable(self):
        self.assertEqual(
            generate_cache_key("HighPrecisionTTestView.post", self.BODY),
            generate_cache_key("HighPrecisionTTestView.post", self.BODY),
        )

    def test_key_is_independent_of_dict_ordering(self):
        reordered = dict(reversed(list(self.BODY.items())))
        self.assertEqual(
            generate_cache_key("HighPrecisionTTestView.post", self.BODY),
            generate_cache_key("HighPrecisionTTestView.post", reordered),
        )

    def test_different_endpoints_never_collide_on_an_identical_body(self):
        # The regression: with prefix=func.__name__ both of these were "post:<hash>".
        # An empty body is the realistic collision -- every endpoint 400s on {}.
        for body in (self.BODY, {}):
            self.assertNotEqual(
                generate_cache_key("HighPrecisionTTestView.post", body),
                generate_cache_key("HighPrecisionANOVAView.post", body),
            )

    def test_different_bodies_produce_different_keys(self):
        other = dict(self.BODY, equal_variance=True)
        self.assertNotEqual(
            generate_cache_key("HighPrecisionTTestView.post", self.BODY),
            generate_cache_key("HighPrecisionTTestView.post", other),
        )

    def test_bumping_the_schema_version_invalidates_every_existing_entry(self):
        self.assertNotEqual(
            generate_cache_key("HighPrecisionTTestView.post", self.BODY, version=CACHE_SCHEMA_VERSION),
            generate_cache_key("HighPrecisionTTestView.post", self.BODY, version=CACHE_SCHEMA_VERSION + 1),
        )

    def test_the_version_is_visible_in_the_key(self):
        key = generate_cache_key("HighPrecisionTTestView.post", self.BODY)
        self.assertIn(f":v{CACHE_SCHEMA_VERSION}:", key)
        self.assertTrue(key.startswith("HighPrecisionTTestView.post:"))

    def test_unserialisable_body_degrades_to_no_caching(self):
        self.assertIsNone(generate_cache_key("X.post", {"bad": object()}))


class CacheDecoratorUsesQualnameTests(TestCase):
    def test_the_decorator_passes_an_endpoint_qualified_prefix(self):
        """
        Guards the actual wiring: cache_utils must hand generate_cache_key the
        qualname, not the bare method name. Asserted on the source of the
        wrapper rather than by exercising two live endpoints, which would need
        two matching request bodies.
        """
        import inspect

        from api.v1 import cache_utils

        source = inspect.getsource(cache_utils.cache_statistical_result)
        self.assertIn("func.__qualname__", source)
        self.assertNotIn("generate_cache_key(func.__name__", source)
