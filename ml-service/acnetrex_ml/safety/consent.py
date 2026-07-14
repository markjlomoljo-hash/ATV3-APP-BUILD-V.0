from acnetrex_ml.contracts.requests import ConsentScope


def validate_consent(
    consent: ConsentScope, *, requires_raw_images: bool = False
) -> tuple[bool, str | None]:
    if not consent.personal_processing:
        return False, "personal_processing_not_consented"
    if requires_raw_images and not consent.raw_image_processing:
        return False, "raw_image_processing_not_consented"
    return True, None
