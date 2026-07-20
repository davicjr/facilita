export type ShortcutCatalogItem = {
  id: string;
  title: string;
  description: string;
  context: string;
  keys: string[];
  target: string;
  openInNewTab: boolean;
};
