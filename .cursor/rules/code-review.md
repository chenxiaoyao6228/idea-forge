We just implemented the feature described in the attached plan.

Please do a thorough code review:

1. Make sure that the plan was correctly implemented.
2. Make sure it follows the code style guideline, for nestjs is `.cursor/rules/nestjs-api.mdc`, for react is `.cursor/rules/react-client.mdc`
3. Look for any obvious bugs or issues in the code.
4. Look for subtle data alignment issues (e.g. expecting snake_case but getting camelCase or expecting data to come through in an object but receiving a nested object like {data:{}})
5. Look for any over-engineering or files getting too large and needing refactoring
6. Look for any weird syntax or style that doesn't match other parts of the codebase
7. Use pg mcp to connect to the db `DATABASE_URL=postgresql://postgres:123456@localhost:5432/ideaforge?schema=public` call the newest api (baseUrl: `http://localhost:5000`) and verify, the default user is `york@test.com`, default password is `Aa111111`, you might need to login to get the cookie, save it to 'root/cookie.txt' and reused, if anymore info needed, ask the user to provide

Document your findings in .cursor/docs/features/<N>\_REVIEW.md unless a different file name is specified.
