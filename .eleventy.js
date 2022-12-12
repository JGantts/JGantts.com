module.exports = function(eleventyConfig) {

  eleventyConfig.addPassthroughCopy("assets");
  eleventyConfig.addPassthroughCopy("resume");

  return {
    dir: {
      input: "public_templates",
      output: "public"
    }
  }
};
