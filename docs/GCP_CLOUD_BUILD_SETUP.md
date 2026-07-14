# Google Cloud Build Setup for AcneTrex V3 ML Engine

This document outlines the steps to set up Google Cloud Build for continuous integration and deployment of the AcneTrex V3 ML engine Docker image to Google Cloud Artifact Registry. This setup ensures that every push to the `main` branch triggers an automated build and push process.

## 1. Enable Required Google Cloud APIs

Ensure the following Google Cloud APIs are enabled in your project. You can enable them using the `gcloud` CLI:

```bash
gcloud services enable cloudbuild.googleapis.com \
    artifactregistry.googleapis.com \
    logging.googleapis.com \
    compute.googleapis.com \
    aiplatform.googleapis.com \
    secretmanager.googleapis.com
```

## 2. Create Artifact Registry Repository

Create a Docker repository in Artifact Registry to store your ML engine images. The repository name should be `acnetrex-ml` and located in `us-central1`.

```bash
gcloud artifacts repositories create acnetrex-ml \
    --repository-format=docker \
    --location=us-central1 \
    --description="Docker repository for AcneTrex V3 ML engine images"
```

## 3. Grant Cloud Build IAM Roles

The Cloud Build service account requires specific IAM roles to build and push Docker images to Artifact Registry. The Cloud Build service account typically follows the format `PROJECT_NUMBER@cloudbuild.gserviceaccount.com`. You can find your project number in the Google Cloud Console Dashboard.

Grant the following roles:

- `Artifact Registry Writer`: Allows Cloud Build to push images to Artifact Registry.
- `Cloud Build Service Account`: Default role for Cloud Build operations.

```bash
PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format="value(projectNumber)")

gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:$PROJECT_NUMBER@cloudbuild.gserviceaccount.com" \
    --role="roles/artifactregistry.writer"

gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:$PROJECT_NUMBER@cloudbuild.gserviceaccount.com" \
    --role="roles/cloudbuild.builds.builder"
```

## 4. Create Cloud Build Trigger

Create a Cloud Build trigger that automatically builds and pushes the Docker image whenever changes are pushed to the `main` branch of your GitHub repository. This trigger will use the `cloudbuild.yaml` file at the root of your repository.

```bash
gcloud builds triggers create github \
    --name="acnetrex-v3-ml-engine-ci" \
    --repo-name="ATV3-APP-BUILD-V.0" \
    --repo-owner="markjlomoljo-hash" \
    --branch-pattern="^main$" \
    --build-config="cloudbuild.yaml" \
    --region="us-central1"
```

## 5. Verify Builds and Images

After setting up the trigger, push a change to your `main` branch to initiate a build. You can verify the build status and the pushed Docker images using the following commands or through the Google Cloud Console.

- **Check Cloud Build History:**

```bash
gcloud builds list --region=us-central1
```

- **Verify Docker Image in Artifact Registry:**

```bash
gcloud artifacts docker images list us-central1-docker.pkg.dev/$PROJECT_ID/acnetrex-ml/ml-engine \
    --include-tags
```

This setup ensures a robust CI/CD pipeline for your AcneTrex V3 ML engine, enabling rapid and automated deployments to Google Cloud.
