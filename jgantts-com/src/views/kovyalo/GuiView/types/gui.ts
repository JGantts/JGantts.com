export type GuiParent = {
  children: Record<string, GuiNode>
}

export type GuiChild = {
  parent: GuiNode|null
}

export type GuiTreeIdentifiable = {
  id: string
  title: string
}

export type GuiNode = GuiChild & GuiParent & GuiTreeIdentifiable

export type GuiLeaf = GuiChild & GuiTreeIdentifiable & {
  uiPathHash: string
  enabled: boolean
  children: {}
}
