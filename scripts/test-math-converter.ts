import { markdownToHtml } from "@idea/editor/server";

const markdown = `Inline: $x^2 + y^2 = r^2$

Block:

$$
\\frac{a}{b} = \\frac{c}{d}
$$`;

async function test() {
  const html = await markdownToHtml(markdown);
  console.log("Generated HTML:");
  console.log(html);
  console.log("\n---\n");
}

test();
