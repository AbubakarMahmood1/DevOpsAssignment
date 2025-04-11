# To-Do List Helm Chart
## Structure
- Chart.yaml
- templates/ (backend-deployment.yaml, backend-service.yaml, frontend-deployment.yaml, frontend-service.yaml, ingress.yaml)
- values-dev.yaml (dev environment)
- values-prod.yaml (prod environment)

## Deploy
helm install todo-app-dev . -f values-dev.yaml -n dev --create-namespace
helm install todo-app-prod . -f values-prod.yaml -n prod --create-namespace

## Access
minikube service frontend -n dev --url
minikube service frontend -n prod --url