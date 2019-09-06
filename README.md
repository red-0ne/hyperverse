# hyperverse
Transparent microservice framework

## Run example
### Build the project
```
tsc -p .
```

### Run main registry
```
node dist/examples/communication/init-main-registry.js
```

### Run hashing service
```
node dist/examples/communication/init-hasher.js
```

### Run consumer service
```
node dist/examples/communication/init-consumer-service.js
```

You will be prompted to input strings that you want to hash, the hash is then displayed in console.
