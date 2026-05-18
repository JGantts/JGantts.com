function hashGuiPath(uiPath: string[]) {
    return encodeURIComponent(uiPath.map(x => x.toLowerCase()).join("*"))
}
  
function hashTitleIntoId(title: string) {
    return encodeURIComponent(title.toLowerCase())
}

export {
    hashGuiPath,
    hashTitleIntoId
}