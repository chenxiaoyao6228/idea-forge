# Markdown Syntax Demo

This is a comprehensive markdown syntax demonstration file for testing import features.

## Headers

# H1 Header

## H2 Header

### H3 Header

#### H4 Header

##### H5 Header

###### H6 Header

## Text Formatting

**Bold text** and **bold text**

_Italic text_ and _italic text_

**_Bold and italic_** and **_bold and italic_**

~~Strikethrough text~~

`Inline code`

++Underlined text++

==Highlighted text==

:sub[subscript text]

:sup[superscript text]

## Links and Images

[Regular link](https://example.com)

[Link with title](https://example.com "Link title")

[Reference link][reference]

[reference]: https://example.com "Reference link"

![Image alt text](https://via.placeholder.com/300x200 "Image title")

## Lists

### Unordered Lists

- First item
- Second item
  - Nested item
  - Another nested item
    - Deeply nested item
- Third item

### Ordered Lists

1. First item
2. Second item
   1. Nested item
   2. Another nested item
3. Third item

### Task Lists

- [x] Completed task
- [ ] Incomplete task
- [x] Another completed task
- [ ] Another incomplete task

## Blockquotes

> This is a blockquote
>
> It can span multiple lines
>
> > Nested blockquote
> >
> > With multiple levels

## Code Blocks

### Fenced Code Block

```javascript
function hello() {
  console.log("Hello, World!");
  return true;
}
```

### Code Block with Language

```python
def fibonacci(n):
    if n <= 1:
        return n
    return fibonacci(n-1) + fibonacci(n-2)
```

### Inline Code

Use `console.log()` to print to the console.

## Tables

| Header 1 | Header 2 | Header 3 |
| -------- | -------- | -------- |
| Cell 1   | Cell 2   | Cell 3   |
| Cell 4   | Cell 5   | Cell 6   |
| Cell 7   | Cell 8   | Cell 9   |

| Left Aligned | Center Aligned | Right Aligned |
| :----------- | :------------: | ------------: |
| Left         |     Center     |         Right |
| Data 1       |     Data 2     |        Data 3 |

## Horizontal Rules

---

---

---

## Line Breaks

This is a paragraph with a line break.  
This line has a line break before it.

This is another paragraph.

## Escaped Characters

\*This is not italic\*

\[This is not a link\]

\`This is not code\`

## HTML Elements

<details>
<summary>Click to expand</summary>

This is hidden content that can be revealed.

</details>

<kbd>Ctrl</kbd> + <kbd>C</kbd> to copy

<mark>Highlighted text</mark>

<del>Deleted text</del>

<ins>Inserted text</ins>

## Math (if supported)

Inline math: $E = mc^2$

Block math:

$$
\int_{-\infty}^{\infty} e^{-x^2} dx = \sqrt{\pi}
$$

## Footnotes

This is a sentence with a footnote[^1].

This is another sentence with a different footnote[^note].

[^1]: This is the first footnote.
[^note]: This is a named footnote.

## Definition Lists

Term 1
: Definition 1

Term 2
: Definition 2a
: Definition 2b

## Abbreviations

The HTML specification is maintained by the W3C.

_[HTML]: HyperText Markup Language
_[W3C]: World Wide Web Consortium

## Emojis

:smile: :heart: :thumbsup: :rocket: :fire: :star:

## Special Characters

© 2024 Example Corp. All rights reserved.

™ Trademark symbol

® Registered trademark

## Complex Example

Here's a complex example combining multiple elements:

> **Important Note**: This is a blockquote with _italic_ and **bold** text.
>
> ```javascript
> // Code example in blockquote
> const example = {
>   name: "Markdown Demo",
>   version: "1.0.0",
> };
> ```
>
> - [x] Task completed
> - [ ] Another task

| Feature | Status | Notes                |
| ------- | ------ | -------------------- |
| Headers | ✅     | All levels supported |
| Lists   | ✅     | Nested lists work    |
| Code    | ✅     | Syntax highlighting  |

For more information, visit [Markdown Guide](https://www.markdownguide.org/).

---

_This demo file contains most common Markdown syntax elements for comprehensive testing._
