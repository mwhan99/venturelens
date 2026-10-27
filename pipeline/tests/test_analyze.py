import numpy as np
import pandas as pd

from analyze import BUCKET_ORDER, MIN_ROUNDS, SECTOR_ORDER, STAGE_ORDER, analyze


def make_rounds(per_cell: int = 30) -> pd.DataFrame:
    """Every sector × size × stage combination, with a mix of filed-again and censored rounds."""
    rng = np.random.default_rng(0)
    rows = []
    for sector in SECTOR_ORDER:
        for bucket in BUCKET_ORDER:
            for stage in STAGE_ORDER:
                for i in range(per_cell):
                    rows.append(
                        {
                            "venture_sector": sector,
                            "amount_bucket": bucket,
                            "stage": stage,
                            "duration": float(rng.uniform(3.5, 60)),
                            "event": int(i % 3 == 0),
                        }
                    )
    return pd.DataFrame(rows)


def test_all_sector_splits_cover_every_round():
    rounds = make_rounds()
    result = analyze(rounds)

    assert [r["amount_bucket"] for r in result["by_amount_bucket"]] == list(BUCKET_ORDER)
    assert [r["stage"] for r in result["by_stage"]] == list(STAGE_ORDER)
    assert all(r["venture_sector"] is None for r in result["by_amount_bucket"] + result["by_stage"])
    assert sum(r["n_rounds"] for r in result["by_amount_bucket"]) == len(rounds)
    assert sum(r["n_rounds"] for r in result["by_stage"]) == len(rounds)
    assert all(r["fallback"] == "overall" for r in result["by_amount_bucket"] + result["by_stage"])


def test_small_groups_are_marked_insufficient():
    rounds = make_rounds(per_cell=2)
    result = analyze(rounds)
    # Each sector × size cell has 2 × 3 stages = 6 rounds, far below MIN_ROUNDS.
    assert all(r["status"] == "insufficient data" for r in result["by_sector_and_amount_bucket"])
    # All sectors together: 2 × 3 stages × 6 sectors = 36 rounds per size, still below.
    assert MIN_ROUNDS > 36
    assert all(r["probability_another_filing_by_month"] is None for r in result["by_amount_bucket"])
