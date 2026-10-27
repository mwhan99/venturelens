#!/usr/bin/env python3
"""Download SEC Form D quarterly data sets and unzip each quarter."""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
import time
import zipfile
from pathlib import Path
from urllib.parse import urljoin

try:
    import requests
except ImportError:
    sys.exit(
        "ERROR: The requests package is not installed.\n"
        "Create the pipeline virtualenv and install dependencies:\n"
        "  python3 -m venv pipeline/.venv\n"
        "  pipeline/.venv/bin/pip install -r pipeline/requirements.txt"
    )

BENCHMARKS_PATH = Path(__file__).resolve().parents[1] / "src" / "data" / "formd" / "benchmarks.json"
SOURCE_PAGE = "https://www.sec.gov/data-research/sec-markets-data/form-d-data-sets"
RAW_DIR = Path(__file__).resolve().parent / "data" / "raw"
# SEC fair-access policy asks filers to stay at or below 10 requests per second.
REQUEST_INTERVAL_SECONDS = 0.2
ZIP_HREF = re.compile(r"""href=["']([^"']+\.zip)["']""", re.IGNORECASE)
QUARTER_IN_NAME = re.compile(r"(\d{4})q([1-4])", re.IGNORECASE)

_last_request_at: float | None = None


def require_user_agent() -> str:
    user_agent = os.environ.get("SEC_USER_AGENT", "").strip()
    if not user_agent:
        sys.exit(
            "ERROR: SEC_USER_AGENT is not set.\n"
            "The SEC rejects requests that do not declare who is asking.\n"
            "Set it to your name and a contact email, then rerun:\n"
            '  export SEC_USER_AGENT="Your Name you@example.com"\n'
            "  python pipeline/download.py"
        )
    return user_agent


def throttle() -> None:
    """Wait 0.2s between SEC requests so we stay under 10 requests/second."""
    global _last_request_at
    if _last_request_at is not None:
        time.sleep(REQUEST_INTERVAL_SECONDS)
    _last_request_at = time.monotonic()


def fetch(session: requests.Session, url: str, *, stream: bool = False) -> requests.Response:
    delay = 1.0
    last_error: Exception | None = None
    for attempt in range(4):
        throttle()
        try:
            response = session.get(url, timeout=(20, 180), stream=stream)
        except requests.RequestException as exc:
            last_error = exc
            print(f"  request failed ({exc}); retrying in {delay:.0f}s")
            time.sleep(delay)
            delay *= 2
            continue
        if response.status_code in {429, 500, 502, 503, 504}:
            response.close()
            print(f"  HTTP {response.status_code} for {url}; retrying in {delay:.0f}s")
            time.sleep(delay)
            delay *= 2
            continue
        try:
            response.raise_for_status()
        except requests.HTTPError as exc:
            response.close()
            raise SystemExit(f"ERROR: SEC returned {response.status_code} for {url}") from exc
        return response
    raise SystemExit(f"ERROR: Failed to fetch {url} after retries ({last_error})")


def scrape_zip_urls(session: requests.Session) -> list[str]:
    print(f"Fetching source page: {SOURCE_PAGE}")
    response = fetch(session, SOURCE_PAGE)
    hrefs = ZIP_HREF.findall(response.text)
    urls: list[str] = []
    seen: set[str] = set()
    for href in hrefs:
        if "form-d-data-sets" not in href.lower():
            continue
        absolute = urljoin(SOURCE_PAGE, href)
        if absolute not in seen:
            seen.add(absolute)
            urls.append(absolute)
    if not urls:
        raise SystemExit(
            "ERROR: No Form D zip links found on the SEC source page. "
            "The page layout may have changed."
        )

    def sort_key(url: str) -> tuple[int, int, str]:
        name = url.rsplit("/", 1)[-1]
        match = QUARTER_IN_NAME.search(name)
        if not match:
            return (9999, 9, name)
        return (int(match.group(1)), int(match.group(2)), name)

    urls.sort(key=sort_key)
    print(f"Found {len(urls)} quarterly zip files.")
    return urls


def safe_extract(archive: zipfile.ZipFile, destination: Path) -> None:
    root = destination.resolve()
    for member in archive.infolist():
        target = (root / member.filename).resolve()
        if target != root and not str(target).startswith(str(root) + os.sep):
            raise RuntimeError(f"Refusing to extract unsafe zip path: {member.filename}")
    archive.extractall(root)


