import fs from "fs";
import path from "path";

export function loadFixture<T>(fixtureName: string): T {
  const fixturePath = path.join(
    __dirname,
    "../fixtures",
    `${fixtureName}.json`
  );
  const fixtureData = fs.readFileSync(fixturePath, "utf-8");
  return JSON.parse(fixtureData);
}
