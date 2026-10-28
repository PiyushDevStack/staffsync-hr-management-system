# Backend tests

Run with `npm --workspace server test`. The built-in Node.js test runner exercises date/leave policy helpers without needing a running MongoDB service. API integration and full workflow verification should additionally be performed against a disposable test database using Postman or Supertest. Do not treat policy-unit tests as proof that the production database or every route is working.
