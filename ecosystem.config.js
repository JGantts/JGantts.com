module.exports = {
  apps : [{
    name    : "prod",
    script  : "index.js",
    cwd     : "install-prod"
  },{
    name   : "stage",
    script : "index.js",
    cwd     : "install-stage"
  }]
}