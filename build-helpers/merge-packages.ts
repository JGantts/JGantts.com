let fs = require('fs')
let path = require('path')

let basePackage = require(path.resolve("package.json"))
let apiPackage = require(path.resolve("api/package.json"))
let appPackage = require(path.resolve("app/package.json"))
let outPackage = path.resolve("dist/package.json")

basePackage.dependencies = {...apiPackage.dependencies, ...apiPackage.dependencies}
delete basePackage.devDependencies
basePackage.scripts = basePackage.prodScripts
delete basePackage.prodScripts



fs.writeFile(outPackage, JSON.stringify(basePackage, null, 2), (err: Error) => {
  if (err) {
    throw err
  }
  console.log("Done merging package files.")
});
