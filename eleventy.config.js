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

  let result_text = align;
  let pre_tag_level = 0;

  function format (node) {
    $(node).contents().each((_, element) => {
      if (element.type === "text") {
        let element_text = element.data;
        if (pre_tag_level < 1) {
          element_text = element_text.replaceAll("\n", "\n"+align);
        }
        result_text += element_text;
        return;
      }
      else if (element.type === "tag") {
        // Rebuild opening tag
        //
        // I have looked at multiple HTML tokenizers and parsers,
        // and found no reasonable NPM modules for this which can
        // preserve whitespace inside opening tags. If an
        // attribute has two spaces or a newline instead of a
        // single space, virtually every project I looked at
        // rewrites this as a single space. It's dissapointing,
        // but not wanting to build my own tokenizer or parser
        // for whitespace management in my own HTML, I must
        // accept that the whitespace around tag attributes will
        // be trimmed.
        //
        result_text += `<${element.name}`;
        for (let [key, value] of Object.entries(element.attribs)) {
          result_text += ` ${key}="${value}"`;
        }
        result_text += ">";

        if (element.name == "pre") {
          pre_tag_level++;
          format(element);
          pre_tag_level--;
        } else {
          format(element);
        }
        result_text += `</${element.name}>`;
        return;

      } else if (element.type == "style") {
        result_text += $.html(element).replaceAll("\n", "\n"+align);
        return;
      }

      throw TypeError(`Unknown element type: ${element.type}`);
    });
  }

  format($.root());
  return result_text;
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
