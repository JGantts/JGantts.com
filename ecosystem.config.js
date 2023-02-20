module.exports = {
  apps : [{
    name   : "prod",
    script : "install-prod/index.js",
    env: {
      "NODE_ENV": "development",
    }
  },{
    name   : "stage",
    script : "install-stage/index.js",
    env: {
      "NODE_ENV": "stage",
    }
  }]
}