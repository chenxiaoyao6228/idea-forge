# Test Document for @idea/editor Extensions

This document tests all core extensions moved to @idea/editor package (sections 2.1-2.3).

## Extensions Tested

**Document Structure (2.1):**
- Paragraph
- Blockquote
- Horizontal rule
- Hard break

**Text Formatting Marks (2.2):**
- Bold, Italic, Strike, Underline
- Inline code
- Links
- Subscript, Superscript

**Lists (2.3):**
- Bullet lists
- Ordered lists
- Task lists with checkboxes

---

# Heading 1

This is a paragraph under heading 1.

## Heading 2 - Text Formatting Marks

Test **bold text** with double asterisks and __bold with underscores__.

Test *italic text* with single asterisk and _italic with underscore_.

Test ~~strikethrough text~~ with double tildes.

Test +underline text+ with plus signs.

Test `inline code` with backticks.

Test [link text](https://example.com) and [link with title](https://example.com "Example Title").

Test subscript with :sub[H2O] and superscript with :sup[x2].

### Heading 3 - Block Elements

> This is a blockquote.
> It can span multiple lines.
> And contain **formatted** text.

---

Above is a horizontal rule (thematic break).

This line has a hard break at the end.
And this is the next line after the hard break.

#### Heading 4 - Lists

Unordered bullet list:
- First item
- Second item
- Third item
  - Nested item 1
  - Nested item 2
- Fourth item

Ordered list:
1. First ordered item
2. Second ordered item
3. Third ordered item
   1. Nested ordered item
   2. Another nested item
4. Fourth ordered item

Task list:
- [ ] Unchecked task item
- [x] Checked task item
- [ ] Another unchecked task
  - [ ] Nested task item
  - [x] Nested checked item
- [x] Completed task

##### Heading 5 - Mixed Content

A paragraph with **bold**, *italic*, ~~strike~~, `code`, and [links](https://example.com) all together.

> A blockquote with **bold** and *italic* text.
>
> It can contain multiple paragraphs.

###### Heading 6 - Complex Lists

1. First item with **bold**
2. Second item with *italic*
   - Nested bullet under ordered
   - Another nested bullet
3. Third item with `code`

- Bullet with [link](https://example.com)
- Another bullet
  1. Nested ordered
  2. Another nested ordered
- Final bullet

## Another H2 - Math Formulas

### Inline Math Examples

The Pythagorean theorem is $a^2 + b^2 = c^2$ and Einstein's famous equation is $E = mc^2$.

The quadratic formula is $x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}$ which is used to solve quadratic equations.

Simple algebraic expressions: $x + y = 10$ and $2x - 3y = 5$.

### Block Math Examples

The quadratic formula in display mode:

$$
x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}
$$

Integration formula:

$$
\int_{a}^{b} f(x) \, dx = F(b) - F(a)
$$

Summation notation:

$$
\sum_{i=1}^{n} i = \frac{n(n+1)}{2}
$$

Matrix representation:

$$
\begin{bmatrix}
a & b \\
c & d
\end{bmatrix}
$$

Fraction and square root:

$$
\frac{a}{b} = \frac{c}{d}
$$

Limit definition:

$$
\lim_{x \to \infty} \frac{1}{x} = 0
$$

Greek letters and complex formulas:

$$
\alpha + \beta = \gamma \quad \text{and} \quad \Delta = b^2 - 4ac
$$

## Final Tests

Final paragraph to test multiple nodes with all formatting: **bold**, *italic*, ~~strike~~, +underline+, `code`, [link](https://example.com), :sub[subscript], and :sup[superscript].

> Final blockquote to ensure all extensions work correctly.

---

End of test document.
