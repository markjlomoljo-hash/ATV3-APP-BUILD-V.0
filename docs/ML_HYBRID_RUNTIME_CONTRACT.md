# ML Hybrid Runtime Contract for AcneTrex V3

This document defines the contract for the hybrid ML runtime in AcneTrex V3, ensuring reliable and secure operation across cloud and local environments.

## 1. Cloud-First ML Execution

The primary mode of operation for all ML engine inference and training tasks is **cloud-first**. This means that the system will always attempt to utilize Google Cloud services (e.g., Vertex AI, Compute Engine) for ML workloads when an internet connection is available and configured. This approach leverages the scalability, performance, and managed services offered by Google Cloud.

## 2. Local Fallback When Offline

In scenarios where cloud services are unreachable or an explicit configuration for local execution is set, the ML runtime must gracefully **fall back to local/offline execution**. This ensures continuity of service and functionality, albeit potentially with reduced performance or limited model capabilities depending on the local resources. The system should be designed to seamlessly switch between these modes without requiring manual intervention beyond initial configuration.

## 3. Environment-Based Runtime Switching

The ML runtime mode (cloud or local) must be configurable via **environment variables**. This allows for flexible deployment and testing across different environments (development, staging, production) and enables easy switching between cloud and local execution without code changes. The `.env.example` file provides placeholders for these configurations.

## 4. Health Checks

Robust **health checks** must be implemented for the ML engine, regardless of its runtime mode. These checks should verify the availability of necessary resources (e.g., model artifacts, compute resources, API endpoints) and the operational status of the ML inference server. This ensures that the system can detect and report issues promptly, facilitating quick recovery or fallback.

## 5. No Fake ML Logic

All ML logic implemented within AcneTrex V3 must be **real and functional**. There shall be no placeholder code, dummy models, or fabricated inference results. The system must always strive to provide genuine ML-driven insights and predictions, maintaining the integrity and trustworthiness of the application.

## 6. Logging Confidence, Model Version, Errors, and Fallback Reason

Comprehensive **logging** is crucial for debugging, monitoring, and auditing the ML runtime. Logs must include:

- **Confidence Scores**: For ML predictions, where applicable.
- **Model Version**: The specific version of the ML model used for inference.
- **Errors**: Detailed error messages and stack traces for any failures.
- **Fallback Reason**: A clear indication of why the system switched from cloud to local execution (e.g., network error, explicit configuration).

This detailed logging ensures transparency and traceability of ML operations.

## 7. Privacy-First User Data Handling

All user data processed by the ML engine must adhere to a **privacy-first approach**. This includes:

- **Minimizing Data Collection**: Only collect data essential for ML tasks.
- **Anonymization/Pseudonymization**: Where possible, anonymize or pseudonymize sensitive user data.
- **Secure Storage and Transmission**: Ensure data is encrypted at rest and in transit.
- **Compliance**: Adhere to relevant data protection regulations (e.g., GDPR, CCPA).

No sensitive user data should ever be logged or exposed unnecessarily.

## 8. No Secrets in Repository

**No secrets, API keys, or sensitive credentials shall ever be committed to the repository.** All such information must be managed securely through environment variables, Google Cloud Secret Manager, or other secure credential management systems. The `.env.example` file provides a template for environment variables without exposing actual secrets.
