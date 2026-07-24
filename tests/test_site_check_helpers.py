"""Behavioral regression tests for portfolio validation helpers."""

from pathlib import Path
from tempfile import TemporaryDirectory
import unittest

from site_checks import validate_json_file, validate_xml_file


class MissingArtifactTests(unittest.TestCase):
    def test_missing_manifest_is_added_to_failure_list(self):
        with TemporaryDirectory() as directory:
            failures = []

            validate_json_file(Path(directory) / "manifest.json", "manifest.json", failures)

        self.assertEqual(["Missing manifest.json"], failures)

    def test_missing_sitemap_is_added_to_failure_list(self):
        with TemporaryDirectory() as directory:
            failures = []

            validate_xml_file(Path(directory) / "sitemap.xml", "sitemap.xml", failures)

        self.assertEqual(["Missing sitemap.xml"], failures)


if __name__ == "__main__":
    unittest.main()
