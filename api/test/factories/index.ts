import { faker } from "@faker-js/faker";
// import { createFixture } from "zod-fixture"; // TODO:

export const buildDocument = (overrides: any = {}) => ({
  id: faker.string.uuid(),
  title: faker.lorem.sentence(),
  content: faker.lorem.paragraphs(3),
  workspaceId: faker.string.uuid(),
  subspaceId: null,
  parentId: null,
  index: faker.string.alphanumeric(8),
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

export const buildUser = (overrides: any = {}) => ({
  id: faker.string.uuid(),
  email: faker.internet.email(),
  name: faker.person.fullName(),
  workspaceId: faker.string.uuid(),
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

export const buildWorkspace = (overrides: any = {}) => ({
  id: faker.string.uuid(),
  name: faker.company.name(),
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

export const buildSubspace = (overrides: any = {}) => ({
  id: faker.string.uuid(),
  name: faker.company.name(),
  workspaceId: faker.string.uuid(),
  navigationTree: [],
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

export const buildGroup = (overrides: any = {}) => ({
  id: faker.string.uuid(),
  name: faker.company.name(),
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});
