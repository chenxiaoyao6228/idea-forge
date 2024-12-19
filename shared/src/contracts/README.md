# Contracts

This directory contains shared contract definitions between the client and API.

## Important Notes

### Avoid Direct Prisma Type References

When defining contracts, do not directly reference Prisma types. The client-side browser environment does not support certain Node.js specific types that Prisma relies on.

For example, referencing Prisma types that use the `Buffer` type will result in runtime errors:

> Uncaught ReferenceError: Buffer is not defined

The prisma folder is only for browse how many fields are available in the database, not for type definition

### Best practice

Use prisma for loose type and contract for strict type definition
