import { DateTime } from "luxon";

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
  config.addPassthroughCopy("src/posts/**/static");
  config.addWatchTarget("src/posts/**/*");

  config.addFilter("search", (await import("jmespath")).search);

  //
  // String operation filters
  //
  config.addFilter("indent", indent);
  config.addPairedShortcode("indent", indent);

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
