module.exports = function(eleventyConfig) {

  eleventyConfig.addPassthroughCopy("assets");

  return {
    dir: {
      input: "public_templates",
      output: "public"
    }
  }
};
