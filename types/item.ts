export enum ItemStatus {
  NOT_PACKED = "NOT_PACKED",
  PACKED = "PACKED",
  RECEIVED = "RECEIVED",
  MISSING = "MISSING",
  DISTRIBUTED = "DISTRIBUTED",
}

// A sub_categories row: the catalogue items can be packed from.
export interface CatalogueItem {
  catalog_id: number;
  description: string;
  category: string;
  // From categories.is_special.
  is_balmas: boolean;
}

// A packing_items row.
export interface Item {
  item_id: number;
  catalog_id: CatalogueItem["catalog_id"];
  description: string;
  item_status: ItemStatus;
  quantity: number;
}
