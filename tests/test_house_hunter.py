import pytest
from datetime import datetime, timezone, timedelta
from scripts.house_hunter import extract_dates, is_recent_listing

def test_extract_dates_published_days_ago():
    desc = "Publicado há 2 dias.\nBela casa com jardim."
    result = extract_dates(desc)
    expected_date = (datetime.now(timezone.utc) - timedelta(days=2)).strftime("%Y-%m-%d")
    assert result["published_date"] == expected_date
    assert result["updated_date"] is None

def test_extract_dates_updated_exact():
    desc = "Atualizado em 4 de agosto de 2026.\nÓtima localização."
    result = extract_dates(desc)
    assert result["updated_date"] == "2026-08-04"
    assert result["published_date"] is None

def test_extract_dates_iso():
    desc = "Publicado: 2026-08-03\nAtualizado: 2026-08-04"
    result = extract_dates(desc)
    assert result["published_date"] == "2026-08-03"
    assert result["updated_date"] == "2026-08-04"

def test_extract_dates_relative_hours():
    desc = "Publicado há 6 horas."
    result = extract_dates(desc)
    expected_date = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    assert result["published_date"] == expected_date

def test_extract_dates_today_yesterday():
    desc = "Publicado: hoje\nAtualizado: ontem"
    result = extract_dates(desc)
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    yesterday = (datetime.now(timezone.utc) - timedelta(days=1)).strftime("%Y-%m-%d")
    assert result["published_date"] == today
    assert result["updated_date"] == yesterday

def test_extract_dates_no_dates():
    desc = "Sem qualquer informação de data neste anúncio."
    result = extract_dates(desc)
    assert result["published_date"] is None
    assert result["updated_date"] is None


def test_is_recent_listing_published_today():
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    listing = {"published_date": today, "updated_date": None}
    assert is_recent_listing(listing, days=3) is True


def test_is_recent_listing_updated_yesterday():
    yesterday = (datetime.now(timezone.utc) - timedelta(days=1)).strftime("%Y-%m-%d")
    listing = {"published_date": None, "updated_date": yesterday}
    assert is_recent_listing(listing, days=3) is True


def test_is_recent_listing_too_old():
    old_date = (datetime.now(timezone.utc) - timedelta(days=10)).strftime("%Y-%m-%d")
    listing = {"published_date": old_date, "updated_date": None}
    assert is_recent_listing(listing, days=3) is False


def test_is_recent_listing_no_dates():
    listing = {"published_date": None, "updated_date": None}
    # No dates → include (assume recent)
    assert is_recent_listing(listing, days=3) is True


def test_is_recent_listing_3_days_boundary():
    exactly_3_days_ago = (datetime.now(timezone.utc) - timedelta(days=3)).strftime("%Y-%m-%d")
    listing = {"published_date": exactly_3_days_ago, "updated_date": None}
    assert is_recent_listing(listing, days=3) is True
