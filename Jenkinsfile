pipeline {
  agent any

  environment {
    DOCKERHUB_IMAGE = 'adripain/cicd-tasklist-backend-exam'
    SONAR_HOST_URL = 'https://sonarqube.cicd.kits.ext.educentre.fr'
  }

  options {
    timestamps()
    disableConcurrentBuilds()
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
        withCredentials([string(credentialsId: 'sonarqube-token', variable: 'SONAR_TOKEN')]) {
          sh '''
            docker run --rm \
              -e SONAR_HOST_URL="$SONAR_HOST_URL" \
              -e SONAR_TOKEN="$SONAR_TOKEN" \
              -v "$PWD:/usr/src" \
              sonarsource/sonar-scanner-cli:latest \
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
            -t "$DOCKERHUB_IMAGE:$BUILD_NUMBER" \
            -t "$DOCKERHUB_IMAGE:latest" \
            .
        '''
      }
    }

    stage('Security scan and SBOM') {
      steps {
        sh '''
          docker run --rm \
            -v /var/run/docker.sock:/var/run/docker.sock \
            aquasec/trivy:latest image \
            --scanners vuln \
            --severity HIGH,CRITICAL \
            --exit-code 1 \
            "$DOCKERHUB_IMAGE:$BUILD_NUMBER"

          docker run --rm \
            -v /var/run/docker.sock:/var/run/docker.sock \
            -v "$PWD:/work" \
            aquasec/trivy:latest image \
            --format cyclonedx \
            --output /work/sbom-cyclonedx.json \
            "$DOCKERHUB_IMAGE:$BUILD_NUMBER"

          docker run --rm \
            -v /var/run/docker.sock:/var/run/docker.sock \
            -v "$PWD:/work" \
            aquasec/trivy:latest image \
            --format spdx-json \
            --output /work/sbom-spdx.json \
            "$DOCKERHUB_IMAGE:$BUILD_NUMBER"
        '''
      }
    }

    stage('Publish Docker Hub') {
      steps {
        withCredentials([usernamePassword(credentialsId: 'dockerhub-credentials', usernameVariable: 'DOCKERHUB_USERNAME', passwordVariable: 'DOCKERHUB_TOKEN')]) {
          sh '''
            echo "$DOCKERHUB_TOKEN" | docker login -u "$DOCKERHUB_USERNAME" --password-stdin
            docker push "$DOCKERHUB_IMAGE:$BUILD_NUMBER"
            docker push "$DOCKERHUB_IMAGE:latest"
          '''
        }
      }
    }
  }

  post {
    always {
      archiveArtifacts allowEmptyArchive: true, artifacts: 'coverage/**,reports/**,sbom-*.json'
      sh 'docker logout || true'
    }
  }
}
