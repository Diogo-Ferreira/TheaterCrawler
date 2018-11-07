# TheaterCrawler

This script crawls a movie theather website periodically in order to detect new movies.

New movies are sent via a slack channel.

# Config

Get your slack webhook url and set it inside `.env`, see `.env-example`

# Deployment on Kubernetes

1. Create secret

```
kubectl create secret generic slack-web-hook --from-env-file=.env
```

2. Deploy

```
kubectl apply -f deployment.yml 
```