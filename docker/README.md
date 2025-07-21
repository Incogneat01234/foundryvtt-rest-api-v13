# Foundry VTT REST API - Docker Version

A standalone WebSocket API server for Foundry VTT that runs in Docker. No Foundry module required!

## Quick Start

### Using Docker Compose (Recommended)

1. Clone this repository or copy the docker folder
2. Navigate to the docker directory
3. Run:

```bash
docker-compose up -d
```

The server will be available at `ws://localhost:8080`

### Using Docker

```bash
# Build the image
docker build -t foundry-rest-api .

# Run the container
docker run -d \
  --name foundry-api \
  -p 8080:8080 \
  -e API_KEY=your-secret-key \
  -e FOUNDRY_URL=http://your-foundry:30000 \
  foundry-rest-api
```

## Configuration

Configure the server using environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 8080 | WebSocket server port |
| `HOST` | 0.0.0.0 | Server host binding |
| `API_KEY` | your-secret-api-key | API authentication key |
| `FOUNDRY_URL` | http://localhost:30000 | Your Foundry VTT URL |
| `FOUNDRY_PASSWORD` | (empty) | Foundry game password |
| `FOUNDRY_ADMIN_PASSWORD` | (empty) | Foundry admin password |
| `LOG_LEVEL` | info | Logging level (debug, info, warn, error) |

### Using .env file

Create a `.env` file in the docker directory:

```env
API_KEY=my-super-secret-key
FOUNDRY_URL=http://192.168.1.100:30000
FOUNDRY_PASSWORD=gamepassword
LOG_LEVEL=debug
```

Then run:
```bash
docker-compose --env-file .env up -d
```

## API Endpoints

### HTTP Endpoints

- `GET /` - Server status and information
- `GET /health` - Health check endpoint
- `GET /info` - Detailed server information

### WebSocket API

Connect to `ws://localhost:8080?token=your-api-key`

Example connection:
```javascript
const ws = new WebSocket('ws://localhost:8080?token=your-secret-api-key');

ws.on('open', () => {
  // Send API requests
  ws.send(JSON.stringify({
    type: 'get-entities',
    entityType: 'Actor',
    requestId: '123'
  }));
});

ws.on('message', (data) => {
  const response = JSON.parse(data);
  console.log('Response:', response);
});
```

## Deployment Options

### Local Development
```bash
cd docker
npm install
npm run dev  # Uses nodemon for auto-reload
```

### Production with Docker
```bash
docker-compose up -d
```

### Kubernetes
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: foundry-api
spec:
  replicas: 1
  selector:
    matchLabels:
      app: foundry-api
  template:
    metadata:
      labels:
        app: foundry-api
    spec:
      containers:
      - name: foundry-api
        image: foundry-rest-api:latest
        ports:
        - containerPort: 8080
        env:
        - name: API_KEY
          valueFrom:
            secretKeyRef:
              name: foundry-api-secret
              key: api-key
        - name: FOUNDRY_URL
          value: "http://foundry-service:30000"
```

### Cloud Deployment

The Docker container can be deployed to:
- **AWS ECS/Fargate**
- **Google Cloud Run**
- **Azure Container Instances**
- **Heroku** (with container registry)
- **DigitalOcean App Platform**

## Security Considerations

1. **Always use HTTPS in production** - Put the server behind a reverse proxy (nginx, Traefik, etc.)
2. **Use strong API keys** - Generate secure random keys
3. **Network isolation** - Use Docker networks to isolate services
4. **Rate limiting** - Consider adding rate limiting for production

### Example with Traefik

```yaml
services:
  traefik:
    image: traefik:v2.10
    command:
      - "--api.insecure=true"
      - "--providers.docker=true"
      - "--entrypoints.websecure.address=:443"
    ports:
      - "443:443"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - ./certs:/certs

  foundry-api:
    build: .
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.foundry-api.rule=Host(`api.yourdomain.com`)"
      - "traefik.http.routers.foundry-api.entrypoints=websecure"
      - "traefik.http.routers.foundry-api.tls=true"
```

## Monitoring

The server provides health checks and metrics:

```bash
# Check health
curl http://localhost:8080/health

# Get server info
curl http://localhost:8080/info
```

### With Prometheus

Add to docker-compose.yml:
```yaml
  prometheus:
    image: prom/prometheus
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
    ports:
      - "9090:9090"
```

## Troubleshooting

### Connection Issues
1. Check Foundry is accessible from the Docker container
2. Verify API key matches
3. Check logs: `docker logs foundry-api`

### Performance
- Adjust Node.js memory: `-e NODE_OPTIONS="--max-old-space-size=4096"`
- Scale horizontally with multiple containers behind a load balancer

### Debug Mode
```bash
docker run -it --rm \
  -e LOG_LEVEL=debug \
  -e API_KEY=test \
  -e FOUNDRY_URL=http://host.docker.internal:30000 \
  foundry-rest-api
```

## License

MIT