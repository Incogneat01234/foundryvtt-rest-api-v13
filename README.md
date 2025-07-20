### How to use Foundry REST API:

- Install the Foundry VTT module using the latest manifest link: [https://github.com/Incogneat01234/foundryvtt-rest-api-v13/releases/latest/download/module.json](https://github.com/Incogneat01234/foundryvtt-rest-api-v13/releases/latest/download/module.json)
    
- Get an API key for the public relay server at [https://foundryvtt-rest-api-relay.fly.dev/](https://foundryvtt-rest-api-relay.fly.dev/)
    
- Download [Postman](https://www.postman.com/downloads/) and the import the latest [API Test Collection](https://github.com/ThreeHats/foundryvtt-rest-api-relay/blob/main/Foundry%20REST%20API%20Documentation.postman_collection.json) for an easy way to start testing endpoints.
    
- Read the [documentation](https://github.com/ThreeHats/foundryvtt-rest-api-relay/wiki) for information about how to use each endpoint

- Join the [discord](https://discord.gg/U634xNGRAC) server for updates, questions, and discussions
    

---

Foundry REST API provides various API endpoints for fetching and interacting with your foundry world data through a node.js server that act as a relay.

## **Getting started guide**

To start using the Foundry REST API, you need to -
    
- Have your API key in the module settings.
    
- Each request must have the your API key in the "x-api-key" header.
    
- Endpoints other than /clients require a clientId parameter that matches a connected world.

### Configuration
After installing the module, go to the module settings to configure:

- **WebSocket Relay URL**: URL for the WebSocket relay server (default: `wss://foundryvtt-rest-api-relay.fly.dev/`).
- **API Key**: Your unique API key obtained from the relay server provider (or set your own if self-hosting).
- **Log Level**: Controls the verbosity of module logs.
- **Ping Interval (seconds)**: How often the module sends application-level pings to the relay server to signal activity (default: `30`).
- **Max Reconnect Attempts**: Maximum number of times the module will try to reconnect if the connection drops (default: `20`).
- **Reconnect Base Delay (ms)**: Initial delay before the first reconnect attempt. Uses exponential backoff (default: `1000`).