def already_extracted(folder: Path) -> bool:
    if not folder.exists():
        return False
    for path in folder.rglob("*"):
        if not path.is_file():
            continue
        if "__MACOSX" in path.parts:
            continue
        if path.suffix.lower() in {".tsv", ".txt"} and path.stem.upper() in {
            "FORMDSUBMISSION",
            "ISSUERS",
            "OFFERING",
        }:
            return True
    return False


def download_one(session: requests.Session, url: str) -> str:
    """Download one zip if needed and unzip it. Returns 'downloaded' or 'skipped'."""
    filename = url.rsplit("/", 1)[-1]
    destination = RAW_DIR / filename
    extract_dir = RAW_DIR / destination.stem

    if destination.exists() and destination.stat().st_size > 0 and zipfile.is_zipfile(destination):
        print(f"SKIP download (already exists): {filename}")
        status = "skipped"
    else:
        print(f"Downloading {url}")
        partial = destination.with_suffix(destination.suffix + ".part")
        response = fetch(session, url, stream=True)
        try:
            with partial.open("wb") as handle:
                for chunk in response.iter_content(chunk_size=1024 * 64):
                    if chunk:
                        handle.write(chunk)
        finally:
            response.close()
        if not zipfile.is_zipfile(partial):
            partial.unlink(missing_ok=True)
            raise SystemExit(f"ERROR: {url} did not download as a zip file.")
        partial.replace(destination)
        status = "downloaded"

    if already_extracted(extract_dir):
        print(f"SKIP unzip (already extracted): {extract_dir.name}/")
        return status

    extract_dir.mkdir(parents=True, exist_ok=True)
    print(f"Unzipping {filename} -> {extract_dir.name}/")
    with zipfile.ZipFile(destination) as archive:
        safe_extract(archive, extract_dir)
    return status


def quarter_from_url(url: str) -> tuple[int, int] | None:
    """(2026, 4) for .../2026q4_d.zip; None if the name has no quarter."""
    match = QUARTER_IN_NAME.search(url.rsplit("/", 1)[-1])
    return (int(match.group(1)), int(match.group(2))) if match else None


def quarter_of_date(iso_date: str) -> tuple[int, int]:
    """(2026, 3) for 2026-09-30."""
    year, month = int(iso_date[:4]), int(iso_date[5:7])
    return (year, (month - 1) // 3 + 1)


def newer_quarters(urls: list[str], end_date: str) -> list[str]:
    """Quarters on the SEC page that end after the data the website shows, e.g. ["2026q4"]."""
    current = quarter_of_date(end_date)
    found = {q for q in map(quarter_from_url, urls) if q is not None and q > current}
    return [f"{y}q{q}" for y, q in sorted(found)]


def check_for_new_quarter(session: requests.Session) -> int:
    """Print whether the SEC has posted a quarter the website doesn't have yet.

    In GitHub Actions it also writes new_quarter=true/false and quarter=2026q4
    to $GITHUB_OUTPUT, so the refresh job can skip the rest when nothing is new.
    """
    end_date = json.loads(BENCHMARKS_PATH.read_text(encoding="utf-8"))["dataset_end_date"]
    newer = newer_quarters(scrape_zip_urls(session), end_date)
    if newer:
        print(f"New on the SEC page: {', '.join(newer)} (the website has data through {end_date}).")
    else:
        print(f"Nothing new: the website already has every posted quarter (data through {end_date}).")
    output = os.environ.get("GITHUB_OUTPUT")
    if output:
        with open(output, "a", encoding="utf-8") as handle:
            handle.write(f"new_quarter={'true' if newer else 'false'}\n")
            handle.write(f"quarter={newer[-1] if newer else ''}\n")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    parser.add_argument(
        "--check", action="store_true", help="only report whether a quarter newer than the website's data is posted"
    )
    args = parser.parse_args()
    user_agent = require_user_agent()
    RAW_DIR.mkdir(parents=True, exist_ok=True)
    session = requests.Session()
    session.headers.update(
        {
            "User-Agent": user_agent,
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        }
    )
    print("Using SEC_USER_AGENT from the environment.")
    if args.check:
        return check_for_new_quarter(session)
    urls = scrape_zip_urls(session)
    downloaded = 0
    skipped = 0
    for url in urls:
        status = download_one(session, url)
        if status == "downloaded":
            downloaded += 1
        else:
            skipped += 1
    print(
        f"Done. {downloaded} downloaded, {skipped} already present, "
        f"{len(urls)} quarters in {RAW_DIR}."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
