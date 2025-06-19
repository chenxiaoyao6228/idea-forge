## Testing

## Levels of testing

- unit testing: utility functions, services(use mock db)
- integration testing: need to connect to db, but focus on single service or module(eg: move-document.service)
- e2e testing: test the api endpoints with supertest, many modules involved

## TODO:

- automate mock module(), should have something similar to https://www.npmjs.com/package/@automock/jest
