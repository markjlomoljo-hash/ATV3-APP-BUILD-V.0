/**
 * Canonical in-app privacy and terms copy.
 *
 * This is the single source for the privacy/terms text shown in onboarding
 * (privacy education) and in the Profile → About screens. No legal text is
 * invented here: everything below is the existing in-app education and
 * consent copy the user acknowledges during onboarding. Formal standalone
 * Privacy Policy / Terms of Service documents have not been published for
 * the Phase 1 beta, and the screens that render this content say so.
 */

export interface LegalPoint {
  icon: string;
  title: string;
  text: string;
}

// Shown during onboarding (privacy-education) and on the in-app
// Privacy screen. Keep the two surfaces identical.
export const PRIVACY_EDUCATION_POINTS: LegalPoint[] = [
  {
    icon: "🩺",
    title: "Not a Medical Device",
    text: "AcneTrex helps you track and understand your skin. It does not diagnose disease, replace a dermatologist, or provide prescriptions.",
  },
  {
    icon: "🔒",
    title: "Your Data Is Private",
    text: "Your skin data is private and user-owned. Raw face images are stored separately and controlled entirely by you.",
  },
  {
    icon: "🤝",
    title: "You Control Sharing",
    text: "Anonymous learning and research participation are opt-in only. You can revoke consent at any time from your profile.",
  },
  {
    icon: "⚠️",
    title: "Seek Professional Care",
    text: "For severe acne, allergic reactions, or medication concerns, please consult a qualified dermatologist.",
  },
  {
    icon: "🧪",
    title: "Honest Uncertainty",
    text: "When data is insufficient, AcneTrex says so. We never fabricate scores, trends, or insights.",
  },
];

// Privacy practices, restated from the consent screen copy the user
// reviewed during onboarding.
export const PRIVACY_PRACTICES: LegalPoint[] = [
  {
    icon: "🙈",
    title: "Anonymous Learning Is Opt-In",
    text: "Anonymized, de-identified pattern data is only contributed to improve AcneTrex's models if you turn this on. No raw images or identifiable data are shared.",
  },
  {
    icon: "🖼️",
    title: "Raw Image Learning Is Opt-In",
    text: "FaceAtlas images are only used to improve skin analysis models if you allow it. Images are processed privately and never shared.",
  },
  {
    icon: "📄",
    title: "Reports Share Only What You Choose",
    text: "FaceAtlas photos and treatment details are only included in generated reports when you enable those options.",
  },
  {
    icon: "🗑️",
    title: "Deletion Rights",
    text: "You can request full data deletion at any time from Profile. Deletion is processed by the backend pipeline and is permanent once completed.",
  },
  {
    icon: "🔐",
    title: "On-Device Protection",
    text: "Locally stored app data (offline queues and ML operations) is kept in an encrypted database keyed from your device's secure storage.",
  },
];

// Terms-of-use commitments, restated from the onboarding acknowledgments.
export const TERMS_POINTS: LegalPoint[] = [
  {
    icon: "🩺",
    title: "Not Medical Advice",
    text: "AcneTrex is not a medical device and does not diagnose, treat, or prevent any disease. Always consult a qualified dermatologist for medical advice.",
  },
  {
    icon: "🎂",
    title: "Age Requirement",
    text: "You must be at least 16 years of age to use AcneTrex.",
  },
  {
    icon: "🧪",
    title: "Zero Fabrication",
    text: "AcneTrex never fabricates scores, correlations, or insights. When data is insufficient, nothing is shown and the app says why.",
  },
  {
    icon: "🤝",
    title: "Your Choices Persist",
    text: "All privacy and notification settings are optional and can be changed at any time. None of them affect your core AcneTrex experience.",
  },
];

export const LEGAL_STATUS_NOTE =
  "Formal standalone Privacy Policy and Terms of Service documents have not yet been published for the AcneTrex v3 Phase 1 beta. The commitments on this screen are the canonical in-app copy you acknowledged during onboarding, shown here verbatim for reference.";

export const SUPPORT_EMAIL = "support@acnetrex.com";
