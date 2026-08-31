import { describe, expect, it } from "vitest";
import { htmlToText } from "./extract";

describe("htmlToText", () => {
  it("pulls the title and collapses body text", () => {
    const html = `
      <html><head><title>Acme — ship faster</title></head>
      <body><h1>Acme</h1><p>Acme helps   teams
      ship  faster.</p></body></html>`;
    const { title, text } = htmlToText(html);
    expect(title).toBe("Acme — ship faster");
    expect(text).toBe("Acme Acme helps teams ship faster.");
  });

  it("strips script/style/noscript so their contents don't reach the model", () => {
    const html = `<title>T</title><body>
      <style>.a{color:red}</style>
      <script>var secret = 42;</script>
      <noscript>enable js</noscript>
      <p>Real copy.</p></body>`;
    const { text } = htmlToText(html);
    expect(text).toContain("Real copy.");
    expect(text).not.toContain("secret");
    expect(text).not.toContain("color:red");
    expect(text).not.toContain("enable js");
  });

  it("falls back to the first h1 when there's no title", () => {
    const { title } = htmlToText("<body><h1>Fallback Name</h1><p>x</p></body>");
    expect(title).toBe("Fallback Name");
  });
});
