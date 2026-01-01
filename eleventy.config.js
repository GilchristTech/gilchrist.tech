import { DateTime } from "luxon";
import * as Cheerio from "cheerio";

function indent (text, width=2) {
  if (arguments.length == 1 && typeof arguments[0] === "number") {
    // If only given an integer, just return that many spaces.
    return " ".repeat(arguments[0]);
  }

  assertString(text);

  const align = " ".repeat(width);
  return text
    .split("\n")
    .map(line => align + line)
    .join("\n");
}


function indentHtml (text, width=2) {
  assertString(text);

  const $ = Cheerio.load(text, null, false);
  const align = " ".repeat(width);

  // Recurse into the document node tree, and apply indentation
  // to text nodes.
  //
  // I have looked at multiple HTML tokenizers and parsers, and
  // found few options to preserve whitespace inside opening
  // tags. If an attribute has two spaces or a newline instead
  // of a single space, virtually every project I looked at
  // rewrites this as a single space. For parsers, this makes
  // sense, as whitespace outside of text nodes is not part of
  // the DOM; but it could be more suitable to have a separate
  // token for intra-tag whitespace. However, few
  // recently-updated options for NPM modules with this
  // functionality.
  //
  // Not wanting to build my own HTML tokenizer, to perform
  // this indentation transformation, I accept that the
  // whitespace around tag attributes will be truncated, and am
  // mutating the document tree in-place.

  function format (node, pre_tag_level=0) {
    $(node).contents().each((_, element) => {
      switch (element.type) {
        case "tag":
          // Because any <pre> ancestor invalidates additional
          // indentation of its children, do not recurse if a <pre>
          // tag is encountered.
          //
          if (element.name != "pre") {
            format(element, pre_tag_level);
          }
          return;

        case "style":
        case "script":
          return;

        case "text":
          // Indent text nodes
          element.data = element.data.replaceAll("\n", "\n"+align);
          return;

        default:
          throw TypeError(`Unknown element type: ${element.type}`);
      }
    });
  }

  format($.root());
  return align + $.html();
}


function assertString(str) {
  if (arguments.length > 1) {
    for (let argument of arguments) {
      assertString(argument);
    }
    return;
  }

  if (typeof str === "string" || str instanceof String) {
    return str;
  }
  throw new TypeError(`Data is not a string, got ${typeof str}: ${str}`);
}


export default async function (config) {
  config.addPassthroughCopy("src/**/*.css");
  config.addPassthroughCopy("static");

  config.addPassthroughCopy("src/posts/**/*.(jpg|png|webp|svg)");
  config.addPassthroughCopy("src/posts/**/static/**/*");
  config.addWatchTarget("src/posts/**/*");

  config.addFilter("search", (await import("jmespath")).search);

  config.addPlugin(
    (await import("@11ty/eleventy-plugin-syntaxhighlight")).default
  );

  //
  // String operation filters
  //
  config.addFilter("indent", indent);
  config.addPairedShortcode("indent", indent);
  config.addFilter("indentHtml", indentHtml);
  config.addPairedShortcode("indentHtml", indentHtml);

  config.addFilter("trim",      s => s.trim());
  config.addFilter("trimLeft",  s => s.trimLeft());
  config.addFilter("trimRight", s => s.trimRight());

  config.addFilter("assertString", assertString);

  config.addFilter("formatDate", (date, format, zone="UTC") => {
    return DateTime.fromJSDate(date, {zone}).toFormat(format);
  });

  return {
    htmlTemplateEngine: "njk",
    markdownTemplateEngine: "njk",

    dir: {
      input: "src",
      output: "dist",
      includes: "includes",
    }
  };
}
