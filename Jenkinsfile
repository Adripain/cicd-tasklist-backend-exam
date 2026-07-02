pipeline {
  agent any

  environment {
    DATABASE_URL = 'mysql://root:password@localhost:3306/tasklist'
    DOCKER_IMAGE = 'tasklist-backend-exam'
    SONAR_HOST_URL = 'https://sonarqube.cicd.kits.ext.educentre.fr'
  }

  options {
    timestamps()
    disableConcurrentBuilds()
  }

  parameters {
    string(name: 'SONAR_PROJECT_KEY', defaultValue: 'adrien-tasklist-backend-exam', description: 'SonarQube project key used for this Jenkins run')
  }

  stages {
    stage('Install dependencies') {
      steps {
        sh 'npm ci'
        sh 'npx prisma generate'
      }
    }

    stage('Dependency audit') {
      steps {
        sh 'npm audit --audit-level=high'
      }
    }

    stage('Tests and coverage') {
      steps {
        sh 'npm run test:coverage'
        sh 'npm run test:e2e:coverage'
      }
      post {
        always {
          junit allowEmptyResults: true, testResults: 'reports/*.xml'
        }
      }
    }

    stage('Build application') {
      steps {
        sh 'npm run build'
      }
    }

    stage('SonarQube analysis') {
      steps {
        withCredentials([string(credentialsId: 'adrien-sonar-token-backend', variable: 'SONAR_TOKEN')]) {
          sh '''
            docker run --rm \
              -e SONAR_HOST_URL="$SONAR_HOST_URL" \
              -e SONAR_TOKEN="$SONAR_TOKEN" \
              -v "$PWD:/usr/src" \
              sonarsource/sonar-scanner-cli:latest \
              -Dproject.settings=sonar-project.properties \
              -Dsonar.projectKey="$SONAR_PROJECT_KEY" \
              -Dsonar.token="$SONAR_TOKEN" \
              -Dsonar.qualitygate.wait=true
          '''
        }
      }
    }

    stage('Build Docker image') {
      steps {
        sh '''
          docker build \
            -t "$DOCKER_IMAGE:$BUILD_NUMBER" \
            -t "$DOCKER_IMAGE:latest" \
            .
        '''
      }
    }

    stage('Security scan and SBOM') {
      steps {
        sh '''
          docker run --rm \
            -v /var/run/docker.sock:/var/run/docker.sock \
            -v "$PWD:/work" \
            aquasec/trivy:latest image \
            --scanners vuln \
            --severity HIGH,CRITICAL \
            --ignore-unfixed \
            --format table \
            --output /work/trivy-image-report.txt \
            "$DOCKER_IMAGE:$BUILD_NUMBER"

          docker run --rm \
            -v /var/run/docker.sock:/var/run/docker.sock \
            -v "$PWD:/work" \
            aquasec/trivy:latest image \
            --format cyclonedx \
            --output /work/sbom-cyclonedx.json \
            "$DOCKER_IMAGE:$BUILD_NUMBER"

          docker run --rm \
            -v /var/run/docker.sock:/var/run/docker.sock \
            -v "$PWD:/work" \
            aquasec/trivy:latest image \
            --format spdx-json \
            --output /work/sbom-spdx.json \
            "$DOCKER_IMAGE:$BUILD_NUMBER"
        '''
      }
    }

    stage('Publish Docker Hub') {
      steps {
        withCredentials([usernamePassword(credentialsId: 'adrien-dockerhub-credentials', usernameVariable: 'DOCKERHUB_USERNAME', passwordVariable: 'DOCKERHUB_TOKEN')]) {
          sh '''
            REMOTE_IMAGE="$DOCKERHUB_USERNAME/$DOCKER_IMAGE"
            echo "$DOCKERHUB_TOKEN" | docker login -u "$DOCKERHUB_USERNAME" --password-stdin
            docker tag "$DOCKER_IMAGE:$BUILD_NUMBER" "$REMOTE_IMAGE:$BUILD_NUMBER"
            docker tag "$DOCKER_IMAGE:latest" "$REMOTE_IMAGE:latest"
            docker push "$REMOTE_IMAGE:$BUILD_NUMBER"
            docker push "$REMOTE_IMAGE:latest"
          '''
        }
      }
    }
  }

  post {
    always {
      archiveArtifacts allowEmptyArchive: true, artifacts: 'coverage/**,reports/**,sbom-*.json,trivy-*.txt'
      sh 'docker logout || true'
    }
  }
}
