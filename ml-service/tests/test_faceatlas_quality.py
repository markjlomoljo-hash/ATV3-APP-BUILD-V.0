from acnetrex_ml.engines.faceatlas_quality import assess_faceatlas_quality


def test_faceatlas_reports_owner_annotation_summary_without_diagnosis() -> None:
    result = assess_faceatlas_quality(
        {
            "images": [],
            "annotations": [
                {
                    "annotation_id": "11111111-1111-4111-8111-111111111121",
                    "record_id": "11111111-1111-4111-8111-111111111120",
                    "lesion_type": "papule",
                    "zone": "left_cheek",
                    "source": "user",
                },
                {
                    "annotation_id": "11111111-1111-4111-8111-111111111122",
                    "record_id": "11111111-1111-4111-8111-111111111120",
                    "lesion_type": "papule",
                    "zone": "chin",
                    "source": "user",
                },
            ],
        }
    )

    assert result["annotation_count"] == 2
    assert result["annotation_summary"] == {
        "by_lesion_type": {"papule": 2},
        "by_zone": {"chin": 1, "left_cheek": 1},
    }
    assert result["lesion_analysis"] is None
    assert any("user-provided" in item for item in result["limitations"])
